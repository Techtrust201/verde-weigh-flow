/**
 * Indicateur de synchronisation
 * Affiche l'état de la synchronisation entre IndexedDB et le fichier
 */

import { useState, useEffect } from "react";
import { Loader2, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { fileBackup } from "@/services/fileBackup";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SyncIndicatorProps {
  className?: string;
}

export function SyncIndicator({ className }: SyncIndicatorProps) {
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [hasBackupFile, setHasBackupFile] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<
    "success" | "warning" | "error" | "idle"
  >("idle");

  // Vérifier l'état de la synchronisation
  useEffect(() => {
    const checkSyncStatus = async () => {
      try {
        // Vérifier si un fichier est configuré
        const hasFile = fileBackup.hasBackupFile();
        setHasBackupFile(hasFile);

        if (hasFile) {
          // Récupérer le nom du fichier
          const name = await fileBackup.getCurrentFileName();
          setFileName(name);

          // Récupérer la date de dernière synchronisation
          // TODO: Implémenter la récupération de la date de dernière synchronisation
          setLastSync(new Date());

          // Définir le statut de synchronisation
          setSyncStatus("success");
        } else {
          setSyncStatus("warning");
        }
      } catch (error) {
        console.error(
          "❌ Erreur lors de la vérification du statut de synchronisation:",
          error
        );
        setSyncStatus("error");
      }
    };

    checkSyncStatus();

    // Vérifier régulièrement l'état de la synchronisation
    const interval = setInterval(checkSyncStatus, 60000); // 1 minute

    return () => clearInterval(interval);
  }, []);

  // Écouter les événements de synchronisation
  useEffect(() => {
    const handleSyncStart = () => {
      setIsSyncing(true);
    };

    const handleSyncComplete = () => {
      setIsSyncing(false);
      setLastSync(new Date());
      setSyncStatus("success");
    };

    const handleSyncError = () => {
      setIsSyncing(false);
      setSyncStatus("error");
    };

    // TODO: Implémenter les événements de synchronisation

    return () => {
      // TODO: Nettoyer les écouteurs d'événements
    };
  }, []);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-2 ${className}`}>
            {isSyncing ? (
              <Badge variant="outline" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-xs">Synchronisation...</span>
              </Badge>
            ) : (
              <Badge
                variant={
                  syncStatus === "success"
                    ? "success"
                    : syncStatus === "warning"
                    ? "warning"
                    : syncStatus === "error"
                    ? "destructive"
                    : "outline"
                }
                className="gap-1"
              >
                {syncStatus === "success" && (
                  <CheckCircle className="h-3 w-3" />
                )}
                {syncStatus === "warning" && <Clock className="h-3 w-3" />}
                {syncStatus === "error" && <AlertCircle className="h-3 w-3" />}
                <span className="text-xs">
                  {syncStatus === "success" && "Synchronisé"}
                  {syncStatus === "warning" && "En attente"}
                  {syncStatus === "error" && "Erreur"}
                  {syncStatus === "idle" && "Non configuré"}
                </span>
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {hasBackupFile ? (
            <div className="space-y-1 text-sm">
              <p className="font-medium">Fichier de sauvegarde configuré</p>
              {fileName && <p className="text-xs">{fileName}</p>}
              {lastSync && (
                <p className="text-xs text-muted-foreground">
                  Dernière synchronisation: il y a{" "}
                  {formatDistanceToNow(lastSync, { locale: fr })}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1 text-sm">
              <p className="font-medium">
                Aucun fichier de sauvegarde configuré
              </p>
              <p className="text-xs text-muted-foreground">
                Utilisez "Sauvegarder maintenant" pour configurer un fichier
              </p>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}



