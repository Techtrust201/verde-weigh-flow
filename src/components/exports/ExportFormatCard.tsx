import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, LucideIcon } from "lucide-react";

interface ExportFormatCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  format: string;
  extension: string;
  recommended?: boolean;
  selected: boolean;
  onClick: () => void;
}

export default function ExportFormatCard({
  icon: Icon,
  title,
  description,
  format,
  extension,
  recommended,
  selected,
  onClick,
}: ExportFormatCardProps) {
  return (
    <Card
      className={`
        cursor-pointer transition-all duration-200 hover:shadow-lg relative overflow-hidden
        ${selected ? "border-primary border-2 shadow-md" : "border hover:border-primary/50"}
      `}
      onClick={onClick}
    >
      {recommended && (
        <div className="absolute top-2 right-2">
          <Badge variant="default" className="text-xs">
            Recommandé
          </Badge>
        </div>
      )}
      
      {selected && (
        <div className="absolute top-2 left-2">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <Check className="h-4 w-4 text-primary-foreground" />
          </div>
        </div>
      )}

      <CardContent className="p-6 pt-10">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className={`p-4 rounded-lg ${selected ? "bg-primary/10" : "bg-muted"}`}>
            <Icon className={`h-8 w-8 ${selected ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          
          <div className="space-y-1">
            <h3 className="font-semibold text-lg">{title}</h3>
            <p className="text-sm text-muted-foreground min-h-[40px]">{description}</p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono">
              {extension}
            </Badge>
            <span className="text-xs text-muted-foreground">• {format}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
