import { useState, useCallback, useEffect } from "react";
import { db } from "@/lib/database";

export interface PeseeTab {
  id: string;
  label: string;
  formData: PeseeTabFormData;
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
  moyenPaiement: "ESP" | "CB" | "CHQ" | "VIR" | "PRVT" | "Direct" | "En compte";
  typeClient: "particulier" | "professionnel" | "micro-entreprise";
  clientId: number;
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
        typeClient: "particulier",
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
  const generateUniqueBLNumber = async (): Promise<string> => {
    let numeroBon = await generateNextBLNumber();
    let attempts = 0;

    // Vérifier qu'aucune pesée n'existe déjà avec ce numéro
    while ((await db.pesees.where("numeroBon").equals(numeroBon).count()) > 0) {
      const num = parseInt(numeroBon.substring(2)) + 1;
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
  const generateUniqueFANumber = async (): Promise<string> => {
    let numeroFacture = await generateNextFANumber();
    let attempts = 0;

    // Vérifier qu'aucune pesée n'existe déjà avec ce numéro
    while (
      (await db.pesees.where("numeroFacture").equals(numeroFacture).count()) > 0
    ) {
      const num = parseInt(numeroFacture.substring(2)) + 1;
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

  const createNewTab = useCallback(async () => {
    const newTabId = crypto.randomUUID();
    // Plus de génération immédiate - le numéro sera généré à la validation
    const newTab: PeseeTab = {
      id: newTabId,
      label: `Pesée ${tabs.length + 1}`, // Label initial, sera mis à jour dynamiquement
      formData: {
        numeroBon: "À générer",
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
        typeClient: "particulier",
        clientId: 0,
      },
    };
    const newTabs = [...tabs, newTab];
    setTabs(newTabs);
    setActiveTabId(newTabId);
    // 💾 Sauvegarder dans localStorage
    localStorage.setItem("pesee-tabs", JSON.stringify(newTabs));
    localStorage.setItem("pesee-active-tab", newTabId);
  }, [tabs]);

  const closeTab = (tabId: string) => {
    const updatedTabs = tabs.filter((tab) => tab.id !== tabId);
    setTabs(updatedTabs);
    const newActiveTabId =
      activeTabId === tabId
        ? updatedTabs.length > 0
          ? updatedTabs[0].id
          : null
        : activeTabId;
    setActiveTabId(newActiveTabId);
    // 💾 Sauvegarder dans localStorage
    localStorage.setItem("pesee-tabs", JSON.stringify(updatedTabs));
    if (newActiveTabId) {
      localStorage.setItem("pesee-active-tab", newActiveTabId);
    } else {
      localStorage.removeItem("pesee-active-tab");
      // Ne pas créer automatiquement un nouvel onglet si l'utilisateur a fermé tous les onglets volontairement
    }
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
      nomAffiche = "Nvlle"; // Nouvelle pesée
    }

    label += nomAffiche;

    // Si le label est vide ou trop court, utiliser un fallback
    if (!label || label === "-" || label.length < 2) {
      return `Pesée ${tabs.findIndex((t) => t.id === tabId) + 1}`;
    }

    return label;
  };

  // Fonction pour changer l'onglet actif avec sauvegarde
  const setActiveTabIdWithSave = (tabId: string | null) => {
    setActiveTabId(tabId);
    if (tabId) {
      localStorage.setItem("pesee-active-tab", tabId);
    } else {
      localStorage.removeItem("pesee-active-tab");
    }
  };

  return {
    tabs,
    activeTabId,
    setActiveTabId: setActiveTabIdWithSave,
    createNewTab,
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
