/**
 * Utilitaire pour tester la persistance d'OPFS
 * Permet de vérifier si les données persistent après refresh et vidage du cache
 */

import { opfsBackup } from "@/services/OPFSBackupService";

/**
 * Écrit un fichier de test dans OPFS avec un timestamp
 */
export async function writeTestFile(): Promise<string> {
  try {
    // Vérifier si OPFS est disponible
    if (!opfsBackup.isSupported()) {
      return "❌ OPFS non supporté sur ce navigateur";
    }

    // Créer des données de test avec timestamp
    const timestamp = Date.now();
    const testData = {
      testId: `test-${timestamp}`,
      timestamp,
      date: new Date().toISOString(),
      message: "Ceci est un test de persistance OPFS",
    };

    // Écrire les données dans un fichier OPFS
    await opfsBackup.saveToFile();

    // Stocker l'ID du test dans localStorage pour vérification ultérieure
    localStorage.setItem("opfs-test-id", testData.testId);
    localStorage.setItem("opfs-test-timestamp", timestamp.toString());

    return `✅ Fichier de test écrit avec succès (ID: ${testData.testId})`;
  } catch (error) {
    console.error("❌ Erreur lors de l'écriture du fichier de test:", error);
    return `❌ Erreur: ${(error as Error).message}`;
  }
}

/**
 * Vérifie si le fichier de test existe toujours dans OPFS
 */
export async function checkTestFile(): Promise<string> {
  try {
    // Vérifier si OPFS est disponible
    if (!opfsBackup.isSupported()) {
      return "❌ OPFS non supporté sur ce navigateur";
    }

    // Récupérer l'ID du test précédent
    const testId = localStorage.getItem("opfs-test-id");
    const testTimestamp = localStorage.getItem("opfs-test-timestamp");

    if (!testId || !testTimestamp) {
      return "⚠️ Aucun test précédent trouvé. Exécutez d'abord writeTestFile()";
    }

    // Vérifier si le fichier existe
    const hasFile = await opfsBackup.hasBackupFile();

    if (!hasFile) {
      return "❌ Fichier de test non trouvé - La persistance a échoué";
    }

    // Charger les données pour vérifier
    const backupData = await opfsBackup.loadFromFile();

    if (!backupData) {
      return "❌ Impossible de charger les données - La persistance a échoué";
    }

    // Calculer le temps écoulé depuis le test
    const elapsed = Date.now() - parseInt(testTimestamp);
    const elapsedStr =
      elapsed < 60000
        ? `${Math.round(elapsed / 1000)} secondes`
        : `${Math.round(elapsed / 60000)} minutes`;

    return `✅ Test de persistance réussi! Les données ont survécu après ${elapsedStr}`;
  } catch (error) {
    console.error(
      "❌ Erreur lors de la vérification du fichier de test:",
      error
    );
    return `❌ Erreur: ${(error as Error).message}`;
  }
}

/**
 * Exécute un test complet de persistance
 * À utiliser dans la console du navigateur
 */
export async function runPersistenceTest(): Promise<string> {
  try {
    const result1 = await writeTestFile();
    console.log(result1);

    console.log(
      "🔄 Maintenant, rafraîchissez la page et exécutez checkTestFile()"
    );

    return "✅ Test initialisé. Rafraîchissez la page et exécutez checkTestFile()";
  } catch (error) {
    console.error("❌ Erreur lors du test de persistance:", error);
    return `❌ Erreur: ${(error as Error).message}`;
  }
}

/**
 * Instructions pour tester la persistance après vidage du cache
 */
export function getCacheTestInstructions(): string {
  return `
Pour tester la persistance après vidage du cache:

1. Exécutez runPersistenceTest() et notez l'ID du test
2. Ouvrez les DevTools (F12)
3. Allez dans l'onglet "Application"
4. Dans la section "Storage", cliquez sur "Clear site data"
5. Rafraîchissez la page
6. Exécutez checkTestFile()

Si le test réussit, cela confirme que OPFS survit au vidage du cache!
`;
}
