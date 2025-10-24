import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Clock, AlertCircle, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Stats {
  success: number;
  pending: number;
  error: number;
  total: number;
}

interface TrackDechetStatsCardsProps {
  stats: Stats;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function TrackDechetStatsCards({ stats, onRefresh, isRefreshing }: TrackDechetStatsCardsProps) {
  const statCards = [
    {
      label: "Réussis",
      value: stats.success,
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
    {
      label: "En attente",
      value: stats.pending,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
    },
    {
      label: "Erreurs",
      value: stats.error,
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
    },
    {
      label: "Total",
      value: stats.total,
      icon: FileText,
      color: "text-primary",
      bgColor: "bg-primary/5",
      borderColor: "border-primary/20",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Track Déchet</h2>
          <p className="text-sm text-muted-foreground">Suivi des bordereaux de suivi des déchets</p>
        </div>
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
            Actualiser
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className={cn(
                "border-2 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-fade-in",
                stat.borderColor
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={cn("p-3 rounded-lg", stat.bgColor)}>
                    <Icon className={cn("h-6 w-6", stat.color)} />
                  </div>
                </div>
                <div className={cn("text-3xl font-bold mb-1", stat.color)}>
                  {stat.value}
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  {stat.label}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
