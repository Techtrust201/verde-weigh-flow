import { db, UserSettings } from "@/lib/database";
import { backgroundSyncManager } from "./backgroundSync";

let syncInterval: NodeJS.Timeout | null = null;
let isInitialized = false;

export const setupAutoSync = async () => {
  // Éviter les réinitialisations multiples
  if (isInitialized) {
    console.log("⚠️ Synchronisation déjà initialisée, ignoré");
    return;
  }

  // Nettoyer l'intervalle existant
  if (syncInterval) {
    clearInterval(syncInterval);
  }

  console.log("🔄 Migration vers le nouveau système de Background Sync");

  // Le nouveau système utilise Periodic Background Sync natif
  // Fallback sur vérification horaire si Periodic Sync non supporté
  syncInterval = setInterval(async () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Synchronisation quotidienne à 17h55 (fallback)
    if (hours === 17 && minutes === 55) {
      console.log(
        "🔄 Fallback: Déclenchement de la synchronisation quotidienne"
      );
      await backgroundSyncManager.performDailySync();
    }
  }, 60000); // Vérifier chaque minute

  isInitialized = true;
  console.log("📅 Système de synchronisation robuste initialisé");
};

export const stopAutoSync = () => {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    // Ne pas réinitialiser isInitialized pour éviter les boucles
    console.log("⏹️ Planificateur de synchronisation automatique arrêté");
  }
};

const performAutoSync = async () => {
  try {
    // Vérifier si l'API Sage est configurée
    const userSettings = await db.userSettings.toCollection().first();

    if (!userSettings?.cleAPISage) {
      console.log(
        "⚠️ Synchronisation automatique annulée: API Sage non configurée"
      );
      return;
    }

    // Vérifier la connexion
    if (!navigator.onLine) {
      console.log("⚠️ Synchronisation automatique annulée: mode hors ligne");
      return;
    }

    // Récupérer les pesées non synchronisées (utiliser 1 au lieu de true pour IndexedDB)
    const pendingPesees = await db.pesees
      .where("synchronized")
      .notEqual(1)
      .toArray();

    if (pendingPesees.length === 0) {
      console.log("✅ Synchronisation automatique: aucune donnée en attente");
      return;
    }

    console.log(
      `🔄 Début de la synchronisation automatique: ${pendingPesees.length} pesée(s)`
    );

    // Simulation de l'envoi vers Sage (à remplacer par la vraie API)
    try {
      // Ici, vous intégrerez l'appel réel à l'API Sage
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Marquer les pesées comme synchronisées
      for (const pesee of pendingPesees) {
        await db.pesees.update(pesee.id!, { synchronized: true });
      }

      console.log(
        `✅ Synchronisation automatique réussie: ${pendingPesees.length} pesée(s) envoyée(s)`
      );

      // Optionnel: Envoyer une notification
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Synchronisation automatique", {
          body: `${pendingPesees.length} pesée(s) synchronisée(s) avec Sage`,
          icon: "/favicon.ico",
        });
      }
    } catch (error) {
      console.error("❌ Erreur lors de la synchronisation automatique:", error);
    }
  } catch (error) {
    console.error(
      "❌ Erreur dans le processus de synchronisation automatique:",
      error
    );
  }
};

// Le démarrage automatique est maintenant géré par App.tsx
// pour éviter les conflits et les boucles infinies
