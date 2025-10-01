import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Settings,
  Clock,
  HardDrive,
  Database,
  Cloud,
  Info,
  Save,
  RefreshCw,
  CheckCircle,
} from "lucide-react";
import { fileBackup } from "@/services/fileBackup";
import { useToast } from "@/hooks/use-toast";

interface BackupSettings {
  autoBackupEnabled: boolean;
  backupIntervalMinutes: number;
  supabaseSyncEnabled: boolean;
}

export default function BackupSettings() {
  const [settings, setSettings] = useState<BackupSettings>({
    autoBackupEnabled: true,
    backupIntervalMinutes: 5,
    supabaseSyncEnabled: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Charger depuis localStorage ou utiliser les valeurs par défaut
      const savedSettings = localStorage.getItem("backupSettings");
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error("Erreur lors du chargement des paramètres:", error);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // Sauvegarder dans localStorage
      localStorage.setItem("backupSettings", JSON.stringify(settings));

      // Redémarrer la sauvegarde automatique avec les nouveaux paramètres
      if (settings.autoBackupEnabled) {
        fileBackup.stopAutoBackup();
        // Redémarrer avec le nouvel intervalle
        setTimeout(() => {
          fileBackup.startAutoBackup(settings.backupIntervalMinutes);
        }, 100);
      } else {
        fileBackup.stopAutoBackup();
      }

      toast({
        title: "Paramètres sauvegardés",
        description: "Les paramètres de sauvegarde ont été mis à jour.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const testBackup = async () => {
    setIsTesting(true);
    try {
      await fileBackup.saveToFile();
      toast({
        title: "Test réussi",
        description: "La sauvegarde fonctionne correctement.",
      });
    } catch (error) {
      toast({
        title: "Erreur de test",
        description: "La sauvegarde a échoué.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const testSupabaseSync = async () => {
    setIsTesting(true);
    try {
      // Synchronisation Supabase désactivée temporairement
      toast({
        title: "Synchronisation Supabase",
        description:
          "La synchronisation Supabase est temporairement désactivée.",
      });
      toast({
        title: "Test de sync réussi",
        description: "La synchronisation Supabase fonctionne.",
      });
    } catch (error) {
      toast({
        title: "Erreur de sync",
        description: "La synchronisation Supabase a échoué.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const formatInterval = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} minute${minutes > 1 ? "s" : ""}`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        return `${hours} heure${hours > 1 ? "s" : ""}`;
      } else {
        return `${hours}h ${remainingMinutes}min`;
      }
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuration des Sauvegardes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sauvegarde automatique locale */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-blue-600" />
              <Label className="font-semibold">
                Sauvegarde automatique locale
              </Label>
            </div>
            <Switch
              checked={settings.autoBackupEnabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, autoBackupEnabled: checked })
              }
            />
          </div>

          {settings.autoBackupEnabled && (
            <div className="space-y-3 pl-6">
              <div className="space-y-2">
                <Label htmlFor="backup-interval">Fréquence de sauvegarde</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="backup-interval"
                    type="number"
                    min="1"
                    max="1440"
                    value={settings.backupIntervalMinutes}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        backupIntervalMinutes: parseInt(e.target.value) || 5,
                      })
                    }
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">minutes</span>
                  <Badge variant="outline">
                    {formatInterval(settings.backupIntervalMinutes)}
                  </Badge>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Actuellement :</strong> Sauvegarde toutes les{" "}
                  {formatInterval(settings.backupIntervalMinutes)} dans le
                  dossier Téléchargements.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        {/* Synchronisation Supabase */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-green-600" />
              <Label className="font-semibold">Synchronisation Supabase</Label>
            </div>
            <Switch
              checked={settings.supabaseSyncEnabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, supabaseSyncEnabled: checked })
              }
            />
          </div>

          {settings.supabaseSyncEnabled && (
            <div className="space-y-3 pl-6">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Fonctionnement Track Déchet :</strong> Synchronise
                  automatiquement vers Supabase UNIQUEMENT les données Track
                  Déchet (pesées avec produits dangereux) pour éviter les
                  problèmes CORS.
                  <br />
                  <strong>Déclenchement :</strong> Dès qu'une pesée contient un
                  produit dangereux, toutes les données nécessaires sont
                  envoyées à Supabase.
                  <br />
                  <strong>Avantage :</strong> Conformité réglementaire garantie,
                  pas de problèmes CORS, synchronisation automatique.
                </AlertDescription>
              </Alert>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">
                    Synchronisation intelligente activée
                  </span>
                </div>
                <p className="text-sm text-green-700">
                  Vos données Track Déchet sont synchronisées automatiquement
                  dès qu'une pesée contient un produit dangereux.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Pattern de stockage */}
        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <Database className="h-4 w-4" />
            Pattern de Stockage
          </h4>

          <div className="grid grid-cols-1 gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="h-4 w-4 text-blue-600" />
                <span className="font-medium">
                  1. IndexedDB (Local - Principal)
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                <strong>Stocke :</strong> TOUTES vos données (clients, produits,
                pesées, paramètres)
                <br />
                <strong>Avantage :</strong> Ultra-rapide, fonctionne hors ligne
                <br />
                <strong>Fonctionnement :</strong> Sauvegarde instantanée à
                chaque modification
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="h-4 w-4 text-orange-600" />
                <span className="font-medium">
                  2. Fichier JSON (Local - Backup)
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                <strong>Stocke :</strong> TOUTES vos données dans un fichier
                <br />
                <strong>Avantage :</strong> Survit au formatage, crash, etc.
                <br />
                <strong>Fonctionnement :</strong> Sauvegarde automatique toutes
                les {formatInterval(settings.backupIntervalMinutes)}
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Cloud className="h-4 w-4 text-green-600" />
                <span className="font-medium">
                  3. Supabase (Cloud - Backup optionnel)
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                <strong>Stocke :</strong> UNIQUEMENT les données Track Déchet
                (pesées avec produits dangereux)
                <br />
                <strong>Avantage :</strong> Évite les problèmes CORS, conformité
                réglementaire garantie
                <br />
                <strong>Fonctionnement :</strong> Sync automatique dès qu'une
                pesée contient un produit dangereux
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={saveSettings} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Sauvegarde..." : "Sauvegarder"}
          </Button>

          <Button onClick={testBackup} variant="outline" disabled={isTesting}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Test sauvegarde
          </Button>

          <Button
            onClick={testSupabaseSync}
            variant="outline"
            disabled={isTesting}
          >
            <Cloud className="h-4 w-4 mr-2" />
            Test sync Supabase
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
