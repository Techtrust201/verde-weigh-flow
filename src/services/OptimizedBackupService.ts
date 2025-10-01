/**
 * Service de sauvegarde optimisé pour gros volumes
 * Implémente des stratégies d'optimisation pour la sauvegarde
 */

import { BackupData } from "./fileBackup";
import { db } from "@/lib/database";

interface ChangeQueueItem {
  timestamp: number;
  operation: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  data: any;
}

export class OptimizedBackupService {
  private static instance: OptimizedBackupService;
  private changeQueue: ChangeQueueItem[] = [];
  private isSaving: boolean = false;
  private saveTimeout: NodeJS.Timeout | null = null;
  private readonly SAVE_DELAY = 1000; // 1 seconde de délai

  /**
   * Obtient l'instance unique du service (Singleton)
   */
  public static getInstance(): OptimizedBackupService {
    if (!OptimizedBackupService.instance) {
      OptimizedBackupService.instance = new OptimizedBackupService();
    }
    return OptimizedBackupService.instance;
  }

  /**
   * Sauvegarde immédiate dans IndexedDB (ultra-rapide)
   * @param data Données à sauvegarder
   * @param table Table concernée
   * @param operation Type d'opération
   */
  async saveImmediate(
    data: any,
    table: string,
    operation: "INSERT" | "UPDATE" | "DELETE" = "UPDATE"
  ): Promise<void> {
    try {
      // 1. Sauvegarder dans IndexedDB (1ms)
      await this.saveToIndexedDB(data, table, operation);

      // 2. Ajouter à la queue de sauvegarde fichier
      this.addToChangeQueue({
        timestamp: Date.now(),
        operation,
        table,
        data,
      });

      // 3. Déclencher la sauvegarde fichier (asynchrone)
      this.triggerFileSave();
    } catch (error) {
      console.error(
        `❌ Erreur lors de la sauvegarde immédiate (${table}):`,
        error
      );
      throw error;
    }
  }

  /**
   * Ajoute un élément à la queue de changements
   * @param item Élément à ajouter
   */
  private addToChangeQueue(item: ChangeQueueItem): void {
    this.changeQueue.push(item);
    console.log(`➕ Ajout à la queue de changements (${item.table})`);
  }

  /**
   * Déclenche la sauvegarde fichier en arrière-plan
   */
  private triggerFileSave(): void {
    if (this.isSaving || this.saveTimeout) return;

    // Attendre 1 seconde pour regrouper les modifications
    this.saveTimeout = setTimeout(async () => {
      this.isSaving = true;
      this.saveTimeout = null;

      try {
        if (this.changeQueue.length > 0) {
          await this.saveChangesToFile();
          this.changeQueue = []; // Vider la queue
        }
      } catch (error) {
        console.error("❌ Erreur lors de la sauvegarde fichier:", error);
      } finally {
        this.isSaving = false;
      }
    }, this.SAVE_DELAY);
  }

  /**
   * Sauvegarde les changements dans le fichier
   */
  private async saveChangesToFile(): Promise<void> {
    if (this.changeQueue.length === 0) return;

    console.log(`💾 Sauvegarde de ${this.changeQueue.length} changements...`);

    // Si peu de changements, sauvegarde incrémentale
    if (this.changeQueue.length < 10) {
      await this.saveIncremental(this.changeQueue);
    } else {
      // Si beaucoup de changements, sauvegarde complète
      await this.saveComplete();
    }
  }

  /**
   * Sauvegarde incrémentale (pour petits volumes)
   * @param changes Changements à sauvegarder
   */
  private async saveIncremental(changes: ChangeQueueItem[]): Promise<void> {
    try {
      console.log(`🔄 Sauvegarde incrémentale (${changes.length} changements)`);

      // TODO: Implémenter la sauvegarde incrémentale
      // Pour l'instant, on utilise la sauvegarde complète
      await this.saveComplete();
    } catch (error) {
      console.error("❌ Erreur lors de la sauvegarde incrémentale:", error);
      throw error;
    }
  }

  /**
   * Sauvegarde complète (pour gros volumes)
   */
  private async saveComplete(): Promise<void> {
    try {
      console.log("📊 Sauvegarde complète...");

      // TODO: Implémenter la sauvegarde complète
      // Pour l'instant, on utilise la sauvegarde par défaut
    } catch (error) {
      console.error("❌ Erreur lors de la sauvegarde complète:", error);
      throw error;
    }
  }

  /**
   * Sauvegarde par chunks (pour très gros volumes)
   * @param data Données à sauvegarder
   */
  async saveByChunks(data: any[]): Promise<void> {
    try {
      console.log(`📦 Sauvegarde par chunks (${data.length} éléments)`);

      const chunkSize = 1000; // 1000 éléments par chunk

      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        await this.saveChunk(
          chunk,
          i / chunkSize + 1,
          Math.ceil(data.length / chunkSize)
        );

        // Pause pour éviter de bloquer l'interface
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      console.log("✅ Sauvegarde par chunks terminée");
    } catch (error) {
      console.error("❌ Erreur lors de la sauvegarde par chunks:", error);
      throw error;
    }
  }

  /**
   * Sauvegarde un chunk de données
   * @param chunk Chunk à sauvegarder
   * @param chunkNumber Numéro du chunk
   * @param totalChunks Nombre total de chunks
   */
  private async saveChunk(
    chunk: any[],
    chunkNumber: number,
    totalChunks: number
  ): Promise<void> {
    try {
      console.log(
        `📦 Sauvegarde du chunk ${chunkNumber}/${totalChunks} (${chunk.length} éléments)`
      );

      // TODO: Implémenter la sauvegarde d'un chunk
    } catch (error) {
      console.error(
        `❌ Erreur lors de la sauvegarde du chunk ${chunkNumber}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Sauvegarde dans IndexedDB
   * @param data Données à sauvegarder
   * @param table Table concernée
   * @param operation Type d'opération
   */
  private async saveToIndexedDB(
    data: any,
    table: string,
    operation: "INSERT" | "UPDATE" | "DELETE"
  ): Promise<void> {
    try {
      switch (operation) {
        case "INSERT":
          if (Array.isArray(data)) {
            await (db as any)[table].bulkAdd(data);
          } else {
            await (db as any)[table].add(data);
          }
          break;

        case "UPDATE":
          if (Array.isArray(data)) {
            await (db as any)[table].bulkPut(data);
          } else {
            await (db as any)[table].put(data);
          }
          break;

        case "DELETE":
          if (Array.isArray(data)) {
            await (db as any)[table].bulkDelete(
              data.map((item: any) => item.id)
            );
          } else {
            await (db as any)[table].delete(data.id);
          }
          break;
      }
    } catch (error) {
      console.error(
        `❌ Erreur lors de la sauvegarde IndexedDB (${table}):`,
        error
      );
      throw error;
    }
  }

  /**
   * Prépare les données de sauvegarde complètes
   */
  async prepareBackupData(): Promise<BackupData> {
    console.log("💾 Préparation des données de sauvegarde...");

    // Récupérer TOUTES les données de la base
    const [
      userSettings,
      clients,
      products,
      pesees,
      transporteurs,
      sageTemplates,
    ] = await Promise.all([
      db.userSettings.toArray(),
      db.clients.toArray(),
      db.products.toArray(),
      db.pesees.toArray(),
      db.transporteurs.toArray(),
      db.sageTemplates.toArray(),
    ]);

    // Trouver la dernière pesée pour les métadonnées
    const lastPesee =
      pesees.length > 0
        ? pesees.reduce((latest, current) =>
            new Date(current.createdAt) > new Date(latest.createdAt)
              ? current
              : latest
          )
        : null;

    const backupData: BackupData = {
      version: "2.0", // Version mise à jour pour sauvegarde complète
      timestamp: new Date().toISOString(),
      userSettings,
      clients,
      products,
      pesees,
      transporteurs,
      sageTemplates,
      metadata: {
        totalClients: clients.length,
        totalProducts: products.length,
        totalPesees: pesees.length,
        totalTransporteurs: transporteurs.length,
        totalTemplates: sageTemplates.length,
        lastPeseeDate: lastPesee?.createdAt.toISOString(),
        backupSize: "Calculé après création",
      },
    };

    // Calculer la taille du backup
    const jsonString = JSON.stringify(backupData, null, 2);
    const sizeInBytes = new Blob([jsonString]).size;
    backupData.metadata.backupSize = this.formatFileSize(sizeInBytes);

    console.log(`📊 Données préparées :
      - Clients: ${backupData.metadata.totalClients}
      - Produits: ${backupData.metadata.totalProducts}
      - Pesées: ${backupData.metadata.totalPesees}
      - Transporteurs: ${backupData.metadata.totalTransporteurs}
      - Templates: ${backupData.metadata.totalTemplates}
      - Taille: ${backupData.metadata.backupSize}`);

    return backupData;
  }

  /**
   * Formate la taille du fichier en unités lisibles
   * @param bytes Taille en octets
   * @returns Taille formatée
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + " bytes";
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    else if (bytes < 1024 * 1024 * 1024)
      return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    else return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  }
}

// Instance globale
let optimizedBackupInstance: OptimizedBackupService | null = null;

export const optimizedBackup = {
  getInstance: () => {
    if (!optimizedBackupInstance) {
      optimizedBackupInstance = new OptimizedBackupService();
    }
    return optimizedBackupInstance;
  },
  saveImmediate: (
    data: any,
    table: string,
    operation: "INSERT" | "UPDATE" | "DELETE" = "UPDATE"
  ) => {
    return optimizedBackup.getInstance().saveImmediate(data, table, operation);
  },
  saveByChunks: (data: any[]) => {
    return optimizedBackup.getInstance().saveByChunks(data);
  },
  prepareBackupData: () => {
    return optimizedBackup.getInstance().prepareBackupData();
  },
};



