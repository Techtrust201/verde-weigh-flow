import { useState, useCallback, useEffect } from "react";
import { db } from "@/lib/database";

export interface PeseeTab {
  id: string;
  label: string;
  formData: PeseeTabFormData;
  isEditing?: boolean;
}

export interface PeseeTabFormData {
  numeroBon: string;
  numeroFacture?: string;
  nomEntreprise: string;
  plaque: string;
  chantier: string;
  chantierLibre?: string; // Champ libre pour chantier (similaire à transporteurLibre)
  produitId: number;
  transporteurId: number;
  transporteurLibre?: string; // Nouveau champ
  poidsEntree: string;
  poidsSortie: string;
  moyenPaiement: "ESP" | "CB" | "CHQ" | "VIR" | "PRVT";
  typeClient: "particulier" | "professionnel" | "micro-entreprise";
  clientId: number;
  reference?: string; // Champ référence optionnel pour les factures
}

export const usePeseeTabs = () => {
  // 💾 Charger l'état depuis localStorage avec validation
  const [tabs, setTabs] = useState<PeseeTab[]>(() => {
    try {
      const savedTabs = localStorage.getItem("pesee-tabs");
      if (savedTabs) {
        const parsed = JSON.parse(savedTabs);
        // Validation : s'assurer que c'est un array
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (error) {
      console.warn(
        "Erreur lors du chargement des onglets depuis localStorage:",
        error
      );
      // Nettoyer les données corrompues
      localStorage.removeItem("pesee-tabs");
      localStorage.removeItem("pesee-active-tab");
    }

    // 🎯 Créer automatiquement un premier onglet si aucun n'existe
    const firstTabId = crypto.randomUUID();
    // Utiliser un numéro temporaire pour l'initialisation synchrone
    // Le vrai numéro sera généré lors du premier montage du composant
    const firstTab: PeseeTab = {
      id: firstTabId,
      label: `Pesée 1`,
      formData: {
        numeroBon: "À générer", // Le numéro sera généré à la validation
        nomEntreprise: "",
        plaque: "",
        chantier: "",
        chantierLibre: "",
        produitId: 0,
        transporteurId: 0,
        transporteurLibre: "",
        poidsEntree: "",
        poidsSortie: "",
        moyenPaiement: "ESP",
        typeClient: "professionnel",
        clientId: 0,
      },
    };

    // Sauvegarder le premier onglet dans localStorage
    localStorage.setItem("pesee-tabs", JSON.stringify([firstTab]));
    localStorage.setItem("pesee-active-tab", firstTabId);

    return [firstTab];
  });

  const [activeTabId, setActiveTabId] = useState<string | null>(() => {
    try {
      const savedActiveTab = localStorage.getItem("pesee-active-tab");
      // Vérifier que l'onglet actif existe dans les onglets chargés
      if (savedActiveTab && tabs.find((tab) => tab.id === savedActiveTab)) {
        return savedActiveTab;
      }
      // Si aucun onglet actif ou onglet inexistant, prendre le premier
      if (tabs.length > 0) {
        return tabs[0].id;
      }
    } catch (error) {
      console.warn("Erreur lors du chargement de l'onglet actif:", error);
    }
    return tabs.length > 0 ? tabs[0].id : null;
  });

  const updateCurrentTab = (newData: Partial<PeseeTabFormData>) => {
    setTabs((prevTabs) => {
      const updatedTabs = prevTabs.map((tab) =>
        tab.id === activeTabId
          ? { ...tab, formData: { ...tab.formData, ...newData } }
          : tab
      );
      // 💾 Sauvegarder dans localStorage
      localStorage.setItem("pesee-tabs", JSON.stringify(updatedTabs));
      return updatedTabs;
    });
  };

  // Effet pour corriger les anciens onglets avec des formats obsolètes
  useEffect(() => {
    const initializeFirstTab = async () => {
      if (tabs.length > 0 && activeTabId) {
        const firstTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
        // Corriger seulement les onglets avec des formats obsolètes (ancien système)
        // Les nouveaux onglets doivent afficher "À générer"
        const isOldFormat =
          firstTab.formData.numeroBon === "BL-INIT-TEMP" ||
          (firstTab.formData.numeroBon.startsWith("BL") &&
            firstTab.formData.numeroBon !== "À générer" &&
            !firstTab.formData.numeroBon.match(/^BL\d+$/)); // Si ce n'est pas un format BL50000

        if (isOldFormat) {
          // Pour les anciens formats, on met "À générer" car les numéros sont générés à la validation
          updateCurrentTab({ numeroBon: "À générer" });
        }
      }
    };

    initializeFirstTab();
  }, []); // Exécuter seulement au montage

  const generateBonNumber = () => {
    // Retourner un placeholder vide - le numéro sera généré uniquement à la validation
    return "À générer";
  };

  // Fonction pour générer le prochain numéro BL séquentiel basé sur la BDD
  const generateNextBLNumber = async (): Promise<string> => {
    try {
      // Récupérer la dernière pesée triée par numeroBon décroissant
      const lastPesee = await db.pesees.orderBy("numeroBon").reverse().first();

      let nextNumber = 50000; // Valeur par défaut

      if (lastPesee && lastPesee.numeroBon.startsWith("BL")) {
        // Extraire le numéro de la dernière pesée (ex: "BL50123" → 50123)
        const currentNum = parseInt(lastPesee.numeroBon.substring(2));
        if (!isNaN(currentNum)) {
          nextNumber = currentNum + 1;
        }
      }

      return `BL${nextNumber}`;
    } catch (error) {
      console.error("Erreur lors de la génération du numéro BL:", error);
      // En cas d'erreur, retourner un numéro par défaut
      return "BL50000";
    }
  };

  // Fonction pour vérifier et générer un numéro BL unique
  const generateUniqueBLNumber = async (
    excludePeseeId?: number
  ): Promise<string> => {
    let numeroBon = await generateNextBLNumber();
    let attempts = 0;

    // Extraire le numéro séquentiel
    const getSeqNum = (numStr: string) => parseInt(numStr.substring(2));

    while (true) {
      // Vérifier qu'aucune pesée n'existe déjà avec ce numeroBon (en excluant la pesée courante si fournie)
      let blExists = false;
      const peseesWithBL = await db.pesees
        .where("numeroBon")
        .equals(numeroBon)
        .toArray();
      if (excludePeseeId) {
        blExists = peseesWithBL.some((p) => p.id !== excludePeseeId);
      } else {
        blExists = peseesWithBL.length > 0;
      }

      // Vérifier qu'aucune pesée n'existe déjà avec un numeroFacture ayant le même numéro séquentiel
      // (en excluant la pesée courante si fournie)
      const seqNum = getSeqNum(numeroBon);
      const correspondingFA = `FA${seqNum}`;
      let faExists = false;
      const peseesWithFA = await db.pesees
        .where("numeroFacture")
        .equals(correspondingFA)
        .toArray();
      if (excludePeseeId) {
        faExists = peseesWithFA.some((p) => p.id !== excludePeseeId);
      } else {
        faExists = peseesWithFA.length > 0;
      }

      if (!blExists && !faExists) {
        break; // Numéro unique trouvé
      }

      // Incrémenter et réessayer
      const num = seqNum + 1;
      numeroBon = `BL${num}`;
      attempts++;

      // Sécurité pour éviter les boucles infinies
      if (attempts > 100) {
        throw new Error(
          "Impossible de générer un numéro BL unique après 100 tentatives"
        );
      }
    }

    return numeroBon;
  };

  // Fonction pour générer le prochain numéro FA séquentiel basé sur la BDD
  const generateNextFANumber = async (): Promise<string> => {
    try {
      // Récupérer la dernière pesée avec numeroFacture triée par numeroFacture décroissant
      const lastPesee = await db.pesees
        .orderBy("numeroFacture")
        .reverse()
        .filter((p) => p.numeroFacture && p.numeroFacture.startsWith("FA"))
        .first();

      let nextNumber = 50000; // Valeur par défaut

      if (
        lastPesee &&
        lastPesee.numeroFacture &&
        lastPesee.numeroFacture.startsWith("FA")
      ) {
        // Extraire le numéro de la dernière pesée (ex: "FA50123" → 50123)
        const currentNum = parseInt(lastPesee.numeroFacture.substring(2));
        if (!isNaN(currentNum)) {
          nextNumber = currentNum + 1;
        }
      }

      return `FA${nextNumber}`;
    } catch (error) {
      console.error("Erreur lors de la génération du numéro FA:", error);
      // En cas d'erreur, retourner un numéro par défaut
      return "FA50000";
    }
  };

  // Fonction pour vérifier et générer un numéro FA unique
  const generateUniqueFANumber = async (
    excludePeseeId?: number
  ): Promise<string> => {
    let numeroFacture = await generateNextFANumber();
    let attempts = 0;

    // Extraire le numéro séquentiel
    const getSeqNum = (numStr: string) => parseInt(numStr.substring(2));

    while (true) {
      // Vérifier qu'aucune pesée n'existe déjà avec ce numeroFacture (en excluant la pesée courante si fournie)
      let faExists = false;
      const peseesWithFA = await db.pesees
        .where("numeroFacture")
        .equals(numeroFacture)
        .toArray();
      if (excludePeseeId) {
        faExists = peseesWithFA.some((p) => p.id !== excludePeseeId);
      } else {
        faExists = peseesWithFA.length > 0;
      }

      // Vérifier qu'aucune pesée n'existe déjà avec un numeroBon ayant le même numéro séquentiel
      // (en excluant la pesée courante si fournie)
      const seqNum = getSeqNum(numeroFacture);
      const correspondingBL = `BL${seqNum}`;
      let blExists = false;
      const peseesWithBL = await db.pesees
        .where("numeroBon")
        .equals(correspondingBL)
        .toArray();
      if (excludePeseeId) {
        blExists = peseesWithBL.some((p) => p.id !== excludePeseeId);
      } else {
        blExists = peseesWithBL.length > 0;
      }

      if (!faExists && !blExists) {
        break; // Numéro unique trouvé
      }

      // Incrémenter et réessayer
      const num = seqNum + 1;
      numeroFacture = `FA${num}`;
      attempts++;

      // Sécurité pour éviter les boucles infinies
      if (attempts > 100) {
        throw new Error(
          "Impossible de générer un numéro FA unique après 100 tentatives"
        );
      }
    }

    return numeroFacture;
  };

  // Fonction optimisée pour trouver le plus grand numéro séquentiel entre BL et FA
  const getMaxSequenceNumber = async (): Promise<number> => {
    try {
      // Récupérer les dernières pesées triées pour optimiser la recherche
      const [lastBL, lastFA] = await Promise.all([
        db.pesees
          .orderBy("numeroBon")
          .reverse()
          .filter((p) => p.numeroBon && p.numeroBon.startsWith("BL"))
          .first(),
        db.pesees
          .orderBy("numeroFacture")
          .reverse()
          .filter((p) => p.numeroFacture && p.numeroFacture.startsWith("FA"))
          .first(),
      ]);

      let maxBL = 50000;
      let maxFA = 50000;

      // Extraire le numéro BL maximum
      if (lastBL?.numeroBon) {
        const num = parseInt(lastBL.numeroBon.substring(2));
        if (!isNaN(num)) {
          maxBL = num;
        }
      }

      // Extraire le numéro FA maximum
      if (lastFA?.numeroFacture) {
        const num = parseInt(lastFA.numeroFacture.substring(2));
        if (!isNaN(num)) {
          maxFA = num;
        }
      }

      // Retourner le plus grand + 1
      return Math.max(maxBL, maxFA) + 1;
    } catch (error) {
      console.error("Erreur lors de la récupération du max séquentiel:", error);
      return 50000;
    }
  };

  const createNewTab = useCallback(async (): Promise<string> => {
    const newTabId = crypto.randomUUID();

    // Rechercher le produit par défaut : DECHETS VERTS, sinon premier favori, sinon premier produit
    let defaultProduitId = 0;
    try {
      // 1. Chercher DECHETS VERTS
      const dechetsVerts = await db.products
        .filter((p) => p.nom.toUpperCase() === "DECHETS VERTS")
        .first();

      if (dechetsVerts && dechetsVerts.id) {
        defaultProduitId = dechetsVerts.id;
      } else {
        // 2. Si pas trouvé, chercher le premier produit favori
        const firstFavorite = await db.products
          .filter((p) => p.isFavorite === true)
          .first();

        if (firstFavorite && firstFavorite.id) {
          defaultProduitId = firstFavorite.id;
        } else {
          // 3. Si pas de favori, prendre le premier produit de la liste
          const firstProduct = await db.products.orderBy("id").first();
          if (firstProduct && firstProduct.id) {
            defaultProduitId = firstProduct.id;
          }
        }
      }
    } catch (error) {
      console.error(
        "Erreur lors de la recherche du produit par défaut:",
        error
      );
    }

    setTabs((prevTabs) => {
      console.log(
        "[usePeseeTabs] createNewTab appelé, nombre d'onglets actuel:",
        prevTabs.length
      );

      const newTab: PeseeTab = {
        id: newTabId,
        label: `Pesée ${prevTabs.length + 1}`,
        formData: {
          numeroBon: "À générer",
          nomEntreprise: "",
          plaque: "",
          chantier: "",
          chantierLibre: "",
          produitId: defaultProduitId,
          transporteurId: 0,
          transporteurLibre: "",
          poidsEntree: "",
          poidsSortie: "",
          moyenPaiement: "ESP",
          typeClient: "professionnel",
          clientId: 0,
        },
      };

      const updatedTabs = [...prevTabs, newTab];
      console.log(
        "[usePeseeTabs] Nouvel onglet créé:",
        newTabId,
        "Total onglets:",
        updatedTabs.length
      );

      // 💾 Sauvegarder dans localStorage
      localStorage.setItem("pesee-tabs", JSON.stringify(updatedTabs));
      return updatedTabs;
    });

    setActiveTabId(newTabId);
    localStorage.setItem("pesee-active-tab", newTabId);
    console.log("[usePeseeTabs] Onglet sauvegardé dans localStorage");

    return newTabId;
  }, []);

  // Fonction pour changer l'onglet actif avec sauvegarde
  const setActiveTabIdWithSave = useCallback((tabId: string | null) => {
    setActiveTabId(tabId);
    if (tabId) {
      localStorage.setItem("pesee-active-tab", tabId);
    } else {
      localStorage.removeItem("pesee-active-tab");
    }
  }, []);

  const createTabFromFormData = useCallback(
    (formData: PeseeTabFormData, label?: string) => {
      const newTabId = crypto.randomUUID();
      const formattedFormData: PeseeTabFormData = {
        numeroBon: formData.numeroBon ?? "À générer",
        numeroFacture: formData.numeroFacture,
        nomEntreprise: formData.nomEntreprise ?? "",
        plaque: formData.plaque ?? "",
        chantier: formData.chantier ?? "",
        chantierLibre: formData.chantierLibre ?? "",
        produitId: formData.produitId ?? 0,
        transporteurId: formData.transporteurId ?? 0,
        transporteurLibre: formData.transporteurLibre ?? "",
        poidsEntree: formData.poidsEntree ?? "",
        poidsSortie: formData.poidsSortie ?? "",
        moyenPaiement: formData.moyenPaiement ?? "ESP",
        typeClient: formData.typeClient ?? "professionnel",
        clientId: formData.clientId ?? 0,
      };

      const newTab: PeseeTab = {
        id: newTabId,
        label: label ?? `Pesée ${tabs.length + 1}`,
        formData: formattedFormData,
      };

      setTabs((prevTabs) => {
        const updatedTabs = [...prevTabs, newTab];
        localStorage.setItem("pesee-tabs", JSON.stringify(updatedTabs));
        return updatedTabs;
      });
      setActiveTabIdWithSave(newTabId);
      return newTabId;
    },
    [tabs, setActiveTabIdWithSave]
  );

  // Créer un onglet d'édition au début de la liste
  const createEditTab = useCallback(
    (formData: PeseeTabFormData, nomEntreprise: string): string => {
      const newTabId = crypto.randomUUID();
      const formattedFormData: PeseeTabFormData = {
        numeroBon: formData.numeroBon ?? "À générer",
        numeroFacture: formData.numeroFacture,
        nomEntreprise: formData.nomEntreprise ?? "",
        plaque: formData.plaque ?? "",
        chantier: formData.chantier ?? "",
        chantierLibre: formData.chantierLibre ?? "",
        produitId: formData.produitId ?? 0,
        transporteurId: formData.transporteurId ?? 0,
        transporteurLibre: formData.transporteurLibre ?? "",
        poidsEntree: formData.poidsEntree ?? "",
        poidsSortie: formData.poidsSortie ?? "",
        moyenPaiement: formData.moyenPaiement ?? "ESP",
        typeClient: formData.typeClient ?? "professionnel",
        clientId: formData.clientId ?? 0,
      };

      // Générer le label "Edit-(début du nom entreprise)"
      let label = "Edit-";
      if (nomEntreprise && nomEntreprise.trim()) {
        label += nomEntreprise.slice(0, 8).trim();
      } else {
        label += "Pesée";
      }

      const newTab: PeseeTab = {
        id: newTabId,
        label: label,
        formData: formattedFormData,
        isEditing: true,
      };

      setTabs((prevTabs) => {
        // Insérer au début de la liste
        const updatedTabs = [newTab, ...prevTabs];
        localStorage.setItem("pesee-tabs", JSON.stringify(updatedTabs));
        return updatedTabs;
      });
      setActiveTabIdWithSave(newTabId);
      return newTabId;
    },
    [setActiveTabIdWithSave]
  );

  const closeTab = (tabId: string) => {
    setTabs((prevTabs) => {
      // Trouver l'index de l'onglet à fermer dans la liste originale
      const tabIndexToClose = prevTabs.findIndex((tab) => tab.id === tabId);

      const updatedTabs = prevTabs.filter((tab) => tab.id !== tabId);

      let newActiveTabId: string | null = null;

      if (activeTabId === tabId) {
        // Si l'onglet fermé était actif, activer l'onglet précédent
        if (updatedTabs.length > 0) {
          if (tabIndexToClose > 0) {
            // Prendre l'onglet juste avant (index - 1 dans la liste originale)
            // Mais dans updatedTabs, l'index est décalé de -1 après le filtre
            newActiveTabId = updatedTabs[tabIndexToClose - 1].id;
          } else {
            // Si c'était le premier onglet, prendre le premier de la liste mise à jour
            newActiveTabId = updatedTabs[0].id;
          }
        }
      } else {
        // Si l'onglet fermé n'était pas actif, garder l'onglet actif actuel
        newActiveTabId = activeTabId;
      }

      setActiveTabId(newActiveTabId);

      // 💾 Sauvegarder dans localStorage
      localStorage.setItem("pesee-tabs", JSON.stringify(updatedTabs));
      if (newActiveTabId) {
        localStorage.setItem("pesee-active-tab", newActiveTabId);
      } else {
        localStorage.removeItem("pesee-active-tab");
      }

      return updatedTabs;
    });
  };

  const getCurrentTabData = (): PeseeTabFormData | undefined => {
    if (!activeTabId) return undefined;
    const currentTab = tabs.find((tab) => tab.id === activeTabId);
    return currentTab?.formData;
  };

  const getTabLabel = (tabId: string): string => {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return "Nouvelle Pesée";

    // Générer un nom parlant basé sur les données du formulaire
    const formData = tab.formData;
    let label = "";

    // Ajouter les 4 premiers caractères de la plaque si disponible
    if (formData.plaque && formData.plaque.trim()) {
      label += formData.plaque.slice(0, 4).toUpperCase();
    }

    // Ajouter un tiret si on a une plaque
    if (label) {
      label += "-";
    }

    // Ajouter 5 caractères du nom/société
    let nomAffiche = "";
    if (formData.nomEntreprise && formData.nomEntreprise.trim()) {
      // Entreprise/société
      nomAffiche = formData.nomEntreprise.slice(0, 5);
    } else if (formData.typeClient === "particulier") {
      // Pour les particuliers, utiliser "Part" comme indicateur
      nomAffiche = "Part";
    } else {
      // Si pas de nom et pas particulier, utiliser "Nouvelle" au lieu de "Nvlle"
      nomAffiche = "Nouv";
    }

    label += nomAffiche;

    // Si le label est vide ou trop court, utiliser un fallback
    if (!label || label === "-" || label.length < 2) {
      return `Pesée ${tabs.findIndex((t) => t.id === tabId) + 1}`;
    }

    return label;
  };

  return {
    tabs,
    activeTabId,
    setActiveTabId: setActiveTabIdWithSave,
    createNewTab,
    createTabFromFormData,
    createEditTab,
    closeTab,
    updateCurrentTab,
    getCurrentTabData,
    generateBonNumber,
    generateNextBLNumber,
    generateUniqueBLNumber,
    generateNextFANumber,
    generateUniqueFANumber,
    getMaxSequenceNumber,
    getTabLabel,
  };
};
