
import { useState, useCallback } from "react";

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
  moyenPaiement: 'Direct' | 'En compte';
  typeClient: 'particulier' | 'professionnel' | 'micro-entreprise';
  clientId: number;
}

export const usePeseeTabs = () => {
  // 💾 Charger l'état depuis localStorage avec validation
  const [tabs, setTabs] = useState<PeseeTab[]>(() => {
    try {
      const savedTabs = localStorage.getItem('pesee-tabs');
      if (savedTabs) {
        const parsed = JSON.parse(savedTabs);
        // Validation : s'assurer que c'est un array
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (error) {
      console.warn('Erreur lors du chargement des onglets depuis localStorage:', error);
      // Nettoyer les données corrompues
      localStorage.removeItem('pesee-tabs');
      localStorage.removeItem('pesee-active-tab');
    }
    return [];
  });
  
  const [activeTabId, setActiveTabId] = useState<string | null>(() => {
    try {
      const savedActiveTab = localStorage.getItem('pesee-active-tab');
      // Vérifier que l'onglet actif existe dans les onglets chargés
      if (savedActiveTab && tabs.find(tab => tab.id === savedActiveTab)) {
        return savedActiveTab;
      }
    } catch (error) {
      console.warn('Erreur lors du chargement de l\'onglet actif:', error);
    }
    return null;
  });
  
  const generateBonNumber = () => {
    const now = Date.now().toString(); // Timestamp actuel
    const random = Math.floor(Math.random() * 1000).toString(); // Nombre aléatoire à 3 chiffres
    return now + random;
  };
  
  const createNewTab = useCallback(() => {
    const newTabId = crypto.randomUUID();
    const newBonNumber = generateBonNumber();
    const newTab: PeseeTab = {
      id: newTabId,
      label: `Pesée ${tabs.length + 1}`,
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
        moyenPaiement: "Direct",
        typeClient: "particulier",
        clientId: 0,
      },
    };
    const newTabs = [...tabs, newTab];
    setTabs(newTabs);
    setActiveTabId(newTabId);
    // 💾 Sauvegarder dans localStorage
    localStorage.setItem('pesee-tabs', JSON.stringify(newTabs));
    localStorage.setItem('pesee-active-tab', newTabId);
  }, [tabs]);

  const closeTab = (tabId: string) => {
    const updatedTabs = tabs.filter((tab) => tab.id !== tabId);
    setTabs(updatedTabs);
    const newActiveTabId = activeTabId === tabId ? 
      (updatedTabs.length > 0 ? updatedTabs[0].id : null) : activeTabId;
    setActiveTabId(newActiveTabId);
    // 💾 Sauvegarder dans localStorage
    localStorage.setItem('pesee-tabs', JSON.stringify(updatedTabs));
    if (newActiveTabId) {
      localStorage.setItem('pesee-active-tab', newActiveTabId);
    } else {
      localStorage.removeItem('pesee-active-tab');
    }
  };

  const updateCurrentTab = (newData: Partial<PeseeTabFormData>) => {
    setTabs((prevTabs) => {
      const updatedTabs = prevTabs.map((tab) =>
        tab.id === activeTabId ? { ...tab, formData: { ...tab.formData, ...newData } } : tab
      );
      // 💾 Sauvegarder dans localStorage
      localStorage.setItem('pesee-tabs', JSON.stringify(updatedTabs));
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
    return tab ? tab.label : "Nouvelle Pesée";
  };

  // Fonction pour changer l'onglet actif avec sauvegarde
  const setActiveTabIdWithSave = (tabId: string | null) => {
    setActiveTabId(tabId);
    if (tabId) {
      localStorage.setItem('pesee-active-tab', tabId);
    } else {
      localStorage.removeItem('pesee-active-tab');
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
    getTabLabel,
  };
};
