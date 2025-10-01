/**
 * Test de compatibilité cross-platform pour la sauvegarde
 * Vérifie les APIs disponibles selon l'OS et le navigateur
 */

export interface CompatibilityReport {
  os: string;
  browser: string;
  fileSystemAccessAPI: boolean;
  downloadAPI: boolean;
  indexedDB: boolean;
  serviceWorker: boolean;
  notifications: boolean;
  recommendations: string[];
}

export class CompatibilityTester {
  /**
   * Détecte l'OS de l'utilisateur
   */
  private detectOS(): string {
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes("windows")) return "Windows";
    if (userAgent.includes("mac")) return "macOS";
    if (userAgent.includes("linux")) return "Linux";
    if (userAgent.includes("android")) return "Android";
    if (userAgent.includes("ios")) return "iOS";

    return "Unknown";
  }

  /**
   * Détecte le navigateur
   */
  private detectBrowser(): string {
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes("chrome") && !userAgent.includes("edg"))
      return "Chrome";
    if (userAgent.includes("firefox")) return "Firefox";
    if (userAgent.includes("safari") && !userAgent.includes("chrome"))
      return "Safari";
    if (userAgent.includes("edg")) return "Edge";
    if (userAgent.includes("opera")) return "Opera";

    return "Unknown";
  }

  /**
   * Teste la File System Access API
   */
  private testFileSystemAccessAPI(): boolean {
    return "showSaveFilePicker" in window && "showOpenFilePicker" in window;
  }

  /**
   * Teste l'API de téléchargement classique
   */
  private testDownloadAPI(): boolean {
    try {
      const a = document.createElement("a");
      return "download" in a && "href" in a;
    } catch {
      return false;
    }
  }

  /**
   * Teste IndexedDB
   */
  private testIndexedDB(): boolean {
    return "indexedDB" in window;
  }

  /**
   * Teste Service Worker
   */
  private testServiceWorker(): boolean {
    return "serviceWorker" in navigator;
  }

  /**
   * Teste les notifications
   */
  private testNotifications(): boolean {
    return "Notification" in window;
  }

  /**
   * Génère des recommandations selon la compatibilité
   */
  private generateRecommendations(report: CompatibilityReport): string[] {
    const recommendations: string[] = [];

    // File System Access API
    if (!report.fileSystemAccessAPI) {
      recommendations.push(
        `⚠️ File System Access API non supportée sur ${report.browser}. ` +
          `Utilisation du téléchargement classique (fonctionne partout).`
      );
    }

    // IndexedDB
    if (!report.indexedDB) {
      recommendations.push(
        `❌ IndexedDB non supporté. L'application ne fonctionnera pas correctement. ` +
          `Mettez à jour votre navigateur.`
      );
    }

    // Service Worker
    if (!report.serviceWorker) {
      recommendations.push(
        `⚠️ Service Worker non supporté. Fonctionnalités hors ligne limitées.`
      );
    }

    // Notifications
    if (!report.notifications) {
      recommendations.push(
        `ℹ️ Notifications non supportées. Pas d'alertes de synchronisation.`
      );
    }

    // Recommandations spécifiques par OS
    if (report.os === "macOS") {
      recommendations.push(
        `🍎 Sur macOS : Utilisez Chrome ou Safari pour la meilleure compatibilité.`
      );
    } else if (report.os === "Linux") {
      recommendations.push(
        `🐧 Sur Linux : Chrome ou Firefox recommandés. Évitez les navigateurs anciens.`
      );
    } else if (report.os === "Windows") {
      recommendations.push(
        `🪟 Sur Windows : Edge, Chrome ou Firefox fonctionnent parfaitement.`
      );
    }

    // Recommandations par navigateur
    if (report.browser === "Safari") {
      recommendations.push(
        `🍎 Safari : File System Access API limitée. Utilisez Chrome pour plus de fonctionnalités.`
      );
    } else if (report.browser === "Firefox") {
      recommendations.push(
        `🦊 Firefox : File System Access API en développement. Chrome recommandé.`
      );
    }

    return recommendations;
  }

  /**
   * Lance le test complet de compatibilité
   */
  public runCompatibilityTest(): CompatibilityReport {
    const os = this.detectOS();
    const browser = this.detectBrowser();

    const report: CompatibilityReport = {
      os,
      browser,
      fileSystemAccessAPI: this.testFileSystemAccessAPI(),
      downloadAPI: this.testDownloadAPI(),
      indexedDB: this.testIndexedDB(),
      serviceWorker: this.testServiceWorker(),
      notifications: this.testNotifications(),
      recommendations: [],
    };

    report.recommendations = this.generateRecommendations(report);

    return report;
  }

  /**
   * Affiche le rapport dans la console
   */
  public logCompatibilityReport(): void {
    const report = this.runCompatibilityTest();

    console.log("🔍 RAPPORT DE COMPATIBILITÉ CROSS-PLATFORM");
    console.log("==========================================");
    console.log(`🖥️  OS: ${report.os}`);
    console.log(`🌐 Navigateur: ${report.browser}`);
    console.log("");
    console.log("📋 APIs Supportées:");
    console.log(
      `  ✅ File System Access API: ${report.fileSystemAccessAPI ? "✅" : "❌"}`
    );
    console.log(`  ✅ Download API: ${report.downloadAPI ? "✅" : "❌"}`);
    console.log(`  ✅ IndexedDB: ${report.indexedDB ? "✅" : "❌"}`);
    console.log(`  ✅ Service Worker: ${report.serviceWorker ? "✅" : "❌"}`);
    console.log(`  ✅ Notifications: ${report.notifications ? "✅" : "❌"}`);
    console.log("");
    console.log("💡 Recommandations:");
    report.recommendations.forEach((rec) => console.log(`  ${rec}`));
    console.log("==========================================");
  }

  /**
   * Teste spécifiquement la sauvegarde
   */
  public testBackupCompatibility(): {
    canSave: boolean;
    canRestore: boolean;
    method: "fileSystemAPI" | "downloadAPI" | "none";
    issues: string[];
  } {
    const report = this.runCompatibilityTest();
    const issues: string[] = [];

    let canSave = false;
    let canRestore = false;
    let method: "fileSystemAPI" | "downloadAPI" | "none" = "none";

    // Test File System Access API
    if (report.fileSystemAccessAPI) {
      canSave = true;
      canRestore = true;
      method = "fileSystemAPI";
    } else if (report.downloadAPI) {
      canSave = true;
      canRestore = true; // Via input file
      method = "downloadAPI";
      issues.push(
        "File System Access API non disponible, utilisation du téléchargement classique"
      );
    } else {
      issues.push("Aucune méthode de sauvegarde disponible");
    }

    if (!report.indexedDB) {
      issues.push("IndexedDB requis pour la sauvegarde");
      canSave = false;
      canRestore = false;
    }

    return {
      canSave,
      canRestore,
      method,
      issues,
    };
  }
}

// Instance globale pour les tests
export const compatibilityTester = new CompatibilityTester();

// Auto-test au chargement (en mode développement)
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  setTimeout(() => {
    compatibilityTester.logCompatibilityReport();
  }, 1000);
}



