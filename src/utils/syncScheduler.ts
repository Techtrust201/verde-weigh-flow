
import { db, UserSettings } from '@/lib/database';

let syncInterval: NodeJS.Timeout | null = null;

export const setupAutoSync = () => {
  // Nettoyer l'intervalle existant
  if (syncInterval) {
    clearInterval(syncInterval);
  }

  // Vérifier toutes les minutes si c'est l'heure de synchroniser
  syncInterval = setInterval(async () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Synchronisation quotidienne à 17h55
    if (hours === 17 && minutes === 55) {
      console.log('🔄 Déclenchement de la synchronisation automatique quotidienne');
      await performAutoSync();
    }
  }, 60000); // Vérifier chaque minute

  console.log('📅 Planificateur de synchronisation automatique activé (17h55 quotidien)');
};

export const stopAutoSync = () => {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('⏹️ Planificateur de synchronisation automatique arrêté');
  }
};

const performAutoSync = async () => {
  try {
    // Vérifier si l'API Sage est configurée
    const userSettings = await db.userSettings.toCollection().first();
    
    if (!userSettings?.cleAPISage) {
      console.log('⚠️ Synchronisation automatique annulée: API Sage non configurée');
      return;
    }

    // Vérifier la connexion
    if (!navigator.onLine) {
      console.log('⚠️ Synchronisation automatique annulée: mode hors ligne');
      return;
    }

    // Récupérer les pesées non synchronisées
    const pendingPesees = await db.pesees.where('synchronized').notEqual(true).toArray();
    
    if (pendingPesees.length === 0) {
      console.log('✅ Synchronisation automatique: aucune donnée en attente');
      return;
    }

    console.log(`🔄 Début de la synchronisation automatique: ${pendingPesees.length} pesée(s)`);

    // Simulation de l'envoi vers Sage (à remplacer par la vraie API)
    try {
      // Ici, vous intégrerez l'appel réel à l'API Sage
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Marquer les pesées comme synchronisées
      for (const pesee of pendingPesees) {
        await db.pesees.update(pesee.id!, { synchronized: true });
      }

      console.log(`✅ Synchronisation automatique réussie: ${pendingPesees.length} pesée(s) envoyée(s)`);
      
      // Optionnel: Envoyer une notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Synchronisation automatique', {
          body: `${pendingPesees.length} pesée(s) synchronisée(s) avec Sage`,
          icon: '/favicon.ico'
        });
      }

    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation automatique:', error);
    }

  } catch (error) {
    console.error('❌ Erreur dans le processus de synchronisation automatique:', error);
  }
};

// Démarrer automatiquement le planificateur
if (typeof window !== 'undefined') {
  setupAutoSync();
  
  // Nettoyer lors du déchargement de la page
  window.addEventListener('beforeunload', stopAutoSync);
}
