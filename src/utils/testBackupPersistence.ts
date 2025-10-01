/**
 * Script de test pour vérifier la persistance des données
 * À exécuter dans la console du navigateur
 */

import { db } from "@/lib/database";
import { fileBackup } from "@/services/fileBackup";

// Fonction pour tester la sauvegarde
async function testBackupPersistence() {
  console.log("🧪 Test de persistance des données...");

  try {
    // 1. Vérifier l'état actuel
    console.log("📊 État actuel des données:");

    const clients = await db.clients.count();
    const products = await db.products.count();
    const pesees = await db.pesees.count();
    const transporteurs = await db.transporteurs.count();

    console.log(`- Clients: ${clients}`);
    console.log(`- Produits: ${products}`);
    console.log(`- Pesées: ${pesees}`);
    console.log(`- Transporteurs: ${transporteurs}`);

    // 2. Ajouter une pesée de test
    console.log("➕ Ajout d'une pesée de test...");
    const testPesee = {
      numeroBon: `TEST-${Date.now()}`,
      dateHeure: new Date(),
      plaque: "TEST-123",
      nomEntreprise: "Test Entreprise",
      chantier: "Test Chantier",
      produitId: 1,
      poidsEntree: 10.5,
      poidsSortie: 8.2,
      net: 2.3,
      prixHT: 50.0,
      prixTTC: 60.0,
      moyenPaiement: "Direct",
      clientId: 1,
      transporteurId: 1,
      typeClient: "professionnel" as const,
      synchronized: false,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.pesees.add(testPesee);
    console.log("✅ Pesée de test ajoutée");

    // 3. Forcer une sauvegarde
    console.log("💾 Sauvegarde forcée...");

    if (fileBackup.forceSaveNow) {
      await fileBackup.forceSaveNow();
      console.log("✅ Sauvegarde forcée réussie");
    } else {
      await fileBackup.saveToFile();
      console.log("✅ Sauvegarde normale réussie");
    }

    // 4. Vérifier le timestamp
    const lastBackupTime = localStorage.getItem("lastBackupTime");
    if (lastBackupTime) {
      const backupDate = new Date(parseInt(lastBackupTime));
      console.log(`🕐 Dernière sauvegarde: ${backupDate.toLocaleString()}`);
    }

    // 5. Vérifier IndexedDB
    console.log("🗄️ Vérification IndexedDB...");
    const request = indexedDB.open("FileBackupDB", 3);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(["backups"], "readonly");
      const store = transaction.objectStore("backups");
      const getRequest = store.get("fullBackup");

      getRequest.onsuccess = () => {
        if (getRequest.result) {
          console.log("✅ Sauvegarde trouvée dans IndexedDB");
          const data = JSON.parse(getRequest.result.data);
          console.log(`📊 Données sauvegardées: ${data.pesees.length} pesées`);
        } else {
          console.log("❌ Aucune sauvegarde trouvée dans IndexedDB");
        }
        db.close();
      };
    };

    console.log(
      "🎉 Test terminé! Rafraîchissez la page et vérifiez que les données persistent."
    );
  } catch (error) {
    console.error("❌ Erreur lors du test:", error);
  }
}

// Fonction pour vérifier la persistance après refresh
async function checkPersistenceAfterRefresh() {
  console.log("🔄 Vérification de la persistance après refresh...");

  try {
    const clients = await db.clients.count();
    const products = await db.products.count();
    const pesees = await db.pesees.count();
    const transporteurs = await db.transporteurs.count();

    console.log("📊 Données après refresh:");
    console.log(`- Clients: ${clients}`);
    console.log(`- Produits: ${products}`);
    console.log(`- Pesées: ${pesees}`);
    console.log(`- Transporteurs: ${transporteurs}`);

    // Vérifier s'il y a des pesées de test
    const testPesees = await db.pesees
      .where("numeroBon")
      .startsWith("TEST-")
      .toArray();
    console.log(`🧪 Pesées de test trouvées: ${testPesees.length}`);

    if (testPesees.length > 0) {
      console.log("✅ La persistance fonctionne correctement!");
    } else {
      console.log("⚠️ Aucune pesée de test trouvée - vérifiez la sauvegarde");
    }
  } catch (error) {
    console.error("❌ Erreur lors de la vérification:", error);
  }
}

// Fonction pour nettoyer les données de test
async function cleanupTestData() {
  console.log("🧹 Nettoyage des données de test...");

  try {
    // Supprimer les pesées de test
    const testPesees = await db.pesees
      .where("numeroBon")
      .startsWith("TEST-")
      .toArray();
    for (const pesee of testPesees) {
      await db.pesees.delete(pesee.id!);
    }

    console.log(`✅ ${testPesees.length} pesées de test supprimées`);
  } catch (error) {
    console.error("❌ Erreur lors du nettoyage:", error);
  }
}

// Exporter les fonctions pour utilisation dans la console
(window as any).testBackupPersistence = testBackupPersistence;
(window as any).checkPersistenceAfterRefresh = checkPersistenceAfterRefresh;
(window as any).cleanupTestData = cleanupTestData;

console.log(`
🧪 Scripts de test disponibles:
- testBackupPersistence() : Teste la sauvegarde des données
- checkPersistenceAfterRefresh() : Vérifie la persistance après refresh
- cleanupTestData() : Nettoie les données de test

Exemple d'utilisation:
1. testBackupPersistence()
2. Rafraîchir la page
3. checkPersistenceAfterRefresh()
4. cleanupTestData()
`);
