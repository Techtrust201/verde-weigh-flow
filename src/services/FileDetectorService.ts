/**
 * Service de détection automatique du fichier de sauvegarde
 * Cherche le fichier verde-weigh-flow-backup.json dans les dossiers courants
 */

export interface DetectedFile {
  file: File;
  path: string;
  lastModified: number;
  isValid: boolean;
  data?: any;
}

export class FileDetectorService {
  private static instance: FileDetectorService;
  private readonly BACKUP_FILENAME = "verde-weigh-flow-backup.json";
  private readonly BACKUP_FILENAME_PATTERN = "verde-weigh-flow-backup*.json";
  private isFileSystemAPIAvailable: boolean = false;

  constructor() {
    this.isFileSystemAPIAvailable =
      typeof window !== "undefined" &&
      "showOpenFilePicker" in window &&
      "showSaveFilePicker" in window;

    console.log(
      `🔍 File System Access API: ${
        this.isFileSystemAPIAvailable ? "✅ Disponible" : "❌ Non disponible"
      }`
    );
  }

  /**
   * Obtient l'instance unique du service (Singleton)
   */
  public static getInstance(): FileDetectorService {
    if (!FileDetectorService.instance) {
      FileDetectorService.instance = new FileDetectorService();
    }
    return FileDetectorService.instance;
  }

  /**
   * Détecte automatiquement le fichier de sauvegarde
   * Cherche dans Downloads, Desktop, Documents
   */
  async detectBackupFile(): Promise<File | null> {
    if (!this.isFileSystemAPIAvailable) {
      console.log(
        "⚠️ File System Access API non disponible, détection impossible"
      );
      return null;
    }

    try {
      console.log("🔍 Recherche automatique du fichier de sauvegarde...");

      // Pour éviter les SecurityError, on ne fait pas de recherche automatique
      // L'utilisateur devra utiliser le bouton "Détecter fichier existant"
      console.log(
        "ℹ️ Détection automatique désactivée pour éviter les erreurs de sécurité"
      );
      console.log(
        "💡 Utilisez le bouton 'Détecter fichier existant' pour rechercher manuellement"
      );

      return null;
    } catch (error) {
      console.error("❌ Erreur lors de la détection automatique:", error);
      return null;
    }
  }

  /**
   * Recherche dans le dossier Downloads
   */
  private async searchInDownloads(): Promise<File | null> {
    try {
      const [fileHandle] = await (
        window as unknown as {
          showOpenFilePicker: (options: any) => Promise<FileSystemFileHandle[]>;
        }
      ).showOpenFilePicker({
        startIn: "downloads",
        types: [
          {
            description: "Fichier de sauvegarde Verde Weigh Flow",
            accept: { "application/json": [".json"] },
          },
        ],
        multiple: false,
        excludeAcceptAllOption: true,
      });

      const file = await fileHandle.getFile();
      if (file.name.includes("verde-weigh-flow-backup")) {
        return file;
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.warn("⚠️ Erreur lors de la recherche dans Downloads:", error);
      }
    }
    return null;
  }

  /**
   * Recherche dans le dossier Desktop
   */
  private async searchInDesktop(): Promise<File | null> {
    try {
      const [fileHandle] = await (
        window as unknown as {
          showOpenFilePicker: (options: any) => Promise<FileSystemFileHandle[]>;
        }
      ).showOpenFilePicker({
        startIn: "desktop",
        types: [
          {
            description: "Fichier de sauvegarde Verde Weigh Flow",
            accept: { "application/json": [".json"] },
          },
        ],
        multiple: false,
        excludeAcceptAllOption: true,
      });

      const file = await fileHandle.getFile();
      if (file.name.includes("verde-weigh-flow-backup")) {
        return file;
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.warn("⚠️ Erreur lors de la recherche dans Desktop:", error);
      }
    }
    return null;
  }

  /**
   * Recherche dans le dossier Documents
   */
  private async searchInDocuments(): Promise<File | null> {
    try {
      const [fileHandle] = await (
        window as unknown as {
          showOpenFilePicker: (options: any) => Promise<FileSystemFileHandle[]>;
        }
      ).showOpenFilePicker({
        startIn: "documents",
        types: [
          {
            description: "Fichier de sauvegarde Verde Weigh Flow",
            accept: { "application/json": [".json"] },
          },
        ],
        multiple: false,
        excludeAcceptAllOption: true,
      });

      const file = await fileHandle.getFile();
      if (file.name.includes("verde-weigh-flow-backup")) {
        return file;
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.warn("⚠️ Erreur lors de la recherche dans Documents:", error);
      }
    }
    return null;
  }

  /**
   * Recherche tous les fichiers de sauvegarde
   */
  async findAllBackupFiles(): Promise<DetectedFile[]> {
    if (!this.isFileSystemAPIAvailable) {
      console.log(
        "⚠️ File System Access API non disponible, détection impossible"
      );
      return [];
    }

    try {
      const files: DetectedFile[] = [];

      // Chercher dans tous les dossiers
      const locations = ["downloads", "desktop", "documents"];

      for (const location of locations) {
        try {
          const handles = await (
            window as unknown as {
              showOpenFilePicker: (
                options: any
              ) => Promise<FileSystemFileHandle[]>;
            }
          ).showOpenFilePicker({
            startIn: location,
            types: [
              {
                description: "Fichier de sauvegarde Verde Weigh Flow",
                accept: { "application/json": [".json"] },
              },
            ],
            multiple: true,
            excludeAcceptAllOption: true,
          });

          for (const handle of handles) {
            try {
              const file = await handle.getFile();
              if (file.name.includes("verde-weigh-flow-backup")) {
                // Vérifier l'intégrité du fichier
                let isValid = false;
                let data = null;

                try {
                  const text = await file.text();
                  data = JSON.parse(text);
                  isValid = true;
                } catch (error) {
                  console.warn(`⚠️ Fichier corrompu: ${file.name}`, error);
                }

                files.push({
                  file,
                  path: location,
                  lastModified: file.lastModified,
                  isValid,
                  data: isValid ? data : undefined,
                });
              }
            } catch (error) {
              console.warn(
                `⚠️ Erreur lors de la lecture du fichier dans ${location}:`,
                error
              );
            }
          }
        } catch (error) {
          if ((error as Error).name !== "AbortError") {
            console.warn(
              `⚠️ Erreur lors de la recherche dans ${location}:`,
              error
            );
          }
        }
      }

      return files;
    } catch (error) {
      console.error("❌ Erreur lors de la recherche de fichiers:", error);
      return [];
    }
  }

  /**
   * Résout les conflits entre plusieurs fichiers
   * Prend le fichier le plus récent et valide
   */
  async resolveFileConflicts(files: DetectedFile[]): Promise<File | null> {
    if (files.length === 0) {
      return null;
    }

    // 1. Filtrer les fichiers valides
    const validFiles = files.filter((f) => f.isValid);
    if (validFiles.length === 0) {
      console.warn("⚠️ Aucun fichier valide trouvé");
      return null;
    }

    // 2. Prendre le fichier le plus récent
    const mostRecent = validFiles.sort(
      (a, b) => b.lastModified - a.lastModified
    )[0];
    console.log(
      `✅ Fichier le plus récent sélectionné: ${mostRecent.file.name}`
    );

    return mostRecent.file;
  }
}

// Instance globale
let fileDetectorInstance: FileDetectorService | null = null;

export const fileDetector = {
  getInstance: () => {
    if (!fileDetectorInstance) {
      fileDetectorInstance = new FileDetectorService();
    }
    return fileDetectorInstance;
  },
  detectBackupFile: () => {
    return fileDetector.getInstance().detectBackupFile();
  },
  findAllBackupFiles: () => {
    return fileDetector.getInstance().findAllBackupFiles();
  },
  resolveFileConflicts: (files: DetectedFile[]) => {
    return fileDetector.getInstance().resolveFileConflicts(files);
  },
};
