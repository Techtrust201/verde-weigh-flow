import { supabase } from "@/integrations/supabase/client";
import { SyncQueueManager } from "@/lib/syncQueue";
import { db } from "@/lib/database";
import { formatPeseeForTrackDechet } from "./trackdechetValidation";
import { toast } from "@/hooks/use-toast";

/**
 * Processeur spécialisé pour les tâches Track Déchet dans la file de synchronisation
 */
export class TrackDechetSyncProcessor {
  private static instance: TrackDechetSyncProcessor;
  private syncManager = SyncQueueManager.getInstance();

  static getInstance(): TrackDechetSyncProcessor {
    if (!TrackDechetSyncProcessor.instance) {
      TrackDechetSyncProcessor.instance = new TrackDechetSyncProcessor();
    }
    return TrackDechetSyncProcessor.instance;
  }

  /**
   * Traite tous les items Track Déchet en attente dans la file de synchronisation
   */
  async processTrackDechetQueue(): Promise<{ success: number; failed: number }> {
    console.log('🚀 Starting Track Déchet sync processing...');
    
    const items = await this.syncManager.getReadyItems();
    const trackDechetItems = items.filter(item => item.tag === 'trackdechet_bsd');

    if (trackDechetItems.length === 0) {
      console.log('📭 No Track Déchet items to process');
      return { success: 0, failed: 0 };
    }

    console.log(`📦 Processing ${trackDechetItems.length} Track Déchet items`);

    let successCount = 0;
    let failedCount = 0;

    for (const item of trackDechetItems) {
      try {
        const startTime = Date.now();
        await this.processSingleBSD(item);
        const duration = Date.now() - startTime;
        
        await this.syncManager.markSuccess(item.id!, duration);
        successCount++;
        
        console.log(`✅ BSD created successfully for pesée ${item.data.peseeId}`);
        
      } catch (error) {
        console.error(`❌ Failed to process BSD for pesée ${item.data.peseeId}:`, error);
        await this.syncManager.markAttemptFailed(item.id!, error.message);
        failedCount++;
      }
    }

    // Notification globale du résultat
    if (successCount > 0) {
      toast({
        title: "✅ Track Déchet - Synchronisation réussie",
        description: `${successCount} BSD générés avec succès${failedCount > 0 ? `, ${failedCount} échecs` : ''}`,
      });
    }

    console.log(`🏁 Track Déchet sync completed: ${successCount} success, ${failedCount} failed`);
    return { success: successCount, failed: failedCount };
  }

  /**
   * Traite un seul BSD dans la file de synchronisation
   */
  private async processSingleBSD(queueItem: any): Promise<void> {
    const { peseeId, clientId, transporteurId, productId, codeDechet } = queueItem.data;

    // Récupérer les données nécessaires
    const [pesee, client, transporteur, product, userSettings] = await Promise.all([
      db.pesees.get(peseeId),
      db.clients.get(clientId),
      db.transporteurs.get(transporteurId),
      db.products.get(productId),
      db.userSettings.orderBy('id').last()
    ]);

    if (!pesee || !client || !transporteur || !product || !userSettings) {
      throw new Error('Données manquantes pour générer le BSD');
    }

    // Formater les données pour l'API Track Déchet
    const bsdData = formatPeseeForTrackDechet(
      pesee,
      client,
      transporteur,
      product,
      codeDechet,
      userSettings
    );

    console.log('📝 Sending BSD data to Track Déchet API:', JSON.stringify(bsdData, null, 2));

    // Appeler le proxy backend
    const { data, error } = await supabase.functions.invoke('trackdechet-proxy/createForm', {
      body: bsdData
    });

    if (error) {
      throw new Error(`Erreur du proxy: ${error.message}`);
    }

    if (!data.success) {
      throw new Error(`Erreur API Track Déchet: ${JSON.stringify(data.details)}`);
    }

    const bsd = data.bsd;
    console.log('🎉 BSD created successfully:', bsd);

    // Sauvegarder le BSD en local
    await this.saveBSDLocally(peseeId, bsd.id, bsd.readableId, 'draft');

    // Mettre à jour la pesée avec l'ID du BSD
    await db.pesees.update(peseeId, { 
      bsdId: bsd.id
    });
  }

  /**
   * Sauvegarde un BSD localement
   */
  private async saveBSDLocally(
    peseeId: number, 
    bsdId: string, 
    readableId: string, 
    status: string
  ): Promise<void> {
    await db.bsds.add({
      bsdId,
      readableId,
      peseeId,
      status: status as any,
      createdAt: new Date(),
      lastSyncAt: new Date()
    });
  }

  /**
   * Ajoute une pesée à la file de synchronisation Track Déchet
   */
  async addPeseeToQueue(
    peseeId: number,
    clientId: number,
    transporteurId: number,
    productId: number,
    codeDechet: string
  ): Promise<void> {
    const queueData = {
      peseeId,
      clientId,
      transporteurId,
      productId,
      codeDechet,
      timestamp: Date.now()
    };

    await this.syncManager.addToQueue('trackdechet_bsd', queueData, 3);
    
    console.log(`📤 Added pesée ${peseeId} to Track Déchet sync queue`);
    
    // Créer un BSD local en attente
    await db.bsds.add({
      bsdId: `pending_${peseeId}_${Date.now()}`,
      readableId: `En attente...`,
      peseeId,
      status: 'pending_sync',
      createdAt: new Date(),
      lastSyncAt: new Date()
    });
  }

  /**
   * Synchronise le statut de tous les BSD existants
   */
  async syncAllBSDStatuses(): Promise<void> {
    console.log('🔄 Syncing all BSD statuses...');
    
    const bsds = await db.bsds.where('status').notEqual('pending_sync').toArray();
    
    for (const bsd of bsds) {
      try {
        const { data, error } = await supabase.functions.invoke('trackdechet-proxy/getForm', {
          body: { id: bsd.bsdId }
        });

        if (!error && data.success) {
          const updatedBsd = data.bsd;
          if (updatedBsd.status !== bsd.status) {
            await db.bsds.update(bsd.id!, {
              status: updatedBsd.status as any,
              lastSyncAt: new Date()
            });

            console.log(`📊 Updated BSD ${bsd.readableId} status: ${bsd.status} → ${updatedBsd.status}`);
          }
        }
      } catch (error) {
        console.error(`❌ Failed to sync BSD ${bsd.readableId}:`, error);
      }
    }
    
    console.log('✅ BSD status sync completed');
  }
}

// Instance globale
export const trackDechetProcessor = TrackDechetSyncProcessor.getInstance();