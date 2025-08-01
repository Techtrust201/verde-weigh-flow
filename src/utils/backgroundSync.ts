import { db } from '@/lib/database';
import { SyncQueueManager } from '@/lib/syncQueue';
import { conflictResolver } from '@/utils/conflictResolver';

export class BackgroundSyncManager {
  private static instance: BackgroundSyncManager;
  private queueManager: SyncQueueManager;
  private isPeriodicSyncSupported = false;

  constructor() {
    this.queueManager = SyncQueueManager.getInstance();
    this.checkPeriodicSyncSupport();
  }

  static getInstance(): BackgroundSyncManager {
    if (!BackgroundSyncManager.instance) {
      BackgroundSyncManager.instance = new BackgroundSyncManager();
    }
    return BackgroundSyncManager.instance;
  }

  private async checkPeriodicSyncSupport(): Promise<void> {
    if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
      try {
        const registration = await navigator.serviceWorker.ready;
        this.isPeriodicSyncSupported = 'periodicSync' in registration;
        
        if (this.isPeriodicSyncSupported) {
          console.log('✅ Periodic Background Sync supporté');
          await this.setupPeriodicSync();
        } else {
          console.log('⚠️ Periodic Background Sync non supporté, fallback sur mécanisme manuel');
          this.setupFallbackSync();
        }
      } catch (error) {
        console.error('❌ Erreur lors de la vérification du support Periodic Sync:', error);
        this.setupFallbackSync();
      }
    }
  }

  // Enregistrer une synchronisation immédiate (one-off)
  async scheduleOneOffSync(data: any): Promise<void> {
    const tag = `pesees-sync-${Date.now()}`;
    
    try {
      // Ajouter à la queue interne
      await this.queueManager.addToQueue(tag, data);

      // Enregistrer le Background Sync natif
      if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
        const registration = await navigator.serviceWorker.ready;
        if ('sync' in registration) {
          await (registration as any).sync.register(tag);
          console.log(`🔄 Background Sync enregistré: ${tag}`);
        }
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'enregistrement du Background Sync:', error);
      // Fallback : sync immédiate si Background Sync échoue
      await this.performManualSync(data);
    }
  }

  // Configurer la synchronisation périodique quotidienne
  private async setupPeriodicSync(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      if ('periodicSync' in registration) {
        // Enregistrer une sync quotidienne
        await (registration as any).periodicSync.register('daily-sync', {
          minInterval: 24 * 60 * 60 * 1000 // 24 heures
        });
        
        console.log('📅 Periodic Background Sync quotidien configuré');
      }
    } catch (error) {
      console.error('❌ Erreur lors de la configuration du Periodic Sync:', error);
      this.setupFallbackSync();
    }
  }

  // Fallback si Periodic Sync non supporté
  private setupFallbackSync(): void {
    // Vérifier toutes les heures si une sync est nécessaire
    setInterval(async () => {
      const now = new Date();
      const lastCheck = localStorage.getItem('lastSyncCheck');
      const lastSyncTime = lastCheck ? new Date(lastCheck) : new Date(0);
      
      // Si plus de 24h depuis la dernière sync réussie
      const hoursSinceLastSync = (now.getTime() - lastSyncTime.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastSync >= 24) {
        console.log('🔄 Fallback: Déclenchement sync quotidienne');
        await this.performDailySync();
      }
    }, 60 * 60 * 1000); // Chaque heure
  }

  // Synchronisation manuelle (utilisée en fallback)
  async performManualSync(data?: any): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      await this.queueManager.logEvent('manual-sync', 'manual', 'pending', 'Début de la synchronisation manuelle');
      
      // Récupérer les données à synchroniser
      const syncData = data || await this.getPendingData();
      
      if (!syncData || syncData.length === 0) {
        await this.queueManager.logEvent('manual-sync', 'manual', 'success', 'Aucune donnée à synchroniser');
        return true;
      }

      // Vérifier la configuration et la connexion
      const userSettings = await db.userSettings.toCollection().first();
      if (!userSettings?.cleAPISage) {
        throw new Error('Clé API Sage non configurée');
      }

      if (!navigator.onLine) {
        throw new Error('Mode hors ligne - synchronisation impossible');
      }

      // Simulation de l'API Sage (à remplacer par l'implémentation réelle)
      const apiResponse = await this.callSageAPI(syncData, userSettings.cleAPISage);

      // Détecter et résoudre les conflits si l'API retourne des données mises à jour
      if (apiResponse && apiResponse.updatedData) {
        const conflicts = await conflictResolver.detectConflicts(apiResponse.updatedData);
        if (conflicts.length > 0) {
          console.log(`⚠️ ${conflicts.length} conflit(s) détecté(s), résolution automatique...`);
          await conflictResolver.resolveConflicts(conflicts);
        }
      }

      // Marquer les données comme synchronisées avec version mise à jour
      for (const pesee of syncData) {
        await db.pesees.update(pesee.id!, { 
          synchronized: true,
          version: (pesee.version || 1) + 1,
          lastSyncHash: this.calculatePeseeHash(pesee)
        });
      }

      const duration = Date.now() - startTime;
      await this.queueManager.logEvent('manual-sync', 'manual', 'success', 
        `${syncData.length} pesée(s) synchronisée(s)`, syncData, 1, duration);

      localStorage.setItem('lastSyncCheck', new Date().toISOString());
      
      console.log(`✅ Sync manuelle réussie: ${syncData.length} pesée(s) en ${duration}ms`);
      return true;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      
      await this.queueManager.logEvent('manual-sync', 'manual', 'failed', 
        `Échec de la synchronisation: ${errorMessage}`, data, 1, duration);
      
      console.error('❌ Échec de la sync manuelle:', error);
      return false;
    }
  }

  // Synchronisation quotidienne
  async performDailySync(): Promise<void> {
    console.log('📅 Exécution de la synchronisation quotidienne');
    
    const pendingData = await this.getPendingData();
    if (pendingData.length > 0) {
      const success = await this.performManualSync(pendingData);
      
      if (success) {
        // Notifier l'utilisateur si supporté
        this.notifyUser(`Synchronisation quotidienne réussie: ${pendingData.length} pesée(s)`);
      }
    }
  }

  // Récupérer les données en attente de synchronisation
  private async getPendingData(): Promise<any[]> {
    return await db.pesees.where('synchronized').notEqual(1).toArray();
  }

  // Appel à l'API Sage (simulation)
  private async callSageAPI(data: any[], apiKey: string): Promise<any> {
    // Simulation - à remplacer par l'implémentation réelle
    console.log(`🔄 Envoi vers Sage de ${data.length} pesée(s) avec clé ${apiKey.substring(0, 8)}...`);
    
    // Simulation d'un délai réseau
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Simulation d'un échec aléatoire (5% de chance)
    if (Math.random() < 0.05) {
      throw new Error('Erreur de l\'API Sage (simulation)');
    }

    // Simulation : parfois l'API retourne des données mises à jour (conflit possible)
    if (Math.random() < 0.1) { // 10% de chance de conflit simulé
      return {
        success: true,
        updatedData: data.map(pesee => ({
          ...pesee,
          version: (pesee.version || 1) + 1,
          // Simuler une modification côté serveur
          moyenPaiement: pesee.moyenPaiement + ' (modifié serveur)'
        }))
      };
    }

    return { success: true };
  }

  // Calculer un hash pour une pesée
  private calculatePeseeHash(pesee: any): string {
    const importantFields = {
      numeroBon: pesee.numeroBon,
      poidsEntree: pesee.poidsEntree,
      poidsSortie: pesee.poidsSortie,
      net: pesee.net,
      prixHT: pesee.prixHT,
      prixTTC: pesee.prixTTC,
      moyenPaiement: pesee.moyenPaiement
    };
    
    return btoa(JSON.stringify(importantFields));
  }

  // Notifier l'utilisateur
  private notifyUser(message: string): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Synchronisation automatique', {
        body: message,
        icon: '/favicon.ico',
        tag: 'sync-notification'
      });
    }
  }

  // Obtenir les statistiques
  async getStats(): Promise<any> {
    const queueStats = await this.queueManager.getStats();
    const pendingData = await this.getPendingData();
    const conflictCount = await conflictResolver.getConflictCount();
    
    return {
      ...queueStats,
      pendingPesees: pendingData.length,
      conflictCount,
      periodicSyncSupported: this.isPeriodicSyncSupported,
      lastSyncCheck: localStorage.getItem('lastSyncCheck')
    };
  }

  // Nettoyer les données anciennes
  async cleanup(): Promise<void> {
    await this.queueManager.cleanupOldEvents();
    await conflictResolver.cleanupOldConflicts();
  }
}

// Instance globale
export const backgroundSyncManager = BackgroundSyncManager.getInstance();