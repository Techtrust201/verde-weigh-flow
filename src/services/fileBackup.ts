import { db } from "@/lib/database";

export interface UserSettings {
  id?: number;
  name?: string;
  value?: string;
  [key: string]: any;
}

export interface Client {
  id?: number;
  nom: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  notes?: string;
  trackDechetId?: string;
  [key: string]: any;
}

export interface Product {
  id?: number;
  nom: string;
  prix: number;
  unite: string;
  clientId?: number;
  isDangereux?: boolean;
  codeDechet?: string;
  [key: string]: any;
}

export interface Pesee {
  id?: number;
  clientId: number;
  productId: number;
  poids: number;
  date: string;
  transporteurId?: number;
  transporteurLibre?: string;
  isSyncedWithTrackDechet?: boolean;
  trackDechetBsdId?: string;
  [key: string]: any;
}

export interface Transporteur {
  id?: number;
  nom: string;
  siret?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  trackDechetId?: string;
  [key: string]: any;
}

export interface SageTemplate {
  id?: number;
  nom: string;
  structure: any;
  dateCreation: string;
  [key: string]: any;
}

export interface BackupData {
  version: string;
  timestamp: number;
  userSettings: UserSettings[];
  clients: Client[];
  products: Product[];
  pesees: Pesee[];
  transporteurs: Transporteur[];
  sageTemplates: SageTemplate[];
  metadata: {
    backupDate: string;
    backupSize: string;
    backupType: string;
  };
}

export class FileBackupService {
  private static instance: FileBackupService;
  private readonly BACKUP_FILENAME = "verde-weigh-flow-backup.json";
  private backupInterval: NodeJS.Timeout | null = null;
  private currentIntervalMinutes: number = 5; // Valeur par défaut
  private currentFileHandle: FileSystemFileHandle | null = null; // Handle du fichier actuel
  private isFileSystemAPIAvailable: boolean = false;
  private useIndexedDBBackup: boolean = true; // Utiliser IndexedDB par défaut pour la persistance

  /**
   * Initialise automatiquement un fichier de sauvegarde par défaut
   * Vérifie s'il existe déjà un fichier, sinon utilise IndexedDB
   */
  async initializeDefaultBackupFile(): Promise<void> {
    try {
      console.log("🔍 Vérification du fichier de sauvegarde par défaut...");

      // Vérifier si on a déjà un fichier de sauvegarde
      if (this.hasBackupFile()) {
        console.log("✅ Fichier de sauvegarde déjà configuré");
        return;
      }

      // Vérifier si File System Access API est disponible
      if (!this.isFileSystemAPIAvailable) {
        console.log(
          "⚠️ File System Access API non disponible, utilisation d'IndexedDB uniquement"
        );
        return;
      }

      // Si c'est le premier démarrage, créer un fichier par défaut
      const isFirstStartup = !localStorage.getItem("app-initialized");
      if (isFirstStartup) {
        console.log("🆕 Premier démarrage détecté");
        await this.createDefaultBackupFile();
        return;
      }

      // Restaurer depuis IndexedDB si possible
      const hasBackupInIndexedDB = await this.hasIndexedDBBackup();
      if (hasBackupInIndexedDB) {
        console.log(
          "✅ Sauvegarde IndexedDB trouvée, utilisation comme source principale"
        );
      } else {
        console.log(
          "📁 Aucune sauvegarde trouvée, création d'une nouvelle sauvegarde IndexedDB"
        );
      }

      // Ne pas créer automatiquement de fichier - attendre une interaction utilisateur
      console.log(
        "💡 Utilisez 'Sauvegarder maintenant' pour configurer un fichier externe"
      );
    } catch (error: unknown) {
      console.warn(
        "⚠️ Impossible d'initialiser la sauvegarde par défaut:",
        error
      );
      // Ne pas faire échouer l'application si on ne peut pas initialiser
    }
  }

  /**
   * Crée un fichier de sauvegarde par défaut au premier démarrage
   * Cette méthode est appelée uniquement au premier démarrage de l'application
   */
  async createDefaultBackupFile(): Promise<void> {
    try {
      console.log(
        "🆕 Premier démarrage, création d'un fichier de sauvegarde par défaut"
      );

      // Vérifier si c'est vraiment le premier démarrage
      const isFirstStartup = !localStorage.getItem("app-initialized");
      if (!isFirstStartup) {
        console.log(
          "ℹ️ Pas le premier démarrage, pas de création de fichier par défaut"
        );
        return;
      }

      // Créer un fichier par défaut uniquement au premier démarrage
      // Préparer les données
      const backupData = await this.prepareBackupData();
      const jsonString = JSON.stringify(backupData, null, 2);

      // Créer le fichier de sauvegarde
      const blob = new Blob([jsonString], {
        type: "application/json",
      });

      // Télécharger automatiquement le fichier
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${this.BACKUP_FILENAME}`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Enregistrer le moment du téléchargement pour éviter les téléchargements multiples
      localStorage.setItem("lastBackupDownload", Date.now().toString());

      console.log("✅ Fichier de sauvegarde par défaut créé");
    } catch (error: unknown) {
      console.warn("⚠️ Impossible de créer le fichier par défaut:", error);
    }
  }

  constructor() {
    // Vérifier la disponibilité de File System Access API
    this.isFileSystemAPIAvailable =
      typeof window !== "undefined" &&
      "showOpenFilePicker" in window &&
      "showSaveFilePicker" in window;

    console.log(
      `🔍 File System Access API: ${
        this.isFileSystemAPIAvailable ? "✅ Disponible" : "❌ Non disponible"
      }`
    );
  }

  public static getInstance(): FileBackupService {
    if (!FileBackupService.instance) {
      FileBackupService.instance = new FileBackupService();
    }
    return FileBackupService.instance;
  }

  /**
   * Initialise la sauvegarde (à appeler au démarrage)
   */
  async initialize(): Promise<void> {
    try {
      console.log("🔄 Initialisation du service de sauvegarde...");

      // Restaurer le handle du fichier depuis IndexedDB
      await this.restoreFileHandleFromStorage();

      // Vérifier si le handle a été restauré
      if (this.currentFileHandle) {
        try {
          // Vérifier si le fichier est toujours accessible
          const file = await this.currentFileHandle.getFile();
          console.log("✅ Fichier de sauvegarde restauré:", file.name);

          // Tester les permissions
          try {
            const permission = await (
              this.currentFileHandle as any
            ).queryPermission({
              mode: "readwrite" as any,
            });

            console.log("🔒 Permission actuelle:", permission);

            // Si la permission n'est pas accordée, on ne la demande pas automatiquement
            // pour éviter les erreurs, l'utilisateur devra cliquer sur un bouton
            if (permission !== "granted") {
              console.log(
                "⚠️ Permission non accordée, attente d'une action utilisateur"
              );
            }
          } catch (permError) {
            console.warn(
              "⚠️ Erreur lors de la vérification des permissions:",
              permError
            );
          }
        } catch (fileError) {
          console.warn("⚠️ Le fichier n'est plus accessible:", fileError);
          console.log("🔄 Réinitialisation du handle...");
          this.currentFileHandle = null;
          await this.clearFileHandleFromStorage();
        }
      } else {
        console.log("ℹ️ Aucun fichier de sauvegarde configuré");
        console.log(
          "💡 Utilisez 'Sélectionner un fichier' ou 'Détecter fichier existant'"
        );
      }
    } catch (error: unknown) {
      console.warn("⚠️ Erreur lors de l'initialisation:", error);
    }
  }

  /**
   * Sauvegarde le handle du fichier dans IndexedDB pour persistance
   */
  private async saveFileHandleToStorage(): Promise<void> {
    try {
      if (this.currentFileHandle) {
        const db = await this.openIndexedDB();
        const transaction = db.transaction(["fileHandles"], "readwrite");
        const store = transaction.objectStore("fileHandles");
        await store.put({
          id: "backupFileHandle",
          handle: this.currentFileHandle,
          timestamp: Date.now(),
        });
        console.log("✅ Handle du fichier sauvegardé dans IndexedDB");
      }
    } catch (error: unknown) {
      console.warn("⚠️ Erreur lors de la sauvegarde du handle:", error);
    }
  }

  /**
   * Restaure le handle du fichier depuis IndexedDB
   */
  private async restoreFileHandleFromStorage(): Promise<void> {
    try {
      if (this.isFileSystemAPIAvailable) {
        console.log("🔍 Recherche du handle du fichier dans IndexedDB...");

        const db = await this.openIndexedDB();
        const transaction = db.transaction(["fileHandles"], "readonly");
        const store = transaction.objectStore("fileHandles");
        const result = (await store.get("backupFileHandle")) as
          | { handle?: FileSystemFileHandle; timestamp?: number }
          | undefined;

        if (result && result.handle) {
          try {
            console.log("🔄 Tentative de restauration du handle...");
            const file = await result.handle.getFile(); // Valider le handle
            this.currentFileHandle = result.handle;
            console.log(
              "✅ Handle du fichier restauré depuis IndexedDB:",
              file.name
            );

            // Vérifier les permissions
            try {
              const permission = await (result.handle as any).queryPermission({
                mode: "readwrite" as any,
              });
              console.log("🔒 Permission actuelle:", permission);
            } catch (permError) {
              console.warn(
                "⚠️ Impossible de vérifier les permissions:",
                permError
              );
            }
          } catch (error: unknown) {
            console.error("❌ Handle du fichier invalide:", error);
            console.log("🗑️ Suppression du handle invalide...");
            this.currentFileHandle = null;
            await this.clearFileHandleFromStorage();
          }
        } else {
          console.log("ℹ️ Aucun handle de fichier trouvé dans IndexedDB");
        }
      }
    } catch (error: unknown) {
      console.warn("⚠️ Erreur lors de la restauration du handle:", error);
      // Réinitialiser pour éviter un état incohérent
      this.currentFileHandle = null;
    }
  }

  /**
   * Supprime le handle du fichier d'IndexedDB
   */
  private async clearFileHandleFromStorage(): Promise<void> {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(["fileHandles"], "readwrite");
      const store = transaction.objectStore("fileHandles");
      await store.delete("backupFileHandle");
      console.log("✅ Handle du fichier supprimé d'IndexedDB");
    } catch (error: unknown) {
      console.warn("⚠️ Erreur lors de la suppression du handle:", error);
    }
  }

  /**
   * Sauvegarde les données complètes dans IndexedDB
   */
  async saveToIndexedDB(): Promise<void> {
    try {
      console.log("💾 Sauvegarde dans IndexedDB...");
      const backupData = await this.prepareBackupData();
      const jsonString = JSON.stringify(backupData);

      // Sauvegarder dans IndexedDB
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
        // Convertir en tableau standard pour pouvoir utiliser filter
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

      console.log(
        "✅ Sauvegarde IndexedDB réussie (données complètes + historique)"
      );

      // Sauvegarder aussi dans localStorage comme backup d'urgence (limité à 5MB)
      try {
        // Sauvegarder juste les données critiques (pas les pesées complètes)
        const emergencyBackup = {
          version: backupData.version,
          timestamp: Date.now(),
          userSettings: backupData.userSettings,
          clients: backupData.clients.map((c) => ({
            id: c.id,
            nom: c.nom,
            email: c.email,
          })),
          products: backupData.products.map((p) => ({
            id: p.id,
            nom: p.nom,
          })),
          metadata: {
            backupDate: new Date().toISOString(),
            backupType: "emergency",
          },
        };

        localStorage.setItem(
          "emergency_backup",
          JSON.stringify(emergencyBackup)
        );
        console.log("✅ Sauvegarde d'urgence dans localStorage");
      } catch (localStorageError) {
        console.warn(
          "⚠️ Impossible de sauvegarder dans localStorage:",
          localStorageError
        );
      }
    } catch (error: unknown) {
      console.error("❌ Erreur sauvegarde IndexedDB:", error);
      throw error;
    }
  }

  /**
   * Restaure les données depuis IndexedDB
   */
  async restoreFromIndexedDB(): Promise<boolean> {
    try {
      console.log("🔄 Restauration depuis IndexedDB...");
      const db = await this.openIndexedDB();
      const transaction = db.transaction(["backups"], "readonly");
      const store = transaction.objectStore("backups");
      const result = (await store.get("fullBackup")) as
        | { data?: string; timestamp?: number }
        | undefined;

      if (!result || !result.data) {
        console.log("⚠️ Aucune sauvegarde trouvée dans IndexedDB");
        return false;
      }

      const backupData: BackupData = JSON.parse(result.data);
      // Restaurer les données
      await this.restoreFromData(backupData);

      console.log("✅ Restauration IndexedDB réussie");
      return true;
    } catch (error: unknown) {
      console.error("❌ Erreur restauration IndexedDB:", error);
      return false;
    }
  }

  /**
   * Vérifie si une sauvegarde existe dans IndexedDB
   */
  async hasIndexedDBBackup(): Promise<boolean> {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(["backups"], "readonly");
      const store = transaction.objectStore("backups");
      const result = await store.get("fullBackup");
      return !!result;
    } catch (error: unknown) {
      console.warn("⚠️ Erreur vérification IndexedDB:", error);
      return false;
    }
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
    } catch (error: unknown) {
      console.error("❌ Erreur lors de la restauration des données:", error);
      throw error;
    }
  }

  /**
   * Ouvre la base de données IndexedDB pour stocker les handles
   */
  private async openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("FileBackupDB", 3);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Créer le store "fileHandles" s'il n'existe pas
        if (!db.objectStoreNames.contains("fileHandles")) {
          db.createObjectStore("fileHandles", { keyPath: "id" });
        }

        // Créer le store "backups" s'il n'existe pas
        if (!db.objectStoreNames.contains("backups")) {
          db.createObjectStore("backups", { keyPath: "id" });
        }
      };
    });
  }

  /**
   * Essaie de trouver un fichier de sauvegarde existant
   */
  private async tryToFindExistingBackupFile(): Promise<boolean> {
    if (!this.isFileSystemAPIAvailable) {
      console.log("⚠️ File System Access API non disponible");
      return false;
    }

    try {
      console.log("🔍 Recherche du fichier de sauvegarde existant...");
      await this.promptToFindExistingBackupFile();
      return this.hasBackupFile();
    } catch (error: unknown) {
      console.error("❌ Erreur lors de la recherche du fichier:", error);
      return false;
    }
  }

  /**
   * Essaie de détecter automatiquement un fichier verde-weigh-flow-backup.json existant
   */
  private async tryToDetectExistingFile(): Promise<void> {
    try {
      console.log(
        "🔍 Détection automatique du fichier verde-weigh-flow-backup.json..."
      );

      // Utiliser le FileDetectorService pour trouver le fichier
      const { fileDetector } = await import("@/services/FileDetectorService");
      const detectedFile = await fileDetector.detectBackupFile();

      if (detectedFile) {
        console.log("✅ Fichier de sauvegarde détecté:", detectedFile.name);

        // Proposer à l'utilisateur de l'utiliser
        const shouldUse = confirm(
          `Un fichier de sauvegarde "${detectedFile.name}" a été détecté.\n\n` +
            `Voulez-vous l'utiliser comme fichier de sauvegarde principal ?\n\n` +
            `Cliquez sur "OK" pour l'utiliser, ou "Annuler" pour continuer sans fichier.`
        );

        if (shouldUse) {
          // Créer un handle temporaire pour le fichier détecté
          // Note: On ne peut pas créer un handle directement depuis un File,
          // mais on peut proposer à l'utilisateur de le sélectionner
          console.log(
            "💡 Veuillez sélectionner le fichier via le bouton 'Sélectionner un fichier'"
          );
        }
      } else {
        console.log("ℹ️ Aucun fichier de sauvegarde détecté automatiquement");
      }
    } catch (error: unknown) {
      console.warn("⚠️ Erreur lors de la détection automatique:", error);
    }
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
          `⏱️ Sauvegarde périodique (intervalle: ${intervalMinutes} minutes)`
        );
        await this.saveToFile();
      } catch (error: unknown) {
        console.error("❌ Erreur lors de la sauvegarde automatique:", error);
      }
    }, intervalMs);

    // Configurer les écouteurs d'événements pour la sauvegarde sur modification
    this.setupChangeListeners();

    console.log(
      `💾 Sauvegarde automatique activée (périodique: ${intervalMinutes} minutes + sur modification)`
    );
  }

  /**
   * Configure les écouteurs d'événements pour la sauvegarde sur modification
   */
  private setupChangeListeners(): void {
    try {
      // Supprimer les écouteurs existants pour éviter les doublons
      this.removeChangeListeners();

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
              console.log(`🔄 Configuration de l'écouteur pour ${table}`);

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

          console.log("✅ Écouteurs de modification configurés");
        })
        .catch((error) => {
          console.error("❌ Erreur lors du chargement de la base:", error);
        });
    } catch (error) {
      console.error("❌ Erreur lors de la configuration des écouteurs:", error);
    }
  }

  /**
   * Supprime les écouteurs d'événements
   */
  private removeChangeListeners(): void {
    try {
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

          // Supprimer les écouteurs pour chaque table
          tables.forEach((table) => {
            if (db[table]) {
              db[table].hook("creating").unsubscribe();
              db[table].hook("updating").unsubscribe();
              db[table].hook("deleting").unsubscribe();
            }
          });
        })
        .catch((error) => {
          console.warn(
            "⚠️ Erreur lors du chargement de la base pour suppression:",
            error
          );
        });
    } catch (error) {
      console.warn("⚠️ Erreur lors de la suppression des écouteurs:", error);
    }
  }

  // Utiliser un délai pour éviter les sauvegardes trop fréquentes
  private lastSaveTime: number = 0;
  private saveDebounceTimeout: NodeJS.Timeout | null = null;
  private readonly SAVE_DEBOUNCE_DELAY = 5000; // 5 secondes

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

      console.log(
        `🔄 Sauvegarde programmée dans ${this.SAVE_DEBOUNCE_DELAY}ms (${table}: ${operation})`
      );
      return;
    }

    // Sinon, sauvegarder immédiatement
    console.log(`🚀 Sauvegarde immédiate (${table}: ${operation})`);
    this.performSaveOnChange(table, operation);
  }

  /**
   * Force une sauvegarde immédiate (pour les actions critiques)
   */
  async forceSaveNow(): Promise<void> {
    try {
      console.log("🚀 Sauvegarde forcée immédiate...");

      // Annuler tout timeout en cours
      if (this.saveDebounceTimeout) {
        clearTimeout(this.saveDebounceTimeout);
        this.saveDebounceTimeout = null;
      }

      // Sauvegarder immédiatement
      await this.saveToFile();

      console.log("✅ Sauvegarde forcée réussie");
    } catch (error) {
      console.error("❌ Erreur lors de la sauvegarde forcée:", error);
      throw error;
    }
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
        `🔄 Sauvegarde sur modification (${operation} dans ${table})`
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
      console.error("❌ Erreur lors de la sauvegarde sur modification:", error);
    }
  }

  /**
   * Sauvegarde incrémentale - ne sauvegarde que la table modifiée
   */
  private async saveIncrementally(
    table: string,
    operation: string
  ): Promise<void> {
    try {
      console.log(`📊 Sauvegarde incrémentale de ${table}...`);

      // Obtenir les données de la table spécifique
      const { db } = await import("@/lib/database");

      if (!db[table]) {
        throw new Error(`Table ${table} non trouvée`);
      }

      // Récupérer les données de la table
      const tableData = await db[table].toArray();

      // Obtenir la sauvegarde existante dans IndexedDB
      const currentBackup = await this.getExistingBackupData();

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

      // Sauvegarder dans IndexedDB
      const idb = await this.openIndexedDB();
      const transaction = idb.transaction(["backups"], "readwrite");
      const store = transaction.objectStore("backups");
      await store.put({
        id: "fullBackup",
        data: jsonString,
        timestamp: Date.now(),
      });

      // Sauvegarder aussi dans le fichier si disponible
      if (this.isFileSystemAPIAvailable && this.currentFileHandle) {
        try {
          // Vérifier les permissions
          try {
            const options = { mode: "readwrite" as any };
            if (
              (await (this.currentFileHandle as any).queryPermission(
                options
              )) !== "granted"
            ) {
              const permission = await (
                this.currentFileHandle as any
              ).requestPermission(options);
              if (permission !== "granted") {
                throw new Error("Permission d'écriture refusée");
              }
            }
          } catch (permError) {
            console.warn("⚠️ Erreur permissions:", permError);
          }

          // Écrire dans le fichier
          const writable = await this.currentFileHandle.createWritable();
          await writable.write(jsonString);
          await writable.close();

          console.log(`✅ Sauvegarde incrémentale de ${table} réussie`);
        } catch (fileError) {
          console.warn("⚠️ Erreur sauvegarde fichier incrémentale:", fileError);
        }
      }
    } catch (error) {
      console.error("❌ Erreur lors de la sauvegarde incrémentale:", error);
      // Fallback sur sauvegarde complète
      await this.saveToFile();
    }
  }

  /**
   * Récupère les données de sauvegarde existantes
   */
  private async getExistingBackupData(): Promise<BackupData | null> {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(["backups"], "readonly");
      const store = transaction.objectStore("backups");
      const result = (await store.get("fullBackup")) as
        | { data?: string; timestamp?: number }
        | undefined;

      if (!result || !result.data) {
        return null;
      }

      return JSON.parse(result.data) as BackupData;
    } catch (error) {
      console.error("❌ Erreur récupération sauvegarde existante:", error);
      return null;
    }
  }

  /**
   * Arrête la sauvegarde automatique
   */
  stopAutoBackup(): void {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
      console.log("⏹️ Sauvegarde automatique arrêtée");
    }
  }

  /**
   * Obtient l'intervalle de sauvegarde actuel
   */
  getCurrentInterval(): number {
    return this.currentIntervalMinutes;
  }

  /**
   * Vérifie si la sauvegarde automatique est active
   */
  isAutoBackupActive(): boolean {
    return this.backupInterval !== null;
  }

  /**
   * Obtient le fichier de sauvegarde actuel
   */
  getCurrentFileHandle(): FileSystemFileHandle | null {
    return this.currentFileHandle;
  }

  /**
   * Définit directement le handle du fichier et le sauvegarde dans IndexedDB
   */
  async setCurrentFileHandle(handle: FileSystemFileHandle): Promise<void> {
    try {
      // Vérifier si le handle est valide
      await handle.getFile();

      // Définir le handle
      this.currentFileHandle = handle;

      // Sauvegarder dans IndexedDB pour persistance
      await this.saveFileHandleToStorage();

      console.log("✅ Handle du fichier défini et sauvegardé:", handle.name);

      // Sauvegarder immédiatement dans le fichier pour l'initialiser
      await this.saveToExistingFile();
    } catch (error: unknown) {
      console.error("❌ Erreur lors de la définition du handle:", error);
      throw error;
    }
  }

  /**
   * Vérifie si un fichier de sauvegarde est configuré
   */
  hasBackupFile(): boolean {
    // Vérifier SEULEMENT le handle actuel (fichier local)
    return this.currentFileHandle !== null;
  }

  /**
   * Réinitialise le fichier de sauvegarde (pour forcer une nouvelle sélection)
   */
  async resetBackupFile(): Promise<void> {
    this.currentFileHandle = null;
    await this.clearFileHandleFromStorage();
    console.log("🗑️ Fichier de sauvegarde réinitialisé");
  }

  /**
   * Obtient le nom du fichier de sauvegarde actuel
   */
  async getCurrentFileName(): Promise<string | null> {
    if (this.currentFileHandle) {
      try {
        return this.currentFileHandle.name;
      } catch (error: unknown) {
        console.warn(
          "Erreur lors de la récupération du nom de fichier:",
          error
        );
        return null;
      }
    }
    return null;
  }

  /**
   * Sauvegarde intelligente : Fichier local prioritaire, IndexedDB en fallback
   */
  async saveToFile(): Promise<void> {
    try {
      console.log("💾 Sauvegarde intelligente...");

      // TOUJOURS sauvegarder dans IndexedDB pour garantir la persistance
      await this.saveToIndexedDB();
      console.log("✅ Sauvegarde IndexedDB réussie (persistance garantie)");

      // PRIORITÉ 1: Si un fichier local est configuré, sauvegarder dedans
      if (this.isFileSystemAPIAvailable && this.currentFileHandle) {
        console.log("📁 Sauvegarde dans le fichier local...");
        try {
          await this.saveToExistingFile();
          console.log("✅ Sauvegarde fichier local réussie");

          // Mettre à jour le timestamp de dernière sauvegarde
          this.lastSaveTime = Date.now();
          localStorage.setItem("lastBackupTime", this.lastSaveTime.toString());
        } catch (fileError) {
          console.warn(
            "⚠️ Erreur sauvegarde fichier, IndexedDB utilisé comme fallback:",
            fileError
          );
        }
        return;
      }

      // PRIORITÉ 2: Si File System Access API disponible mais pas de fichier, proposer d'en créer un
      if (this.isFileSystemAPIAvailable) {
        console.log(
          "⚠️ Aucun fichier configuré, sauvegarde IndexedDB uniquement"
        );
        console.log(
          "💡 Utilisez 'Sélectionner un fichier' pour configurer un fichier local"
        );
        return;
      }

      // PRIORITÉ 3: Fallback téléchargement (navigateurs non compatibles)
      console.log("📥 Fallback téléchargement...");
      await this.saveToDownload();
      console.log("✅ Sauvegarde téléchargement réussie");

      // Mettre à jour le timestamp de dernière sauvegarde
      this.lastSaveTime = Date.now();
      localStorage.setItem("lastBackupTime", this.lastSaveTime.toString());
    } catch (error: unknown) {
      console.error("❌ Erreur lors de la sauvegarde:", error);
      throw error;
    }
  }

  /**
   * Sauvegarde dans le fichier existant
   */
  private async saveToExistingFile(): Promise<void> {
    try {
      if (!this.currentFileHandle) {
        throw new Error("Aucun fichier configuré");
      }

      console.log("💾 Sauvegarde dans le fichier existant...");
      const backupData = await this.prepareBackupData();
      const jsonString = JSON.stringify(backupData, null, 2);

      // Vérifier les permissions (simplifié pour éviter les erreurs de typage)
      try {
        const options = {
          mode: "readwrite" as any,
        };

        // Demander la permission d'écriture si nécessaire
        if (
          (await (this.currentFileHandle as any).queryPermission(options)) !==
          "granted"
        ) {
          const permission = await (
            this.currentFileHandle as any
          ).requestPermission(options);
          if (permission !== "granted") {
            throw new Error("Permission d'écriture refusée");
          }
        }
      } catch (permissionError) {
        console.warn(
          "⚠️ Impossible de vérifier les permissions:",
          permissionError
        );
        // Continuer quand même, certaines versions de Chrome n'ont pas cette API
      }

      // Écrire dans le fichier
      const writable = await this.currentFileHandle.createWritable();
      await writable.write(jsonString);
      await writable.close();

      // AUSSI sauvegarder dans IndexedDB comme backup de sécurité
      await this.saveToIndexedDB();

      console.log("✅ Sauvegarde fichier local + IndexedDB réussie");
    } catch (error: unknown) {
      console.error("❌ Erreur lors de la sauvegarde dans le fichier:", error);
      throw error;
    }
  }

  /**
   * Crée un nouveau fichier de sauvegarde
   * ATTENTION: Nécessite une interaction utilisateur (clic)
   */
  async saveToNewFile(): Promise<void> {
    try {
      console.log("💾 Première sauvegarde, sélection du fichier...");

      const backupData = await this.prepareBackupData();
      const jsonString = JSON.stringify(backupData, null, 2);

      // Ouvrir le dialogue de sauvegarde
      const fileHandle = await (
        window as unknown as {
          showSaveFilePicker: (
            options: SaveFilePickerOptions
          ) => Promise<FileSystemFileHandle>;
        }
      ).showSaveFilePicker({
        suggestedName: this.BACKUP_FILENAME,
        types: [
          {
            description: "Fichier de sauvegarde Verde Weigh Flow",
            accept: { "application/json": [".json"] },
          },
        ],
      });

      // Sauvegarder le handle pour les prochaines sauvegardes
      this.currentFileHandle = fileHandle;
      // Sauvegarder le handle pour persistance
      await this.saveFileHandleToStorage();

      // Écrire le fichier
      const writable = await fileHandle.createWritable();
      await writable.write(jsonString);
      await writable.close();

      // AUSSI sauvegarder dans IndexedDB comme backup de sécurité
      await this.saveToIndexedDB();

      console.log(
        "✅ Première sauvegarde réussie, fichier sélectionné pour les prochaines"
      );
    } catch (error: unknown) {
      if ((error as Error).name === "AbortError") {
        console.log("ℹ️ Sauvegarde annulée par l'utilisateur");
      } else {
        console.error("❌ Erreur lors de la première sauvegarde:", error);
        // Fallback vers téléchargement
        await this.saveToDownload();
      }
    }
  }

  /**
   * Invite l'utilisateur à sélectionner un fichier de sauvegarde existant
   */
  async promptToFindExistingBackupFile(): Promise<void> {
    try {
      console.log("🔍 Sélection d'un fichier de sauvegarde existant...");

      const [fileHandle] = await (
        window as unknown as {
          showOpenFilePicker: (
            options: OpenFilePickerOptions
          ) => Promise<FileSystemFileHandle[]>;
        }
      ).showOpenFilePicker({
        types: [
          {
            description: "Fichier de sauvegarde Verde Weigh Flow",
            accept: { "application/json": [".json"] },
          },
        ],
        multiple: false,
      });

      // Vérifier que c'est un fichier valide
      const file = await fileHandle.getFile();
      try {
        const content = await file.text();
        const data = JSON.parse(content);
        if (!data.version || !data.clients) {
          throw new Error("Format de fichier invalide");
        }
      } catch (error: unknown) {
        console.error("❌ Fichier invalide:", error);
        throw new Error(
          "Le fichier sélectionné n'est pas un fichier de sauvegarde valide"
        );
      }

      // Sauvegarder le handle pour les prochaines sauvegardes
      this.currentFileHandle = fileHandle;
      await this.saveFileHandleToStorage();

      console.log("✅ Fichier de sauvegarde sélectionné");
    } catch (error: unknown) {
      if ((error as Error).name === "AbortError") {
        console.log("ℹ️ Sélection annulée par l'utilisateur");
      } else {
        console.error("❌ Erreur lors de la sélection du fichier:", error);
        throw error;
      }
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
      version: "2.0", // Version complète
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
        backupType: this.currentFileHandle
          ? "file"
          : this.useIndexedDBBackup
          ? "indexeddb"
          : "download",
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
   * Fallback : téléchargement classique (pour navigateurs non compatibles)
   */
  private async saveToDownload(): Promise<void> {
    try {
      console.log("💾 Sauvegarde par téléchargement (fallback)...");

      // Vérifier si on a déjà fait un téléchargement récemment
      const lastDownload = localStorage.getItem("lastBackupDownload");
      const now = Date.now();

      if (lastDownload) {
        const lastTime = parseInt(lastDownload, 10);
        const timeDiff = now - lastTime;

        // Si moins de 5 minutes depuis le dernier téléchargement, ne pas en faire un nouveau
        if (timeDiff < 5 * 60 * 1000) {
          console.log(
            "⏱️ Dernier téléchargement il y a moins de 5 minutes, téléchargement ignoré"
          );
          return;
        }
      }

      const backupData = await this.prepareBackupData();
      const jsonString = JSON.stringify(backupData, null, 2);

      // Créer le fichier de sauvegarde
      const blob = new Blob([jsonString], {
        type: "application/json",
      });

      // Télécharger automatiquement le fichier
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${this.BACKUP_FILENAME}`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Enregistrer le moment du téléchargement
      localStorage.setItem("lastBackupDownload", now.toString());

      console.log("✅ Sauvegarde par téléchargement réussie");
    } catch (error: unknown) {
      console.error(
        "❌ Erreur lors de la sauvegarde par téléchargement:",
        error
      );
    }
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
   * Restaure TOUTES les données depuis un fichier
   */
  async restoreFromFile(file: File): Promise<void> {
    try {
      console.log("🔄 Début de la restauration complète...");

      const text = await file.text();
      const backupData: BackupData = JSON.parse(text);

      // Vérifier la version
      if (
        !backupData.version ||
        (backupData.version !== "1.0" && backupData.version !== "2.0")
      ) {
        throw new Error(
          `Version de sauvegarde non supportée: ${backupData.version}`
        );
      }

      console.log(`📋 Restauration depuis version ${backupData.version}:`, {
        clients: backupData.clients?.length || 0,
        products: backupData.products?.length || 0,
        pesees: backupData.pesees?.length || 0,
        transporteurs: backupData.transporteurs?.length || 0,
        templates: backupData.sageTemplates?.length || 0,
      });

      // Restaurer les données
      await this.restoreFromData(backupData);

      // Sauvegarder aussi dans IndexedDB après restauration
      await this.saveToIndexedDB();

      if (backupData.version !== "2.0") {
        // Restauration partielle (version 1.0)
        if (backupData.userSettings) {
          await db.userSettings.bulkAdd(
            Array.isArray(backupData.userSettings)
              ? (backupData.userSettings as any)
              : [backupData.userSettings as any]
          );
        }
      }

      console.log("✅ Restauration complète réussie");
    } catch (error: unknown) {
      console.error("❌ Erreur lors de la restauration:", error);
      throw error;
    }
  }
}

export const fileBackup = FileBackupService.getInstance();

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
}

interface OpenFilePickerOptions {
  types?: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
  multiple?: boolean;
}
