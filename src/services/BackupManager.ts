/**
 * Service centralisé de gestion des sauvegardes
 * Gère la coordination entre OPFS, File System API et IndexedDB
 */

import { fileBackup } from "./fileBackup";
import { opfsBackup } from "./OPFSBackupService";

export type BackupMethod = "opfs" | "file-system" | "indexeddb" | "download";

export interface BackupStatus {
  isOPFSAvailable: boolean;
  isFileSystemAvailable: boolean;
  activeMethod: BackupMethod;
  lastBackupTime: Date | null;
  lastBackupSize: string | null;
  hasBackupFile: boolean;
  backupFileName: string | null;
  autoBackupEnabled: boolean;
  autoBackupInterval: number;
}

export class BackupManager {
  private static instance: BackupManager;
  private activeMethod: BackupMethod = "indexeddb";
  private lastBackupTime: Date | null = null;
  private autoBackupEnabled: boolean = true;
  private autoBackupInterval: number = 5; // minutes

  private constructor() {
    // Singleton
  }

  public static getInstance(): BackupManager {
    if (!BackupManager.instance) {
      BackupManager.instance = new BackupManager();
    }
    return BackupManager.instance;
  }

  /**
   * Initialise les services de sauvegarde
   */
  async initialize(): Promise<void> {
    try {
      console.log("🔄 Initialisation du gestionnaire de sauvegarde...");

      // 1. Initialiser OPFS (prioritaire car plus fiable)
      try {
        await opfsBackup.initialize();
      } catch (opfsError) {
        console.warn("⚠️ Erreur lors de l'initialisation d'OPFS:", opfsError);
      }

      // 2. Initialiser le service File System API (fallback)
      try {
        await fileBackup.initialize();
      } catch (fileError) {
        console.warn(
          "⚠️ Erreur lors de l'initialisation du File System API:",
          fileError
        );
      }

      // Déterminer la méthode active
      this.determineActiveMethod();

      console.log(`✅ Méthode de sauvegarde active: ${this.activeMethod}`);
    } catch (error) {
      console.error(
        "❌ Erreur lors de l'initialisation du gestionnaire de sauvegarde:",
        error
      );
    }
  }

  /**
   * Détermine la méthode de sauvegarde active en fonction des disponibilités
   */
  private determineActiveMethod(): void {
    // Priorité 1: OPFS (le plus fiable)
    try {
      if (opfsBackup.isSupported && opfsBackup.isSupported()) {
        this.activeMethod = "opfs";
        return;
      }
    } catch (error) {
      console.warn("⚠️ Erreur lors de la vérification d'OPFS:", error);
    }

    // Priorité 2: File System API
    try {
      if (this.isFileSystemAPIAvailable()) {
        this.activeMethod = "file-system";
        return;
      }
    } catch (error) {
      console.warn(
        "⚠️ Erreur lors de la vérification du File System API:",
        error
      );
    }

    // Priorité 3: IndexedDB (toujours disponible)
    this.activeMethod = "indexeddb";
  }

  /**
   * Vérifie si File System API est disponible
   */
  isFileSystemAPIAvailable(): boolean {
    try {
      return (
        typeof window !== "undefined" &&
        "showOpenFilePicker" in window &&
        "showSaveFilePicker" in window
      );
    } catch (error) {
      console.warn(
        "⚠️ Erreur lors de la vérification du File System API:",
        error
      );
      return false;
    }
  }

  /**
   * Sauvegarde les données avec la méthode active
   */
  async saveBackup(): Promise<void> {
    try {
      console.log(`🔄 Sauvegarde avec la méthode: ${this.activeMethod}...`);

      switch (this.activeMethod) {
        case "opfs":
          try {
            await opfsBackup.saveToFile();
          } catch (error) {
            console.warn("⚠️ Erreur OPFS, fallback sur IndexedDB:", error);
            await fileBackup.saveToIndexedDB();
          }
          break;
        case "file-system":
          try {
            await fileBackup.saveToFile();
          } catch (error) {
            console.warn(
              "⚠️ Erreur File System API, fallback sur IndexedDB:",
              error
            );
            await fileBackup.saveToIndexedDB();
          }
          break;
        case "indexeddb":
          await fileBackup.saveToIndexedDB();
          break;
        case "download":
          // Fallback sur téléchargement
          try {
            await this.exportToDownload();
          } catch (error) {
            console.warn(
              "⚠️ Erreur téléchargement, fallback sur IndexedDB:",
              error
            );
            await fileBackup.saveToIndexedDB();
          }
          break;
      }

      this.lastBackupTime = new Date();
      console.log("✅ Sauvegarde réussie");
    } catch (error) {
      console.error("❌ Erreur lors de la sauvegarde:", error);

      // Dernier recours: essayer IndexedDB
      try {
        console.log("🔄 Tentative de sauvegarde de secours dans IndexedDB...");
        await fileBackup.saveToIndexedDB();
        console.log("✅ Sauvegarde de secours réussie");
      } catch (fallbackError) {
        console.error("❌ Échec total de la sauvegarde:", fallbackError);
        throw error;
      }
    }
  }

  /**
   * Restaure les données depuis la source disponible
   */
  async restoreBackup(): Promise<boolean> {
    try {
      console.log(`🔄 Restauration avec la méthode: ${this.activeMethod}...`);

      let success = false;

      switch (this.activeMethod) {
        case "opfs":
          try {
            const result = await opfsBackup.restoreFromFile();
            success = Boolean(result);
          } catch (error) {
            console.warn("⚠️ Erreur OPFS, fallback sur IndexedDB:", error);
            const result = await fileBackup.restoreFromIndexedDB();
            success = Boolean(result);
          }
          break;
        case "file-system":
          try {
            const result = await fileBackup.restoreFromIndexedDB();
            success = Boolean(result);
          } catch (error) {
            console.warn(
              "⚠️ Erreur File System API, fallback sur IndexedDB:",
              error
            );
            const result = await fileBackup.restoreFromIndexedDB();
            success = Boolean(result);
          }
          break;
        case "indexeddb":
          {
            const result = await fileBackup.restoreFromIndexedDB();
            success = Boolean(result);
          }
          break;
      }

      if (success) {
        console.log("✅ Restauration réussie");
      } else {
        console.warn("⚠️ Aucune donnée à restaurer");
      }

      return success;
    } catch (error) {
      console.error("❌ Erreur lors de la restauration:", error);
      return false;
    }
  }

  /**
   * Importe les données depuis un fichier
   */
  async importFromFile(file: File): Promise<void> {
    try {
      console.log("📥 Import depuis un fichier...");

      if (opfsBackup.isSupported && opfsBackup.isSupported()) {
        try {
          await opfsBackup.importFromFile(file);
        } catch (error) {
          console.warn("⚠️ Erreur OPFS, fallback sur File System API:", error);
          await fileBackup.restoreFromFile(file);
        }
      } else {
        await fileBackup.restoreFromFile(file);
      }

      console.log("✅ Import réussi");
    } catch (error) {
      console.error("❌ Erreur lors de l'import:", error);
      throw error;
    }
  }

  /**
   * Exporte les données vers un fichier téléchargeable
   */
  async exportToDownload(): Promise<void> {
    try {
      console.log("📤 Export vers un fichier téléchargeable...");

      // Préparer les données pour l'export
      const { db } = await import("@/lib/database");

      // Récupérer toutes les données
      const userSettings = await db.userSettings.toArray();
      const clients = await db.clients.toArray();
      const products = await db.products.toArray();
      const pesees = await db.pesees.toArray();
      const transporteurs = await db.transporteurs.toArray();
      const sageTemplates = await db.sageTemplates.toArray();

      // Créer l'objet de sauvegarde
      const backupData = {
        version: "2.0",
        timestamp: Date.now(),
        userSettings,
        clients,
        products,
        pesees,
        transporteurs,
        sageTemplates,
        metadata: {
          backupDate: new Date().toISOString(),
          backupSize: "0 KB",
          backupType: "download",
        },
      };

      // Convertir en JSON
      const jsonString = JSON.stringify(backupData, null, 2);

      // Créer le blob et télécharger
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "verde-weigh-flow-backup.json";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Enregistrer le moment du téléchargement
      localStorage.setItem("lastBackupDownload", Date.now().toString());

      console.log("✅ Export réussi");
    } catch (error) {
      console.error("❌ Erreur lors de l'export:", error);
      throw error;
    }
  }

  /**
   * Démarre la sauvegarde automatique
   */
  startAutoBackup(intervalMinutes: number = 5): void {
    this.autoBackupEnabled = true;
    this.autoBackupInterval = intervalMinutes;

    try {
      if (opfsBackup.isSupported && opfsBackup.isSupported()) {
        opfsBackup.startAutoBackup(intervalMinutes);
      } else {
        fileBackup.startAutoBackup(intervalMinutes);
      }
    } catch (error) {
      console.warn("⚠️ Erreur lors du démarrage de la sauvegarde auto:", error);
      // Fallback: démarrer la sauvegarde auto avec fileBackup
      try {
        fileBackup.startAutoBackup(intervalMinutes);
      } catch (fallbackError) {
        console.error(
          "❌ Impossible de démarrer la sauvegarde auto:",
          fallbackError
        );
      }
    }

    console.log(
      `✅ Sauvegarde automatique démarrée (intervalle: ${intervalMinutes} minutes)`
    );
  }

  /**
   * Arrête la sauvegarde automatique
   */
  stopAutoBackup(): void {
    this.autoBackupEnabled = false;

    try {
      if (opfsBackup.isSupported && opfsBackup.isSupported()) {
        opfsBackup.stopAutoBackup();
      } else {
        fileBackup.stopAutoBackup();
      }
    } catch (error) {
      console.warn("⚠️ Erreur lors de l'arrêt de la sauvegarde auto:", error);
      // Fallback: arrêter la sauvegarde auto avec fileBackup
      try {
        fileBackup.stopAutoBackup();
      } catch (fallbackError) {
        console.error(
          "❌ Impossible d'arrêter la sauvegarde auto:",
          fallbackError
        );
      }
    }

    console.log("⏹️ Sauvegarde automatique arrêtée");
  }

  /**
   * Obtient le statut actuel de la sauvegarde
   */
  async getBackupStatus(): Promise<BackupStatus> {
    let isOPFSAvailable = false;
    let isFileSystemAvailable = false;

    try {
      isOPFSAvailable = opfsBackup.isSupported && opfsBackup.isSupported();
    } catch (error) {
      console.warn("⚠️ Erreur lors de la vérification d'OPFS:", error);
    }

    try {
      isFileSystemAvailable = this.isFileSystemAPIAvailable();
    } catch (error) {
      console.warn(
        "⚠️ Erreur lors de la vérification du File System API:",
        error
      );
    }

    let backupFileName = null;
    let hasBackupFile = false;

    try {
      if (this.activeMethod === "opfs") {
        // Pour OPFS, on vérifie si un fichier existe
        if (
          opfsBackup.hasBackupFile &&
          typeof opfsBackup.hasBackupFile === "function"
        ) {
          hasBackupFile = Boolean(await opfsBackup.hasBackupFile());
          backupFileName = "verde-weigh-flow-backup.json (OPFS)";
        }
      } else if (this.activeMethod === "file-system") {
        // Pour File System API, on récupère le nom du fichier
        hasBackupFile = Boolean(fileBackup.hasBackupFile());
        backupFileName = fileBackup.getCurrentFileName();
      }
    } catch (error) {
      console.warn(
        "⚠️ Erreur lors de la récupération du statut du fichier:",
        error
      );
    }

    return {
      isOPFSAvailable,
      isFileSystemAvailable,
      activeMethod: this.activeMethod,
      lastBackupTime: this.lastBackupTime,
      lastBackupSize: null, // À implémenter si nécessaire
      hasBackupFile,
      backupFileName,
      autoBackupEnabled: this.autoBackupEnabled,
      autoBackupInterval: this.autoBackupInterval,
    };
  }
}

export const backupManager = BackupManager.getInstance();
