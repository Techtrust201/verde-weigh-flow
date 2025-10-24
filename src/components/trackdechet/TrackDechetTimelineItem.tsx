import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, RefreshCw, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { trackDechetProcessor } from "@/utils/trackdechetSyncProcessor";

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

interface TrackDechetTimelineItemProps {
  item: TrackDechetHistoryItem;
  onRefresh: () => void;
}

export function TrackDechetTimelineItem({ item, onRefresh }: TrackDechetTimelineItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const { toast } = useToast();

  const getBadgeVariant = () => {
    switch (item.bsdStatus) {
      case "success":
        return "default";
      case "pending":
        return "secondary";
      case "error":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusLabel = () => {
    switch (item.bsdStatus) {
      case "success":
        return "✅ Réussi";
      case "pending":
        return "⏳ En attente";
      case "error":
        return "❌ Erreur";
      default:
        return "⚪ Inconnu";
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await trackDechetProcessor.processTrackDechetQueue();
      toast({
        title: "Synchronisation relancée",
        description: "La tentative de création du BSD a été relancée.",
      });
      onRefresh();
    } catch (error) {
      console.error("Error retrying BSD:", error);
      toast({
        title: "Erreur",
        description: "Impossible de relancer la synchronisation.",
        variant: "destructive",
      });
    } finally {
      setIsRetrying(false);
    }
  };

  const handleSyncStatus = async () => {
    if (!item.bsdId) return;
    
    try {
      await trackDechetProcessor.syncAllBSDStatuses();
      toast({
        title: "Statut mis à jour",
        description: "Le statut du BSD a été synchronisé.",
      });
      onRefresh();
    } catch (error) {
      console.error("Error syncing BSD status:", error);
      toast({
        title: "Erreur",
        description: "Impossible de synchroniser le statut.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={getBadgeVariant()}>{getStatusLabel()}</Badge>
                <span className="font-semibold">{item.numeroBon}</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(item.dateHeure).toLocaleDateString()} à{" "}
                  {new Date(item.dateHeure).toLocaleTimeString()}
                </span>
              </div>
              
              <div className="text-sm text-muted-foreground space-y-1">
                <div>
                  {item.clientName && <span>{item.clientName} • </span>}
                  <span>{item.net}T</span>
                  {item.bsdReadableId && <span> • BSD: {item.bsdReadableId}</span>}
                </div>
                {item.plaque && <div>Plaque: {item.plaque}</div>}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {item.bsdStatus === "error" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRetry}
                  disabled={isRetrying}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRetrying ? "animate-spin" : ""}`} />
                  Réessayer
                </Button>
              )}
              
              {item.bsdStatus === "success" && item.bsdId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSyncStatus}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Maj statut
                </Button>
              )}

              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>

          <CollapsibleContent className="mt-4 pt-4 border-t space-y-3">
            {item.bsdStatus === "success" && (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Statut actuel:</span>
                  <Badge variant="outline">Sealed</Badge>
                </div>
                {item.bsdId && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">ID BSD:</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{item.bsdId}</code>
                  </div>
                )}
                {item.codeDechet && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Code déchet:</span>
                    <span>{item.codeDechet}</span>
                  </div>
                )}
              </div>
            )}

            {item.bsdStatus === "pending" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>BSD en cours de création... La synchronisation s'effectue automatiquement.</span>
              </div>
            )}

            {item.bsdStatus === "error" && item.errorMessage && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <p className="font-medium text-destructive">Erreur de synchronisation</p>
                    <p className="text-sm text-muted-foreground">{item.errorMessage}</p>
                  </div>
                </div>
                
                <div className="text-sm space-y-2">
                  <p className="font-medium">💡 Solutions suggérées:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Vérifier que le code déchet est valide (format XX XX XX)</li>
                    <li>S'assurer que les informations client sont complètes</li>
                    <li>Vérifier la connexion à Track Déchet</li>
                  </ul>
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
