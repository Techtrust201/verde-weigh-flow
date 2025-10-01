/**
 * Gestionnaire d'erreurs de sauvegarde
 * Affiche les erreurs de sauvegarde et propose des solutions
 */

import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface BackupError {
  id: string;
  title: string;
  description: string;
  timestamp: Date;
  type: "quota" | "permission" | "corruption" | "network" | "other";
  action?: () => Promise<void>;
  actionLabel?: string;
}

interface BackupErrorHandlerProps {
  className?: string;
}

export function BackupErrorHandler({ className }: BackupErrorHandlerProps) {
  const [errors, setErrors] = useState<BackupError[]>([]);
  const [isResolving, setIsResolving] = useState<boolean>(false);

  // Écouter les événements d'erreur
  useEffect(() => {
    const handleQuotaError = (error: any) => {
      addError({
        id: `quota-${Date.now()}`,
        title: "Espace disque insuffisant",
        description:
          "L'espace disque est insuffisant pour sauvegarder vos données. Libérez de l'espace ou choisissez un autre emplacement.",
        timestamp: new Date(),
        type: "quota",
        action: async () => {
          // Proposer de sauvegarder ailleurs
          // TODO: Implémenter la sauvegarde ailleurs
        },
        actionLabel: "Choisir un autre emplacement",
      });
    };

    const handlePermissionError = (error: any) => {
      addError({
        id: `permission-${Date.now()}`,
        title: "Permissions insuffisantes",
        description:
          "Vous n'avez pas les permissions nécessaires pour sauvegarder dans ce dossier.",
        timestamp: new Date(),
        type: "permission",
        action: async () => {
          // Proposer de sauvegarder ailleurs
          // TODO: Implémenter la sauvegarde ailleurs
        },
        actionLabel: "Choisir un autre emplacement",
      });
    };

    const handleCorruptionError = (error: any) => {
      addError({
        id: `corruption-${Date.now()}`,
        title: "Fichier corrompu",
        description:
          "Le fichier de sauvegarde est corrompu et ne peut pas être utilisé.",
        timestamp: new Date(),
        type: "corruption",
        action: async () => {
          // Proposer de créer un nouveau fichier
          // TODO: Implémenter la création d'un nouveau fichier
        },
        actionLabel: "Créer un nouveau fichier",
      });
    };

    const handleNetworkError = (error: any) => {
      addError({
        id: `network-${Date.now()}`,
        title: "Erreur réseau",
        description: "Une erreur réseau est survenue lors de la sauvegarde.",
        timestamp: new Date(),
        type: "network",
        action: async () => {
          // Proposer de réessayer
          // TODO: Implémenter la réessaie
        },
        actionLabel: "Réessayer",
      });
    };

    // TODO: Ajouter les écouteurs d'événements

    return () => {
      // TODO: Nettoyer les écouteurs d'événements
    };
  }, []);

  // Ajouter une erreur
  const addError = (error: BackupError) => {
    setErrors((prevErrors) => {
      // Éviter les doublons
      const isDuplicate = prevErrors.some((e) => e.type === error.type);
      if (isDuplicate) {
        return prevErrors.map((e) =>
          e.type === error.type ? { ...error, timestamp: new Date() } : e
        );
      }
      return [...prevErrors, error];
    });
  };

  // Supprimer une erreur
  const removeError = (id: string) => {
    setErrors((prevErrors) => prevErrors.filter((e) => e.id !== id));
  };

  // Résoudre une erreur
  const resolveError = async (error: BackupError) => {
    if (!error.action) {
      removeError(error.id);
      return;
    }

    setIsResolving(true);

    try {
      await error.action();
      removeError(error.id);
    } catch (e) {
      console.error(
        `❌ Erreur lors de la résolution de l'erreur ${error.id}:`,
        e
      );
    } finally {
      setIsResolving(false);
    }
  };

  // Si pas d'erreurs, ne rien afficher
  if (errors.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {errors.map((error) => (
        <Alert
          key={error.id}
          variant="destructive"
          className="flex items-start justify-between"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-1" />
            <div>
              <AlertTitle>{error.title}</AlertTitle>
              <AlertDescription>{error.description}</AlertDescription>
            </div>
          </div>

          {error.action && (
            <Button
              size="sm"
              variant="outline"
              className="ml-2"
              onClick={() => resolveError(error)}
              disabled={isResolving}
            >
              {isResolving && (
                <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
              )}
              {error.actionLabel || "Résoudre"}
            </Button>
          )}
        </Alert>
      ))}
    </div>
  );
}



