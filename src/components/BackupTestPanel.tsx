"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Play,
  RefreshCw,
  Trash2,
  Database,
  FileText,
  Clock,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export function BackupTestPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<{
    before: any;
    after: any;
    success: boolean;
  } | null>(null);
  const { toast } = useToast();

  const runBackupTest = async () => {
    setIsRunning(true);
    try {
      // Exécuter le test directement
      await (window as any).testBackupPersistence();

      toast({
        title: "Test lancé",
        description:
          "Vérifiez la console pour les résultats. Rafraîchissez la page pour tester la persistance.",
      });
    } catch (error) {
      console.error("Erreur lors du test:", error);
      toast({
        title: "Erreur de test",
        description: "Impossible d'exécuter le test de sauvegarde.",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const checkPersistence = async () => {
    try {
      await (window as any).checkPersistenceAfterRefresh();

      toast({
        title: "Vérification terminée",
        description: "Consultez la console pour les résultats de persistance.",
      });
    } catch (error) {
      console.error("Erreur lors de la vérification:", error);
      toast({
        title: "Erreur de vérification",
        description: "Impossible de vérifier la persistance.",
        variant: "destructive",
      });
    }
  };

  const cleanupTestData = async () => {
    try {
      await (window as any).cleanupTestData();

      toast({
        title: "Nettoyage terminé",
        description: "Les données de test ont été supprimées.",
      });
    } catch (error) {
      console.error("Erreur lors du nettoyage:", error);
      toast({
        title: "Erreur de nettoyage",
        description: "Impossible de nettoyer les données de test.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Test de Persistance des Données
        </CardTitle>
        <CardDescription>
          Testez la sauvegarde et la persistance des données après un
          rafraîchissement de page.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={runBackupTest}
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            {isRunning ? "Test en cours..." : "Lancer le test"}
          </Button>

          <Button
            onClick={checkPersistence}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Vérifier persistance
          </Button>

          <Button
            onClick={cleanupTestData}
            variant="destructive"
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Nettoyer
          </Button>
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Instructions de test
          </h4>

          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">
                1
              </Badge>
              <span>
                Cliquez sur "Lancer le test" pour ajouter une pesée de test et
                forcer une sauvegarde
              </span>
            </div>

            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">
                2
              </Badge>
              <span>Rafraîchissez la page (F5 ou Ctrl+R)</span>
            </div>

            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">
                3
              </Badge>
              <span>
                Cliquez sur "Vérifier persistance" pour confirmer que les
                données sont toujours là
              </span>
            </div>

            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">
                4
              </Badge>
              <span>
                Cliquez sur "Nettoyer" pour supprimer les données de test
              </span>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Vérifications automatiques
          </h4>

          <div className="space-y-2 text-sm text-muted-foreground">
            <div>✅ Sauvegarde automatique toutes les 5 minutes</div>
            <div>✅ Sauvegarde sur modification (délai de 5 secondes)</div>
            <div>✅ Sauvegarde forcée disponible</div>
            <div>✅ Persistance dans IndexedDB</div>
            <div>✅ Sauvegarde d'urgence dans localStorage</div>
          </div>
        </div>

        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Ouvrez la console du navigateur (F12) pour
            voir les logs détaillés du test.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
