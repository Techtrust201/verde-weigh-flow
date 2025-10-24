import { useState, useEffect } from "react";
import { db } from "@/lib/database";
import { SyncQueueManager } from "@/lib/syncQueue";

interface Stats {
  success: number;
  pending: number;
  error: number;
  total: number;
}

export function useTrackDechetStats() {
  const [stats, setStats] = useState<Stats>({
    success: 0,
    pending: 0,
    error: 0,
    total: 0,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const bsds = await db.bsds?.toArray() || [];
        const syncQueue = SyncQueueManager.getInstance();
        const queueItems = await syncQueue.getReadyItems();

        const errorCount = queueItems.filter(
          item => item.tag === "trackdechet_bsd" && item.attemptCount >= item.maxAttempts
        ).length;

        const successCount = bsds.filter(bsd => bsd.status !== "pending_sync").length;
        const pendingCount = bsds.filter(bsd => bsd.status === "pending_sync").length;

        setStats({
          success: successCount,
          pending: pendingCount,
          error: errorCount,
          total: successCount + pendingCount + errorCount,
        });
      } catch (error) {
        console.error("Error loading Track Déchet stats:", error);
      }
    };

    loadStats();
    
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return { stats };
}
