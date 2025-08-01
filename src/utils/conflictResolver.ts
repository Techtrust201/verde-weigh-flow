import { db, Pesee, ConflictLog } from '@/lib/database';

export interface ConflictInfo {
  peseeId: number;
  localVersion: number;
  serverVersion: number;
  localData: Pesee;
  serverData: Pesee;
}

export class ConflictResolver {
  private static instance: ConflictResolver;

  static getInstance(): ConflictResolver {
    if (!ConflictResolver.instance) {
      ConflictResolver.instance = new ConflictResolver();
    }
    return ConflictResolver.instance;
  }

  // Détecter les conflits lors de la réception de données du serveur
  async detectConflicts(serverData: Pesee[]): Promise<ConflictInfo[]> {
    const conflicts: ConflictInfo[] = [];

    for (const serverPesee of serverData) {
      if (serverPesee.id) {
        const localPesee = await db.pesees.get(serverPesee.id);
        
        if (localPesee && this.hasConflict(localPesee, serverPesee)) {
          conflicts.push({
            peseeId: serverPesee.id,
            localVersion: localPesee.version || 1,
            serverVersion: serverPesee.version || 1,
            localData: localPesee,
            serverData: serverPesee
          });
        }
      }
    }

    return conflicts;
  }

  // Vérifier s'il y a un conflit entre les versions locale et serveur
  private hasConflict(localPesee: Pesee, serverPesee: Pesee): boolean {
    // Si les versions sont différentes ou si les hashes ne correspondent pas
    const localVersion = localPesee.version || 1;
    const serverVersion = serverPesee.version || 1;
    
    if (localVersion !== serverVersion) {
      return true;
    }

    // Vérifier si les données importantes ont changé
    const localHash = this.calculateHash(localPesee);
    const serverHash = this.calculateHash(serverPesee);
    
    return localHash !== serverHash;
  }

  // Calculer un hash simple des données importantes
  private calculateHash(pesee: Pesee): string {
    const importantFields = {
      numeroBon: pesee.numeroBon,
      poidsEntree: pesee.poidsEntree,
      poidsSortie: pesee.poidsSortie,
      net: pesee.net,
      prixHT: pesee.prixHT,
      prixTTC: pesee.prixTTC,
      moyenPaiement: pesee.moyenPaiement
    };
    
    return btoa(JSON.stringify(importantFields));
  }

  // Résoudre les conflits avec la stratégie "Local Wins"
  async resolveConflicts(conflicts: ConflictInfo[]): Promise<void> {
    for (const conflict of conflicts) {
      await this.resolveConflictLocalWins(conflict);
    }
  }

  // Stratégie : La version locale gagne toujours
  private async resolveConflictLocalWins(conflict: ConflictInfo): Promise<void> {
    try {
      // Logger le conflit
      await this.logConflict(conflict, 'local-wins');
      
      // Garder la version locale, juste mettre à jour le hash de sync
      const updatedPesee = {
        ...conflict.localData,
        lastSyncHash: this.calculateHash(conflict.localData),
        version: Math.max(conflict.localVersion, conflict.serverVersion) + 1
      };

      await db.pesees.update(conflict.peseeId, updatedPesee);
      
      console.log(`✅ Conflit résolu (local wins) pour pesée ${conflict.peseeId}`);
    } catch (error) {
      console.error('❌ Erreur lors de la résolution de conflit:', error);
    }
  }

  // Logger les conflits pour traçabilité
  private async logConflict(conflict: ConflictInfo, resolution: 'local-wins' | 'server-wins' | 'manual'): Promise<void> {
    const conflictLog: ConflictLog = {
      peseeId: conflict.peseeId,
      localVersion: conflict.localVersion,
      serverVersion: conflict.serverVersion,
      localData: conflict.localData,
      serverData: conflict.serverData,
      resolution,
      createdAt: new Date()
    };

    await db.conflictLogs.add(conflictLog);
  }

  // Obtenir le nombre de conflits non résolus
  async getConflictCount(): Promise<number> {
    const recentConflicts = await db.conflictLogs
      .where('createdAt')
      .above(new Date(Date.now() - 24 * 60 * 60 * 1000)) // Dernières 24h
      .count();
    
    return recentConflicts;
  }

  // Obtenir la liste des conflits récents
  async getRecentConflicts(): Promise<ConflictLog[]> {
    return await db.conflictLogs
      .orderBy('createdAt')
      .reverse()
      .limit(10)
      .toArray();
  }

  // Nettoyer les anciens logs de conflits
  async cleanupOldConflicts(): Promise<void> {
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 jours
    await db.conflictLogs.where('createdAt').below(cutoffDate).delete();
  }

  // Forcer une resynchronisation (utilisateur peut décider de prendre la version serveur)
  async forceServerSync(peseeId: number): Promise<void> {
    // Cette fonction pourrait être utilisée plus tard si l'utilisateur veut
    // manuellement prendre la version serveur au lieu de la locale
    console.log(`🔄 Force sync demandée pour pesée ${peseeId}`);
  }
}

export const conflictResolver = ConflictResolver.getInstance();