import React from "react";
import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "./components/Layout";
import ClientsSpace from "./components/spaces/ClientsSpace";
import ProductsSpace from "./components/spaces/ProductsSpace";
import PeseeSpace from "./components/spaces/PeseeSpace";
import TransporteursSpace from "./components/spaces/TransporteursSpace";
import HistoriqueSpace from "./components/spaces/HistoriqueSpace";
import ExportsSpace from "./components/exports/ExportsSpace";
import UtilisateurSpace from "./components/spaces/UtilisateurSpace";
import ComptabiliteSpace from "./components/spaces/ComptabiliteSpace";
import { initializeSampleData, checkDataIntegrity } from "./lib/database";
import { setupAutoSync } from "./utils/syncScheduler";
import { connectionManager } from "./utils/connectionManager";
import { migrateExistingPesees } from "./utils/migrations/addDocumentType";
import "./utils/backgroundSyncTrackDechet"; // Démarrage automatique de la sync Track Déchet

const App = () => {
  const [currentSpace, setCurrentSpace] = useState("pesee");
  const [pendingEdit, setPendingEdit] = useState<{
    id: number;
    nonce: number;
  } | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      // Initialize PWA and database
      await initializeSampleData();

      // Migration des pesées existantes pour ajouter typeDocument
      await migrateExistingPesees();

      // Vérifier périodiquement l'intégrité des données (toutes les 5 minutes)
      const dataIntegrityCheck = setInterval(() => {
        checkDataIntegrity();
      }, 5 * 60 * 1000);

      // Initialize connection manager and sync scheduler
      // Temporairement désactivé pour éviter les boucles infinies
      // setupAutoSync();

      return () => {
        clearInterval(dataIntegrityCheck);
      };
    };

    initializeApp();

    // Register enhanced service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Enhanced SW registered: ", registration);

          // Écouter les messages du service worker
          navigator.serviceWorker.addEventListener("message", (event) => {
            if (event.data?.type === "BACKGROUND_SYNC_AVAILABLE") {
              console.log("Background sync available");
            }
          });

          // Vérifier les mises à jour
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (
                  newWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  // Nouvelle version disponible
                  console.log("New app version available");
                }
              });
            }
          });
        })
        .catch((registrationError) => {
          console.log("SW registration failed: ", registrationError);
        });
    }

    // Enregistrer pour les notifications push si supporté
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        console.log("Notification permission:", permission);
      });
    }

    // Nettoyage à la fermeture
    return () => {
      connectionManager.destroy();
    };
  }, []);

  const handleEditPeseeRequest = (peseeId: number) => {
    setPendingEdit({ id: peseeId, nonce: Date.now() });
    setCurrentSpace("pesee");
  };

  const handleEditHandled = () => {
    setPendingEdit(null);
  };

  const renderCurrentSpace = () => {
    switch (currentSpace) {
      case "clients":
        return <ClientsSpace />;
      case "produits":
        return <ProductsSpace />;
      case "pesee":
        return (
          <PeseeSpace
            editingRequest={pendingEdit}
            onEditHandled={handleEditHandled}
          />
        );
      case "transporteurs":
        return <TransporteursSpace />;
      case "historique":
        return <HistoriqueSpace onEditPesee={handleEditPeseeRequest} />;
      case "exports":
        return <ExportsSpace />;
      case "utilisateur":
        return <UtilisateurSpace />;
      case "comptabilite":
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
