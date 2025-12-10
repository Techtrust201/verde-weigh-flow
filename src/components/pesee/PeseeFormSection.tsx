import { useState, useMemo, useEffect, useRef } from "react";
import { useScrollToTop } from "@/hooks/useScrollToTop";
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
import { UserPlus, RotateCcw, Check, ChevronsUpDown, Plus } from "lucide-react";
import { Client, Transporteur, PaymentMethod, db } from "@/lib/database";
import { PeseeTab } from "@/hooks/usePeseeTabs";
import ClientForm from "@/components/forms/ClientForm";
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
  isAddPlaqueDialogOpen: boolean;
  setIsAddPlaqueDialogOpen: (open: boolean) => void;
  newPlaque: string;
  setNewPlaque: (plaque: string) => void;
  handleAddPlaque: () => void;
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
  isAddPlaqueDialogOpen,
  setIsAddPlaqueDialogOpen,
  newPlaque,
  setNewPlaque,
  handleAddPlaque,
  isAddTransporteurDialogOpen,
  setIsAddTransporteurDialogOpen,
  newTransporteurForm,
  setNewTransporteurForm,
  handleAddNewTransporteur,
  validateNewTransporteur,
  validationErrors = {},
}: PeseeFormSectionProps) => {
  // États pour les sélecteurs
  const [clientSelectorOpen, setClientSelectorOpen] = useState(false);
  const [clientSearchValue, setClientSearchValue] = useState("");
  const [transporteurSelectorOpen, setTransporteurSelectorOpen] =
    useState(false);
  const [transporteurSearchValue, setTransporteurSearchValue] = useState("");
  const [chantierSelectorOpen, setChantierSelectorOpen] = useState(false);
  const [chantierSearchValue, setChantierSearchValue] = useState("");
  const [plaqueSelectorOpen, setPlaqueSelectorOpen] = useState(false);
  const [plaqueSearchValue, setPlaqueSearchValue] = useState("");

  // États locaux pour les champs libres
  const [transporteurLibre, setTransporteurLibre] = useState("");
  const [chantierLibre, setChantierLibre] = useState("");
  const [plaqueLibre, setPlaqueLibre] = useState("");

  // Références pour le scroll des listes de recherche
  const clientListRef = useRef<HTMLDivElement>(null);

  // États pour les modes de paiement
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  // Charger et synchroniser les modes de paiement
  const loadPaymentMethods = async () => {
    try {
      const methods = await db.paymentMethods
        .filter((pm) => pm.active)
        .toArray();
      setPaymentMethods(methods);
    } catch (error) {
      console.error("Erreur chargement modes de paiement:", error);
    }
  };

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  // Synchroniser les états locaux avec currentData
  useEffect(() => {
    setChantierLibre(currentData?.chantierLibre || "");
  }, [currentData?.chantierLibre]);

  useEffect(() => {
    setTransporteurLibre(currentData?.transporteurLibre || "");
  }, [currentData?.transporteurLibre]);

  useEffect(() => {
    // Ne synchroniser que si plaque n'est pas dans la liste des plaques du client
    // (c'est-à-dire si c'est une saisie libre)
    if (currentData?.plaque) {
      const client = clients.find((c) => c.id === currentData?.clientId);
      const isPlaqueFromClient = client?.plaques?.includes(currentData.plaque);
      if (!isPlaqueFromClient) {
        setPlaqueLibre(currentData.plaque);
      } else {
        setPlaqueLibre("");
      }
    } else {
      setPlaqueLibre("");
    }
  }, [currentData?.plaque, currentData?.clientId, clients]);

  // Helpers
  const selectedClient = useMemo(
    () => clients.find((c) => c.id === currentData?.clientId),
    [clients, currentData?.clientId]
  );

  const isClientAddressComplete = (client: Client): boolean => {
    return Boolean(
      client.adresse?.trim() &&
        client.codePostal?.trim() &&
        client.ville?.trim()
    );
  };

  // Recherche de clients
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
    const transporteurId =
      client.transporteurId && client.transporteurId > 0
        ? client.transporteurId
        : 0;
    const moyenPaiement = client.modePaiementPreferentiel || "ESP";

    // Déterminer le chantier : priorité au premier chantier du client, sinon utiliser l'adresse complète
    let chantierToSet = client.chantiers?.[0] || "";
    if (!chantierToSet && isClientAddressComplete(client)) {
      chantierToSet = `${client.adresse}, ${client.codePostal} ${client.ville}`;
    }

    updateCurrentTab({
      clientId: client.id!,
      nomEntreprise: client.raisonSociale,
      typeClient: client.typeClient as
        | "particulier"
        | "professionnel"
        | "micro-entreprise",
      plaque: client.plaques?.[0] || "",
      chantier: chantierToSet,
      chantierLibre: "",
      transporteurId,
      moyenPaiement: moyenPaiement as PeseeTab["formData"]["moyenPaiement"],
    });

    setChantierLibre("");
    setTransporteurLibre("");
    setClientSelectorOpen(false);
    setClientSearchValue("");
  };

  const handleNomEntrepriseChange = (value: string) => {
    updateCurrentTab({ nomEntreprise: value });
  };

  const getClientInfo = (client: Client): string[] => {
    const info: string[] = [];
    if (client.siret) info.push(`SIRET: ${client.siret}`);
    if (client.telephone) info.push(client.telephone);
    if (client.plaques?.length) info.push(client.plaques[0]);
    return info.slice(0, 2);
  };

  const getEntrepriseLabel = (): string => {
    return currentData?.typeClient === "particulier"
      ? "Nom"
      : "Nom entreprise *";
  };

  const resetForm = () => {
    updateCurrentTab({
      clientId: 0,
      transporteurId: 0,
      nomEntreprise: "",
      typeClient: "professionnel",
      plaque: "",
      chantier: "",
      chantierLibre: "",
      moyenPaiement: "ESP",
    });
    setTransporteurLibre("");
    setChantierLibre("");
  };

  // Fonctions helper pour obtenir les valeurs d'affichage
  const getTransporteurInputValue = (): string => {
    if (currentData?.transporteurId && currentData.transporteurId > 0) {
      const transporteur = transporteurs.find(
        (t) => t.id === currentData.transporteurId
      );
      return transporteur ? `${transporteur.prenom} ${transporteur.nom}` : "";
    }
    if (transporteurLibre?.trim()) return transporteurLibre;
    if (currentData?.nomEntreprise) return currentData.nomEntreprise;
    return "";
  };

  const getChantierInputValue = (): string => {
    if (currentData?.chantier?.trim()) return currentData.chantier;
    if (chantierLibre?.trim()) return chantierLibre;
    if (currentData?.clientId) {
      const client = clients.find((c) => c.id === currentData.clientId);
      if (client && isClientAddressComplete(client)) {
        return `${client.adresse}, ${client.codePostal} ${client.ville}`;
      }
    }
    return "";
  };

  // Helper pour obtenir les chantiers filtrés
  const getFilteredChantiers = (searchValue: string): string[] => {
    if (currentData?.clientId) {
      const client = clients.find((c) => c.id === currentData.clientId);
      const clientChantiers = client?.chantiers || [];
      return clientChantiers.filter(
        (c) =>
          c.toLowerCase().includes(searchValue.toLowerCase()) ||
          searchValue === ""
      );
    }
    const allChantiers = [
      ...new Set(clients.flatMap((c) => c.chantiers || [])),
    ];
    return allChantiers.filter(
      (c) =>
        c.toLowerCase().includes(searchValue.toLowerCase()) ||
        searchValue === ""
    );
  };

  // Helper pour obtenir les plaques filtrées
  const getFilteredPlaques = (searchValue: string): string[] => {
    if (!currentData?.clientId) return [];
    const client = clients.find((c) => c.id === currentData.clientId);
    if (!client?.plaques || client.plaques.length === 0) return [];
    return client.plaques.filter(
      (plaque) =>
        searchValue.trim() === "" ||
        plaque.toLowerCase().includes(searchValue.toLowerCase())
    );
  };

  return (
    <div className="space-y-3 flex-1 flex flex-col h-full">
      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="numeroBon">Numéro de bon</Label>
            <Input
              id="numeroBon"
              value={currentData?.numeroBon || ""}
              onChange={(e) => updateCurrentTab({ numeroBon: e.target.value })}
              className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
            />
          </div>
          <div>
            <Label htmlFor="moyenPaiement">Mode de paiement</Label>
            <Select
              value={currentData?.moyenPaiement || "ESP"}
              onValueChange={(value) => {
                const selectedMethod = paymentMethods.find(
                  (pm) => pm.code === value
                );
                if (selectedMethod) {
                  updateCurrentTab({
                    moyenPaiement:
                      value as PeseeTab["formData"]["moyenPaiement"],
                  });
                } else {
                  // Si le mode sélectionné n'est plus actif, réinitialiser au premier actif ou ESP
                  const firstActive = paymentMethods[0];
                  updateCurrentTab({
                    moyenPaiement: (firstActive?.code ||
                      "ESP") as PeseeTab["formData"]["moyenPaiement"],
                  });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {paymentMethods.length > 0 ? (
                  paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.code}>
                      {method.libelle}
                    </SelectItem>
                  ))
                ) : (
                  // Fallback si aucun mode de paiement actif
                  <>
                    <SelectItem value="ESP">Espèces (ESP)</SelectItem>
                    <SelectItem value="CB">Carte bancaire (CB)</SelectItem>
                    <SelectItem value="CHQ">Chèque (CHQ)</SelectItem>
                    <SelectItem value="VIR">Virement (VIR)</SelectItem>
                    <SelectItem value="PRVT">Prélèvement (PRVT)</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Si pas de client sélectionné, afficher le sélecteur de type */}
      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/50">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3">
          {!currentData?.clientId ? (
            <>
              <div>
                <Label htmlFor="typeClient">Type de client</Label>
                <Select
                  value={currentData?.typeClient || "professionnel"}
                  onValueChange={(
                    value: "particulier" | "professionnel" | "micro-entreprise"
                  ) => updateCurrentTab({ typeClient: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professionnel">
                      🏢 Professionnel
                    </SelectItem>
                    <SelectItem value="particulier">👤 Particulier</SelectItem>
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
                    side="bottom"
                    sideOffset={4}
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
                      <CommandList
                        ref={clientListRef}
                        className="max-h-[400px]"
                      >
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
                                } ${client.adresse || ""} ${
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
                                          : client.typeClient ===
                                            "professionnel"
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
                    side="bottom"
                    sideOffset={4}
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
                      <CommandList
                        ref={clientListRef}
                        className="max-h-[400px]"
                      >
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
                                } ${client.adresse || ""} ${
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
      </div>

      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/50">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3 items-stretch">
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
                "max-w-full overflow-hidden text-ellipsis whitespace-nowrap placeholder:text-black",
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
            <div className="mb-1.5">
              <Label
                htmlFor="plaque"
                className={cn(
                  "flex items-center gap-2",
                  validationErrors.plaque && "text-red-600"
                )}
              >
                Plaque
                {validationErrors.plaque && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </Label>
            </div>
            <div className="space-y-1.5">
              <div className="flex gap-2 min-w-0">
                <div className="flex-1 min-w-0">
                  <Popover
                    open={plaqueSelectorOpen}
                    onOpenChange={setPlaqueSelectorOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={plaqueSelectorOpen}
                        className="w-full justify-between min-w-0 font-normal"
                        disabled={!currentData?.clientId}
                      >
                        <span className="truncate flex-1 text-left">
                          {currentData?.plaque?.trim() ||
                            "Sélectionner une plaque..."}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput
                          placeholder="Rechercher une plaque..."
                          value={plaqueSearchValue}
                          onValueChange={setPlaqueSearchValue}
                        />
                        <CommandList>
                          <CommandEmpty>Aucune plaque trouvée.</CommandEmpty>
                          <CommandGroup>
                            {getFilteredPlaques(plaqueSearchValue).map(
                              (plaque) => (
                                <CommandItem
                                  key={plaque}
                                  value={plaque}
                                  onSelect={() => {
                                    setPlaqueLibre(""); // Vider l'input libre quand on sélectionne depuis le dropdown
                                    updateCurrentTab({ plaque });
                                    setPlaqueSelectorOpen(false);
                                    setPlaqueSearchValue("");
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      currentData?.plaque === plaque
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  <span>{plaque}</span>
                                </CommandItem>
                              )
                            )}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                {/* Bouton pour ajouter une plaque au client */}
                <Dialog
                  open={isAddPlaqueDialogOpen}
                  onOpenChange={(open) => {
                    setIsAddPlaqueDialogOpen(open);
                    if (open && currentData?.plaque) {
                      setNewPlaque(currentData.plaque);
                    } else if (!open) {
                      setNewPlaque("");
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      disabled={!currentData?.clientId}
                      title="Ajouter une nouvelle plaque au client"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ajouter une nouvelle plaque</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <Label>Plaque d'immatriculation</Label>
                        <Input
                          value={newPlaque}
                          onChange={(e) => setNewPlaque(e.target.value)}
                          placeholder="Plaque d'immatriculation (ex: AB-123-CD)"
                          className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsAddPlaqueDialogOpen(false);
                          setNewPlaque("");
                        }}
                      >
                        Annuler
                      </Button>
                      <Button onClick={handleAddPlaque}>Ajouter</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              {/* Champ pour plaque libre - en dessous */}
              <Input
                placeholder="Ou saisir une plaque libre..."
                value={plaqueLibre}
                onChange={(e) => {
                  const value = e.target.value;
                  setPlaqueLibre(value);
                  // Si on saisit dans le champ libre, on écrase la plaque sélectionnée
                  if (value.trim()) {
                    updateCurrentTab({
                      plaque: value,
                    });
                  } else {
                    // Si on vide le champ libre, on garde la plaque sélectionnée s'il y en a une
                    updateCurrentTab({
                      plaque: "",
                    });
                  }
                }}
                className={cn(
                  "max-w-full overflow-hidden text-ellipsis whitespace-nowrap",
                  validationErrors.plaque &&
                    "border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500"
                )}
              />
              {validationErrors.plaque && (
                <p className="text-red-600 text-sm mt-1">
                  Ce champ est obligatoire
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
          <div className="flex flex-col h-full">
            <div>
              <Label
                htmlFor="chantier"
                className={cn(validationErrors.chantier && "text-red-600")}
              >
                Chantier
                {!!validationErrors.chantier && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </Label>
              {currentData?.clientId
                ? (() => {
                    const client = clients.find(
                      (c) => c.id === currentData.clientId
                    );
                    if (client && isClientAddressComplete(client)) {
                      const defaultChantier = `${client.adresse}, ${client.codePostal} ${client.ville}`;
                      return (
                        <p className="text-xs text-muted-foreground my-2">
                          💡 Par défaut :{" "}
                          <span className="font-medium">
                            (adresse du client)
                          </span>{" "}
                        </p>
                      );
                    }
                    return null;
                  })()
                : null}
            </div>
            <div className="space-y-1.5">
              <div className="flex gap-2 min-w-0">
                <div className="flex-1 min-w-0">
                  <Popover
                    open={chantierSelectorOpen}
                    onOpenChange={setChantierSelectorOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={chantierSelectorOpen}
                        className={cn(
                          "w-full justify-between min-w-0 font-normal",
                          validationErrors.chantier &&
                            "border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500"
                        )}
                        disabled={!currentData?.clientId}
                      >
                        <span className="truncate flex-1 text-left">
                          {getChantierInputValue() ||
                            "Sélectionner un chantier..."}
                        </span>
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
                            {/* Chantiers filtrés */}
                            {getFilteredChantiers(chantierSearchValue).map(
                              (chantier) => (
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
                              )
                            )}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <Dialog
                  open={isAddChantierDialogOpen}
                  onOpenChange={setIsAddChantierDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
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
                          className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
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
              {/* Champ pour chantier libre - toujours affiché comme pour transporteur */}
              <Input
                placeholder="Ou saisir un chantier libre (optionnel)"
                value={chantierLibre}
                onChange={(e) => {
                  const value = e.target.value;
                  setChantierLibre(value);
                  // Si on saisit dans le champ libre, on écrase le chantier sélectionné
                  if (value.trim()) {
                    updateCurrentTab({
                      chantierLibre: value,
                      chantier: "", // Vider chantier si on saisit dans libre
                    });
                  } else {
                    // Si on vide le champ libre, on garde le chantier sélectionné s'il existe
                    updateCurrentTab({
                      chantierLibre: "",
                    });
                  }
                }}
                className={cn(
                  "max-w-full overflow-hidden text-ellipsis whitespace-nowrap",
                  validationErrors.chantier &&
                    "border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500"
                )}
              />
              {!!validationErrors.chantier && (
                <p className="text-red-600 text-sm mt-1">
                  Ce champ est obligatoire
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col h-full">
            <div>
              <Label htmlFor="transporteur">Transporteur</Label>
              {currentData?.nomEntreprise && (
                <p className="text-xs text-muted-foreground my-2">
                  💡 Par défaut :{" "}
                  <span className="font-medium">(le client)</span>
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex gap-2 min-w-0">
                <div className="flex-1 min-w-0">
                  <Popover
                    open={transporteurSelectorOpen}
                    onOpenChange={setTransporteurSelectorOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={transporteurSelectorOpen}
                        className="w-full justify-between min-w-0 font-normal"
                      >
                        <span className="truncate flex-1 text-left">
                          {getTransporteurInputValue() ||
                            "Sélectionner un transporteur..."}
                        </span>
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
                          <CommandEmpty>
                            Aucun transporteur trouvé.
                          </CommandEmpty>
                          <CommandGroup>
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
                                    .includes(
                                      transporteurSearchValue.toLowerCase()
                                    )
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
                </div>
                <Dialog
                  open={isAddTransporteurDialogOpen}
                  onOpenChange={setIsAddTransporteurDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      title="Ajouter un nouveau transporteur"
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Nouveau Transporteur</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
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
                            className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
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
                          className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
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
                            className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
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
                          className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
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
              {/* Champ pour transporteur libre - toujours affiché */}
              <Input
                placeholder="Nom du transporteur libre (optionnel)"
                value={transporteurLibre}
                onChange={(e) => {
                  const value = e.target.value;
                  setTransporteurLibre(value);
                  // Si on saisit dans le champ libre, on écrase le transporteur sélectionné
                  if (value.trim()) {
                    updateCurrentTab({
                      transporteurLibre: value,
                      transporteurId: 0, // Vider transporteurId si on saisit dans libre
                    });
                  } else {
                    // Si on vide le champ libre, on garde le transporteur sélectionné s'il existe
                    updateCurrentTab({
                      transporteurLibre: "",
                    });
                  }
                }}
                className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center pt-4 mt-auto">
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
