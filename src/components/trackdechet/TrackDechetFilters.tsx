import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Search, Filter, X } from "lucide-react";

interface Filters {
  status: string;
  client: string;
  search: string;
}

interface TrackDechetFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  resultCount: number;
}

export function TrackDechetFilters({ filters, onFiltersChange, resultCount }: TrackDechetFiltersProps) {
  const activeFiltersCount = [
    filters.status !== "all",
    filters.client !== "",
    filters.search !== "",
  ].filter(Boolean).length;

  const statusOptions = [
    { value: "all", label: "Tous", color: "default" as const },
    { value: "success", label: "Réussis", color: "default" as const },
    { value: "pending", label: "En attente", color: "secondary" as const },
    { value: "error", label: "Erreurs", color: "destructive" as const },
  ];

  const clearFilters = () => {
    onFiltersChange({ status: "all", client: "", search: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par plaque, numéro bon, BSD..."
            className="pl-9 pr-9"
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          />
          {filters.search && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => onFiltersChange({ ...filters, search: "" })}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Quick filters for desktop */}
        <div className="hidden md:flex gap-2">
          {statusOptions.map((option) => (
            <Button
              key={option.value}
              variant={filters.status === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => onFiltersChange({ ...filters, status: option.value })}
              className="transition-all"
            >
              {option.label}
            </Button>
          ))}
        </div>

        {/* Mobile filter sheet */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="md:hidden relative">
              <Filter className="h-4 w-4 mr-2" />
              Filtres
              {activeFiltersCount > 0 && (
                <Badge className="ml-2 px-1.5 py-0 h-5 min-w-[20px]" variant="secondary">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Filtres</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Statut</label>
                <div className="grid grid-cols-2 gap-2">
                  {statusOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={filters.status === option.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => onFiltersChange({ ...filters, status: option.value })}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Client</label>
                <Input
                  placeholder="Filtrer par client..."
                  value={filters.client}
                  onChange={(e) => onFiltersChange({ ...filters, client: e.target.value })}
                />
              </div>

              {activeFiltersCount > 0 && (
                <Button variant="outline" className="w-full" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Réinitialiser les filtres
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Clear filters button for desktop */}
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="hidden md:flex">
            <X className="h-4 w-4 mr-2" />
            Effacer
          </Button>
        )}
      </div>

      {/* Results count and active filters */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="font-medium">{resultCount}</span>
          <span>résultat{resultCount > 1 ? "s" : ""}</span>
        </div>
        {filters.client && (
          <Badge variant="secondary" className="gap-1">
            Client: {filters.client}
            <button
              onClick={() => onFiltersChange({ ...filters, client: "" })}
              className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
      </div>
    </div>
  );
}
