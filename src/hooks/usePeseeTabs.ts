import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";

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
  const [tabs, setTabs] = useState<PeseeTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const generateBonNumber = () => {
    const now = Date.now().toString(); // Timestamp actuel
    const random = Math.floor(Math.random() * 1000).toString(); // Nombre aléatoire à 3 chiffres
    return now + random;
  };
  const createNewTab = useCallback(() => {
    const newTabId = uuidv4();
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
    setTabs([...tabs, newTab]);
    setActiveTabId(newTabId);
  }, [tabs]);

  const closeTab = (tabId: string) => {
    const updatedTabs = tabs.filter((tab) => tab.id !== tabId);
    setTabs(updatedTabs);
    if (activeTabId === tabId) {
      setActiveTabId(updatedTabs.length > 0 ? updatedTabs[0].id : null);
    }
  };

  const updateCurrentTab = (newData: Partial<PeseeTabFormData>) => {
    setTabs((prevTabs) =>
      prevTabs.map((tab) =>
        tab.id === activeTabId ? { ...tab, formData: { ...tab.formData, ...newData } } : tab
      )
    );
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

  return {
    tabs,
    activeTabId,
    setActiveTabId,
    createNewTab,
    closeTab,
    updateCurrentTab,
    getCurrentTabData,
    generateBonNumber,
    getTabLabel,
  };
};
