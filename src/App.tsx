
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
import { setupAutoSync } from './utils/syncScheduler';
import { connectionManager } from './utils/connectionManager';

const App = () => {
  const [currentSpace, setCurrentSpace] = useState('pesee');

  useEffect(() => {
    // Initialize PWA and database
    initializeSampleData();

    // Initialize connection manager and sync scheduler
    setupAutoSync();

    // Register enhanced service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Enhanced SW registered: ', registration);
          
          // Écouter les messages du service worker
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data?.type === 'BACKGROUND_SYNC_AVAILABLE') {
              console.log('Background sync available');
            }
          });
          
          // Vérifier les mises à jour
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // Nouvelle version disponible
                  console.log('New app version available');
                }
              });
            }
          });
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    }

    // Enregistrer pour les notifications push si supporté
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }

    // Nettoyage à la fermeture
    return () => {
      connectionManager.destroy();
    };
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
