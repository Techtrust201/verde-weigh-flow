import { Trash2, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface BulkActionsBarProps {
  selectedCount: number;
  onDelete: () => void;
  onMarkFavorites: () => void;
  onClear: () => void;
}

export default function BulkActionsBar({
  selectedCount,
  onDelete,
  onMarkFavorites,
  onClear,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-in-right">
      <Card className="shadow-2xl border-2 border-primary/20">
        <div className="flex items-center gap-4 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">
                {selectedCount}
              </span>
            </div>
            <span className="font-medium">
              {selectedCount} produit{selectedCount > 1 ? "s" : ""} sélectionné{selectedCount > 1 ? "s" : ""}
            </span>
          </div>

          <div className="h-6 w-px bg-border" />

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onMarkFavorites}
              className="gap-2"
            >
              <Star className="h-4 w-4" />
              Favoris
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={onDelete}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Supprimer
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClear}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
