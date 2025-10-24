import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { X, Filter, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterConfig {
  key: string;
  label: string;
  type: "text" | "select" | "number";
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface TableFiltersProps {
  filters: FilterConfig[];
  onFiltersChange: (filters: Record<string, string>) => void;
  className?: string;
  showPageSize?: boolean;
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
}

export function TableFilters({
  filters,
  onFiltersChange,
  className,
  showPageSize = false,
  pageSize = 20,
  onPageSizeChange,
}: TableFiltersProps) {
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>(
    {}
  );
  const [isOpen, setIsOpen] = useState(false);

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...activeFilters };
    if (value === "" || value === "all") {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    setActiveFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    setActiveFilters({});
    onFiltersChange({});
  };

  const clearFilter = (key: string) => {
    const newFilters = { ...activeFilters };
    delete newFilters[key];
    setActiveFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const activeFilterCount = Object.keys(activeFilters).length;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Bouton principal de filtrage */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtres
            {activeFilterCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 h-5 w-5 rounded-full p-0 text-xs"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filtres</h4>
              <div className="flex items-center gap-2">
                {showPageSize && onPageSizeChange && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Par page:
                    </span>
                    <Select
                      value={pageSize.toString()}
                      onValueChange={(value) =>
                        onPageSizeChange(parseInt(value))
                      }
                    >
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="h-8 px-2 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Effacer tout
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {filters.map((filter) => (
                <div key={filter.key} className="space-y-2">
                  <Label className="text-sm font-medium">{filter.label}</Label>

                  {filter.type === "text" && (
                    <Input
                      placeholder={
                        filter.placeholder ||
                        `Rechercher dans ${filter.label.toLowerCase()}...`
                      }
                      value={activeFilters[filter.key] || ""}
                      onChange={(e) =>
                        handleFilterChange(filter.key, e.target.value)
                      }
                      className="h-8"
                    />
                  )}

                  {filter.type === "number" && (
                    <Input
                      type="number"
                      placeholder={
                        filter.placeholder ||
                        `Valeur ${filter.label.toLowerCase()}...`
                      }
                      value={activeFilters[filter.key] || ""}
                      onChange={(e) =>
                        handleFilterChange(filter.key, e.target.value)
                      }
                      className="h-8"
                    />
                  )}

                  {filter.type === "select" && filter.options && (
                    <Select
                      value={activeFilters[filter.key] || ""}
                      onValueChange={(value) =>
                        handleFilterChange(filter.key, value)
                      }
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue
                          placeholder={`Sélectionner ${filter.label.toLowerCase()}...`}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        {filter.options.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Affichage des filtres actifs */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {Object.entries(activeFilters).map(([key, value]) => {
            const filter = filters.find((f) => f.key === key);
            if (!filter) return null;

            return (
              <Badge
                key={key}
                variant="secondary"
                className="gap-1 px-2 py-1 text-xs"
              >
                <span className="font-medium">{filter.label}:</span>
                <span>{value}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearFilter(key)}
                  className="h-4 w-4 p-0 hover:bg-transparent"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Hook pour gérer les filtres de tableau avec pagination
export function useTableFilters<T>(
  data: T[],
  filterConfigs: FilterConfig[],
  getFieldValue: (item: T, field: string) => any,
  pageSize: number = 20
) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);

  const filteredData = React.useMemo(() => {
    if (!data) return [];

    return data.filter((item) => {
      return filterConfigs.every((config) => {
        const filterValue = filters[config.key];
        if (!filterValue) return true;

        const itemValue = getFieldValue(item, config.key);
        const itemValueStr = String(itemValue || "").toLowerCase();
        const filterValueStr = filterValue.toLowerCase();

        switch (config.type) {
          case "text":
            return itemValueStr.includes(filterValueStr);
          case "number":
            const numValue = parseFloat(itemValueStr);
            const filterNum = parseFloat(filterValueStr);
            return (
              !isNaN(numValue) && !isNaN(filterNum) && numValue === filterNum
            );
          case "select":
            return itemValueStr === filterValueStr;
          default:
            return true;
        }
      });
    });
  }, [data, filters, filterConfigs, getFieldValue]);

  const paginatedData = React.useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Reset to first page when data changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  return {
    filters,
    setFilters,
    filteredData,
    paginatedData,
    currentPage,
    totalPages,
    goToPage,
    pageSize,
  };
}
