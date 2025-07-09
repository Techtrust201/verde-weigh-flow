
import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from './components/Layout';
import ClientsSpace from './components/spaces/ClientsSpace';
import ProductsSpace from './components/spaces/ProductsSpace';
import PeseeSpace from './components/spaces/PeseeSpace';
import TransporteursSpace from './components/spaces/TransporteursSpace';
import HistoriqueSpace from './components/spaces/HistoriqueSpace';
import UtilisateurSpace from './components/spaces/UtilisateurSpace';
import ComptabiliteSpace from './components/spaces/ComptabiliteSpace';
import { initializeSampleData } from './lib/database';

const App = () => {
  const [currentSpace, setCurrentSpace] = useState('pesee');

  useEffect(() => {
    // Initialize PWA and database
    initializeSampleData();

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    }
  }, []);

  const renderCurrentSpace = () => {
    switch (currentSpace) {
      case 'clients':
        return <ClientsSpace />;
      case 'produits':
        return <ProductsSpace />;
      case 'pesee':
        return <PeseeSpace />;
      case 'transporteurs':
        return <TransporteursSpace />;
      case 'historique':
        return <HistoriqueSpace />;
      case 'utilisateur':
        return <UtilisateurSpace />;
      case 'comptabilite':
        return <ComptabiliteSpace />;
      default:
        return <PeseeSpace />;
    }
  };

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Layout currentSpace={currentSpace} onSpaceChange={setCurrentSpace}>
        {renderCurrentSpace()}
      </Layout>
    </TooltipProvider>
  );
};

export default App;
