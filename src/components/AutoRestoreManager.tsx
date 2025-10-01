/**
 * Composant de gestion de l'auto-restore
 * Affiche les options de restauration automatique
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Download,
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  Info,
  FolderOpen,
} from "lucide-react";
import { autoRestoreService } from "@/services/autoRestoreService";
import { fileBackup } from "@/services/fileBackup";
import { useToast } from "@/hooks/use-toast";

export default function AutoRestoreManager() {
  const [isChecking, setIsChecking] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [hasExistingData, setHasExistingData] = useState(false);
  const [backupFiles, setBackupFiles] = useState<File[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    checkExistingData();
  }, []);

  const checkExistingData = async () => {
    try {
      const hasData = await autoRestoreService.hasExistingData();
      setHasExistingData(hasData);
    } catch (error) {
      console.error("Erreur vérification données existantes:", error);
    }
  };

  const handleCheckForBackups = async () => {
    setIsChecking(true);
    try {
      const found = await autoRestoreService.checkForAutoRestore();
      if (found) {
        toast({
          title: "🔍 Fichiers de sauvegarde détectés",
          description: "Restauration automatique proposée",
        });
      } else {
        toast({
          title: "📁 Aucun fichier de sauvegarde trouvé",
          description: "Aucune restauration automatique disponible",
        });
      }
    } catch (error) {
      toast({
        title: "❌ Erreur de vérification",
        description: "Impossible de vérifier les fichiers de sauvegarde",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleManualRestore = async () => {
    try {
      await fileBackup.restoreWithFileSystemAPI();
      toast({
        title: "✅ Restauration manuelle réussie",
        description: "Toutes vos données ont été restaurées",
      });
      await checkExistingData();
    } catch (error) {
      if ((error as any).name !== "AbortError") {
        toast({
          title: "❌ Erreur de restauration",
          description: "Impossible de restaurer les données",
          variant: "destructive",
        });
      }
    }
  };

  const handleForceCheck = async () => {
    setIsChecking(true);
    try {
      const found = await autoRestoreService.forceCheck();
      if (found) {
        toast({
          title: "🔄 Vérification forcée",
          description: "Restauration automatique en cours",
        });
      }
    } catch (error) {
      toast({
        title: "❌ Erreur de vérification forcée",
        description: "Impossible de forcer la vérification",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Restauration Automatique
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statut des données existantes */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Info className="h-4 w-4" />
            Statut des Données
          </h4>

          {hasExistingData ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Données existantes détectées</strong> - L'auto-restore
                ne s'activera pas automatiquement pour éviter d'écraser vos
                données actuelles.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Aucune donnée existante</strong> - L'auto-restore peut
                s'activer automatiquement si des fichiers de sauvegarde sont
                détectés.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Fonctionnement de l'auto-restore */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Comment ça fonctionne
          </h4>

          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Badge variant="outline">1</Badge>
              <span>
                Copiez votre fichier <code>verde-weigh-flow-backup.json</code>{" "}
                sur le nouvel ordinateur
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">2</Badge>
              <span>Ouvrez l'application web</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">3</Badge>
              <span>
                L'app détecte automatiquement le fichier de sauvegarde
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">4</Badge>
              <span>
                Confirmez la restauration → Toutes vos données sont restaurées
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Actions Disponibles
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={handleCheckForBackups}
              disabled={isChecking}
              className="w-full"
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              {isChecking ? "Vérification..." : "Vérifier les sauvegardes"}
            </Button>

            <Button
              onClick={handleManualRestore}
              variant="outline"
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Restauration manuelle
            </Button>
          </div>

          {hasExistingData && (
            <Button
              onClick={handleForceCheck}
              disabled={isChecking}
              variant="secondary"
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {isChecking ? "Vérification..." : "Forcer la vérification"}
            </Button>
          )}
        </div>

        {/* Informations importantes */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Important :</strong> L'auto-restore ne fonctionne que si
            vous n'avez pas encore de données dans l'application. Si vous avez
            déjà des données, utilisez la restauration manuelle pour éviter de
            les écraser.
          </AlertDescription>
        </Alert>

        {/* Compatibilité */}
        <div className="space-y-3">
          <h4 className="font-semibold">Compatibilité</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>
              ✅ <strong>Chrome/Edge :</strong> Détection automatique complète
            </div>
            <div>
              ⚠️ <strong>Firefox/Safari :</strong> Détection limitée,
              restauration manuelle recommandée
            </div>
            <div>
              📱 <strong>Mobile :</strong> Restauration manuelle uniquement
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}



