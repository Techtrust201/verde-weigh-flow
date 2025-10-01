/**
 * Initialisation de la sauvegarde automatique
 * À appeler au démarrage de l'application
 */

import { fileBackup } from "@/services/fileBackup";
import { opfsBackup } from "@/services/OPFSBackupService";
import { backupManager } from "@/services/BackupManager";

export async function initializeAutoBackup(): Promise<void> {
  console.log("🔄 Initialisation de la sauvegarde automatique...");

  try {
    // Initialiser le gestionnaire de sauvegarde centralisé
    await backupManager.initialize();

    // Démarrer la sauvegarde automatique avec la méthode la plus appropriée
    backupManager.startAutoBackup(5); // 5 minutes par défaut

    // Restaurer les données si nécessaire
    await backupManager.restoreBackup();

    console.log("✅ Sauvegarde automatique initialisée via BackupManager");
  } catch (error) {
    console.error(
      "❌ Erreur lors de l'initialisation de la sauvegarde automatique:",
      error
    );

    // Fallback sur les méthodes individuelles si le BackupManager échoue
    try {
      console.log("⚠️ Tentative de fallback sur les services individuels...");

      // 1. Initialiser OPFS (prioritaire car plus fiable)
      try {
        await opfsBackup.initialize();

        // Vérifier si OPFS est disponible
        if (opfsBackup.isSupported()) {
          console.log("✅ OPFS disponible - Utilisation comme fallback");
          opfsBackup.startAutoBackup();
          return;
        }
      } catch (opfsError) {
        console.warn("⚠️ Erreur OPFS:", opfsError);
      }

      // 2. Fallback sur File System API
      try {
        await fileBackup.initialize();
        await fileBackup.initializeDefaultBackupFile();
        fileBackup.startAutoBackup();
        console.log("✅ Fallback sur File System API réussi");
        return;
      } catch (fsError) {
        console.warn("⚠️ Erreur File System API:", fsError);
      }

      // 3. Dernier recours: IndexedDB
      console.log("⚠️ Fallback sur IndexedDB...");
      await fileBackup.saveToIndexedDB();
      console.log("✅ Données sauvegardées dans IndexedDB");
    } catch (fallbackError) {
      console.error("❌ Erreur critique lors du fallback:", fallbackError);
    }
  }
}

// La sauvegarde automatique est maintenant initialisée depuis App.tsx
