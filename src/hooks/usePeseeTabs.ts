
import { useState, useEffect } from 'react';

export interface PeseeTab {
  id: string;
  label: string;
  formData: {
    numeroBon: string;
    moyenPaiement: 'Direct' | 'En compte';
    plaque: string;
    nomEntreprise: string;
    chantier: string;
    produitId: number;
    poidsEntree: string;
    poidsSortie: string;
    clientId: number;
    transporteurId: number;
    typeClient?: 'particulier' | 'professionnel' | 'micro-entreprise';
  };
}

export const usePeseeTabs = () => {
  const [tabs, setTabs] = useState<PeseeTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');

  const generateBonNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const time = now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0');
    return `${year}${month}${day}-${time}`;
  };

  const getDefaultPaymentMethod = (typeClient?: 'particulier' | 'professionnel' | 'micro-entreprise'): 'Direct' | 'En compte' => {
    return typeClient === 'professionnel' ? 'En compte' : 'Direct';
  };

  const createNewTab = () => {
    const newTabId = Date.now().toString();
    const newTab: PeseeTab = {
      id: newTabId,
      label: '', // Le label sera calculé dynamiquement
      formData: {
        numeroBon: generateBonNumber(),
        moyenPaiement: 'Direct',
        plaque: '',
        nomEntreprise: '',
        chantier: '',
        produitId: 0,
        poidsEntree: '',
        poidsSortie: '',
        clientId: 0,
        transporteurId: 0,
        typeClient: 'particulier'
      }
    };
    
    setTabs([...tabs, newTab]);
    setActiveTabId(newTabId);
  };

  const getTabLabel = (tabId: string) => {
    const index = tabs.findIndex(tab => tab.id === tabId);
    const tab = tabs[index];
    
    if (tab?.formData.nomEntreprise && tab?.formData.plaque) {
      return `${tab.formData.nomEntreprise.slice(0, 8)}... (${tab.formData.plaque})`;
    }
    
    return `Pesée ${index + 1}`;
  };

  const closeTab = (tabId: string) => {
    const newTabs = tabs.filter(tab => tab.id !== tabId);
    setTabs(newTabs);
    
    if (activeTabId === tabId) {
      if (newTabs.length > 0) {
        setActiveTabId(newTabs[0].id);
      } else {
        createNewTab();
      }
    }
  };

  const updateCurrentTab = (updates: Partial<PeseeTab['formData']>) => {
    setTabs(tabs.map(tab => {
      if (tab.id === activeTabId) {
        const newFormData = { ...tab.formData, ...updates };
        
        // Mettre à jour automatiquement le moyen de paiement selon le type de client
        if (updates.typeClient) {
          newFormData.moyenPaiement = getDefaultPaymentMethod(updates.typeClient);
        }
        
        return { ...tab, formData: newFormData };
      }
      return tab;
    }));
  };

  const getCurrentTabData = () => {
    return tabs.find(tab => tab.id === activeTabId)?.formData || tabs[0]?.formData;
  };

  const saveTabsToStorage = () => {
    localStorage.setItem('pesee-tabs', JSON.stringify({ tabs, activeTabId }));
  };

  const loadTabsFromStorage = () => {
    const stored = localStorage.getItem('pesee-tabs');
    if (stored) {
      const { tabs: storedTabs, activeTabId: storedActiveId } = JSON.parse(stored);
      if (storedTabs.length > 0) {
        setTabs(storedTabs);
        setActiveTabId(storedActiveId || storedTabs[0].id);
        return;
      }
    }
    createNewTab();
  };

  useEffect(() => {
    loadTabsFromStorage();
  }, []);

  useEffect(() => {
    saveTabsToStorage();
  }, [tabs, activeTabId]);

  return {
    tabs,
    activeTabId,
    setActiveTabId,
    createNewTab,
    closeTab,
    updateCurrentTab,
    getCurrentTabData,
    generateBonNumber,
    getTabLabel
  };
};
