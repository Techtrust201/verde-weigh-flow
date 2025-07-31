import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CityData {
  nom: string;
  code: string;
  codesPostaux: string[];
}

interface CityPostalInputProps {
  cityValue: string;
  postalValue: string;
  onCityChange: (city: string) => void;
  onPostalChange: (postal: string) => void;
  disabled?: boolean;
}

export function CityPostalInput({
  cityValue,
  postalValue,
  onCityChange,
  onPostalChange,
  disabled = false
}: CityPostalInputProps) {
  const [cities, setCities] = useState<CityData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [postalOpen, setPostalOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [postalSearch, setPostalSearch] = useState("");
  const [citySearch, setCitySearch] = useState("");

  const searchCities = useCallback(async (query: string) => {
    if (query.length < 2) {
      setCities([]);
      return;
    }

    setIsLoading(true);
    try {
      // Search by city name or postal code
      const isPostalCode = /^\d/.test(query);
      const searchParam = isPostalCode ? `codePostal=${query}` : `nom=${query}`;
      
      const response = await fetch(
        `https://geo.api.gouv.fr/communes?${searchParam}&fields=nom,code,codesPostaux&boost=population&limit=10`
      );
      
      if (response.ok) {
        const data = await response.json();
        setCities(data);
      }
    } catch (error) {
      console.error("Error fetching cities:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (postalSearch) {
        searchCities(postalSearch);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [postalSearch, searchCities]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (citySearch) {
        searchCities(citySearch);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [citySearch, searchCities]);

  const handlePostalSelect = (city: CityData, postalCode?: string) => {
    // Toujours remplir les deux champs
    onCityChange(city.nom);
    
    if (postalCode) {
      onPostalChange(postalCode);
    } else if (city.codesPostaux.length === 1) {
      onPostalChange(city.codesPostaux[0]);
    }
    
    setPostalOpen(false);
    setPostalSearch("");
    setCities([]); // Clear search results
  };

  const handleCitySelect = (city: CityData, postalCode?: string) => {
    // Toujours remplir les deux champs
    onCityChange(city.nom);
    
    if (postalCode) {
      onPostalChange(postalCode);
    } else if (city.codesPostaux.length === 1) {
      onPostalChange(city.codesPostaux[0]);
    }
    
    setCityOpen(false);
    setCitySearch("");
    setCities([]); // Clear search results
  };

  const displayValue = cityValue || postalValue || "";

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Popover open={postalOpen} onOpenChange={setPostalOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={postalOpen}
              className="w-full justify-between"
              disabled={disabled}
            >
              {postalValue || "Code postal..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0">
            <Command>
              <CommandInput
                placeholder="Rechercher par code postal..."
                value={postalSearch}
                onValueChange={setPostalSearch}
              />
              <CommandList>
                <CommandEmpty>
                  {isLoading ? "Recherche en cours..." : "Aucune ville trouvée."}
                </CommandEmpty>
                <CommandGroup>
                  {cities.map((city) => (
                    city.codesPostaux.map((postal) => (
                      <CommandItem
                        key={`postal-${city.code}-${postal}`}
                        value={`${postal} ${city.nom}`}
                        onSelect={() => handlePostalSelect(city, postal)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            postalValue === postal && cityValue === city.nom
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{postal}</span>
                          <span className="text-sm text-muted-foreground">{city.nom}</span>
                        </div>
                      </CommandItem>
                    ))
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      
      <div>
        <Popover open={cityOpen} onOpenChange={setCityOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={cityOpen}
              className="w-full justify-between"
              disabled={disabled}
            >
              {cityValue || "Ville..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0">
            <Command>
              <CommandInput
                placeholder="Rechercher par ville..."
                value={citySearch}
                onValueChange={setCitySearch}
              />
              <CommandList>
                <CommandEmpty>
                  {isLoading ? "Recherche en cours..." : "Aucune ville trouvée."}
                </CommandEmpty>
                <CommandGroup>
                  {cities.map((city) => (
                    city.codesPostaux.map((postal) => (
                      <CommandItem
                        key={`city-${city.code}-${postal}`}
                        value={`${city.nom} ${postal}`}
                        onSelect={() => handleCitySelect(city, postal)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            cityValue === city.nom && postalValue === postal
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{city.nom}</span>
                          <span className="text-sm text-muted-foreground">{postal}</span>
                        </div>
                      </CommandItem>
                    ))
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}