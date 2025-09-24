/**
 * Service de synchronisation en arrière-plan pour Track Déchet
 * Intégré avec le service worker existant
 */

import { trackDechetProcessor } from './trackdechetSyncProcessor';

/**
 * Démarre la synchronisation Track Déchet en arrière-plan
 */
export const startTrackDechetBackgroundSync = () => {
  // Lancer la synchronisation Track Déchet toutes les 30 secondes
  const interval = setInterval(async () => {
    try {
      await trackDechetProcessor.processTrackDechetQueue();
    } catch (error) {
      console.error('Erreur synchronisation Track Déchet en arrière-plan:', error);
    }
  }, 30000); // 30 secondes

  console.log('🚀 Synchronisation Track Déchet en arrière-plan démarrée');

  // Nettoyer à la fermeture
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      clearInterval(interval);
    });
  }

  return interval;
};

/**
 * Synchronise immédiatement la file Track Déchet
 */
export const syncTrackDechetNow = async (): Promise<void> => {
  try {
    console.log('⚡ Synchronisation immédiate Track Déchet déclenchée');
    await trackDechetProcessor.processTrackDechetQueue();
  } catch (error) {
    console.error('Erreur synchronisation immédiate Track Déchet:', error);
    throw error;
  }
};

/**
 * Synchronise les statuts des BSD existants
 */
export const syncBSDStatuses = async (): Promise<void> => {
  try {
    console.log('📊 Synchronisation des statuts BSD déclenchée');
    await trackDechetProcessor.syncAllBSDStatuses();
  } catch (error) {
    console.error('Erreur synchronisation statuts BSD:', error);
    throw error;
  }
};

// Auto-démarrage si nous sommes dans le navigateur
if (typeof window !== 'undefined') {
  // Démarrer après un délai pour permettre l'initialisation
  setTimeout(startTrackDechetBackgroundSync, 5000);
}