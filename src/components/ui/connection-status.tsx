import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { Badge } from './badge';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import { Progress } from './progress';
import { Separator } from './separator';
import { Switch } from './switch';
import { Label } from './label';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Settings, 
  Activity,
  Zap,
  Clock,
  Database
} from 'lucide-react';
import { connectionManager, useConnection } from '../../utils/connectionManager';
import { cn } from '../../lib/utils';

interface ConnectionStatusProps {
  className?: string;
  showDetails?: boolean;
}

export function ConnectionStatus({ className, showDetails = false }: ConnectionStatusProps) {
  const { isOnline, stats } = useConnection();
  const [isChecking, setIsChecking] = useState(false);
  const [dataSavingMode, setDataSavingMode] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Forcer une vérification de connexion
  const handleForceCheck = async () => {
    setIsChecking(true);
    try {
      await connectionManager.checkBeforeCriticalAction();
    } finally {
      setIsChecking(false);
    }
  };

  // Basculer le mode économie de données
  const toggleDataSaving = (enabled: boolean) => {
    setDataSavingMode(enabled);
    if (enabled) {
      connectionManager.enableDataSavingMode();
    } else {
      connectionManager.disableDataSavingMode();
    }
  };

  // Composant d'indicateur simple
  const SimpleIndicator = () => (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge variant={isOnline ? "default" : "destructive"} className="gap-1">
        {isOnline ? (
          <Wifi className="h-3 w-3" />
        ) : (
          <WifiOff className="h-3 w-3" />
        )}
        {isOnline ? "En ligne" : "Hors ligne"}
      </Badge>
      
      {dataSavingMode && (
        <Badge variant="outline" className="gap-1">
          <Zap className="h-3 w-3" />
          Économie
        </Badge>
      )}
    </div>
  );

  // Composant détaillé avec stats
  const DetailedStatus = () => (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600" />
            )}
            État de la connexion
          </span>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configuration réseau</DialogTitle>
              </DialogHeader>
              <AdvancedSettings 
                dataSavingMode={dataSavingMode}
                onDataSavingToggle={toggleDataSaving}
                stats={stats}
              />
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Statut principal */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {isOnline ? "Connecté" : "Déconnecté"}
          </span>
          <Badge variant={isOnline ? "default" : "destructive"}>
            {isOnline ? "En ligne" : "Hors ligne"}
          </Badge>
        </div>

        {/* Taux de succès */}
        {stats.successRate > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Fiabilité</span>
              <span>{Math.round(stats.successRate * 100)}%</span>
            </div>
            <Progress value={stats.successRate * 100} className="h-2" />
          </div>
        )}

        {/* Dernière vérification */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Dernière vérif.
          </span>
          <span>
            {new Date(stats.lastCheck).toLocaleTimeString('fr-FR')}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleForceCheck}
            disabled={isChecking}
            className="flex-1"
          >
            {isChecking ? (
              <RefreshCw className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Vérifier
          </Button>
          
          <Button
            variant={dataSavingMode ? "default" : "outline"}
            size="sm"
            onClick={() => toggleDataSaving(!dataSavingMode)}
            className="flex-1"
          >
            <Zap className="h-3 w-3 mr-1" />
            {dataSavingMode ? "Économie ON" : "Économie OFF"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return showDetails ? <DetailedStatus /> : <SimpleIndicator />;
}

// Composant de configuration avancée
function AdvancedSettings({ 
  dataSavingMode, 
  onDataSavingToggle, 
  stats 
}: {
  dataSavingMode: boolean;
  onDataSavingToggle: (enabled: boolean) => void;
  stats: any;
}) {
  return (
    <div className="space-y-6">
      {/* Mode économie de données */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="data-saving">Mode économie de données</Label>
          <Switch
            id="data-saving"
            checked={dataSavingMode}
            onCheckedChange={onDataSavingToggle}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Réduit les vérifications automatiques de connexion pour économiser la bande passante.
        </p>
      </div>

      <Separator />

      {/* Statistiques détaillées */}
      <div className="space-y-3">
        <h4 className="font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Statistiques de connexion
        </h4>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Niveau de throttling</span>
            <div className="font-medium">
              {stats.throttleLevel === 0 ? "Normal" : 
               stats.throttleLevel === 1 ? "Modéré" : "Économie"}
            </div>
          </div>
          
          <div>
            <span className="text-muted-foreground">Prochaine vérif.</span>
            <div className="font-medium">
              {Math.round((stats.nextCheck - Date.now()) / 1000)}s
            </div>
          </div>
          
          <div>
            <span className="text-muted-foreground">Dernier ping</span>
            <div className="font-medium">
              {stats.lastPing ? new Date(stats.lastPing).toLocaleTimeString('fr-FR') : 'Jamais'}
            </div>
          </div>
          
          <div>
            <span className="text-muted-foreground">Fiabilité</span>
            <div className="font-medium">
              {Math.round(stats.successRate * 100)}%
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Actions avancées */}
      <div className="space-y-3">
        <h4 className="font-medium flex items-center gap-2">
          <Database className="h-4 w-4" />
          Actions
        </h4>
        
        <div className="space-y-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start"
            onClick={() => {
              // Vider le cache du service worker
              if ('serviceWorker' in navigator && 'caches' in window) {
                caches.keys().then(names => {
                  names.forEach(name => caches.delete(name));
                });
              }
            }}
          >
            <Database className="h-3 w-3 mr-2" />
            Vider le cache
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start"
            onClick={() => {
              // Forcer la mise à jour du service worker
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistration().then(reg => {
                  if (reg) reg.update();
                });
              }
            }}
          >
            <RefreshCw className="h-3 w-3 mr-2" />
            Mettre à jour l'app
          </Button>
        </div>
      </div>
    </div>
  );
}