/**
 * Service de résolution des conflits entre fichier et IndexedDB
 * Gère les conflits entre les différentes sources de données
 */

import { BackupData } from "./fileBackup";

export interface ConflictResolutionResult {
  resolved: boolean;
  source: "file" | "indexeddb" | "none";
  data?: any;
  error?: string;
}

export class ConflictResolver {
  private static instance: ConflictResolver;

  /**
   * Obtient l'instance unique du service (Singleton)
   */
  public static getInstance(): ConflictResolver {
    if (!ConflictResolver.instance) {
      ConflictResolver.instance = new ConflictResolver();
    }
    return ConflictResolver.instance;
  }

  /**
   * Résout les conflits entre le fichier et IndexedDB
   * @param fileData Données du fichier
   * @param indexedDBData Données d'IndexedDB
   * @returns Résultat de la résolution
   */
  async resolveConflict(
    fileData: BackupData | null,
    indexedDBData: BackupData | null
  ): Promise<ConflictResolutionResult> {
    try {
      // Si une source est null, prendre l'autre
      if (!fileData && !indexedDBData) {
        return {
          resolved: false,
          source: "none",
          error: "Aucune donnée disponible",
        };
      }

      if (!fileData) {
        return {
          resolved: true,
          source: "indexeddb",
          data: indexedDBData,
        };
      }

      if (!indexedDBData) {
        return {
          resolved: true,
          source: "file",
          data: fileData,
        };
      }

      // Les deux sources existent, comparer les timestamps
      const fileTimestamp = new Date(fileData.timestamp).getTime();
      const indexedDBTimestamp = new Date(indexedDBData.timestamp).getTime();

      if (fileTimestamp > indexedDBTimestamp) {
        console.log("📂 Fichier plus récent que IndexedDB");
        return {
          resolved: true,
          source: "file",
          data: fileData,
        };
      } else if (indexedDBTimestamp > fileTimestamp) {
        console.log("🗄️ IndexedDB plus récent que fichier");
        return {
          resolved: true,
          source: "indexeddb",
          data: indexedDBData,
        };
      } else {
        // Même timestamp, comparer le contenu
        return this.resolveByContent(fileData, indexedDBData);
      }
    } catch (error) {
      console.error("❌ Erreur lors de la résolution des conflits:", error);
      return {
        resolved: false,
        source: "none",
        error: `Erreur lors de la résolution: ${error}`,
      };
    }
  }

  /**
   * Résout les conflits en comparant le contenu
   * @param fileData Données du fichier
   * @param indexedDBData Données d'IndexedDB
   * @returns Résultat de la résolution
   */
  private resolveByContent(
    fileData: BackupData,
    indexedDBData: BackupData
  ): ConflictResolutionResult {
    try {
      // Comparer les métadonnées
      const fileTotalItems =
        fileData.metadata.totalClients +
        fileData.metadata.totalProducts +
        fileData.metadata.totalPesees +
        fileData.metadata.totalTransporteurs +
        fileData.metadata.totalTemplates;

      const indexedDBTotalItems =
        indexedDBData.metadata.totalClients +
        indexedDBData.metadata.totalProducts +
        indexedDBData.metadata.totalPesees +
        indexedDBData.metadata.totalTransporteurs +
        indexedDBData.metadata.totalTemplates;

      if (fileTotalItems > indexedDBTotalItems) {
        console.log("📂 Fichier contient plus d'éléments que IndexedDB");
        return {
          resolved: true,
          source: "file",
          data: fileData,
        };
      } else if (indexedDBTotalItems > fileTotalItems) {
        console.log("🗄️ IndexedDB contient plus d'éléments que fichier");
        return {
          resolved: true,
          source: "indexeddb",
          data: indexedDBData,
        };
      } else {
        // Même nombre d'éléments, prendre IndexedDB par défaut
        console.log(
          "🔄 Même nombre d'éléments, utilisation d'IndexedDB par défaut"
        );
        return {
          resolved: true,
          source: "indexeddb",
          data: indexedDBData,
        };
      }
    } catch (error) {
      console.error("❌ Erreur lors de la résolution par contenu:", error);
      return {
        resolved: false,
        source: "none",
        error: `Erreur lors de la résolution par contenu: ${error}`,
      };
    }
  }

  /**
   * Vérifie l'intégrité d'un fichier de sauvegarde
   * @param data Données à vérifier
   * @returns true si le fichier est valide
   */
  validateFileIntegrity(data: any): boolean {
    try {
      // Vérifier la structure de base
      if (!data || typeof data !== "object") return false;

      // Vérifier les champs obligatoires
      const requiredFields = [
        "version",
        "timestamp",
        "userSettings",
        "clients",
        "products",
        "pesees",
        "transporteurs",
        "metadata",
      ];

      for (const field of requiredFields) {
        if (!(field in data)) return false;
      }

      // Vérifier les métadonnées
      if (!data.metadata || typeof data.metadata !== "object") return false;

      const requiredMetaFields = [
        "totalClients",
        "totalProducts",
        "totalPesees",
        "totalTransporteurs",
        "backupSize",
      ];

      for (const field of requiredMetaFields) {
        if (!(field in data.metadata)) return false;
      }

      // Vérifier les tableaux
      const arrayFields = [
        "userSettings",
        "clients",
        "products",
        "pesees",
        "transporteurs",
      ];
      for (const field of arrayFields) {
        if (!Array.isArray(data[field])) return false;
      }

      // Vérifier la cohérence des métadonnées
      if (data.metadata.totalClients !== data.clients.length) return false;
      if (data.metadata.totalProducts !== data.products.length) return false;
      if (data.metadata.totalPesees !== data.pesees.length) return false;
      if (data.metadata.totalTransporteurs !== data.transporteurs.length)
        return false;

      return true;
    } catch (error) {
      console.error("❌ Erreur lors de la validation d'intégrité:", error);
      return false;
    }
  }

  /**
   * Gère le cas d'un fichier corrompu
   * @param fileData Données du fichier
   * @param indexedDBData Données d'IndexedDB
   * @returns Résultat de la résolution
   */
  handleCorruptedFile(
    fileData: any,
    indexedDBData: BackupData | null
  ): ConflictResolutionResult {
    console.warn("⚠️ Fichier corrompu détecté");

    if (indexedDBData) {
      console.log("🗄️ Utilisation des données IndexedDB comme fallback");
      return {
        resolved: true,
        source: "indexeddb",
        data: indexedDBData,
      };
    } else {
      console.error("❌ Aucune donnée valide disponible");
      return {
        resolved: false,
        source: "none",
        error: "Fichier corrompu et aucune donnée IndexedDB disponible",
      };
    }
  }
}

// Instance globale
let conflictResolverInstance: ConflictResolver | null = null;

export const conflictResolver = {
  getInstance: () => {
    if (!conflictResolverInstance) {
      conflictResolverInstance = new ConflictResolver();
    }
    return conflictResolverInstance;
  },
  resolveConflict: (
    fileData: BackupData | null,
    indexedDBData: BackupData | null
  ) => {
    return conflictResolver
      .getInstance()
      .resolveConflict(fileData, indexedDBData);
  },
  validateFileIntegrity: (data: any) => {
    return conflictResolver.getInstance().validateFileIntegrity(data);
  },
  handleCorruptedFile: (fileData: any, indexedDBData: BackupData | null) => {
    return conflictResolver
      .getInstance()
      .handleCorruptedFile(fileData, indexedDBData);
  },
};



