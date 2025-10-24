import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface ExportTypeCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  count?: number;
  badge?: string;
  selected: boolean;
  onClick: () => void;
}

export default function ExportTypeCard({
  icon: Icon,
  title,
  description,
  count,
  badge,
  selected,
  onClick,
}: ExportTypeCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
        selected
          ? "border-primary border-2 bg-primary/5 shadow-md"
          : "border-border hover:border-primary/50"
      )}
      onClick={onClick}
    >
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "p-3 rounded-lg transition-colors",
              selected ? "bg-primary text-primary-foreground" : "bg-muted"
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
          {badge && (
            <Badge variant="secondary" className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {count !== undefined && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Disponibles</span>
              <span className="text-2xl font-bold text-primary">{count}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
