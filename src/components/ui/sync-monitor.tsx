import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, Clock, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { backgroundSyncManager } from '@/utils/backgroundSync';
import { useToast } from '@/hooks/use-toast';

interface SyncMonitorProps {
  onManualSync?: () => Promise<void>;
  className?: string;
}

export function SyncMonitor({ onManualSync, className }: SyncMonitorProps) {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { toast } = useToast();

  // Charger les statistiques
  const loadStats = async () => {
    try {
      const syncStats = await backgroundSyncManager.getStats();
      setStats(syncStats);
    } catch (error) {
      console.error('Erreur lors du chargement des stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Écouter les changements de connexion
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Écouter les messages du Service Worker
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { data } = event;
      
      if (data?.type === 'BACKGROUND_SYNC_REQUEST') {
        handleSyncRequest(data.tag, data.isLastChance);
      } else if (data?.type === 'SYNC_REREGISTER_REQUEST') {
        handleReregisterRequest(data.originalTag, data.error);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);
    
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  // Gérer les demandes de sync du Service Worker
  const handleSyncRequest = async (tag: string, isLastChance: boolean) => {
    try {
      console.log(`🔄 Client: Traitement de la demande de sync ${tag}`);
      
      // Exécuter la synchronisation via le manager
      const success = await backgroundSyncManager.performManualSync();
      
      // Répondre au Service Worker
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SYNC_RESPONSE',
          tag,
          result: { success, error: success ? null : 'Échec de la synchronisation' }
        });
      }
      
      if (success) {
        toast({
          title: "Synchronisation réussie",
          description: `Background sync ${tag} terminé avec succès`,
        });
      }
      
      // Recharger les stats
      await loadStats();
      
    } catch (error) {
      console.error('Erreur lors du traitement de la sync request:', error);
      
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SYNC_RESPONSE',
          tag,
          result: { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' }
        });
      }
    }
  };

  // Gérer les demandes de ré-enregistrement
  const handleReregisterRequest = async (originalTag: string, error: string) => {
    console.log(`🔄 Client: Ré-enregistrement requis pour ${originalTag}: ${error}`);
    
    toast({
      title: "Synchronisation en échec",
      description: `Le sync ${originalTag} a échoué et sera reprogrammé`,
      variant: "destructive"
    });
    
    // Le ré-enregistrement est géré automatiquement par le SyncQueueManager
    await loadStats();
  };

  // Recharger les stats périodiquement
  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000); // Toutes les 30 secondes
    return () => clearInterval(interval);
  }, []);

  // Synchronisation manuelle
  const handleManualSync = async () => {
    try {
      setIsLoading(true);
      
      if (onManualSync) {
        await onManualSync();
      } else {
        await backgroundSyncManager.performManualSync();
      }
      
      await loadStats();
      
      toast({
        title: "Synchronisation réussie",
        description: "Les données ont été synchronisées avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur de synchronisation",
        description: error instanceof Error ? error.message : "Erreur inconnue",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !stats) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Chargement des statistiques...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const hasOldPendingData = stats.oldestPendingDate && 
    (Date.now() - new Date(stats.oldestPendingDate).getTime()) > 24 * 60 * 60 * 1000;

  const hasRecentSuccess = stats.lastSuccessDate && 
    (Date.now() - new Date(stats.lastSuccessDate).getTime()) < 24 * 60 * 60 * 1000;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Statut de connexion */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              {isOnline ? (
                <Wifi className="w-5 h-5 text-green-600" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-600" />
              )}
              Statut de connexion
            </CardTitle>
            <Badge variant={isOnline ? "default" : "destructive"}>
              {isOnline ? "En ligne" : "Hors ligne"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Background Sync:</span>
              <Badge variant={stats.periodicSyncSupported ? "default" : "secondary"} className="ml-2">
                {stats.periodicSyncSupported ? "Supporté" : "Fallback"}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Dernière vérification:</span>
              <span className="ml-2">
                {stats.lastSyncCheck ? new Date(stats.lastSyncCheck).toLocaleTimeString() : 'Jamais'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertes importantes */}
      {hasOldPendingData && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Des données attendent la synchronisation depuis plus de 24h. 
            Vérifiez votre connexion et la configuration de l'API Sage.
          </AlertDescription>
        </Alert>
      )}

      {/* Statistiques de synchronisation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Queue de synchronisation</span>
            <Button 
              onClick={handleManualSync} 
              disabled={isLoading || !isOnline}
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Synchroniser
            </Button>
          </CardTitle>
          <CardDescription>
            Gestion intelligente des données en attente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.queueSize}</div>
              <div className="text-sm text-muted-foreground">Total queue</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.pendingItems}</div>
              <div className="text-sm text-muted-foreground">En attente</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.pendingPesees}</div>
              <div className="text-sm text-muted-foreground">Pesées</div>
            </div>
          </div>

          {stats.oldestPendingDate && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Plus ancienne:</span>
              <span className="text-sm">
                {new Date(stats.oldestPendingDate).toLocaleString()}
              </span>
            </div>
          )}

          {stats.lastSuccessDate && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Dernier succès:</span>
              <span className="text-sm flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-600" />
                {new Date(stats.lastSuccessDate).toLocaleString()}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Événements récents */}
      {stats.recentEvents && stats.recentEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Activité récente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {stats.recentEvents.map((event: any, index: number) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  {event.status === 'success' && <CheckCircle className="w-3 h-3 text-green-600" />}
                  {event.status === 'failed' && <AlertCircle className="w-3 h-3 text-red-600" />}
                  {event.status === 'pending' && <Clock className="w-3 h-3 text-orange-600" />}
                  
                  <span className="flex-1">{event.message}</span>
                  <span className="text-muted-foreground">
                    {new Date(event.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}