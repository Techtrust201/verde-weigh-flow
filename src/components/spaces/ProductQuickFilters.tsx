import { Star, Recycle, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProductQuickFiltersProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onClearFilters: () => void;
}

export default function ProductQuickFilters({
  activeFilter,
  onFilterChange,
  onClearFilters,
}: ProductQuickFiltersProps) {
  const quickFilters = [
    {
      id: "all",
      label: "Tous",
      icon: null,
    },
    {
      id: "favorites",
      label: "Favoris",
      icon: Star,
      color: "text-amber-600",
    },
    {
      id: "trackDechet",
      label: "Track Déchet",
      icon: Recycle,
      color: "text-green-600",
    },
    {
      id: "noPrice",
      label: "Sans prix",
      icon: AlertCircle,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">Filtres rapides:</span>
      {quickFilters.map((filter) => {
        const Icon = filter.icon;
        const isActive = activeFilter === filter.id;

        return (
          <Button
            key={filter.id}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterChange(filter.id)}
            className={`gap-2 ${
              !isActive && filter.color ? filter.color : ""
            }`}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {filter.label}
          </Button>
        );
      })}
      
      {activeFilter !== "all" && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="gap-1"
        >
          <X className="h-3 w-3" />
          Réinitialiser
        </Button>
      )}
    </div>
  );
}
