import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ChevronDown,
  RefreshCw,
  Clock,
  AlertCircle,
  CheckCircle2,
  Package,
  Truck,
  FileText,
  Calendar,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { trackDechetProcessor } from "@/utils/trackdechetSyncProcessor";
import { cn } from "@/lib/utils";

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

  const getStatusConfig = () => {
    switch (item.bsdStatus) {
      case "success":
        return {
          variant: "default" as const,
          label: "Créé avec succès",
          icon: CheckCircle2,
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-l-green-500",
        };
      case "pending":
        return {
          variant: "secondary" as const,
          label: "En cours de création",
          icon: Clock,
          color: "text-orange-600",
          bgColor: "bg-orange-50",
          borderColor: "border-l-orange-500",
        };
      case "error":
        return {
          variant: "destructive" as const,
          label: "Erreur de création",
          icon: AlertCircle,
          color: "text-red-600",
          bgColor: "bg-red-50",
          borderColor: "border-l-red-500",
        };
      default:
        return {
          variant: "outline" as const,
          label: "Statut inconnu",
          icon: FileText,
          color: "text-muted-foreground",
          bgColor: "bg-muted",
          borderColor: "border-l-muted",
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

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
    <Card
      className={cn(
        "border-l-4 transition-all duration-300 hover:shadow-md animate-fade-in",
        statusConfig.borderColor
      )}
    >
      <CardContent className="p-0">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="p-4">
            {/* Header section */}
            <div className="flex items-start gap-4">
              {/* Status icon */}
              <div className={cn("p-2 rounded-lg shrink-0", statusConfig.bgColor)}>
                <StatusIcon className={cn("h-5 w-5", statusConfig.color)} />
              </div>

              {/* Main content */}
              <div className="flex-1 min-w-0">
                {/* Title row */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant={statusConfig.variant} className="shrink-0">
                    {statusConfig.label}
                  </Badge>
                  <span className="font-semibold text-lg">{item.numeroBon}</span>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {item.clientName && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.clientName}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Package className="h-4 w-4 shrink-0" />
                    <span>{item.net}T</span>
                  </div>
                  {item.plaque && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Truck className="h-4 w-4 shrink-0" />
                      <span>{item.plaque}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>
                      {new Date(item.dateHeure).toLocaleDateString()} à{" "}
                      {new Date(item.dateHeure).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {/* BSD ID if present */}
                {item.bsdReadableId && (
                  <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 bg-primary/10 rounded text-xs font-mono">
                    BSD: {item.bsdReadableId}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {item.bsdStatus === "error" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="hover:bg-red-50"
                  >
                    <RefreshCw
                      className={cn("h-4 w-4", isRetrying && "animate-spin")}
                    />
                  </Button>
                )}

                {item.bsdStatus === "success" && item.bsdId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSyncStatus}
                    className="hover:bg-green-50"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}

                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="hover:bg-muted">
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        !isOpen && "-rotate-90"
                      )}
                    />
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
          </div>

          <CollapsibleContent className="border-t animate-accordion-down">
            <div className="p-4 space-y-4 bg-muted/30">
              {item.bsdStatus === "success" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="flex flex-col gap-1 p-3 bg-background rounded-lg">
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">
                        Statut actuel
                      </span>
                      <Badge variant="outline" className="w-fit">
                        Sealed
                      </Badge>
                    </div>
                    {item.bsdId && (
                      <div className="flex flex-col gap-1 p-3 bg-background rounded-lg">
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">
                          ID BSD
                        </span>
                        <code className="text-xs font-mono px-2 py-1 bg-muted rounded w-fit">
                          {item.bsdId.slice(0, 20)}...
                        </code>
                      </div>
                    )}
                    {item.codeDechet && (
                      <div className="flex flex-col gap-1 p-3 bg-background rounded-lg">
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">
                          Code déchet
                        </span>
                        <span className="font-medium">{item.codeDechet}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {item.bsdStatus === "pending" && (
                <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <Clock className="h-5 w-5 text-orange-600 shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-1">
                    <p className="font-medium text-orange-900">
                      BSD en cours de création
                    </p>
                    <p className="text-sm text-orange-700">
                      La synchronisation s'effectue automatiquement toutes les 30 secondes.
                      Vous serez notifié une fois le BSD créé.
                    </p>
                  </div>
                </div>
              )}

              {item.bsdStatus === "error" && item.errorMessage && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="space-y-2 flex-1">
                      <p className="font-semibold text-red-900">
                        Erreur de synchronisation
                      </p>
                      <p className="text-sm text-red-700 font-mono bg-red-100 p-2 rounded">
                        {item.errorMessage}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                    <p className="font-medium text-blue-900 flex items-center gap-2">
                      <span>💡</span>
                      Solutions suggérées
                    </p>
                    <ul className="space-y-2 text-sm text-blue-800">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 shrink-0">•</span>
                        <span>
                          Vérifier que le code déchet respecte le format européen à 6 chiffres (XX XX XX)
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 shrink-0">•</span>
                        <span>
                          S'assurer que toutes les informations client sont complètes et valides
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 shrink-0">•</span>
                        <span>
                          Vérifier votre connexion internet et la disponibilité de Track Déchet
                        </span>
                      </li>
                    </ul>
                    <Button
                      size="sm"
                      onClick={handleRetry}
                      disabled={isRetrying}
                      className="w-full mt-2"
                    >
                      <RefreshCw
                        className={cn("h-4 w-4 mr-2", isRetrying && "animate-spin")}
                      />
                      Réessayer maintenant
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
