// Gestionnaire de connexion ultra-économique pour 3G
class ConnectionManager {
  private static instance: ConnectionManager;
  private connectionState: {
    isOnline: boolean;
    lastCheck: number;
    lastPingTime: number;
    pingResults: boolean[];
    throttleLevel: number;
  };
  
  private listeners: Array<(isOnline: boolean) => void> = [];
  private checkInterval?: NodeJS.Timeout;
  private isCheckingConnection = false;
  
  // Configuration adaptative selon le type de connexion
  private readonly config = {
    // Temps minimum entre les vérifications (évite le spam)
    minCheckInterval: 10000, // 10 secondes
    
    // Timeout pour le ping (adapté à la 3G)
    pingTimeout: 5000, // 5 secondes max
    
    // URL de ping ultra-légère (< 1KB)
    pingUrl: 'https://httpbin.org/status/200',
    
    // Nombre de résultats de ping à garder en mémoire
    pingHistorySize: 5,
    
    // Niveaux de throttling selon la stabilité
    throttleLevels: {
      stable: 30000,   // 30s si connexion stable
      unstable: 15000, // 15s si instable  
      poor: 60000      // 1min si très mauvaise
    }
  };

  private constructor() {
    this.connectionState = {
      isOnline: navigator.onLine,
      lastCheck: Date.now(),
      lastPingTime: 0,
      pingResults: [],
      throttleLevel: 0
    };
    
    this.setupEventListeners();
  }

  public static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  // Configuration des écouteurs d'événements système
  private setupEventListeners(): void {
    // Événements système de base
    window.addEventListener('online', () => {
      console.log('Connection Manager: System reported online');
      this.updateConnectionState(true);
    });
    
    window.addEventListener('offline', () => {
      console.log('Connection Manager: System reported offline');
      this.updateConnectionState(false);
    });

    // Détecter les changements de type de connexion
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        connection.addEventListener('change', () => {
          console.log('Connection Manager: Network type changed', {
            effectiveType: connection.effectiveType,
            downlink: connection.downlink
          });
          this.adaptToConnectionType(connection);
        });
      }
    }
  }

  // Adapter la stratégie selon le type de connexion
  private adaptToConnectionType(connection: any): void {
    const effectiveType = connection.effectiveType;
    
    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      this.connectionState.throttleLevel = 2; // Mode économie maximale
      console.log('Connection Manager: Slow connection detected, max economy mode');
    } else if (effectiveType === '3g') {
      this.connectionState.throttleLevel = 1; // Mode économie modérée
      console.log('Connection Manager: 3G detected, moderate economy mode');
    } else {
      this.connectionState.throttleLevel = 0; // Mode normal
      console.log('Connection Manager: Fast connection detected, normal mode');
    }
  }

  // Vérification intelligente de la connexion
  public async checkConnection(force = false): Promise<boolean> {
    const now = Date.now();
    
    // Éviter les vérifications trop fréquentes
    if (!force && now - this.connectionState.lastCheck < this.config.minCheckInterval) {
      return this.connectionState.isOnline;
    }

    // Éviter les vérifications simultanées
    if (this.isCheckingConnection) {
      return this.connectionState.isOnline;
    }

    this.isCheckingConnection = true;
    this.connectionState.lastCheck = now;

    try {
      // Vérification rapide avec navigator.onLine
      if (!navigator.onLine) {
        this.updateConnectionState(false);
        return false;
      }

      // Ping léger seulement si nécessaire
      const shouldPing = force || 
        now - this.connectionState.lastPingTime > this.getThrottleInterval();

      if (shouldPing) {
        const isOnline = await this.performLightPing();
        this.updateConnectionState(isOnline);
        this.connectionState.lastPingTime = now;
        
        // Mettre à jour l'historique des pings
        this.updatePingHistory(isOnline);
        
        return isOnline;
      }

      return this.connectionState.isOnline;
    } catch (error) {
      console.warn('Connection Manager: Check failed', error);
      return false;
    } finally {
      this.isCheckingConnection = false;
    }
  }

  // Ping ultra-léger optimisé pour la 3G
  private async performLightPing(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.pingTimeout);

      const response = await fetch(this.config.pingUrl, {
        method: 'HEAD', // Plus léger que GET
        mode: 'no-cors', // Évite les problèmes CORS
        cache: 'no-cache',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return true; // Si on arrive ici, la connexion fonctionne
    } catch (error) {
      console.log('Connection Manager: Ping failed', error);
      return false;
    }
  }

  // Mettre à jour l'historique des pings pour adapter le throttling
  private updatePingHistory(success: boolean): void {
    this.connectionState.pingResults.push(success);
    
    // Garder seulement les N derniers résultats
    if (this.connectionState.pingResults.length > this.config.pingHistorySize) {
      this.connectionState.pingResults.shift();
    }
  }

  // Calculer l'intervalle de throttling selon la stabilité
  private getThrottleInterval(): number {
    const { pingResults, throttleLevel } = this.connectionState;
    
    if (pingResults.length < 3) {
      return this.config.throttleLevels.unstable;
    }

    // Calculer le taux de succès récent
    const successRate = pingResults.filter(Boolean).length / pingResults.length;
    
    // Ajouter un bonus de stabilité selon le niveau de throttling
    let baseInterval;
    if (successRate > 0.8) {
      baseInterval = this.config.throttleLevels.stable;
    } else if (successRate > 0.5) {
      baseInterval = this.config.throttleLevels.unstable;
    } else {
      baseInterval = this.config.throttleLevels.poor;
    }

    // Ajuster selon le type de connexion détecté
    const throttleMultiplier = throttleLevel === 2 ? 2 : throttleLevel === 1 ? 1.5 : 1;
    
    return baseInterval * throttleMultiplier;
  }

  // Mettre à jour l'état et notifier les listeners
  private updateConnectionState(isOnline: boolean): void {
    const wasOnline = this.connectionState.isOnline;
    this.connectionState.isOnline = isOnline;

    if (wasOnline !== isOnline) {
      console.log(`Connection Manager: State changed to ${isOnline ? 'online' : 'offline'}`);
      this.notifyListeners(isOnline);
    }
  }

  // Notifier tous les listeners
  private notifyListeners(isOnline: boolean): void {
    this.listeners.forEach(listener => {
      try {
        listener(isOnline);
      } catch (error) {
        console.error('Connection Manager: Listener error', error);
      }
    });
  }

  // API publique
  public isOnline(): boolean {
    return this.connectionState.isOnline;
  }

  public getConnectionStats() {
    return {
      isOnline: this.connectionState.isOnline,
      lastCheck: this.connectionState.lastCheck,
      lastPing: this.connectionState.lastPingTime,
      successRate: this.calculateSuccessRate(),
      throttleLevel: this.connectionState.throttleLevel,
      nextCheck: this.connectionState.lastCheck + this.getThrottleInterval()
    };
  }

  private calculateSuccessRate(): number {
    const { pingResults } = this.connectionState;
    if (pingResults.length === 0) return 0;
    return pingResults.filter(Boolean).length / pingResults.length;
  }

  public addListener(callback: (isOnline: boolean) => void): () => void {
    this.listeners.push(callback);
    
    // Retourner une fonction de nettoyage
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public removeAllListeners(): void {
    this.listeners = [];
  }

  // Vérification à la demande avant actions critiques
  public async checkBeforeCriticalAction(): Promise<boolean> {
    console.log('Connection Manager: Checking before critical action');
    return await this.checkConnection(true);
  }

  // Mode économie de données
  public enableDataSavingMode(): void {
    console.log('Connection Manager: Data saving mode enabled');
    this.connectionState.throttleLevel = Math.max(this.connectionState.throttleLevel, 2);
  }

  public disableDataSavingMode(): void {
    console.log('Connection Manager: Data saving mode disabled');
    this.connectionState.throttleLevel = 0;
  }

  // Nettoyage
  public destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    this.removeAllListeners();
  }
}

// Export singleton
export const connectionManager = ConnectionManager.getInstance();

// Hook pour React
export function useConnection() {
  const [isOnline, setIsOnline] = React.useState(connectionManager.isOnline());
  const [stats, setStats] = React.useState(connectionManager.getConnectionStats());

  React.useEffect(() => {
    const unsubscribe = connectionManager.addListener((online) => {
      setIsOnline(online);
      setStats(connectionManager.getConnectionStats());
    });

    // Mise à jour initiale
    setStats(connectionManager.getConnectionStats());

    return unsubscribe;
  }, []);

  return {
    isOnline,
    stats,
    checkConnection: connectionManager.checkBeforeCriticalAction.bind(connectionManager),
    enableDataSaving: connectionManager.enableDataSavingMode.bind(connectionManager),
    disableDataSaving: connectionManager.disableDataSavingMode.bind(connectionManager)
  };
}

// Pour les imports directs
import React from 'react';