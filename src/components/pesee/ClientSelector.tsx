import { useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Client } from "@/lib/database";
import { PeseeTab } from "@/hooks/usePeseeTabs";

interface ClientSelectorProps {
  clients: Client[];
  currentData: PeseeTab["formData"] | undefined;
  updateCurrentTab: (updates: Partial<PeseeTab["formData"]>) => void;
}

export const ClientSelector = ({
  clients,
  currentData,
  updateCurrentTab,
}: ClientSelectorProps) => {
  const [showChantierOptions, setShowChantierOptions] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const getClientTypeIcon = (type: string) => {
    const icons = {
      particulier: "👤",
      professionnel: "🏢",
      "micro-entreprise": "💼",
    };
    return icons[type as keyof typeof icons] || "👤";
  };

  // Recherche avancée dans tous les champs
  const filteredClients = useMemo(() => {
    if (!searchValue.trim()) return clients;

    const searchTerm = searchValue.toLowerCase();

    return clients.filter((client) => {
      // Recherche dans la raison sociale
      if (client.raisonSociale?.toLowerCase().includes(searchTerm)) return true;

      // Recherche dans le SIRET
      if (client.siret?.toLowerCase().includes(searchTerm)) return true;

      // Recherche dans le contact (email + téléphone)
      if (client.email?.toLowerCase().includes(searchTerm)) return true;
      if (client.telephone?.toLowerCase().includes(searchTerm)) return true;

      // Recherche dans l'adresse
      if (client.adresse?.toLowerCase().includes(searchTerm)) return true;
      if (client.ville?.toLowerCase().includes(searchTerm)) return true;
      if (client.codePostal?.toLowerCase().includes(searchTerm)) return true;

      // Recherche dans les plaques
      if (
        client.plaques?.some((plaque) =>
          plaque.toLowerCase().includes(searchTerm)
        )
      )
        return true;

      return false;
    });
  }, [clients, searchValue]);

  const handleClientSelect = (client: Client) => {
    const updates: Partial<PeseeTab["formData"]> = {
      clientId: client.id!,
      nomEntreprise: client.raisonSociale,
      typeClient: client.typeClient,
    };

    // Gestion de la plaque - utiliser la première plaque disponible
    if (client.plaques && client.plaques.length > 0) {
      updates.plaque = client.plaques[0];
    }

    // Gestion des chantiers
    if (client.chantiers && client.chantiers.length > 0) {
      if (client.chantiers.length === 1) {
        updates.chantier = client.chantiers[0];
        setShowChantierOptions(false);
      } else {
        updates.chantier = client.chantiers[0]; // Par défaut le premier
        setShowChantierOptions(true);
      }
    }

    updateCurrentTab(updates);
    setOpen(false);
    setSearchValue("");
  };

  const selectedClient = clients.find((c) => c.id === currentData?.clientId);

  const getClientDisplayInfo = (client: Client) => {
    const info = [];

    if (client.siret) info.push(`SIRET: ${client.siret}`);
    if (client.telephone) info.push(`📞 ${client.telephone}`);
    if (client.email) info.push(`📧 ${client.email}`);
    if (client.adresse) info.push(`📍 ${client.adresse}`);
    if (client.ville && client.codePostal)
      info.push(`${client.codePostal} ${client.ville}`);
    if (client.plaques && client.plaques.length > 0) {
      info.push(`🚗 ${client.plaques.join(", ")}`);
    }

    return info;
  };

  return (
    <div className="space-y-4">
      <div>
        <Label
          htmlFor="client"
          className="text-sm font-medium text-gray-700 mb-2 block"
        >
          Client existant
        </Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between h-12 px-4 py-3 bg-white border-2 border-gray-200 hover:border-blue-300 focus:border-blue-500 transition-colors duration-200 rounded-lg"
            >
              {selectedClient ? (
                <div className="flex items-center gap-3 w-full">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white text-sm font-semibold">
                    {getClientTypeIcon(selectedClient.typeClient)}
                  </div>
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <span className="font-semibold text-gray-900 truncate w-full">
                      {selectedClient.raisonSociale}
                    </span>
                    <span className="text-xs text-gray-500 truncate w-full">
                      {selectedClient.siret
                        ? `SIRET: ${selectedClient.siret}`
                        : "Client sélectionné"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 w-full">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-400">
                    <Search className="h-4 w-4" />
                  </div>
                  <span className="text-gray-500 font-medium">
                    Rechercher un client...
                  </span>
                </div>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-gray-400" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[700px] p-0 shadow-lg border border-gray-200 rounded-lg overflow-hidden"
            align="start"
          >
            <Command className="bg-white">
              <div className="flex items-center border-b border-gray-100 px-4 py-3 bg-gray-50">
                <Search className="mr-3 h-5 w-5 text-gray-500" />
                <CommandInput
                  placeholder="Rechercher par nom, SIRET, contact, adresse, plaque..."
                  value={searchValue}
                  onValueChange={setSearchValue}
                  className="border-0 focus:ring-0 text-base placeholder:text-gray-400"
                />
              </div>
              <CommandList className="max-h-[400px]">
                <CommandEmpty className="py-6 text-left px-4">
                  <div className="flex items-center gap-3">
                    <Search className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-gray-500 font-medium">
                        {searchValue
                          ? "Aucun client trouvé"
                          : "Commencez à taper pour rechercher"}
                      </p>
                      <p className="text-sm text-gray-400">
                        {searchValue
                          ? "Essayez avec d'autres termes"
                          : "Recherchez par nom, SIRET, téléphone, etc."}
                      </p>
                    </div>
                  </div>
                </CommandEmpty>
                <CommandGroup>
                  {filteredClients.map((client) => {
                    const clientInfo = getClientDisplayInfo(client);
                    return (
                      <CommandItem
                        key={client.id}
                        value={`${client.raisonSociale} ${client.siret || ""} ${
                          client.telephone || ""
                        } ${client.email || ""} ${client.adresse || ""} ${
                          client.ville || ""
                        } ${client.codePostal || ""} ${
                          client.plaques?.join(" ") || ""
                        }`}
                        onSelect={() => handleClientSelect(client)}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                      >
                        <Check
                          className={cn(
                            "mr-3 h-5 w-5 transition-opacity duration-200",
                            selectedClient?.id === client.id
                              ? "opacity-100 text-blue-600"
                              : "opacity-0"
                          )}
                        />
                        <div className="flex items-start gap-3 w-full">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-600 text-white text-sm font-semibold flex-shrink-0">
                            {getClientTypeIcon(client.typeClient)}
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900 truncate">
                                {client.raisonSociale}
                              </span>
                              {client.siret && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                  SIRET
                                </span>
                              )}
                            </div>
                            {clientInfo.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {clientInfo.slice(0, 2).map((info, index) => (
                                  <span
                                    key={index}
                                    className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                                  >
                                    {info}
                                  </span>
                                ))}
                                {clientInfo.length > 2 && (
                                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                    +{clientInfo.length - 2} autres
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Options de chantiers multiples */}
      {showChantierOptions &&
        selectedClient &&
        selectedClient.chantiers &&
        selectedClient.chantiers.length > 1 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <Label className="text-sm font-semibold text-gray-700 mb-3 block">
              Chantiers disponibles pour ce client
            </Label>
            <div className="flex flex-wrap gap-2">
              {selectedClient.chantiers.map((chantier, index) => (
                <Badge
                  key={index}
                  variant={
                    currentData?.chantier === chantier ? "default" : "outline"
                  }
                  className={cn(
                    "cursor-pointer transition-colors duration-200",
                    currentData?.chantier === chantier
                      ? "bg-blue-500 text-white border-0"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  )}
                  onClick={() => updateCurrentTab({ chantier })}
                >
                  {currentData?.chantier === chantier && "✓ "}
                  {chantier}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Cliquez sur un chantier pour le sélectionner
            </p>
          </div>
        )}
    </div>
  );
};
