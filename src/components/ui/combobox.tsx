import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useScrollToTop } from "@/hooks/useScrollToTop";

interface ComboboxOption {
  value: string;
  label: string;
  keywords?: string; // texte de recherche additionnel non affiché (ex: code article)
  isFavorite?: boolean; // Indique si l'option est un favori
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Sélectionner...",
  searchPlaceholder = "Rechercher...",
  emptyText = "Aucun élément trouvé.",
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");

  // Hook personnalisé pour le scroll automatique vers le haut
  const listRef = useScrollToTop(searchValue);

  // Réinitialiser la recherche quand le popover se ferme
  React.useEffect(() => {
    if (!open) {
      setSearchValue("");
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {value
            ? options.find((option) => option.value === value)?.label || value
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        side="bottom"
        sideOffset={4}
      >
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList ref={listRef}>
            <CommandEmpty className="text-sm text-center py-6 px-2">
              <div className="space-y-1">
                <div>{emptyText.split(".")[0]}.</div>
                <div className="text-xs text-muted-foreground">
                  {emptyText.split(".")[1]}.
                </div>
              </div>
            </CommandEmpty>
            {/* Groupe des favoris */}
            {options.some((opt) => opt.isFavorite) && (
              <CommandGroup heading="Favoris">
                {options
                  .filter((option) => option.isFavorite)
                  .map((option) => (
                    <CommandItem
                      key={option.value}
                      value={`${option.label} ${option.value} ${
                        option.keywords ?? ""
                      }`}
                      onSelect={(currentValue) => {
                        onValueChange(option.value);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === option.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="mr-1 text-yellow-500">⭐</span>
                      {option.label}
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}
            {/* Groupe des autres produits */}
            {options.some((opt) => !opt.isFavorite) && (
              <CommandGroup
                heading={
                  options.some((opt) => opt.isFavorite)
                    ? "Autres produits"
                    : undefined
                }
              >
                {options
                  .filter((option) => !option.isFavorite)
                  .map((option) => (
                    <CommandItem
                      key={option.value}
                      value={`${option.label} ${option.value} ${
                        option.keywords ?? ""
                      }`}
                      onSelect={(currentValue) => {
                        onValueChange(option.value);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === option.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {option.label}
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
