import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LucideIcon, ArrowRight } from "lucide-react";

interface ImportActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  count?: number;
  countLabel?: string;
  buttonText: string;
  onAction: () => void;
}

export default function ImportActionCard({
  icon: Icon,
  title,
  description,
  count,
  countLabel,
  buttonText,
  onAction,
}: ImportActionCardProps) {
  return (
    <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-border hover:border-primary/50">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="p-3 rounded-lg bg-primary/10">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          {count !== undefined && (
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {count}
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-xl">{title}</h3>
          <p className="text-sm text-muted-foreground min-h-[40px]">{description}</p>
        </div>

        {countLabel && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            {countLabel}
          </div>
        )}

        <Button onClick={onAction} className="w-full group">
          {buttonText}
          <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
