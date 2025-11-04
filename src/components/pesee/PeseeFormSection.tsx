import { useState, useMemo, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Combobox } from "@/components/ui/combobox";
import {
  UserPlus,
  RotateCcw,
  Check,
  ChevronsUpDown,
  Search,
  Plus,
} from "lucide-react";
import { Client, Transporteur } from "@/lib/database";
import { PeseeTab } from "@/hooks/usePeseeTabs";
import ClientForm from "@/components/forms/ClientForm";
import { PlaqueAutocomplete } from "./PlaqueAutocomplete";
import { ChantierAutocomplete } from "./ChantierAutocomplete";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PeseeFormSectionProps {
  currentData: PeseeTab["formData"] | undefined;
  clients: Client[];
  transporteurs: Transporteur[];
  updateCurrentTab: (updates: Partial<PeseeTab["formData"]>) => void;
  onAddClient: () => void;
  isAddClientDialogOpen: boolean;
  setIsAddClientDialogOpen: (open: boolean) => void;
  newClientForm: Partial<Client>;
  setNewClientForm: (form: Partial<Client>) => void;
  handleAddNewClient: () => void;
  handleUpdateClient: () => void;
  validateNewClient: () => boolean;
  isAddChantierDialogOpen: boolean;
  setIsAddChantierDialogOpen: (open: boolean) => void;
  newChantier: string;
  setNewChantier: (chantier: string) => void;
  handleAddChantier: () => void;
  isAddTransporteurDialogOpen: boolean;
  setIsAddTransporteurDialogOpen: (open: boolean) => void;
  newTransporteurForm: Partial<Transporteur>;
  setNewTransporteurForm: (form: Partial<Transporteur>) => void;
  handleAddNewTransporteur: () => void;
  validateNewTransporteur: () => boolean;
  validationErrors?: {
    plaque?: boolean;
    nomEntreprise?: boolean;
    chantier?: boolean;
    produitId?: boolean;
  };
}

export const PeseeFormSection = ({
  currentData,
  clients,
  transporteurs,
  updateCurrentTab,
  onAddClient,
  isAddClientDialogOpen,
  setIsAddClientDialogOpen,
  newClientForm,
  setNewClientForm,
  handleAddNewClient,
  handleUpdateClient,
  validateNewClient,
  isAddChantierDialogOpen,
  setIsAddChantierDialogOpen,
  newChantier,
  setNewChantier,
  handleAddChantier,
  isAddTransporteurDialogOpen,
  setIsAddTransporteurDialogOpen,
  newTransporteurForm,
  setNewTransporteurForm,
  handleAddNewTransporteur,
  validateNewTransporteur,
  validationErrors = {},
}: PeseeFormSectionProps) => {
  const [clientSelectorOpen, setClientSelectorOpen] = useState(false);
  const [clientSearchValue, setClientSearchValue] = useState("");
  const [transporteurLibre, setTransporteurLibre] = useState("");
  const [transporteurSelectorOpen, setTransporteurSelectorOpen] =
    useState(false);
  const [chantierLibre, setChantierLibre] = useState("");
  const [chantierSelectorOpen, setChantierSelectorOpen] = useState(false);
  const [chantierSearchValue, setChantierSearchValue] = useState("");

  // Synchroniser l'état local chantierLibre avec currentData
  useEffect(() => {
    if (currentData?.chantierLibre !== undefined) {
      setChantierLibre(currentData.chantierLibre);
    } else {
      setChantierLibre("");
    }
  }, [currentData?.chantierLibre]);

  // Synchroniser l'état local transporteurLibre avec currentData
  useEffect(() => {
    if (currentData?.transporteurLibre !== undefined) {
      setTransporteurLibre(currentData.transporteurLibre);
    } else {
      setTransporteurLibre("");
    }
  }, [currentData?.transporteurLibre]);

  // Fonction pour vérifier si l'adresse client est complète
  const isClientAddressComplete = (client: Client): boolean => {
    return Boolean(
      client.adresse &&
        client.adresse.trim() !== "" &&
        client.codePostal &&
        client.codePostal.trim() !== "" &&
        client.ville &&
        client.ville.trim() !== ""
    );
  };
  const [transporteurSearchValue, setTransporteurSearchValue] = useState("");

  const selectedClient = clients.find((c) => c.id === currentData?.clientId);

  // Fonction pour obtenir le placeholder automatique du transporteur
  const getAutoTransporteurPlaceholder = () => {
    if (!currentData?.nomEntreprise) return "Nom du transporteur...";

    // Par défaut, le client devient le transporteur (logique Track Déchet)
    return `Transporteur (par défaut: ${currentData.nomEntreprise})`;
  };

  // Recherche simplifiée pour les clients
  const filteredClients = useMemo(() => {
    if (!clientSearchValue.trim()) return clients;
    const term = clientSearchValue.toLowerCase();

    return clients.filter(
      (client) =>
        client.raisonSociale?.toLowerCase().includes(term) ||
        client.siret?.toLowerCase().includes(term) ||
        client.telephone?.toLowerCase().includes(term) ||
        client.email?.toLowerCase().includes(term) ||
        client.adresse?.toLowerCase().includes(term) ||
        client.ville?.toLowerCase().includes(term) ||
        client.codePostal?.toLowerCase().includes(term) ||
        client.plaques?.some((p) => p.toLowerCase().includes(term))
    );
  }, [clients, clientSearchValue]);

  const handleClientSelect = (client: Client) => {
    // Vérifier d'abord si le client a déjà un transporteur assigné
    let transporteurId = 0;

    if (client.transporteurId && client.transporteurId > 0) {
      // Le client a déjà un transporteur assigné, on le garde
      transporteurId = client.transporteurId;
      // Vider le transporteur libre car on utilise un transporteur officiel
      setTransporteurLibre("");
    } else {
      // Aucun transporteur assigné, on vide aussi le transporteur libre
      // L'auto-remplissage se fera via le placeholder
      setTransporteurLibre("");
    }

    // Déterminer le mode de paiement à utiliser
    let moyenPaiement = "ESP"; // Par défaut Espèces
    if (client.modePaiementPreferentiel) {
      moyenPaiement = client.modePaiementPreferentiel;
    }

    updateCurrentTab({
      clientId: client.id!,
      nomEntreprise: client.raisonSociale,
      typeClient: client.typeClient as
        | "particulier"
        | "professionnel"
        | "micro-entreprise",
      plaque: client.plaques?.[0] || "",
      chantier: client.chantiers?.[0] || "",
      chantierLibre: "",
      transporteurId: transporteurId,
      moyenPaiement: moyenPaiement as PeseeTab["formData"]["moyenPaiement"], // Auto-complétion du mode de paiement
    });
    // Vider le chantier libre car on utilise un chantier existant
    setChantierLibre("");

    setClientSelectorOpen(false);
    setClientSearchValue("");
  };

  // Gestion du remplissage du nom d'entreprise (sans affecter le transporteur)
  const handleNomEntrepriseChange = (value: string) => {
    updateCurrentTab({ nomEntreprise: value });
    // Plus de modification automatique du transporteurLibre ici
  };

  const getClientInfo = (client: Client) => {
    const info = [];
    if (client.siret) info.push(`SIRET: ${client.siret}`);
    if (client.telephone) info.push(client.telephone);
    if (client.plaques?.length) info.push(client.plaques[0]);
    return info.slice(0, 2);
  };

  const getEntrepriseLabel = () => {
    if (currentData?.typeClient === "particulier") {
      return "Nom *";
    }
    return "Nom entreprise *";
  };

  const resetForm = () => {
    updateCurrentTab({
      clientId: 0,
      transporteurId: 0,
      nomEntreprise: "",
      typeClient: "particulier",
      plaque: "",
      chantier: "",
      chantierLibre: "",
      moyenPaiement: "ESP",
    });
    setTransporteurLibre("");
    setChantierLibre("");
  };

  // Obtenir la valeur réelle affichée dans l'input transporteur
  const getTransporteurInputValue = () => {
    // Si un transporteur officiel est sélectionné, afficher son nom
    if (currentData?.transporteurId && currentData.transporteurId > 0) {
      const selectedTransporteur = transporteurs.find(
        (t) => t.id === currentData.transporteurId
      );
      return selectedTransporteur
        ? `${selectedTransporteur.prenom} ${selectedTransporteur.nom}`
        : "";
    }

    // Si l'utilisateur a tapé quelque chose dans transporteurLibre, l'afficher
    if (transporteurLibre) {
      return transporteurLibre;
    }

    // Sinon, par défaut pour Track Déchet : le client devient le transporteur
    if (currentData?.nomEntreprise) {
      return currentData.nomEntreprise;
    }

    return "";
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="numeroBon">Numéro de bon</Label>
          <Input
            id="numeroBon"
            value={currentData?.numeroBon || ""}
            onChange={(e) => updateCurrentTab({ numeroBon: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="moyenPaiement">Mode de paiement</Label>
          <Select
            value={currentData?.moyenPaiement || "ESP"}
            onValueChange={(value) =>
              updateCurrentTab({
                moyenPaiement: value as PeseeTab["formData"]["moyenPaiement"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="ESP">💶 Espèces (ESP)</SelectItem>
              <SelectItem value="CB">💳 Carte bancaire (CB)</SelectItem>
              <SelectItem value="CHQ">🏦 Chèque (CHQ)</SelectItem>
              <SelectItem value="VIR">📤 Virement (VIR)</SelectItem>
              <SelectItem value="PRVT">📋 Prélèvement (PRVT)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Si pas de client sélectionné, afficher le sélecteur de type */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {!currentData?.clientId ? (
          <>
            <div>
              <Label htmlFor="typeClient">Type de client</Label>
              <Select
                value={currentData?.typeClient || "particulier"}
                onValueChange={(
                  value: "particulier" | "professionnel" | "micro-entreprise"
                ) => updateCurrentTab({ typeClient: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="particulier">👤 Particulier</SelectItem>
                  <SelectItem value="professionnel">
                    🏢 Professionnel
                  </SelectItem>
                  <SelectItem value="micro-entreprise">
                    💼 Micro-entreprise
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Client existant</Label>
              <Popover
                open={clientSelectorOpen}
                onOpenChange={setClientSelectorOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientSelectorOpen}
                    className="w-full justify-between  px-4 py-3 bg-white border-2 border-gray-200 transition-colors duration-200 rounded-lg"
                  >
                    {selectedClient ? (
                      <div className="flex items-center gap-3 w-full">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white text-sm font-semibold">
                          {selectedClient.typeClient === "particulier"
                            ? "👤"
                            : "🏢"}
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
                        <span className="font-medium">
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
                      <CommandInput
                        placeholder="Rechercher par nom, SIRET, contact, adresse, plaque..."
                        value={clientSearchValue}
                        onValueChange={setClientSearchValue}
                        className="min-w-[400px] border-0 focus:ring-0 text-base placeholder:text-gray-400"
                      />
                    </div>
                    <CommandList className="max-h-[400px]">
                      <CommandEmpty className="py-6 text-left px-4">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="text-gray-500 font-medium">
                              {clientSearchValue
                                ? "Aucun client trouvé"
                                : "Commencez à taper pour rechercher"}
                            </p>
                            <p className="text-sm text-gray-400">
                              {clientSearchValue
                                ? "Essayez avec d'autres termes"
                                : "Recherchez par nom, SIRET, téléphone, etc."}
                            </p>
                          </div>
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        {filteredClients.map((client) => {
                          const info = getClientInfo(client);
                          return (
                            <CommandItem
                              key={client.id}
                              value={`${client.raisonSociale} ${
                                client.siret || ""
                              } ${client.telephone || ""} ${
                                client.email || ""
                              } ${client.adresse || ""} ${client.ville || ""} ${
                                client.codePostal || ""
                              } ${client.plaques?.join(" ") || ""}`}
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
                                  {client.typeClient === "particulier"
                                    ? "👤"
                                    : "🏢"}
                                </div>
                                <div className="flex flex-col flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-gray-900 truncate">
                                      {client.raisonSociale}
                                    </span>
                                    <span
                                      className={cn(
                                        "text-xs px-2 py-1 rounded-full font-medium",
                                        client.typeClient === "particulier"
                                          ? "bg-blue-100 text-blue-700"
                                          : client.typeClient ===
                                            "professionnel"
                                          ? "bg-purple-100 text-purple-700"
                                          : "bg-orange-100 text-orange-700"
                                      )}
                                    >
                                      {client.typeClient === "particulier"
                                        ? "👤 Particulier"
                                        : client.typeClient === "professionnel"
                                        ? "🏢 Pro"
                                        : "💼 Micro"}
                                    </span>
                                    {client.modePaiementPreferentiel && (
                                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                                        💳 {client.modePaiementPreferentiel}
                                      </span>
                                    )}
                                  </div>
                                  {info.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {info.map((item, index) => (
                                        <span
                                          key={index}
                                          className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                                        >
                                          {item}
                                        </span>
                                      ))}
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
          </>
        ) : (
          <div>
            <Label>Client existant</Label>
            <div className="flex gap-2">
              <Popover
                open={clientSelectorOpen}
                onOpenChange={setClientSelectorOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientSelectorOpen}
                    className="w-full justify-between px-4 py-3 bg-white border-2 border-gray-200 hover:border-blue-300 focus:border-blue-500 transition-colors duration-200 rounded-lg"
                  >
                    {selectedClient ? (
                      <div className="flex items-center gap-3 w-full">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white text-sm font-semibold">
                          {selectedClient.typeClient === "particulier"
                            ? "👤"
                            : "🏢"}
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
                        <span className="font-medium">
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
                      <CommandInput
                        placeholder="Rechercher par nom, SIRET, contact, adresse, plaque..."
                        value={clientSearchValue}
                        onValueChange={setClientSearchValue}
                        className="min-w-[400px] border-0 focus:ring-0 text-base placeholder:text-gray-400"
                      />
                    </div>
                    <CommandList className="max-h-[400px]">
                      <CommandEmpty className="py-6 text-left px-4">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="text-gray-500 font-medium">
                              {clientSearchValue
                                ? "Aucun client trouvé"
                                : "Commencez à taper pour rechercher"}
                            </p>
                            <p className="text-sm text-gray-400">
                              {clientSearchValue
                                ? "Essayez avec d'autres termes"
                                : "Recherchez par nom, SIRET, téléphone, etc."}
                            </p>
                          </div>
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        {filteredClients.map((client) => {
                          const info = getClientInfo(client);
                          return (
                            <CommandItem
                              key={client.id}
                              value={`${client.raisonSociale} ${
                                client.siret || ""
                              } ${client.telephone || ""} ${
                                client.email || ""
                              } ${client.adresse || ""} ${client.ville || ""} ${
                                client.codePostal || ""
                              } ${client.plaques?.join(" ") || ""}`}
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
                                  {client.typeClient === "particulier"
                                    ? "👤"
                                    : "🏢"}
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
                                  {info.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {info.map((item, index) => (
                                        <span
                                          key={index}
                                          className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                                        >
                                          {item}
                                        </span>
                                      ))}
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
              <Button
                variant="outline"
                size="sm"
                onClick={resetForm}
                title="Réinitialiser le formulaire"
                className="content-center"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        <div>
          <Label
            htmlFor="nomEntreprise"
            className={cn(validationErrors.nomEntreprise && "text-red-600")}
          >
            {getEntrepriseLabel()}
            {validationErrors.nomEntreprise && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </Label>
          <Input
            id="nomEntreprise"
            className={cn(
              "placeholder:text-black",
              validationErrors.nomEntreprise &&
                "border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500"
            )}
            value={currentData?.nomEntreprise || ""}
            onChange={(e) => handleNomEntrepriseChange(e.target.value)}
            placeholder={
              currentData?.typeClient === "particulier"
                ? "Nom du particulier..."
                : "Nom de l'entreprise..."
            }
          />
          {validationErrors.nomEntreprise && (
            <p className="text-red-600 text-sm mt-1">
              Ce champ est obligatoire
            </p>
          )}
        </div>
        <div>
          <PlaqueAutocomplete
            value={currentData?.plaque || ""}
            clients={clients}
            onSelect={(match) => {
              updateCurrentTab({
                plaque: match.plaque,
                clientId: match.client.id!,
                nomEntreprise: match.client.raisonSociale,
                typeClient: match.client.typeClient as
                  | "particulier"
                  | "professionnel"
                  | "micro-entreprise",
              });
            }}
            onChange={(val) => updateCurrentTab({ plaque: val })}
          />
          {validationErrors.plaque && (
            <p className="text-red-600 text-sm mt-1">
              Ce champ est obligatoire
            </p>
          )}
        </div>
        <div>
          <div className="mb-2">
            <Label
              htmlFor="chantier"
              className={cn(
                "flex items-center gap-2",
                validationErrors.chantier && "text-red-600"
              )}
            >
              Chantier <span className="text-red-500">*</span>
              {validationErrors.chantier && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </Label>
            {(() => {
              // Vérifier si le chantier actuel correspond à l'adresse du client (suggestion)
              if (currentData?.clientId && currentData?.chantier) {
                const client = clients.find(
                  (c) => c.id === currentData.clientId
                );
                if (client && isClientAddressComplete(client)) {
                  const suggestedChantier = `${client.adresse}, ${client.codePostal} ${client.ville}`;
                  if (currentData.chantier === suggestedChantier) {
                    return (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium border border-green-200">
                        ✓ Chantier suggéré automatiquement
                      </span>
                    );
                  }
                }
              }
              return null;
            })()}
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Popover
                open={chantierSelectorOpen}
                onOpenChange={setChantierSelectorOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={chantierSelectorOpen}
                    className="w-full justify-between"
                    disabled={!currentData?.clientId}
                  >
                    {(() => {
                      // Priorité: chantierLibre > chantier
                      const displayValue =
                        currentData?.chantierLibre?.trim() ||
                        currentData?.chantier?.trim() ||
                        "";
                      return displayValue || "Sélectionner un chantier...";
                    })()}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput
                      placeholder="Rechercher un chantier..."
                      value={chantierSearchValue}
                      onValueChange={setChantierSearchValue}
                    />
                    <CommandList>
                      <CommandEmpty>Aucun chantier trouvé.</CommandEmpty>
                      <CommandGroup>
                        {/* Option chantier libre */}
                        <CommandItem
                          value="chantier-libre"
                          onSelect={() => {
                            // Activer le mode chantier libre
                            setChantierLibre("");
                            updateCurrentTab({
                              chantier: "",
                              chantierLibre: "",
                            });
                            setChantierSelectorOpen(false);
                            // Le champ input s'affichera automatiquement grâce à la condition
                          }}
                          className="font-medium"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              !currentData?.chantier &&
                                !currentData?.chantierLibre
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          Chantier libre (saisie manuelle)
                        </CommandItem>
                        {/* Chantiers du client actuel */}
                        {currentData?.clientId &&
                          (() => {
                            const client = clients.find(
                              (c) => c.id === currentData.clientId
                            );
                            const clientChantiers = client?.chantiers || [];
                            const filteredChantiers = clientChantiers.filter(
                              (c) =>
                                c
                                  .toLowerCase()
                                  .includes(
                                    chantierSearchValue.toLowerCase()
                                  ) || chantierSearchValue === ""
                            );
                            return filteredChantiers.map((chantier) => (
                              <CommandItem
                                key={chantier}
                                value={chantier}
                                onSelect={() => {
                                  setChantierLibre("");
                                  updateCurrentTab({
                                    chantier: chantier,
                                    chantierLibre: "",
                                  });
                                  setChantierSelectorOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    currentData?.chantier === chantier &&
                                      !currentData?.chantierLibre
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {chantier}
                              </CommandItem>
                            ));
                          })()}
                        {/* Tous les chantiers si aucun client sélectionné */}
                        {!currentData?.clientId &&
                          (() => {
                            const allChantiers = [
                              ...new Set(
                                clients.flatMap((c) => c.chantiers || [])
                              ),
                            ];
                            const filteredChantiers = allChantiers.filter(
                              (c) =>
                                c
                                  .toLowerCase()
                                  .includes(
                                    chantierSearchValue.toLowerCase()
                                  ) || chantierSearchValue === ""
                            );
                            return filteredChantiers.map((chantier) => (
                              <CommandItem
                                key={chantier}
                                value={chantier}
                                onSelect={() => {
                                  setChantierLibre("");
                                  updateCurrentTab({
                                    chantier: chantier,
                                    chantierLibre: "",
                                  });
                                  setChantierSelectorOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    currentData?.chantier === chantier &&
                                      !currentData?.chantierLibre
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {chantier}
                              </CommandItem>
                            ));
                          })()}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {/* Champ pour chantier libre - toujours affiché si aucun chantier existant n'est sélectionné */}
              {!currentData?.chantier ? (
                <div className="mt-2">
                  <Input
                    placeholder="Nom du chantier libre (ou sélectionnez un chantier ci-dessus)"
                    value={chantierLibre}
                    onChange={(e) => {
                      const value = e.target.value;
                      setChantierLibre(value);
                      updateCurrentTab({
                        chantierLibre: value,
                        chantier: "", // S'assurer que chantier est vide quand on utilise chantierLibre
                      });
                    }}
                    className={cn(
                      validationErrors.chantier &&
                        "border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500"
                    )}
                  />
                </div>
              ) : null}
              {validationErrors.chantier && (
                <p className="text-red-600 text-sm mt-1">
                  Ce champ est obligatoire
                </p>
              )}
            </div>
            <Dialog
              open={isAddChantierDialogOpen}
              onOpenChange={setIsAddChantierDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-0 self-start shrink-0"
                  disabled={!currentData?.clientId}
                  title="Ajouter un nouveau chantier"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un nouveau chantier</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nom du chantier</Label>
                    <Input
                      value={newChantier}
                      onChange={(e) => setNewChantier(e.target.value)}
                      placeholder="Nom du nouveau chantier"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsAddChantierDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button onClick={handleAddChantier}>Ajouter</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div>
          <div className="mb-2">
            <Label htmlFor="transporteur">Transporteur</Label>
            {currentData?.nomEntreprise && (
              <p className="text-xs text-muted-foreground mt-1">
                💡 Par défaut :{" "}
                <span className="font-medium">{currentData.nomEntreprise}</span>{" "}
                (le client)
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Popover
                open={transporteurSelectorOpen}
                onOpenChange={setTransporteurSelectorOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={transporteurSelectorOpen}
                    className="w-full justify-between"
                  >
                    {getTransporteurInputValue() ||
                      "Sélectionner un transporteur..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput
                      placeholder="Rechercher un transporteur..."
                      value={transporteurSearchValue}
                      onValueChange={setTransporteurSearchValue}
                    />
                    <CommandList>
                      <CommandEmpty>Aucun transporteur trouvé.</CommandEmpty>
                      <CommandGroup>
                        {/* Option transporteur libre */}
                        <CommandItem
                          value="transporteur-libre"
                          onSelect={() => {
                            setTransporteurLibre("");
                            updateCurrentTab({
                              transporteurId: 0,
                              transporteurLibre: "",
                            });
                            setTransporteurSelectorOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              (!currentData?.transporteurId ||
                                currentData.transporteurId === 0) &&
                                !transporteurLibre
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          Transporteur libre (saisie manuelle)
                        </CommandItem>

                        {/* Transporteurs existants */}
                        {transporteurs
                          .filter(
                            (transporteur) =>
                              transporteur.prenom
                                .toLowerCase()
                                .includes(
                                  transporteurSearchValue.toLowerCase()
                                ) ||
                              transporteur.nom
                                .toLowerCase()
                                .includes(transporteurSearchValue.toLowerCase())
                          )
                          .map((transporteur) => (
                            <CommandItem
                              key={transporteur.id}
                              value={`${transporteur.prenom} ${transporteur.nom}`}
                              onSelect={() => {
                                updateCurrentTab({
                                  transporteurId: transporteur.id!,
                                });
                                setTransporteurLibre("");
                                setTransporteurSelectorOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  currentData?.transporteurId ===
                                    transporteur.id
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {transporteur.prenom} {transporteur.nom}
                              {transporteur.siret && (
                                <Badge variant="secondary" className="ml-2">
                                  {transporteur.siret}
                                </Badge>
                              )}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Champ pour transporteur libre si sélectionné */}
              {(!currentData?.transporteurId ||
                currentData.transporteurId === 0) && (
                <div className="mt-2">
                  <Input
                    placeholder="Nom du transporteur libre (optionnel)"
                    value={transporteurLibre}
                    onChange={(e) => {
                      setTransporteurLibre(e.target.value);
                      updateCurrentTab({ transporteurLibre: e.target.value });
                    }}
                  />
                </div>
              )}
            </div>
            <Dialog
              open={isAddTransporteurDialogOpen}
              onOpenChange={setIsAddTransporteurDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-0 self-start shrink-0"
                  title="Ajouter un nouveau transporteur"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nouveau Transporteur</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Prénom *</Label>
                      <Input
                        value={newTransporteurForm.prenom || ""}
                        onChange={(e) =>
                          setNewTransporteurForm({
                            ...newTransporteurForm,
                            prenom: e.target.value,
                          })
                        }
                        placeholder="Prénom du transporteur"
                      />
                    </div>
                    <div>
                      <Label>Nom *</Label>
                      <Input
                        value={newTransporteurForm.nom || ""}
                        onChange={(e) =>
                          setNewTransporteurForm({
                            ...newTransporteurForm,
                            nom: e.target.value,
                          })
                        }
                        placeholder="Nom du transporteur"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>SIRET</Label>
                    <Input
                      value={newTransporteurForm.siret || ""}
                      onChange={(e) =>
                        setNewTransporteurForm({
                          ...newTransporteurForm,
                          siret: e.target.value,
                        })
                      }
                      placeholder="SIRET (optionnel)"
                    />
                  </div>
                  <div>
                    <Label>Adresse</Label>
                    <Input
                      value={newTransporteurForm.adresse || ""}
                      onChange={(e) =>
                        setNewTransporteurForm({
                          ...newTransporteurForm,
                          adresse: e.target.value,
                        })
                      }
                      placeholder="Adresse"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Code postal</Label>
                      <Input
                        value={newTransporteurForm.codePostal || ""}
                        onChange={(e) =>
                          setNewTransporteurForm({
                            ...newTransporteurForm,
                            codePostal: e.target.value,
                          })
                        }
                        placeholder="Code postal"
                      />
                    </div>
                    <div>
                      <Label>Ville</Label>
                      <Input
                        value={newTransporteurForm.ville || ""}
                        onChange={(e) =>
                          setNewTransporteurForm({
                            ...newTransporteurForm,
                            ville: e.target.value,
                          })
                        }
                        placeholder="Ville"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={newTransporteurForm.email || ""}
                      onChange={(e) =>
                        setNewTransporteurForm({
                          ...newTransporteurForm,
                          email: e.target.value,
                        })
                      }
                      placeholder="Email"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsAddTransporteurDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleAddNewTransporteur}
                    disabled={!validateNewTransporteur()}
                  >
                    Créer et sélectionner
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Chantiers multiples */}
      {selectedClient?.chantiers && selectedClient.chantiers.length > 1 && (
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

      <div className="flex justify-center">
        <Dialog
          open={isAddClientDialogOpen}
          onOpenChange={setIsAddClientDialogOpen}
        >
          <DialogTrigger asChild>
            <Button
              variant="outline"
              onClick={() => {
                if (selectedClient) {
                  // Si un client est sélectionné, pré-remplir le formulaire avec ses données
                  setNewClientForm({
                    id: selectedClient.id,
                    codeClient: selectedClient.codeClient,
                    raisonSociale: selectedClient.raisonSociale,
                    typeClient: selectedClient.typeClient,
                    siret: selectedClient.siret,
                    adresse: selectedClient.adresse,
                    codePostal: selectedClient.codePostal,
                    ville: selectedClient.ville,
                    telephone: selectedClient.telephone,
                    email: selectedClient.email,
                    plaques: selectedClient.plaques,
                    chantiers: selectedClient.chantiers,
                    transporteurId: selectedClient.transporteurId,
                    modePaiementPreferentiel:
                      selectedClient.modePaiementPreferentiel,
                    tarifsPreferentiels: selectedClient.tarifsPreferentiels,
                  });
                } else {
                  onAddClient();
                }
                setIsAddClientDialogOpen(true);
              }}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {selectedClient
                ? "Modifier les informations du client"
                : "Ajouter nouveau client"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedClient ? "Modifier le client" : "Nouveau Client"}
              </DialogTitle>
            </DialogHeader>
            <ClientForm
              formData={newClientForm}
              onFormDataChange={setNewClientForm}
              transporteurs={transporteurs}
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsAddClientDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button
                onClick={
                  selectedClient ? handleUpdateClient : handleAddNewClient
                }
                disabled={!validateNewClient()}
              >
                {selectedClient
                  ? "Enregistrer les modifications"
                  : "Créer et sélectionner"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
