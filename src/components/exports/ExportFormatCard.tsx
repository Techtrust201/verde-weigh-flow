import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface ExportFormatCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  format: string;
  recommended?: boolean;
  selected: boolean;
  onClick: () => void;
}

export default function ExportFormatCard({
  icon: Icon,
  title,
  description,
  format,
  recommended,
  selected,
  onClick,
}: ExportFormatCardProps) {
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
          {recommended && (
            <Badge className="bg-gradient-to-r from-primary to-primary/80">
              ⭐ Recommandé
            </Badge>
          )}
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
          <Badge variant="outline" className="text-xs font-mono">
            {format}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
