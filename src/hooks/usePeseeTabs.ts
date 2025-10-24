import { useState, useCallback, useEffect } from "react";
import { db } from "@/lib/database";

export interface PeseeTab {
  id: string;
  label: string;
  formData: PeseeTabFormData;
}

export interface PeseeTabFormData {
  numeroBon: string;
  nomEntreprise: string;
  plaque: string;
  chantier: string;
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
        numeroBon: "BL-INIT-TEMP", // Numéro temporaire pour l'initialisation
        nomEntreprise: "",
        plaque: "",
        chantier: "",
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

  // Effet pour initialiser le premier onglet avec le bon numéro BL
  useEffect(() => {
    const initializeFirstTab = async () => {
      if (tabs.length > 0) {
        const firstTab = tabs[0];
        // Vérifier si c'est un onglet avec numéro temporaire OU un numéro ancien (non BL)
        const isOldFormat = !firstTab.formData.numeroBon.startsWith("BL");
        if (firstTab.formData.numeroBon === "BL-INIT-TEMP" || isOldFormat) {
          try {
            const realBonNumber = await generateNextBLNumber();
            // Mettre à jour uniquement si le numéro est différent pour éviter des re-renders inutiles
            if (firstTab.formData.numeroBon !== realBonNumber) {
              updateCurrentTab({ numeroBon: realBonNumber });
            }
          } catch (error) {
            console.error(
              "Erreur lors de l'initialisation du numéro BL:",
              error
            );
            // En cas d'erreur, utiliser un numéro par défaut
            if (firstTab.formData.numeroBon !== "BL50000") {
              updateCurrentTab({ numeroBon: "BL50000" });
            }
          }
        }
      }
    };

    initializeFirstTab();
  }, []); // Exécuter seulement au montage

  const generateBonNumber = () => {
    // Génère un numéro temporaire pour l'interface
    // Le vrai numéro sera généré au moment de la sauvegarde
    return `BL-TEMP-${crypto.randomUUID().slice(0, 8)}`;
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

  const createNewTab = useCallback(async () => {
    const newTabId = crypto.randomUUID();
    // Générer le prochain numéro BL séquentiel immédiatement
    const newBonNumber = await generateNextBLNumber();
    const newTab: PeseeTab = {
      id: newTabId,
      label: `Pesée ${tabs.length + 1}`, // Label initial, sera mis à jour dynamiquement
      formData: {
        numeroBon: newBonNumber,
        nomEntreprise: "",
        plaque: "",
        chantier: "",
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
    }
  };

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
    getTabLabel,
  };
};
