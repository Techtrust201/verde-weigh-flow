import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FileText,
  Save,
  FolderOpen,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Info,
  Eye,
  Database,
  HardDrive,
  Download,
  Upload,
} from "lucide-react";
import { fileBackup } from "@/services/fileBackup";
import { opfsBackup } from "@/services/OPFSBackupService";
import { backupManager, BackupMethod } from "@/services/BackupManager";
import { useToast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function BackupFileStatus() {
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [hasBackupFile, setHasBackupFile] = useState(false);
  const [isFileSystemAPIAvailable, setIsFileSystemAPIAvailable] =
    useState(false);
  const [isOPFSAvailable, setIsOPFSAvailable] = useState(false);
  const [activeMethod, setActiveMethod] = useState<BackupMethod>("indexeddb");
  const [isLoading, setIsLoading] = useState(true);
  const [showStorageDetails, setShowStorageDetails] = useState(false);
  interface StorageDetails {
    opfs?: {
      available: boolean;
      active: boolean;
      hasFile: boolean;
    };
    fileSystem?: {
      available: boolean;
      active: boolean;
      currentFile: string | null;
      hasHandle: boolean;
    };
    indexedDB?: {
      available: boolean;
      active: boolean;
      databases: Array<{ name: string; stores: string[] }>;
      size: string;
    };
    localStorage?: {
      available: boolean;
      keys: string[];
      size: number;
    };
    lastBackup?: string | null;
    appInitialized?: string | null;
    persistenceStatus?: string | null;
  }

  const [storageDetails, setStorageDetails] = useState<StorageDetails | null>(
    null
  );
  const { toast } = useToast();

  const loadStatus = async () => {
    try {
      setIsLoading(true);
      console.log("🔄 Chargement du statut du fichier de sauvegarde...");

      // Initialiser le gestionnaire de sauvegarde si nécessaire
      await backupManager.initialize();

      // Récupérer le statut
      const status = await backupManager.getBackupStatus();

      // Mettre à jour les états
      setIsFileSystemAPIAvailable(status.isFileSystemAvailable);
      setIsOPFSAvailable(status.isOPFSAvailable);
      setActiveMethod(status.activeMethod);
      setHasBackupFile(status.hasBackupFile);
      setCurrentFileName(status.backupFileName);

      console.log("📊 Statut de sauvegarde:", status);
    } catch (error) {
      console.error("❌ Erreur lors du chargement du statut:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStorageDetails = useCallback(async () => {
    try {
      const details = {
        opfs: {
          available: isOPFSAvailable,
          active: activeMethod === "opfs",
          hasFile:
            opfsBackup.hasBackupFile && (await opfsBackup.hasBackupFile()),
        },
        fileSystem: {
          available: isFileSystemAPIAvailable,
          active: activeMethod === "file-system",
          currentFile: currentFileName,
          hasHandle: fileBackup.getCurrentFileHandle() !== null,
        },
        indexedDB: {
          available: true, // IndexedDB est toujours disponible
          active: activeMethod === "indexeddb",
          databases: [],
          size: "Calcul en cours...",
        },
        localStorage: {
          available: typeof window !== "undefined" && "localStorage" in window,
          keys: Object.keys(localStorage),
          size: JSON.stringify(localStorage).length,
        },
        lastBackup: localStorage.getItem("lastBackupDownload"),
        appInitialized: localStorage.getItem("app-initialized"),
        persistenceStatus: null as string | null,
      };

      // Vérifier le statut de persistance du stockage
      try {
        if (navigator.storage && navigator.storage.persisted) {
          const isPersisted = await navigator.storage.persisted();
          details.persistenceStatus = isPersisted
            ? "✅ Persistant"
            : "⚠️ Non persistant";
        } else {
          details.persistenceStatus = "❌ API non disponible";
        }
      } catch (error) {
        details.persistenceStatus = "❌ Erreur";
        console.error(
          "Erreur lors de la vérification de la persistance:",
          error
        );
      }

      // Essayer de calculer la taille d'IndexedDB
      if (details.indexedDB.available) {
        try {
          // Vérifier les bases de données OPFS et FileBackup
          const dbNames = ["OPFSBackupDB", "FileBackupDB"];
          const dbInfos = [];

          for (const dbName of dbNames) {
            try {
              const request = indexedDB.open(dbName);
              request.onsuccess = () => {
                const db = request.result;
                dbInfos.push({
                  name: dbName,
                  stores: Array.from(db.objectStoreNames),
                });
                db.close();
              };
            } catch (dbError) {
              console.warn(`Impossible d'ouvrir ${dbName}:`, dbError);
            }
          }

          details.indexedDB.databases = dbInfos;
        } catch (error) {
          console.warn("Impossible de calculer la taille d'IndexedDB:", error);
        }
      }

      setStorageDetails(details);
    } catch (error) {
      console.error("Erreur lors du chargement des détails:", error);
    }
  }, [
    isOPFSAvailable,
    isFileSystemAPIAvailable,
    activeMethod,
    currentFileName,
  ]);

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      loadStorageDetails();
    }
  }, [isLoading, loadStorageDetails]);

  const handleSelectFile = async () => {
    try {
      // Si OPFS est disponible, utiliser l'import OPFS
      if (isOPFSAvailable) {
        // Sélectionner un fichier à importer
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = ".json";

        fileInput.onchange = async (event) => {
          const file = (event.target as HTMLInputElement).files?.[0];
          if (file) {
            try {
              await backupManager.importFromFile(file);
              toast({
                title: "Import réussi",
                description: `Le fichier "${file.name}" a été importé avec succès.`,
              });
              await loadStatus();
              await loadStorageDetails();
            } catch (importError) {
              console.error("Erreur lors de l'import:", importError);
              toast({
                title: "Erreur d'import",
                description:
                  "Impossible d'importer le fichier. Format invalide ou erreur de lecture.",
                variant: "destructive",
              });
            }
          }
        };

        fileInput.click();
      } else {
        // Fallback sur File System API
        if (!hasBackupFile) {
          await fileBackup.saveToNewFile();
        } else {
          // Forcer une nouvelle sélection de fichier
          fileBackup.resetBackupFile();
          await fileBackup.saveToNewFile();
        }

        // Recharger le statut
        await loadStatus();
        await loadStorageDetails();

        toast({
          title: "Fichier sélectionné",
          description: "Le fichier de sauvegarde a été configuré.",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sélectionner le fichier.",
        variant: "destructive",
      });
    }
  };

  const handleDetectExistingFile = async () => {
    try {
      toast({
        title: "Recherche en cours",
        description: "Sélectionnez le fichier verde-weigh-flow-backup.json",
      });

      if (isOPFSAvailable) {
        // Pour OPFS, on utilise l'import
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = ".json";

        fileInput.onchange = async (event) => {
          const file = (event.target as HTMLInputElement).files?.[0];
          if (file) {
            if (file.name.includes("verde-weigh-flow-backup")) {
              try {
                await backupManager.importFromFile(file);
                toast({
                  title: "Fichier importé",
                  description: `Fichier "${file.name}" importé avec succès.`,
                });
                await loadStatus();
                await loadStorageDetails();
              } catch (importError) {
                console.error("Erreur lors de l'import:", importError);
                toast({
                  title: "Erreur d'import",
                  description: "Impossible d'importer le fichier.",
                  variant: "destructive",
                });
              }
            } else {
              toast({
                title: "Fichier non reconnu",
                description:
                  "Le fichier sélectionné n'est pas un fichier de sauvegarde verde-weigh-flow-backup.json.",
                variant: "destructive",
              });
            }
          }
        };

        fileInput.click();
      } else {
        // Fallback sur File System API
        // Utiliser directement le file picker pour sélectionner le fichier
        // TypeScript ne connaît pas encore showOpenFilePicker dans tous les environnements
        const fileHandle = await (
          window as unknown as {
            showOpenFilePicker: (
              options: Record<string, unknown>
            ) => Promise<FileSystemFileHandle[]>;
          }
        ).showOpenFilePicker({
          types: [
            {
              description: "Fichier de sauvegarde",
              accept: {
                "application/json": [".json"],
              },
            },
          ],
          multiple: false,
        });

        if (fileHandle && fileHandle.length > 0) {
          const file = await fileHandle[0].getFile();

          // Si le nom du fichier correspond
          if (file.name.includes("verde-weigh-flow-backup")) {
            console.log("📄 Fichier sélectionné:", file.name);

            try {
              // Sauvegarder le handle dans IndexedDB
              await fileBackup.setCurrentFileHandle(fileHandle[0]);
              console.log("✅ Handle sauvegardé avec succès");

              // Force la réinitialisation complète du service
              await fileBackup.initialize();

              // Recharger le statut avec un délai pour s'assurer que tout est bien mis à jour
              setTimeout(async () => {
                await loadStatus();
                await loadStorageDetails();

                toast({
                  title: "Fichier configuré",
                  description: `Fichier "${file.name}" configuré avec succès.`,
                });
              }, 500);
            } catch (saveError) {
              console.error(
                "❌ Erreur lors de la sauvegarde du handle:",
                saveError
              );
              toast({
                title: "Erreur de configuration",
                description:
                  "Impossible de configurer le fichier. Vérifiez les permissions.",
                variant: "destructive",
              });
            }
          } else {
            toast({
              title: "Fichier non reconnu",
              description:
                "Le fichier sélectionné n'est pas un fichier de sauvegarde verde-weigh-flow-backup.json.",
              variant: "destructive",
            });
          }
        }
      }
    } catch (error) {
      // Si l'utilisateur annule, ne pas afficher d'erreur
      if ((error as Error)?.name !== "AbortError") {
        toast({
          title: "Erreur de détection",
          description: "Impossible de configurer le fichier sélectionné.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSaveNow = async () => {
    try {
      await backupManager.saveBackup();
      toast({
        title: "Sauvegarde réussie",
        description: "Vos données ont été sauvegardées.",
      });
      await loadStatus();
      await loadStorageDetails();
    } catch (error) {
      toast({
        title: "Erreur de sauvegarde",
        description: "Impossible de sauvegarder les données.",
        variant: "destructive",
      });
    }
  };

  const handleForceSaveNow = async () => {
    try {
      // Utiliser la méthode forceSaveNow si disponible
      if (fileBackup.forceSaveNow) {
        await fileBackup.forceSaveNow();
      } else {
        await backupManager.saveBackup();
      }

      toast({
        title: "Sauvegarde forcée réussie",
        description: "Vos données ont été sauvegardées immédiatement.",
      });
      await loadStatus();
      await loadStorageDetails();
    } catch (error) {
      toast({
        title: "Erreur de sauvegarde forcée",
        description: "Impossible de forcer la sauvegarde.",
        variant: "destructive",
      });
    }
  };

  const handleExportFile = async () => {
    try {
      await backupManager.exportToDownload();
      toast({
        title: "Export réussi",
        description: "Vos données ont été exportées dans un fichier.",
      });
    } catch (error) {
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter les données.",
        variant: "destructive",
      });
    }
  };

  const handleRequestPersistence = async () => {
    try {
      if (navigator.storage && navigator.storage.persist) {
        const isPersisted = await navigator.storage.persist();
        if (isPersisted) {
          toast({
            title: "Persistance accordée",
            description: "Le stockage est maintenant persistant.",
          });
        } else {
          toast({
            title: "Persistance refusée",
            description: "Le navigateur a refusé la persistance du stockage.",
            variant: "destructive",
          });
        }
        await loadStorageDetails();
      } else {
        toast({
          title: "Non supporté",
          description:
            "Votre navigateur ne supporte pas la persistance du stockage.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de demander la persistance du stockage.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Chargement du statut...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Statut du Fichier de Sauvegarde
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statut de l'API */}
        <div className="space-y-3">
          <h4 className="font-semibold">Compatibilité</h4>

          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center gap-2">
                {isOPFSAvailable ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <span>Origin Private File System (OPFS)</span>
              </div>
              <Badge variant={isOPFSAvailable ? "default" : "destructive"}>
                {isOPFSAvailable ? "✅ Disponible" : "❌ Non disponible"}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center gap-2">
                {isFileSystemAPIAvailable ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <span>File System Access API</span>
              </div>
              <Badge
                variant={isFileSystemAPIAvailable ? "default" : "destructive"}
              >
                {isFileSystemAPIAvailable
                  ? "✅ Disponible"
                  : "❌ Non disponible"}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>IndexedDB</span>
              </div>
              <Badge variant="default">✅ Disponible</Badge>
            </div>
          </div>
        </div>

        {/* Statut du fichier */}
        <div className="space-y-3">
          <h4 className="font-semibold">Fichier de Sauvegarde</h4>

          <div className="space-y-3">
            {hasBackupFile ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 border rounded bg-green-50">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Fichier configuré</span>
                  </div>
                  <Badge
                    variant="default"
                    className="bg-green-100 text-green-800"
                  >
                    ✅ Actif
                  </Badge>
                </div>

                {currentFileName && (
                  <div className="p-2 border rounded bg-blue-50">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">
                        Fichier actuel :
                      </span>
                    </div>
                    <p className="text-sm text-blue-800 mt-1 font-mono">
                      {currentFileName}
                    </p>
                  </div>
                )}

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Sauvegarde intelligente activée :</strong> Vos
                    données sont sauvegardées automatiquement dans{" "}
                    {activeMethod === "opfs"
                      ? "OPFS"
                      : activeMethod === "file-system"
                      ? "un fichier local"
                      : "IndexedDB"}
                    .
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 border rounded bg-yellow-50">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium">Aucun fichier configuré</span>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-yellow-300 text-yellow-800"
                  >
                    ⚠️ À configurer
                  </Badge>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Première sauvegarde :</strong>{" "}
                    {isOPFSAvailable ? "Importez" : "Sélectionnez"} un fichier
                    pour activer la sauvegarde intelligente. Les prochaines
                    sauvegardes se feront automatiquement.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            onClick={loadStatus}
            variant="outline"
            size="icon"
            title="Rafraîchir le statut"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          {!hasBackupFile && (
            <>
              <Button onClick={handleSelectFile} className="flex-1">
                {isOPFSAvailable ? (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Importer un fichier
                  </>
                ) : (
                  <>
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Sélectionner un fichier
                  </>
                )}
              </Button>
              <Button onClick={handleDetectExistingFile} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Détecter fichier existant
              </Button>
            </>
          )}

          {hasBackupFile && (
            <>
              <Button
                onClick={handleSaveNow}
                variant="outline"
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder maintenant
              </Button>

              <Button
                onClick={handleForceSaveNow}
                variant="outline"
                className="flex-1"
                title="Force une sauvegarde immédiate sans délai"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Sauvegarde forcée
              </Button>

              <Button onClick={handleExportFile} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </>
          )}
        </div>

        {/* Détails du stockage */}
        <div className="pt-4 border-t">
          <Collapsible
            open={showStorageDetails}
            onOpenChange={setShowStorageDetails}
          >
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-start">
                <Eye className="h-4 w-4 mr-2" />
                Voir les détails du stockage
                {showStorageDetails ? " ▼" : " ▶"}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              {storageDetails && (
                <>
                  {/* OPFS */}
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <HardDrive className="h-4 w-4" />
                      Origin Private File System (OPFS)
                    </h4>
                    <div className="p-3 border rounded bg-blue-50">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Disponible:</span>
                          <Badge
                            variant={
                              storageDetails.opfs?.available
                                ? "default"
                                : "destructive"
                            }
                          >
                            {storageDetails.opfs?.available
                              ? "✅ Oui"
                              : "❌ Non"}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Actif:</span>
                          <Badge
                            variant={
                              storageDetails.opfs?.active
                                ? "default"
                                : "outline"
                            }
                          >
                            {storageDetails.opfs?.active ? "✅ Oui" : "❌ Non"}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Fichier configuré:</span>
                          <Badge
                            variant={
                              storageDetails.opfs?.hasFile
                                ? "default"
                                : "outline"
                            }
                          >
                            {storageDetails.opfs?.hasFile ? "✅ Oui" : "❌ Non"}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Persistance:</span>
                          <span className="font-medium text-blue-700">
                            {storageDetails.persistenceStatus || "Inconnu"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* IndexedDB */}
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      IndexedDB (Cache intelligent)
                    </h4>
                    <div className="p-3 border rounded bg-green-50">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Disponible:</span>
                          <Badge
                            variant={
                              storageDetails.indexedDB?.available
                                ? "default"
                                : "destructive"
                            }
                          >
                            {storageDetails.indexedDB?.available
                              ? "✅ Oui"
                              : "❌ Non"}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Actif:</span>
                          <Badge
                            variant={
                              storageDetails.indexedDB?.active
                                ? "default"
                                : "outline"
                            }
                          >
                            {storageDetails.indexedDB?.active
                              ? "✅ Oui"
                              : "❌ Non"}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Rôle:</span>
                          <span className="font-medium text-green-700">
                            Cache rapide + Backup secondaire
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* File System API */}
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      File System Access API
                    </h4>
                    <div className="p-3 border rounded bg-orange-50">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Disponible:</span>
                          <Badge
                            variant={
                              storageDetails.fileSystem?.available
                                ? "default"
                                : "destructive"
                            }
                          >
                            {storageDetails.fileSystem?.available
                              ? "✅ Oui"
                              : "❌ Non"}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Actif:</span>
                          <Badge
                            variant={
                              storageDetails.fileSystem?.active
                                ? "default"
                                : "outline"
                            }
                          >
                            {storageDetails.fileSystem?.active
                              ? "✅ Oui"
                              : "❌ Non"}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Fichier actuel:</span>
                          <span className="font-mono">
                            {storageDetails.fileSystem?.currentFile || "Aucun"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Handle configuré:</span>
                          <Badge
                            variant={
                              storageDetails.fileSystem?.hasHandle
                                ? "default"
                                : "outline"
                            }
                          >
                            {storageDetails.fileSystem?.hasHandle
                              ? "✅ Oui"
                              : "❌ Non"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      onClick={loadStorageDetails}
                      variant="outline"
                      size="sm"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Actualiser les détails
                    </Button>
                    <Button
                      onClick={handleRequestPersistence}
                      variant="outline"
                      size="sm"
                    >
                      <HardDrive className="h-4 w-4 mr-2" />
                      Demander persistance
                    </Button>
                  </div>
                </>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </CardContent>
    </Card>
  );
}
