/**
 * Service de restauration automatique des données
 * Détecte et restaure automatiquement les fichiers de sauvegarde
 */

import { fileBackup, BackupData } from "@/services/fileBackup";
import { db } from "@/lib/database";
import { useToast } from "@/hooks/use-toast";

export class AutoRestoreService {
  private static instance: AutoRestoreService;
  private isRestoring: boolean = false;

  public static getInstance(): AutoRestoreService {
    if (!AutoRestoreService.instance) {
      AutoRestoreService.instance = new AutoRestoreService();
    }
    return AutoRestoreService.instance;
  }

  /**
   * Vérifie s'il y a des fichiers de sauvegarde à restaurer automatiquement
   */
  async checkForAutoRestore(): Promise<boolean> {
    if (this.isRestoring) {
      console.log("🔄 Restauration déjà en cours...");
      return false;
    }

    try {
      // Vérifier si l'utilisateur a déjà des données
      const hasExistingData = await this.hasExistingData();

      if (hasExistingData) {
        console.log(
          "📊 Données existantes détectées, pas de restauration automatique"
        );
        return false;
      }

      // Chercher des fichiers de sauvegarde dans le dossier Downloads
      const backupFiles = await this.findBackupFiles();

      if (backupFiles.length === 0) {
        console.log("📁 Aucun fichier de sauvegarde trouvé");
        return false;
      }

      // Prendre le fichier le plus récent
      const latestBackup = backupFiles.sort(
        (a, b) => b.lastModified - a.lastModified
      )[0];

      console.log(`🔍 Fichier de sauvegarde trouvé: ${latestBackup.name}`);

      // Proposer la restauration automatique
      return await this.promptAutoRestore(latestBackup);
    } catch (error) {
      console.error("❌ Erreur lors de la vérification auto-restore:", error);
      return false;
    }
  }

  /**
   * Vérifie si l'utilisateur a déjà des données
   */
  async hasExistingData(): Promise<boolean> {
    try {
      const [clientsCount, productsCount, peseesCount] = await Promise.all([
        db.clients.count(),
        db.products.count(),
        db.pesees.count(),
      ]);

      return clientsCount > 0 || productsCount > 0 || peseesCount > 0;
    } catch (error) {
      console.error("❌ Erreur vérification données existantes:", error);
      return false;
    }
  }

  /**
   * Trouve les fichiers de sauvegarde dans le dossier Downloads
   */
  private async findBackupFiles(): Promise<File[]> {
    try {
      // Utiliser l'API File System Access si disponible
      if ("showOpenFilePicker" in window) {
        return await this.findBackupFilesWithFileSystemAPI();
      } else {
        // Fallback: chercher dans les fichiers récents du navigateur
        return await this.findBackupFilesFromCache();
      }
    } catch (error) {
      console.error("❌ Erreur recherche fichiers de sauvegarde:", error);
      return [];
    }
  }

  /**
   * Recherche avec File System Access API
   */
  private async findBackupFilesWithFileSystemAPI(): Promise<File[]> {
    try {
      // Ouvrir le dossier Downloads
      const dirHandle = await (window as any).showDirectoryPicker({
        startIn: "downloads",
      });

      const backupFiles: File[] = [];

      for await (const [name, handle] of dirHandle.entries()) {
        if (
          name.startsWith("verde-weigh-flow-backup") &&
          name.endsWith(".json")
        ) {
          const file = await handle.getFile();
          backupFiles.push(file);
        }
      }

      return backupFiles;
    } catch (error) {
      if ((error as any).name !== "AbortError") {
        console.error("❌ Erreur File System Access API:", error);
      }
      return [];
    }
  }

  /**
   * Recherche dans le cache du navigateur (fallback)
   */
  private async findBackupFilesFromCache(): Promise<File[]> {
    // Cette méthode est limitée par les restrictions de sécurité du navigateur
    // On ne peut pas accéder directement au système de fichiers
    console.log("⚠️ File System Access API non disponible, recherche limitée");
    return [];
  }

  /**
   * Propose la restauration automatique à l'utilisateur
   */
  private async promptAutoRestore(backupFile: File): Promise<boolean> {
    return new Promise((resolve) => {
      // Créer une notification ou un dialog pour proposer la restauration
      const shouldRestore = confirm(
        `🔍 Fichier de sauvegarde détecté: ${backupFile.name}\n\n` +
          `Voulez-vous restaurer automatiquement toutes vos données ?\n\n` +
          `✅ Cela va restaurer:\n` +
          `• Tous vos clients\n` +
          `• Tous vos produits\n` +
          `• Toutes vos pesées\n` +
          `• Tous vos paramètres\n\n` +
          `⚠️ Attention: Les données actuelles seront remplacées`
      );

      if (shouldRestore) {
        this.performAutoRestore(backupFile)
          .then(() => {
            resolve(true);
          })
          .catch(() => {
            resolve(false);
          });
      } else {
        resolve(false);
      }
    });
  }

  /**
   * Effectue la restauration automatique
   */
  private async performAutoRestore(backupFile: File): Promise<void> {
    this.isRestoring = true;

    try {
      console.log("🔄 Début de la restauration automatique...");

      // Utiliser le service de restauration existant
      await fileBackup.restoreFromFile(backupFile);

      console.log("✅ Restauration automatique terminée avec succès");

      // Afficher une notification de succès
      alert(
        "🎉 Restauration automatique réussie !\n\n" +
          "Toutes vos données ont été restaurées.\n" +
          "Vous pouvez maintenant utiliser l'application normalement."
      );
    } catch (error) {
      console.error("❌ Erreur lors de la restauration automatique:", error);

      alert(
        "❌ Erreur lors de la restauration automatique\n\n" +
          "Veuillez essayer de restaurer manuellement via:\n" +
          "Paramètres > Sauvegarde > Restaurer"
      );

      throw error;
    } finally {
      this.isRestoring = false;
    }
  }

  /**
   * Force la vérification d'auto-restore (pour tests)
   */
  async forceCheck(): Promise<boolean> {
    return await this.checkForAutoRestore();
  }

  /**
   * Vérifie si une restauration est en cours
   */
  isRestoreInProgress(): boolean {
    return this.isRestoring;
  }
}

// Instance globale
export const autoRestoreService = AutoRestoreService.getInstance();
