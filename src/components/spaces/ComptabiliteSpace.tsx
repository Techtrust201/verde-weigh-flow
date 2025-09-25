import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Upload,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  Clock,
  Settings,
} from "lucide-react";
import { db, Pesee, UserSettings } from "@/lib/database";
import { useToast } from "@/hooks/use-toast";
import { setupAutoSync, stopAutoSync } from "@/utils/syncScheduler";
import { backgroundSyncManager } from "@/utils/backgroundSync";
import { SyncMonitor } from "@/components/ui/sync-monitor";
import { conflictResolver } from "@/utils/conflictResolver";

export default function ComptabiliteSpace() {
  const [pesees, setPesees] = useState<Pesee[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [conflictCount, setConflictCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    loadData();

    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming online
      if (userSettings?.cleAPISage && autoSyncEnabled) {
        handleSyncToSage();
      }
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Démarrer la synchronisation automatique si activée
    if (autoSyncEnabled) {
      setupAutoSync();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      stopAutoSync();
    };
  }, [autoSyncEnabled, userSettings]);

  const loadData = async () => {
    try {
      const [peseesData, settingsData, conflicts] = await Promise.all([
        db.pesees.toArray(),
        db.userSettings.toCollection().first(),
        conflictResolver.getConflictCount(),
      ]);

      setPesees(peseesData);
      setUserSettings(settingsData || null);
      setConflictCount(conflicts);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleAutoSyncToggle = (enabled: boolean) => {
    setAutoSyncEnabled(enabled);

    if (enabled) {
      setupAutoSync();
      toast({
        title: "Synchronisation automatique activée",
        description:
          "Les données seront synchronisées automatiquement chaque jour à 17h55.",
      });
    } else {
      stopAutoSync();
      toast({
        title: "Synchronisation automatique désactivée",
        description: "Vous devrez synchroniser manuellement vos données.",
      });
    }
  };

  const handleSyncToSage = async () => {
    setIsSyncing(true);

    try {
      // Utiliser le nouveau système de Background Sync robuste
      const success = await backgroundSyncManager.performManualSync();

      if (success) {
        // Recharger les données
        await loadData();
        setLastSync(new Date());

        toast({
          title: "Synchronisation réussie",
          description: "Les données ont été synchronisées avec Sage.",
        });
      } else {
        toast({
          title: "Erreur de synchronisation",
          description:
            "La synchronisation a échoué. Vérifiez votre configuration et votre connexion.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("❌ Erreur lors de la synchronisation:", error);

      toast({
        title: "Erreur de synchronisation",
        description:
          error instanceof Error
            ? error.message
            : "Une erreur inconnue est survenue.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const pendingPesees = pesees.filter((pesee) => !pesee.synchronized);
  const syncedPesees = pesees.filter((pesee) => pesee.synchronized);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Comptabilité</h1>
        <div className="flex items-center space-x-2">
          {conflictCount > 0 && (
            <Badge
              variant="secondary"
              className="bg-orange-100 text-orange-800"
            >
              <AlertCircle className="h-3 w-3 mr-1" />
              {conflictCount} conflit(s)
            </Badge>
          )}
          {isOnline ? (
            <Badge variant="default" className="bg-green-500">
              <Wifi className="h-3 w-3 mr-1" />
              En ligne
            </Badge>
          ) : (
            <Badge variant="destructive">
              <WifiOff className="h-3 w-3 mr-1" />
              Hors ligne
            </Badge>
          )}
        </div>
      </div>

      {/* Sage Configuration Status */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {userSettings?.cleAPISage ? (
            <span className="text-green-600">
              ✓ Configuration Sage active. Synchronisation automatique{" "}
              {autoSyncEnabled ? "activée" : "désactivée"}.
            </span>
          ) : (
            <span className="text-orange-600">
              ⚠ Clé API Sage non configurée. Veuillez configurer votre clé API
              dans les paramètres utilisateur.
            </span>
          )}
        </AlertDescription>
      </Alert>

      {/* Configuration de la synchronisation automatique */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuration de la synchronisation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <Label htmlFor="auto-sync">
                  Synchronisation automatique quotidienne
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Synchronise automatiquement les données avec Sage chaque jour à
                17h55
              </p>
            </div>
            <Switch
              id="auto-sync"
              checked={autoSyncEnabled}
              onCheckedChange={handleAutoSyncToggle}
              disabled={!userSettings?.cleAPISage}
            />
          </div>

          {autoSyncEnabled && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                La synchronisation automatique est programmée tous les jours à
                17h55. Assurez-vous que l'application reste ouverte pour que la
                synchronisation se déclenche.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Sync Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Données en attente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {pendingPesees.length}
            </div>
            <p className="text-sm text-gray-600">pesée(s) à synchroniser</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Données synchronisées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {syncedPesees.length}
            </div>
            <p className="text-sm text-gray-600">
              pesée(s) envoyée(s) vers Sage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dernière sync</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {lastSync ? lastSync.toLocaleDateString() : "Jamais"}
            </div>
            <p className="text-sm text-gray-600">
              {lastSync
                ? lastSync.toLocaleTimeString()
                : "Aucune synchronisation"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sync Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Synchronisation avec Sage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Envoi manuel vers Sage</h3>
              <p className="text-sm text-gray-600">
                Envoyer toutes les données en attente vers votre logiciel de
                comptabilité Sage.
              </p>
            </div>
            <Button
              onClick={handleSyncToSage}
              disabled={
                !isOnline ||
                !userSettings?.cleAPISage ||
                isSyncing ||
                pendingPesees.length === 0
              }
            >
              {isSyncing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Synchronisation...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Synchroniser ({pendingPesees.length})
                </>
              )}
            </Button>
          </div>

          {pendingPesees.length === 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Toutes les données ont été synchronisées avec Sage.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Nouveau système de monitoring de synchronisation */}
      <SyncMonitor onManualSync={handleSyncToSage} />

      {/* Affichage des conflits s'il y en a */}
      {conflictCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="h-5 w-5" />
              Conflits de synchronisation détectés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {conflictCount} conflit(s) de données ont été détectés et
                résolus automatiquement. Les versions locales ont été
                conservées. Si vous souhaitez forcer une resynchronisation
                complète, utilisez le bouton de synchronisation manuelle.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Sync Log */}
      {pendingPesees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Données en attente de synchronisation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pendingPesees.slice(0, 10).map((pesee) => (
                <div
                  key={pesee.id}
                  className="flex justify-between items-center p-2 bg-orange-50 rounded"
                >
                  <div>
                    <span className="font-medium">{pesee.numeroBon}</span>
                    <span className="text-sm text-gray-600 ml-2">
                      {pesee.nomEntreprise} -{" "}
                      {pesee.dateHeure.toLocaleDateString()}
                    </span>
                  </div>
                  <Badge variant="outline">En attente</Badge>
                </div>
              ))}
              {pendingPesees.length > 10 && (
                <p className="text-sm text-gray-600 text-center">
                  ... et {pendingPesees.length - 10} autres pesées
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
