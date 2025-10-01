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
import { initializeAutoBackup } from "./utils/autoBackup";
import { autoRestoreService } from "./services/autoRestoreService";
import { BackupDetectionModal } from "./components/BackupDetectionModal";
import { fileDetector } from "./services/FileDetectorService";
import { backupManager } from "./services/BackupManager";
import "./utils/testBackupPersistence"; // Charger les scripts de test

const App = () => {
  const [currentSpace, setCurrentSpace] = useState("pesee");
  const [isFirstStartup, setIsFirstStartup] = useState(false);
  const [backupDetectionComplete, setBackupDetectionComplete] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      // Vérifier si c'est le premier démarrage
      const isFirst = !localStorage.getItem("app-initialized");
      setIsFirstStartup(isFirst);

      // Initialize PWA and database
      await initializeSampleData();

      // Vérifier périodiquement l'intégrité des données (toutes les 5 minutes)
      const dataIntegrityCheck = setInterval(() => {
        checkDataIntegrity();
      }, 5 * 60 * 1000);

      // Initialize automatic file backup
      await initializeAutoBackup();

      // Initialiser le gestionnaire de sauvegarde centralisé
      try {
        await backupManager.initialize();
        console.log("✅ BackupManager initialisé");
      } catch (error) {
        console.warn(
          "⚠️ Erreur lors de l'initialisation du BackupManager:",
          error
        );
      }

      // Détecter automatiquement le fichier de sauvegarde
      if (isFirst) {
        try {
          // Vérifier si le fichier existe déjà dans OPFS
          const status = await backupManager.getBackupStatus();
          if (status.hasBackupFile) {
            console.log(
              "✅ Fichier de sauvegarde déjà configuré:",
              status.backupFileName
            );
          } else {
            // Tenter de détecter un fichier existant
            const file = await fileDetector.detectBackupFile();
            if (file) {
              console.log("✅ Fichier de sauvegarde détecté:", file.name);
            }
          }
        } catch (error) {
          console.warn("⚠️ Erreur lors de la détection du fichier:", error);
        }
      } else {
        setBackupDetectionComplete(true);
      }

      // Check for auto-restore (délai pour laisser l'app se charger)
      setTimeout(async () => {
        try {
          await autoRestoreService.checkForAutoRestore();
        } catch (error) {
          console.warn("Auto-restore check failed:", error);
        }
      }, 2000); // 2 secondes après le chargement

      return () => {
        clearInterval(dataIntegrityCheck);
      };
    };

    initializeApp();

    // Register enhanced service worker
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("/sw.js").then(
          function (registration) {
            console.log(
              "ServiceWorker registration successful with scope: ",
              registration.scope
            );
          },
          function (err) {
            console.log("ServiceWorker registration failed: ", err);
          }
        );
      });
    }
  }, []);

  const handleBackupDetectionComplete = () => {
    setBackupDetectionComplete(true);
    localStorage.setItem("app-initialized", "true");
  };

  const renderSpace = () => {
    switch (currentSpace) {
      case "clients":
        return <ClientsSpace />;
      case "products":
        return <ProductsSpace />;
      case "pesee":
        return <PeseeSpace />;
      case "transporteurs":
        return <TransporteursSpace />;
      case "historique":
        return <HistoriqueSpace />;
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
      <Layout currentSpace={currentSpace} setCurrentSpace={setCurrentSpace}>
        {renderSpace()}
      </Layout>
      <Toaster />
      <Sonner />

      {/* Modal de détection de fichier au premier démarrage */}
      {isFirstStartup && !backupDetectionComplete && (
        <BackupDetectionModal onComplete={handleBackupDetectionComplete} />
      )}
    </TooltipProvider>
  );
};

export default App;
