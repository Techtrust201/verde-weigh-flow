import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

interface Filters {
  status: string;
  client: string;
  search: string;
}

interface TrackDechetFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export function TrackDechetFilters({ filters, onFiltersChange }: TrackDechetFiltersProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="status-filter">Statut BSD</Label>
            <Select
              value={filters.status}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, status: value })
              }
            >
              <SelectTrigger id="status-filter">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="success">Réussis</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="error">Erreurs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-filter">Client</Label>
            <Input
              id="client-filter"
              placeholder="Filtrer par client..."
              value={filters.client}
              onChange={(e) =>
                onFiltersChange({ ...filters, client: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="search-filter">Recherche</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search-filter"
                placeholder="Plaque, numéro bon, BSD..."
                className="pl-8"
                value={filters.search}
                onChange={(e) =>
                  onFiltersChange({ ...filters, search: e.target.value })
                }
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
