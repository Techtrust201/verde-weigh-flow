
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, CheckCircle, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { db, Pesee, UserSettings } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';

export default function ComptabiliteSpace() {
  const [pesees, setPesees] = useState<Pesee[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming online
      if (userSettings?.cleAPISage) {
        handleSyncToSage();
      }
    };
    
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadData = async () => {
    try {
      const [peseesData, settingsData] = await Promise.all([
        db.pesees.toArray(),
        db.userSettings.toCollection().first()
      ]);
      
      setPesees(peseesData);
      setUserSettings(settingsData || null);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleSyncToSage = async () => {
    if (!userSettings?.cleAPISage) {
      toast({
        title: "Configuration manquante",
        description: "Veuillez configurer votre clé API Sage dans les paramètres utilisateur.",
        variant: "destructive"
      });
      return;
    }

    if (!isOnline) {
      toast({
        title: "Connexion requise",
        description: "Une connexion internet est nécessaire pour synchroniser avec Sage.",
        variant: "destructive"
      });
      return;
    }

    setIsSyncing(true);

    try {
      // Simulation de l'envoi vers Sage
      // Dans un vrai projet, ici vous feriez l'appel API vers Sage
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Marquer les pesées comme synchronisées
      // (vous pourriez ajouter un champ 'synchronized' à votre modèle Pesee)
      
      setLastSync(new Date());
      
      toast({
        title: "Synchronisation réussie",
        description: `${pesees.length} pesée(s) envoyée(s) vers Sage.`
      });
    } catch (error) {
      console.error('Error syncing to Sage:', error);
      toast({
        title: "Erreur de synchronisation",
        description: "Impossible d'envoyer les données vers Sage. Veuillez réessayer.",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const pendingPesees = pesees.filter(pesee => !pesee.synchronized);
  const syncedPesees = pesees.filter(pesee => pesee.synchronized);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Comptabilité</h1>
        <div className="flex items-center space-x-2">
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
              ✓ Configuration Sage active. Synchronisation automatique activée.
            </span>
          ) : (
            <span className="text-orange-600">
              ⚠ Clé API Sage non configurée. Veuillez configurer votre clé API dans les paramètres utilisateur.
            </span>
          )}
        </AlertDescription>
      </Alert>

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
            <p className="text-sm text-gray-600">
              pesée(s) à synchroniser
            </p>
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
              {lastSync ? lastSync.toLocaleDateString() : 'Jamais'}
            </div>
            <p className="text-sm text-gray-600">
              {lastSync ? lastSync.toLocaleTimeString() : 'Aucune synchronisation'}
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
                Envoyer toutes les données en attente vers votre logiciel de comptabilité Sage.
              </p>
            </div>
            <Button
              onClick={handleSyncToSage}
              disabled={!isOnline || !userSettings?.cleAPISage || isSyncing || pendingPesees.length === 0}
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

      {/* Sync Log */}
      {pendingPesees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Données en attente de synchronisation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pendingPesees.slice(0, 10).map((pesee) => (
                <div key={pesee.id} className="flex justify-between items-center p-2 bg-orange-50 rounded">
                  <div>
                    <span className="font-medium">{pesee.numeroBon}</span>
                    <span className="text-sm text-gray-600 ml-2">
                      {pesee.nomEntreprise} - {pesee.dateHeure.toLocaleDateString()}
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
