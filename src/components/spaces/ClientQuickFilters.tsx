import { Star, Building, User, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClientQuickFiltersProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onClearFilters: () => void;
}

export default function ClientQuickFilters({
  activeFilter,
  onFilterChange,
  onClearFilters,
}: ClientQuickFiltersProps) {
  const quickFilters = [
    {
      id: "all",
      label: "Tous",
      icon: null,
    },
    {
      id: "favorites",
      label: "Sans SIRET",
      icon: Star,
      color: "text-amber-600",
    },
    {
      id: "professionals",
      label: "Professionnels",
      icon: Building,
      color: "text-purple-600",
    },
    {
      id: "particuliers",
      label: "Particuliers",
      icon: User,
      color: "text-blue-600",
    },
    {
      id: "trackDechet",
      label: "Avec SIRET",
      icon: AlertCircle,
      color: "text-green-600",
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
