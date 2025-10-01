/**
 * Modal de détection automatique du fichier de sauvegarde
 * Affichée au premier démarrage si un fichier est détecté
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fileDetector } from "@/services/FileDetectorService";
import { fileBackup } from "@/services/fileBackup";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, CheckCircle, AlertCircle, FileJson } from "lucide-react";

interface BackupDetectionModalProps {
  onComplete: () => void;
}

export function BackupDetectionModal({
  onComplete,
}: BackupDetectionModalProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [detectedFile, setDetectedFile] = useState<File | null>(null);
  const [fileDate, setFileDate] = useState<Date | null>(null);
  const { toast } = useToast();

  // Vérifier s'il y a un fichier de sauvegarde
  useEffect(() => {
    const checkForBackupFile = async () => {
      // Vérifier si c'est le premier démarrage
      const isFirstStartup = !localStorage.getItem("app-initialized");

      if (isFirstStartup) {
        setIsSearching(true);
        setIsOpen(true);

        try {
          // Rechercher le fichier de sauvegarde
          const file = await fileDetector.detectBackupFile();

          if (file) {
            setDetectedFile(file);
            setFileDate(new Date(file.lastModified));
          }
        } catch (error) {
          console.error("❌ Erreur lors de la détection du fichier:", error);
        } finally {
          setIsSearching(false);
          localStorage.setItem("app-initialized", "true");
        }
      }
    };

    checkForBackupFile();
  }, []);

  // Fermeture du modal
  const handleClose = () => {
    setIsOpen(false);
    onComplete();
  };

  // Restauration depuis le fichier
  const handleRestore = async () => {
    if (!detectedFile) return;

    setIsRestoring(true);

    try {
      await fileBackup.restoreFromFile(detectedFile);

      toast({
        title: "Restauration réussie",
        description: "Toutes vos données ont été restaurées avec succès",
        variant: "success",
      });

      setIsOpen(false);
      onComplete();
    } catch (error) {
      console.error("❌ Erreur lors de la restauration:", error);

      toast({
        title: "Erreur de restauration",
        description: "Impossible de restaurer vos données. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isSearching
              ? "Recherche de sauvegarde..."
              : detectedFile
              ? "Fichier de sauvegarde détecté"
              : "Bienvenue sur Verde Weigh Flow"}
          </DialogTitle>
          <DialogDescription>
            {isSearching
              ? "Recherche d'un fichier de sauvegarde sur votre ordinateur..."
              : detectedFile
              ? "Un fichier de sauvegarde a été trouvé. Souhaitez-vous restaurer vos données ?"
              : "Aucun fichier de sauvegarde n'a été trouvé. Vous pouvez commencer à utiliser l'application."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isSearching && (
            <div className="flex items-center justify-center gap-4 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p>Recherche en cours...</p>
            </div>
          )}

          {!isSearching && detectedFile && (
            <div className="rounded-md border p-4">
              <div className="flex items-start gap-4">
                <FileJson className="h-10 w-10 text-primary" />
                <div className="space-y-1">
                  <h4 className="font-medium">{detectedFile.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {fileDate && (
                      <>
                        Dernière modification: il y a{" "}
                        {formatDistanceToNow(fileDate, { locale: fr })}
                      </>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Taille: {(detectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
            </div>
          )}

          {!isSearching && !detectedFile && (
            <div className="flex items-center justify-center gap-4 py-8">
              <AlertCircle className="h-8 w-8 text-yellow-500" />
              <p>Aucun fichier de sauvegarde trouvé</p>
            </div>
          )}
        </div>

        <DialogFooter>
          {!isSearching && detectedFile && (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isRestoring}
              >
                Ignorer
              </Button>
              <Button onClick={handleRestore} disabled={isRestoring}>
                {isRestoring ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Restauration...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Restaurer
                  </>
                )}
              </Button>
            </>
          )}

          {!isSearching && !detectedFile && (
            <Button onClick={handleClose}>Commencer</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



