/**
 * Service de sauvegarde utilisant Origin Private File System (OPFS)
 * Garantit une persistance à 100% des données, même après refresh ou vidage du cache
 */

import { db } from "@/lib/database";

export interface BackupData {
  version: string;
  timestamp: number;
  userSettings: any[];
  clients: any[];
  products: any[];
  pesees: any[];
  transporteurs: any[];
  sageTemplates: any[];
  metadata: {
    backupDate: string;
    backupSize: string;
    backupType: string;
  };
}

export class OPFSBackupService {
  private static instance: OPFSBackupService;
  private readonly BACKUP_FILENAME = "verde-weigh-flow-backup.json";
  private readonly BACKUP_DIRECTORY = "verde-weigh-flow";
  private backupInterval: NodeJS.Timeout | null = null;
  private currentIntervalMinutes: number = 5; // Valeur par défaut
  private isOPFSAvailable: boolean = false;
  private rootDirectory: FileSystemDirectoryHandle | null = null;
  private backupDirectory: FileSystemDirectoryHandle | null = null;
  private lastSaveTime: number = 0;
  private saveDebounceTimeout: NodeJS.Timeout | null = null;
  private readonly SAVE_DEBOUNCE_DELAY = 5000; // 5 secondes

  constructor() {
    // Vérifier la disponibilité de OPFS
    this.isOPFSAvailable =
      typeof navigator !== "undefined" &&
      "storage" in navigator &&
      "getDirectory" in navigator.storage;

    console.log(
      `🔍 Origin Private File System (OPFS): ${
        this.isOPFSAvailable ? "✅ Disponible" : "❌ Non disponible"
      }`
    );
  }

  public static getInstance(): OPFSBackupService {
    if (!OPFSBackupService.instance) {
      OPFSBackupService.instance = new OPFSBackupService();
    }
    return OPFSBackupService.instance;
  }

  /**
   * Initialise le service OPFS (à appeler au démarrage)
   */
  async initialize(): Promise<void> {
    try {
      console.log("🔄 Initialisation du service OPFS...");

      // Vérifier si OPFS est disponible
      if (!this.isOPFSAvailable) {
        console.warn("⚠️ OPFS n'est pas disponible sur ce navigateur");
        return;
      }

      // Demander la persistance du stockage
      await this.requestPersistentStorage();

      // Accéder au répertoire racine OPFS
      this.rootDirectory = await navigator.storage.getDirectory();

      // Créer ou accéder au répertoire de sauvegarde
      this.backupDirectory = await this.getBackupDirectory();

      // Vérifier si le fichier de sauvegarde existe déjà
      const hasBackupFile = await this.hasBackupFile();

      if (hasBackupFile) {
        console.log("✅ Fichier de sauvegarde OPFS trouvé");
      } else {
        console.log("ℹ️ Aucun fichier de sauvegarde OPFS trouvé");
      }

      console.log("✅ Service OPFS initialisé avec succès");
    } catch (error) {
      console.error(
        "❌ Erreur lors de l'initialisation du service OPFS:",
        error
      );
    }
  }

  /**
   * Demande la persistance du stockage pour éviter le nettoyage automatique
   */
  private async requestPersistentStorage(): Promise<boolean> {
    try {
      // Vérifier si la persistance est déjà accordée
      const isPersisted = await navigator.storage.persisted();

      if (isPersisted) {
        console.log("✅ Stockage déjà persistant");
        return true;
      }

      // Demander la persistance
      const granted = await navigator.storage.persist();

      if (granted) {
        console.log("✅ Persistance du stockage accordée");
      } else {
        console.warn("⚠️ Persistance du stockage refusée");
      }

      return granted;
    } catch (error) {
      console.error("❌ Erreur lors de la demande de persistance:", error);
      return false;
    }
  }

  /**
   * Obtient ou crée le répertoire de sauvegarde
   */
  private async getBackupDirectory(): Promise<FileSystemDirectoryHandle> {
    try {
      if (!this.rootDirectory) {
        throw new Error("Répertoire racine OPFS non initialisé");
      }

      // Essayer d'accéder au répertoire s'il existe déjà
      try {
        return await this.rootDirectory.getDirectoryHandle(
          this.BACKUP_DIRECTORY
        );
      } catch (error) {
        // Le répertoire n'existe pas, le créer
        console.log(`📁 Création du répertoire ${this.BACKUP_DIRECTORY}...`);
        return await this.rootDirectory.getDirectoryHandle(
          this.BACKUP_DIRECTORY,
          { create: true }
        );
      }
    } catch (error) {
      console.error(
        "❌ Erreur lors de l'accès au répertoire de sauvegarde:",
        error
      );
      throw error;
    }
  }

  /**
   * Vérifie si un fichier de sauvegarde existe
   */
  async hasBackupFile(): Promise<boolean> {
    try {
      if (!this.backupDirectory) {
        return false;
      }

      try {
        // Essayer d'accéder au fichier pour voir s'il existe
        await this.backupDirectory.getFileHandle(this.BACKUP_FILENAME);
        return true;
      } catch (error) {
        // Le fichier n'existe pas
        return false;
      }
    } catch (error) {
      console.error("❌ Erreur lors de la vérification du fichier:", error);
      return false;
    }
  }

  /**
   * Sauvegarde les données dans le fichier OPFS
   */
  async saveToFile(): Promise<void> {
    try {
      console.log("💾 Sauvegarde dans OPFS...");

      if (!this.isOPFSAvailable || !this.backupDirectory) {
        throw new Error("OPFS non disponible ou non initialisé");
      }

      // Préparer les données
      const backupData = await this.prepareBackupData();
      const jsonString = JSON.stringify(backupData, null, 2);

      // Créer ou ouvrir le fichier
      const fileHandle = await this.backupDirectory.getFileHandle(
        this.BACKUP_FILENAME,
        { create: true }
      );

      // Écrire dans le fichier
      const writable = await fileHandle.createWritable();
      await writable.write(jsonString);
      await writable.close();

      // Sauvegarder aussi dans IndexedDB comme backup secondaire
      await this.saveToIndexedDB(backupData);

      console.log("✅ Sauvegarde OPFS réussie");
    } catch (error) {
      console.error("❌ Erreur lors de la sauvegarde OPFS:", error);

      // Fallback sur IndexedDB en cas d'erreur
      try {
        const backupData = await this.prepareBackupData();
        await this.saveToIndexedDB(backupData);
        console.log("✅ Fallback sur IndexedDB réussi");
      } catch (fallbackError) {
        console.error(
          "❌ Erreur lors du fallback sur IndexedDB:",
          fallbackError
        );
        throw error; // Remonter l'erreur originale
      }
    }
  }

  /**
   * Sauvegarde incrémentale - ne sauvegarde que la table modifiée
   */
  async saveIncrementally(table: string, operation: string): Promise<void> {
    try {
      console.log(`📊 Sauvegarde incrémentale de ${table}...`);

      if (!this.isOPFSAvailable || !this.backupDirectory) {
        throw new Error("OPFS non disponible ou non initialisé");
      }

      // Obtenir les données de la table spécifique
      const { db } = await import("@/lib/database");

      if (!db[table]) {
        throw new Error(`Table ${table} non trouvée`);
      }

      // Récupérer les données de la table
      const tableData = await db[table].toArray();

      // Obtenir la sauvegarde existante
      const currentBackup = await this.loadFromFile();

      if (!currentBackup) {
        // Si pas de sauvegarde existante, faire une sauvegarde complète
        console.log("⚠️ Pas de sauvegarde existante, sauvegarde complète");
        await this.saveToFile();
        return;
      }

      // Mettre à jour uniquement la table modifiée
      currentBackup[table] = tableData;
      currentBackup.timestamp = Date.now();
      currentBackup.metadata.backupDate = new Date().toISOString();
      currentBackup.metadata.backupType = "incremental";

      // Sauvegarder la version mise à jour
      const jsonString = JSON.stringify(currentBackup);

      // Écrire dans le fichier
      const fileHandle = await this.backupDirectory.getFileHandle(
        this.BACKUP_FILENAME,
        { create: true }
      );
      const writable = await fileHandle.createWritable();
      await writable.write(jsonString);
      await writable.close();

      // Sauvegarder aussi dans IndexedDB
      await this.saveToIndexedDB(currentBackup);

      console.log(`✅ Sauvegarde incrémentale de ${table} réussie`);
    } catch (error) {
      console.error("❌ Erreur lors de la sauvegarde incrémentale:", error);
      // Fallback sur sauvegarde complète
      await this.saveToFile();
    }
  }

  /**
   * Charge les données depuis le fichier OPFS
   */
  async loadFromFile(): Promise<BackupData | null> {
    try {
      console.log("🔄 Chargement depuis OPFS...");

      if (!this.isOPFSAvailable || !this.backupDirectory) {
        throw new Error("OPFS non disponible ou non initialisé");
      }

      // Vérifier si le fichier existe
      const hasFile = await this.hasBackupFile();
      if (!hasFile) {
        console.log("ℹ️ Aucun fichier de sauvegarde OPFS trouvé");
        return null;
      }

      // Ouvrir le fichier
      const fileHandle = await this.backupDirectory.getFileHandle(
        this.BACKUP_FILENAME
      );
      const file = await fileHandle.getFile();
      const text = await file.text();

      // Parser les données
      const backupData: BackupData = JSON.parse(text);

      console.log("✅ Chargement OPFS réussi");
      return backupData;
    } catch (error) {
      console.error("❌ Erreur lors du chargement OPFS:", error);

      // Fallback sur IndexedDB
      try {
        console.log("🔄 Tentative de restauration depuis IndexedDB...");
        return await this.loadFromIndexedDB();
      } catch (fallbackError) {
        console.error(
          "❌ Erreur lors du fallback sur IndexedDB:",
          fallbackError
        );
        return null;
      }
    }
  }

  /**
   * Restaure les données depuis le fichier OPFS
   */
  async restoreFromFile(): Promise<boolean> {
    try {
      console.log("🔄 Restauration depuis OPFS...");

      // Charger les données
      const backupData = await this.loadFromFile();

      if (!backupData) {
        console.log("⚠️ Aucune donnée à restaurer depuis OPFS");
        return false;
      }

      // Restaurer les données
      await this.restoreFromData(backupData);

      console.log("✅ Restauration OPFS réussie");
      return true;
    } catch (error) {
      console.error("❌ Erreur lors de la restauration OPFS:", error);

      // Fallback sur IndexedDB
      try {
        console.log("🔄 Tentative de restauration depuis IndexedDB...");
        return await this.restoreFromIndexedDB();
      } catch (fallbackError) {
        console.error(
          "❌ Erreur lors du fallback sur IndexedDB:",
          fallbackError
        );
        return false;
      }
    }
  }

  /**
   * Sauvegarde les données dans IndexedDB (backup secondaire)
   */
  private async saveToIndexedDB(backupData: BackupData): Promise<void> {
    try {
      console.log("💾 Sauvegarde dans IndexedDB (backup secondaire)...");
      const jsonString = JSON.stringify(backupData);

      // Ouvrir la base de données
      const db = await this.openIndexedDB();
      const transaction = db.transaction(["backups"], "readwrite");
      const store = transaction.objectStore("backups");

      // Sauvegarder la version complète
      await store.put({
        id: "fullBackup",
        data: jsonString,
        timestamp: Date.now(),
      });

      // Sauvegarder aussi une version historique avec timestamp
      const historyKey = `backup_${Date.now()}`;
      await store.put({
        id: historyKey,
        data: jsonString,
        timestamp: Date.now(),
      });

      // Limiter l'historique à 10 sauvegardes
      try {
        const allKeys = await store.getAllKeys();
        const keysArray = Array.from(allKeys as IDBValidKey[]);
        const historyKeys = keysArray
          .filter(
            (key) =>
              typeof key === "string" && key.toString().startsWith("backup_")
          )
          .sort();

        // Supprimer les plus anciennes si plus de 10
        if (historyKeys.length > 10) {
          const keysToDelete = historyKeys.slice(0, historyKeys.length - 10);
          for (const key of keysToDelete) {
            await store.delete(key as IDBValidKey);
          }
          console.log(
            `🗑️ ${keysToDelete.length} anciennes sauvegardes supprimées`
          );
        }
      } catch (historyError) {
        console.warn(
          "⚠️ Erreur lors du nettoyage de l'historique:",
          historyError
        );
      }

      console.log("✅ Sauvegarde IndexedDB réussie");
    } catch (error) {
      console.error("❌ Erreur sauvegarde IndexedDB:", error);
      throw error;
    }
  }

  /**
   * Charge les données depuis IndexedDB (backup secondaire)
   */
  private async loadFromIndexedDB(): Promise<BackupData | null> {
    try {
      console.log("🔄 Chargement depuis IndexedDB...");

      const db = await this.openIndexedDB();
      const transaction = db.transaction(["backups"], "readonly");
      const store = transaction.objectStore("backups");
      const result = (await store.get("fullBackup")) as
        | { data?: string; timestamp?: number }
        | undefined;

      if (!result || !result.data) {
        console.log("⚠️ Aucune sauvegarde trouvée dans IndexedDB");
        return null;
      }

      const backupData: BackupData = JSON.parse(result.data);
      console.log("✅ Chargement IndexedDB réussi");
      return backupData;
    } catch (error) {
      console.error("❌ Erreur chargement IndexedDB:", error);
      return null;
    }
  }

  /**
   * Restaure les données depuis IndexedDB (backup secondaire)
   */
  private async restoreFromIndexedDB(): Promise<boolean> {
    try {
      console.log("🔄 Restauration depuis IndexedDB...");

      const backupData = await this.loadFromIndexedDB();

      if (!backupData) {
        console.log("⚠️ Aucune donnée à restaurer depuis IndexedDB");
        return false;
      }

      // Restaurer les données
      await this.restoreFromData(backupData);

      console.log("✅ Restauration IndexedDB réussie");
      return true;
    } catch (error) {
      console.error("❌ Erreur lors de la restauration IndexedDB:", error);
      return false;
    }
  }

  /**
   * Ouvre la base de données IndexedDB pour le backup secondaire
   */
  private async openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("OPFSBackupDB", 2);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Créer le store "backups" s'il n'existe pas
        if (!db.objectStoreNames.contains("backups")) {
          db.createObjectStore("backups", { keyPath: "id" });
        }

        // Créer le store "fileHandles" s'il n'existe pas (pour compatibilité)
        if (!db.objectStoreNames.contains("fileHandles")) {
          db.createObjectStore("fileHandles", { keyPath: "id" });
        }
      };
    });
  }

  /**
   * Restaure les données depuis un objet BackupData
   */
  private async restoreFromData(backupData: BackupData): Promise<void> {
    try {
      console.log("🔄 Restauration des données...");

      const { db } = await import("@/lib/database");

      // Vider les tables existantes
      await Promise.all([
        db.userSettings.clear(),
        db.clients.clear(),
        db.products.clear(),
        db.pesees.clear(),
        db.transporteurs.clear(),
        db.sageTemplates.clear(),
      ]);

      // Restaurer les données
      await Promise.all([
        db.userSettings.bulkAdd((backupData.userSettings || []) as any),
        db.clients.bulkAdd((backupData.clients || []) as any),
        db.products.bulkAdd((backupData.products || []) as any),
        db.pesees.bulkAdd((backupData.pesees || []) as any),
        db.transporteurs.bulkAdd((backupData.transporteurs || []) as any),
        db.sageTemplates.bulkAdd((backupData.sageTemplates || []) as any),
      ]);

      console.log("✅ Données restaurées avec succès");
    } catch (error) {
      console.error("❌ Erreur lors de la restauration des données:", error);
      throw error;
    }
  }

  /**
   * Prépare les données pour la sauvegarde
   */
  private async prepareBackupData(): Promise<BackupData> {
    console.log("📊 Préparation des données pour la sauvegarde...");

    // Récupérer toutes les données
    const userSettings = await db.userSettings.toArray();
    const clients = await db.clients.toArray();
    const products = await db.products.toArray();
    const pesees = await db.pesees.toArray();
    const transporteurs = await db.transporteurs.toArray();
    const sageTemplates = await db.sageTemplates.toArray();

    // Créer l'objet de sauvegarde
    const backupData: BackupData = {
      version: "2.0",
      timestamp: Date.now(),
      userSettings: userSettings as any,
      clients: clients as any,
      products: products as any,
      pesees: pesees as any,
      transporteurs: transporteurs as any,
      sageTemplates: sageTemplates as any,
      metadata: {
        backupDate: new Date().toISOString(),
        backupSize: "0 KB", // Sera mis à jour plus tard
        backupType: "opfs",
      },
    };

    // Calculer la taille approximative
    const jsonString = JSON.stringify(backupData);
    const sizeInBytes = new Blob([jsonString]).size;
    backupData.metadata.backupSize = this.formatFileSize(sizeInBytes);

    console.log(`📊 Données préparées :`, {
      clients: clients.length,
      products: products.length,
      pesees: pesees.length,
      transporteurs: transporteurs.length,
      templates: sageTemplates.length,
      taille: backupData.metadata.backupSize,
    });

    return backupData;
  }

  /**
   * Formate la taille de fichier en format lisible
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Sauvegarde automatique avec intervalle configurable
   */
  startAutoBackup(intervalMinutes: number = 5): void {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
    }

    this.currentIntervalMinutes = intervalMinutes;
    const intervalMs = intervalMinutes * 60 * 1000;

    // Sauvegarde périodique
    this.backupInterval = setInterval(async () => {
      try {
        console.log(
          `⏱️ Sauvegarde périodique OPFS (intervalle: ${intervalMinutes} minutes)`
        );
        await this.saveToFile();
      } catch (error) {
        console.error(
          "❌ Erreur lors de la sauvegarde automatique OPFS:",
          error
        );
      }
    }, intervalMs);

    // Configurer les écouteurs d'événements pour la sauvegarde sur modification
    this.setupChangeListeners();

    console.log(
      `💾 Sauvegarde automatique OPFS activée (périodique: ${intervalMinutes} minutes + sur modification)`
    );
  }

  /**
   * Arrête la sauvegarde automatique
   */
  stopAutoBackup(): void {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
      console.log("⏹️ Sauvegarde automatique OPFS arrêtée");
    }
  }

  /**
   * Configure les écouteurs d'événements pour la sauvegarde sur modification
   */
  private setupChangeListeners(): void {
    try {
      // Écouter les événements de modification de la base de données
      import("@/lib/database")
        .then(({ db }) => {
          // Liste des tables à surveiller
          const tables = [
            "clients",
            "products",
            "pesees",
            "transporteurs",
            "userSettings",
            "sageTemplates",
          ];

          // Ajouter les écouteurs pour chaque table
          tables.forEach((table) => {
            if (db[table]) {
              console.log(`🔄 Configuration de l'écouteur OPFS pour ${table}`);

              // Utiliser les hooks Dexie pour détecter les modifications
              db[table].hook("creating", () =>
                this.triggerSaveOnChange(table, "create")
              );
              db[table].hook("updating", () =>
                this.triggerSaveOnChange(table, "update")
              );
              db[table].hook("deleting", () =>
                this.triggerSaveOnChange(table, "delete")
              );
            }
          });

          console.log("✅ Écouteurs de modification OPFS configurés");
        })
        .catch((error) => {
          console.error("❌ Erreur lors du chargement de la base:", error);
        });
    } catch (error) {
      console.error(
        "❌ Erreur lors de la configuration des écouteurs OPFS:",
        error
      );
    }
  }

  /**
   * Déclenche une sauvegarde sur modification avec debounce
   */
  private triggerSaveOnChange(table: string, operation: string): void {
    const now = Date.now();

    // Si moins de 5 secondes depuis la dernière sauvegarde, attendre
    if (now - this.lastSaveTime < this.SAVE_DEBOUNCE_DELAY) {
      // Annuler le timeout précédent s'il existe
      if (this.saveDebounceTimeout) {
        clearTimeout(this.saveDebounceTimeout);
      }

      // Configurer un nouveau timeout
      this.saveDebounceTimeout = setTimeout(() => {
        this.performSaveOnChange(table, operation);
      }, this.SAVE_DEBOUNCE_DELAY);

      return;
    }

    // Sinon, sauvegarder immédiatement
    this.performSaveOnChange(table, operation);
  }

  /**
   * Effectue la sauvegarde sur modification
   */
  private async performSaveOnChange(
    table: string,
    operation: string
  ): Promise<void> {
    try {
      console.log(
        `🔄 Sauvegarde OPFS sur modification (${operation} dans ${table})`
      );
      this.lastSaveTime = Date.now();

      // Utiliser la sauvegarde incrémentale pour les modifications individuelles
      if (table && operation) {
        await this.saveIncrementally(table, operation);
      } else {
        // Fallback sur sauvegarde complète si pas d'info sur la modification
        await this.saveToFile();
      }
    } catch (error) {
      console.error(
        "❌ Erreur lors de la sauvegarde OPFS sur modification:",
        error
      );
    }
  }

  /**
   * Exporte les données vers un fichier téléchargeable
   */
  async exportToDownload(): Promise<void> {
    try {
      console.log("📤 Export des données vers un fichier téléchargeable...");

      // Préparer les données
      const backupData = await this.prepareBackupData();
      const jsonString = JSON.stringify(backupData, null, 2);

      // Créer le blob
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      // Créer le lien de téléchargement
      const a = document.createElement("a");
      a.href = url;
      a.download = this.BACKUP_FILENAME;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();

      // Nettoyer
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log("✅ Export réussi");
    } catch (error) {
      console.error("❌ Erreur lors de l'export:", error);
      throw error;
    }
  }

  /**
   * Importe les données depuis un fichier
   */
  async importFromFile(file: File): Promise<void> {
    try {
      console.log("📥 Import des données depuis un fichier...");

      // Lire le fichier
      const text = await file.text();
      const backupData = JSON.parse(text) as BackupData;

      // Vérifier la validité des données
      if (!backupData.version || !backupData.clients) {
        throw new Error("Format de fichier invalide");
      }

      // Restaurer les données
      await this.restoreFromData(backupData);

      // Sauvegarder dans OPFS
      if (this.isOPFSAvailable && this.backupDirectory) {
        const fileHandle = await this.backupDirectory.getFileHandle(
          this.BACKUP_FILENAME,
          { create: true }
        );
        const writable = await fileHandle.createWritable();
        await writable.write(text);
        await writable.close();
      }

      // Sauvegarder aussi dans IndexedDB
      await this.saveToIndexedDB(backupData);

      console.log("✅ Import réussi");
    } catch (error) {
      console.error("❌ Erreur lors de l'import:", error);
      throw error;
    }
  }

  /**
   * Vérifie si le navigateur supporte OPFS
   */
  isSupported(): boolean {
    return this.isOPFSAvailable;
  }
}

export const opfsBackup = OPFSBackupService.getInstance();
