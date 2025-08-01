import { Dexie, Table } from 'dexie';

// Interface pour les requêtes en attente de synchronisation
export interface SyncQueueItem {
  id?: number;
  tag: string;
  data: any;
  attemptCount: number;
  maxAttempts: number;
  nextAttempt: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Interface pour les logs de synchronisation détaillés
export interface SyncEvent {
  id?: number;
  tag: string;
  type: 'sync' | 'periodicsync' | 'manual';
  status: 'pending' | 'success' | 'failed' | 'abandoned';
  message: string;
  data?: any;
  attemptNumber: number;
  duration?: number;
  createdAt: Date;
}

// Extension de la base de données pour la queue de sync
class SyncDatabase extends Dexie {
  syncQueue!: Table<SyncQueueItem>;
  syncEvents!: Table<SyncEvent>;

  constructor() {
    super('SyncDatabase');
    this.version(1).stores({
      syncQueue: '++id, tag, nextAttempt, attemptCount, createdAt',
      syncEvents: '++id, tag, type, status, createdAt'
    });
  }
}

export const syncDb = new SyncDatabase();

// Gestionnaire de la queue de synchronisation
export class SyncQueueManager {
  private static instance: SyncQueueManager;
  private maxRetentionTime = 7 * 24 * 60 * 60 * 1000; // 7 jours en ms

  static getInstance(): SyncQueueManager {
    if (!SyncQueueManager.instance) {
      SyncQueueManager.instance = new SyncQueueManager();
    }
    return SyncQueueManager.instance;
  }

  // Ajouter une requête à la queue
  async addToQueue(tag: string, data: any, maxAttempts = 5): Promise<number> {
    const now = new Date();
    const queueItem: SyncQueueItem = {
      tag,
      data,
      attemptCount: 0,
      maxAttempts,
      nextAttempt: now,
      createdAt: now,
      updatedAt: now
    };

    const id = await syncDb.syncQueue.add(queueItem);
    
    await this.logEvent(tag, 'sync', 'pending', 'Ajouté à la queue de synchronisation', data, 0);
    
    console.log(`📤 Queue: Ajout de ${tag} avec ID ${id}`);
    return id;
  }

  // Récupérer les requêtes prêtes à être traitées
  async getReadyItems(): Promise<SyncQueueItem[]> {
    const now = new Date();
    return await syncDb.syncQueue
      .where('nextAttempt')
      .belowOrEqual(now)
      .and(item => item.attemptCount < item.maxAttempts)
      .toArray();
  }

  // Marquer une tentative comme échouée et programmer le prochain essai
  async markAttemptFailed(id: number, error: string): Promise<void> {
    const item = await syncDb.syncQueue.get(id);
    if (!item) return;

    const attemptCount = item.attemptCount + 1;
    const isLastChance = attemptCount >= item.maxAttempts;
    
    if (isLastChance) {
      // Abandoner après max tentatives
      await syncDb.syncQueue.delete(id);
      await this.logEvent(item.tag, 'sync', 'abandoned', 
        `Abandonné après ${attemptCount} tentatives: ${error}`, 
        item.data, attemptCount);
      
      console.log(`❌ Queue: Abandon de ${item.tag} après ${attemptCount} tentatives`);
      
      // Ré-enregistrer un nouveau sync avec un tag unique pour éviter les conflisions
      await this.reregisterSync(item);
    } else {
      // Programmer le prochain essai avec backoff exponentiel + jitter
      const backoffMs = Math.min(
        Math.pow(2, attemptCount) * 1000, // 2^n secondes
        15 * 60 * 1000 // Maximum 15 minutes
      );
      const jitter = Math.random() * 0.3 * backoffMs; // ±30% de variation
      const nextAttempt = new Date(Date.now() + backoffMs + jitter);

      await syncDb.syncQueue.update(id, {
        attemptCount,
        nextAttempt,
        lastError: error,
        updatedAt: new Date()
      });

      await this.logEvent(item.tag, 'sync', 'failed', 
        `Tentative ${attemptCount}/${item.maxAttempts} échouée: ${error}. Prochain essai: ${nextAttempt.toLocaleTimeString()}`, 
        item.data, attemptCount);
      
      console.log(`🔄 Queue: Échec de ${item.tag}, prochain essai dans ${Math.round(backoffMs/1000)}s`);
    }
  }

  // Marquer comme réussi et supprimer de la queue
  async markSuccess(id: number, duration?: number): Promise<void> {
    const item = await syncDb.syncQueue.get(id);
    if (!item) return;

    await syncDb.syncQueue.delete(id);
    await this.logEvent(item.tag, 'sync', 'success', 
      `Synchronisation réussie${duration ? ` en ${duration}ms` : ''}`, 
      item.data, item.attemptCount + 1);
    
    console.log(`✅ Queue: Succès de ${item.tag}`);
  }

  // Ré-enregistrer un sync abandonné avec un nouveau tag unique
  private async reregisterSync(originalItem: SyncQueueItem): Promise<void> {
    const newTag = `${originalItem.tag}-retry-${Date.now()}`;
    
    // Enregistrer un nouveau Background Sync avec un tag unique
    if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if ('sync' in registration) {
          await (registration as any).sync.register(newTag);
          
          // Ajouter à la queue avec le nouveau tag
          await this.addToQueue(newTag, originalItem.data, originalItem.maxAttempts);
          
          console.log(`🔄 Queue: Ré-enregistrement avec nouveau tag ${newTag}`);
        }
      } catch (error) {
        console.error('❌ Queue: Impossible de ré-enregistrer le sync:', error);
      }
    }
  }

  // Logger un événement de synchronisation
  async logEvent(tag: string, type: 'sync' | 'periodicsync' | 'manual', 
                 status: 'pending' | 'success' | 'failed' | 'abandoned', 
                 message: string, data?: any, attemptNumber = 0, duration?: number): Promise<void> {
    const event: SyncEvent = {
      tag,
      type,
      status,
      message,
      data,
      attemptNumber,
      duration,
      createdAt: new Date()
    };

    await syncDb.syncEvents.add(event);
  }

  // Nettoyer les anciens événements
  async cleanupOldEvents(): Promise<void> {
    const cutoff = new Date(Date.now() - this.maxRetentionTime);
    
    const deletedQueue = await syncDb.syncQueue
      .where('createdAt')
      .below(cutoff)
      .delete();
    
    const deletedEvents = await syncDb.syncEvents
      .where('createdAt')
      .below(cutoff)
      .delete();
    
    if (deletedQueue > 0 || deletedEvents > 0) {
      console.log(`🧹 Queue: Nettoyage - ${deletedQueue} items queue, ${deletedEvents} événements supprimés`);
    }
  }

  // Obtenir les statistiques de la queue
  async getStats(): Promise<{
    queueSize: number;
    pendingItems: number;
    recentEvents: SyncEvent[];
    oldestPendingDate?: Date;
    lastSuccessDate?: Date;
  }> {
    const queueSize = await syncDb.syncQueue.count();
    const pendingItems = await syncDb.syncQueue
      .where('attemptCount')
      .below(5) // Moins de 5 tentatives
      .count();

    const recentEvents = await syncDb.syncEvents
      .orderBy('createdAt')
      .reverse()
      .limit(10)
      .toArray();

    const oldestPending = await syncDb.syncQueue
      .orderBy('createdAt')
      .first();

    const lastSuccess = await syncDb.syncEvents
      .where('status')
      .equals('success')
      .last();

    return {
      queueSize,
      pendingItems,
      recentEvents,
      oldestPendingDate: oldestPending?.createdAt,
      lastSuccessDate: lastSuccess?.createdAt
    };
  }
}