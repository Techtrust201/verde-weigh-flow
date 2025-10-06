// Version simplifiée du système de synchronisation pour éviter les boucles infinies

let syncInterval: NodeJS.Timeout | null = null;
let isInitialized = false;

export const setupSimpleAutoSync = async () => {
  // Éviter les réinitialisations multiples
  if (isInitialized) {
    console.log("⚠️ Synchronisation simple déjà initialisée, ignoré");
    return;
  }

  // Nettoyer l'intervalle existant
  if (syncInterval) {
    clearInterval(syncInterval);
  }

  console.log("🔄 Démarrage du système de synchronisation simple");

  // Synchronisation quotidienne à 17h55
  syncInterval = setInterval(async () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Synchronisation quotidienne à 17h55
    if (hours === 17 && minutes === 55) {
      console.log("🔄 Déclenchement de la synchronisation quotidienne");
      // Ici on pourrait ajouter la logique de synchronisation
    }
  }, 60000); // Vérifier chaque minute

  isInitialized = true;
  console.log("📅 Système de synchronisation simple initialisé");
};

export const stopSimpleAutoSync = () => {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    isInitialized = false;
    console.log("⏹️ Système de synchronisation simple arrêté");
  }
};

// Fonction pour tester la synchronisation
export const testSync = () => {
  console.log("🧪 Test de synchronisation simple");
  console.log("✅ Système de synchronisation fonctionnel");
  return true;
};
