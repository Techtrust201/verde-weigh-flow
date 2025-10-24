import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/database";
import { SyncQueueManager } from "@/lib/syncQueue";

interface TrackDechetHistoryItem {
  id: number;
  numeroBon: string;
  dateHeure: Date;
  clientName?: string;
  net: number;
  plaque?: string;
  bsdId?: string;
  bsdReadableId?: string;
  bsdStatus: "success" | "pending" | "error";
  errorMessage?: string;
  codeDechet?: string;
}

export function useTrackDechetHistory() {
  const [history, setHistory] = useState<TrackDechetHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      // Charger les pesées avec BSD
      const pesees = await db.pesees.toArray();
      const clients = await db.clients.toArray();
      const products = await db.products.toArray();
      
      // Charger les BSD
      const bsds = await db.bsds?.toArray() || [];
      const bsdMap = new Map(bsds.map(bsd => [bsd.peseeId, bsd]));

      // Charger la queue de synchronisation pour voir les erreurs
      const syncQueue = SyncQueueManager.getInstance();
      const queueItems = await syncQueue.getReadyItems();
      const errorMap = new Map(
        queueItems
          .filter(item => item.tag === "trackdechet_bsd" && item.attemptCount >= item.maxAttempts)
          .map(item => [item.data.peseeId, item.lastError])
      );

      // Combiner les données
      const enrichedHistory: TrackDechetHistoryItem[] = pesees
        .filter(pesee => {
          // Ne garder que les pesées qui ont un BSD ou qui sont dans la queue
          const bsd = bsdMap.get(pesee.id!);
          const hasError = errorMap.has(pesee.id!);
          return bsd || hasError;
        })
        .map(pesee => {
          const bsd = bsdMap.get(pesee.id!);
          const error = errorMap.get(pesee.id!);
          const client = clients.find(c => c.id === pesee.clientId);
          const product = products.find(p => p.id === pesee.produitId);

          let status: "success" | "pending" | "error" = "pending";
          if (bsd && bsd.status !== "pending_sync") {
            status = "success";
          } else if (error) {
            status = "error";
          }

          return {
            id: pesee.id!,
            numeroBon: pesee.numeroBon,
            dateHeure: pesee.dateHeure,
            clientName: client?.nom || pesee.nomEntreprise,
            net: pesee.net,
            plaque: pesee.plaque,
            bsdId: bsd?.bsdId,
            bsdReadableId: bsd?.readableId,
            bsdStatus: status,
            errorMessage: error,
            codeDechet: product?.codeDechets,
          };
        })
        .sort((a, b) => new Date(b.dateHeure).getTime() - new Date(a.dateHeure).getTime());

      setHistory(enrichedHistory);
    } catch (error) {
      console.error("Error loading Track Déchet history:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
    
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(loadHistory, 30000);
    return () => clearInterval(interval);
  }, [loadHistory]);

  return { history, loading, refresh: loadHistory };
}
