import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  TableFilters,
  FilterConfig,
  useTableFilters,
} from "@/components/ui/table-filters";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Edit,
  Plus,
  Search,
  Trash2,
  User,
  Users,
  Building,
  Briefcase,
  Filter,
  CheckSquare,
  Square,
  X,
  LayoutGrid,
  LayoutList,
  MoreVertical,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Client, db, Transporteur, Product } from "@/lib/database";
import { useToast } from "@/hooks/use-toast";
import ClientForm from "@/components/forms/ClientForm";
import PreferentialPricingSection from "@/components/forms/PreferentialPricingSection";
import ClientStatsCards from "./ClientStatsCards";
import ClientCardGrid from "./ClientCardGrid";
import BulkActionsBar from "./BulkActionsBar";
import EmptyClientState from "./EmptyClientState";
import ClientQuickFilters from "./ClientQuickFilters";
import { normalizeClientCode } from "@/utils/clientCodeUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ClientsSpace() {
  const [clients, setClients] = useState<Client[]>([]);
  const [transporteurs, setTransporteurs] = useState<Transporteur[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<number>>(
    new Set()
  );
  const [pageSize, setPageSize] = useState(20);
  const [viewMode, setViewMode] = useState<"cards" | "table">(() => {
    return (
      (localStorage.getItem("clientsViewMode") as "cards" | "table") || "cards"
    );
  });
  const [quickFilter, setQuickFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [trackDechetEnabled, setTrackDechetEnabled] = useState(false);
  // Configuration des filtres pour le tableau des clients
  const clientFilterConfigs: FilterConfig[] = [
    {
      key: "codeClient",
      label: "Code",
      type: "text",
      placeholder: "Rechercher par code...",
    },
    {
      key: "typeClient",
      label: "Type",
      type: "select",
      options: [
        { value: "particulier", label: "Particulier" },
        { value: "professionnel", label: "Professionnel" },
        { value: "micro-entreprise", label: "Micro-entreprise" },
      ],
    },
    {
      key: "raisonSociale",
      label: "Raison Sociale",
      type: "text",
      placeholder: "Rechercher par nom...",
    },
    {
      key: "siret",
      label: "SIRET",
      type: "text",
      placeholder: "Rechercher par SIRET...",
    },
    {
      key: "tvaIntracom",
      label: "TVA Intra",
      type: "text",
      placeholder: "Rechercher par TVA...",
    },
    {
      key: "telephone",
      label: "Contact",
      type: "text",
      placeholder: "Rechercher par téléphone...",
    },
    {
      key: "adresse",
      label: "Adresse",
      type: "text",
      placeholder: "Rechercher par adresse...",
    },
    {
      key: "ville",
      label: "Ville",
      type: "text",
      placeholder: "Rechercher par ville...",
    },
    {
      key: "transporteurId",
      label: "Transporteur",
      type: "select",
      options: [],
    },
    {
      key: "modePaiementPreferentiel",
      label: "Mode Paiement",
      type: "select",
      options: [
        { value: "ESP", label: "Espèces" },
        { value: "CB", label: "Carte Bancaire" },
        { value: "CHQ", label: "Chèque" },
        { value: "VIR", label: "Virement" },
        { value: "PRVT", label: "Prélèvement" },
      ],
    },
  ];

  const [formData, setFormData] = useState<Partial<Client>>({
    typeClient: "particulier",
    prenom: "",
    nom: "",
    raisonSociale: "",
    codeClient: "",
    siret: "",
    codeNAF: "",
    activite: "",
    adresse: "",
    codePostal: "",
    ville: "",
    representantLegal: "",
    telephone: "",
    email: "",
    plaques: [],
    chantiers: [],
    tarifsPreferentiels: {},
  });
  const { toast } = useToast();

  useEffect(() => {
    loadClients();
    loadTransporteurs();
    loadProducts();
  }, []);

  const loadClients = async () => {
    try {
      const clientsData = await db.clients
        .orderBy("createdAt")
        .reverse()
        .toArray();

      // Corriger les types de clients
      const correctedClients = await Promise.all(
        clientsData.map(async (client) => {
        // Si le type est déjà correct, ne pas le modifier
        if (
          client.typeClient === "particulier" ||
          client.typeClient === "professionnel" ||
          client.typeClient === "micro-entreprise"
        ) {
          return client;
        }

        // Sinon, corriger le type
        const typeLower = String(client.typeClient || "")
          .toLowerCase()
          .trim();
        let correctedType:
          | "particulier"
          | "professionnel"
          | "micro-entreprise" = "professionnel"; // Par défaut

        if (typeLower.includes("particulier")) {
          correctedType = "particulier";
        } else if (typeLower.includes("micro")) {
          correctedType = "micro-entreprise";
        }

          // Mettre à jour dans la base de données avec put pour garantir la persistance
          // Récupérer le client complet depuis la DB d'abord
          const fullClient = await db.clients.get(client.id!);
          if (fullClient) {
            await db.clients.put({
              ...fullClient,
          typeClient: correctedType,
              updatedAt: new Date(),
            });
          }

        // Retourner le client avec le type corrigé
        return {
          ...client,
          typeClient: correctedType,
        };
        })
      );

      setClients(correctedClients);
    } catch (error) {
      console.error("Erreur lors du chargement des clients:", error);
    }
  };

  const generateNextClientCode = async (): Promise<string> => {
    try {
      // Récupérer tous les clients avec un codeClient
      const clientsWithCode = await db.clients
        .where("codeClient")
        .above("")
        .toArray();

      if (clientsWithCode.length === 0) {
        return normalizeClientCode("1"); // Premier client avec code normalisé
      }

      // Extraire les codes numériques et trouver le maximum
      const numericCodes = clientsWithCode
        .map((client) => {
          const code = client.codeClient || "";
          const match = code.match(/^(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter((code) => code > 0);

      if (numericCodes.length === 0) {
        return normalizeClientCode("1"); // Aucun code numérique trouvé
      }

      const maxCode = Math.max(...numericCodes);
      return normalizeClientCode((maxCode + 1).toString());
    } catch (error) {
      console.error("Erreur lors de la génération du code client:", error);
      return normalizeClientCode("1"); // Valeur par défaut en cas d'erreur
    }
  };

  const loadTransporteurs = async () => {
    try {
      const transporteursData = await db.transporteurs
        .orderBy("createdAt")
        .reverse()
        .toArray();
      setTransporteurs(transporteursData);
    } catch (error) {
      console.error("Erreur lors du chargement des transporteurs:", error);
    }
  };

  const loadProducts = async () => {
    try {
      const productsData = await db.products.orderBy("nom").toArray();
      setProducts(productsData);
    } catch (error) {
      console.error("Erreur lors du chargement des produits:", error);
    }
  };

  // Fonction pour obtenir les valeurs des champs pour le filtrage
  const getClientFieldValue = (client: Client, field: string): string => {
    switch (field) {
      case "codeClient":
        return client.codeClient || "";
      case "typeClient":
        return client.typeClient || "";
      case "raisonSociale":
        return client.raisonSociale || "";
      case "siret":
        return client.siret || "";
      case "tvaIntracom":
        return client.tvaIntracom || "";
      case "telephone":
        return client.telephone || "";
      case "adresse":
        return client.adresse || "";
      case "ville":
        return client.ville || "";
      case "transporteurId":
        return client.transporteurId?.toString() || "";
      case "modePaiementPreferentiel":
        return client.modePaiementPreferentiel || "";
      default:
        return "";
    }
  };

  // Utilisation du hook de filtrage SANS pagination (on pagine après les filtres rapides)
  const {
    filteredData: sortedClients,
    filters,
    setFilters,
  } = useTableFilters(
    clients,
    clientFilterConfigs,
    getClientFieldValue,
    999999 // Pas de pagination dans le hook, on pagine manuellement après
  );

  // Gestion du changement de vue
  const handleViewModeChange = (mode: "cards" | "table") => {
    setViewMode(mode);
    localStorage.setItem("clientsViewMode", mode);
  };

  // Gestion des filtres rapides
  const handleQuickFilterChange = (filter: string) => {
    setQuickFilter(filter);
  };

  // Appliquer les filtres rapides et la recherche
  const getFilteredClients = () => {
    let filtered = [...sortedClients];

    // Filtre rapide
    if (quickFilter === "noSiret") {
      filtered = filtered.filter((c) => !c.siret || c.siret.trim() === "");
    } else if (quickFilter === "professionals") {
      filtered = filtered.filter(
        (c) =>
          c.typeClient === "professionnel" ||
          c.typeClient === "micro-entreprise"
      );
    } else if (quickFilter === "particuliers") {
      filtered = filtered.filter((c) => c.typeClient === "particulier");
    } else if (quickFilter === "withSiret") {
      filtered = filtered.filter((c) => c.siret && c.siret.trim() !== "");
    } else if (quickFilter === "withEmail") {
      filtered = filtered.filter((c) => c.email && c.email.trim() !== "");
    } else if (quickFilter === "withPhone") {
      filtered = filtered.filter(
        (c) => c.telephone && c.telephone.trim() !== ""
      );
    }

    // Recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.raisonSociale?.toLowerCase().includes(query) ||
          c.prenom?.toLowerCase().includes(query) ||
          c.nom?.toLowerCase().includes(query) ||
          c.codeClient?.toLowerCase().includes(query) ||
          c.telephone?.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query) ||
          c.ville?.toLowerCase().includes(query) ||
          c.siret?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const displayedClients = getFilteredClients();

  // Pagination manuelle après filtrage
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(displayedClients.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedClients = displayedClients.slice(startIndex, endIndex);

  // Reset à la page 1 quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [quickFilter, searchQuery, filters, clients]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Fonction pour gérer le clic sur les stats
  const handleStatClick = (filterType: string) => {
    setQuickFilter(filterType);
  };

  // Mettre à jour les options des transporteurs dans la config des filtres
  useEffect(() => {
    const transporteurOptions = transporteurs.map((t) => ({
      value: t.id?.toString() || "",
      label: `${t.prenom} ${t.nom}`,
    }));

    const updatedConfigs = clientFilterConfigs.map((config) => {
      if (config.key === "transporteurId") {
        return { ...config, options: transporteurOptions };
      }
      return config;
    });
  }, [transporteurs, clientFilterConfigs]);

  const uniqueVilles = [
    ...new Set(clients.map((c) => c.ville).filter(Boolean)),
  ].sort();

  const validateForm = () => {
    if (!formData.codeClient || formData.codeClient.trim() === "") {
      toast({
        title: "Erreur",
        description: "Le code client est obligatoire.",
        variant: "destructive",
      });
      return false;
    }

    // Vérifier l'unicité du code client
    const existingClient = clients.find(
      (client) =>
        client.codeClient === formData.codeClient &&
        client.id !== selectedClient?.id
    );

    if (existingClient) {
      toast({
        title: "Erreur",
        description:
          "Ce code client existe déjà. Veuillez en choisir un autre.",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.typeClient) {
      toast({
        title: "Erreur",
        description: "Le type de client est obligatoire.",
        variant: "destructive",
      });
      return false;
    }

    if (formData.typeClient === "particulier") {
      if (!formData.raisonSociale) {
        toast({
          title: "Erreur",
          description:
            "Le nom et prénom sont obligatoires pour un particulier.",
          variant: "destructive",
        });
        return false;
      }
    } else {
      // Validations pour professionnels et micro-entreprises
      if (!formData.raisonSociale) {
        toast({
          title: "Erreur",
          description: "La raison sociale est obligatoire.",
          variant: "destructive",
        });
        return false;
      }

      if (formData.typeClient === "professionnel" && !formData.siret) {
        toast({
          title: "Erreur",
          description: "Le SIRET est obligatoire pour un professionnel.",
          variant: "destructive",
        });
        return false;
      }

      // Adresse obligatoire pour les professionnels et micro-entreprises (requis pour Sage/Track Déchet)
      if (!formData.adresse) {
        toast({
          title: "Erreur",
          description: "L'adresse est obligatoire pour les entreprises.",
          variant: "destructive",
        });
        return false;
      }

      // Ville et code postal obligatoires pour les entreprises
      if (!formData.ville || !formData.codePostal) {
        toast({
          title: "Erreur",
          description:
            "La ville et le code postal sont obligatoires pour les entreprises.",
          variant: "destructive",
        });
        return false;
      }

      // Champs Track Déchet obligatoires uniquement si le toggle est activé
      if (trackDechetEnabled) {
        const missingFields = [
          !formData.codeNAF ? "Code NAF" : null,
          !formData.representantLegal ? "Représentant légal" : null,
          !formData.activite ? "Activité" : null,
        ].filter(Boolean) as string[];

        if (missingFields.length > 0) {
          toast({
            title: "Erreur",
            description: `Informations Track Déchets incomplètes: ${missingFields.join(
              ", "
            )}.`,
            variant: "destructive",
          });
          return false;
        }
      }
    }

    // Validation des tarifs préférentiels
    if (formData.tarifsPreferentiels) {
      const hasInvalidPricing = Object.values(
        formData.tarifsPreferentiels
      ).some((tarif) => !tarif.prixHT || tarif.prixHT <= 0);
      if (hasInvalidPricing) {
        toast({
          title: "Erreur",
          description:
            "Tous les tarifs préférentiels doivent avoir un prix HT valide.",
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      const clientData = {
        ...formData,
        telephone: formData.telephone || "",
        plaques: formData.plaques || [],
        chantiers: formData.chantiers || [],
        tarifsPreferentiels: formData.tarifsPreferentiels || {},
      };

      if (selectedClient) {
        // Récupérer le client complet depuis la DB pour garantir toutes les données
        const fullClient = await db.clients.get(selectedClient.id!);
        if (!fullClient) {
          toast({
            title: "Erreur",
            description: "Client introuvable.",
            variant: "destructive",
          });
          return;
        }

        // Mettre à jour avec put pour garantir la persistance des tableaux et objets complexes
        await db.clients.put({
          ...fullClient,
          ...clientData,
          id: selectedClient.id,
          updatedAt: new Date(),
        } as Client);
        toast({
          title: "Succès",
          description: "Client modifié avec succès.",
        });
      } else {
        await db.clients.add({
          ...clientData,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Client);
        toast({
          title: "Succès",
          description: "Client créé avec succès.",
        });
      }

      loadClients();
      await resetForm();
      setIsCreateDialogOpen(false);
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast({
        title: "Erreur",
        description: `Erreur lors de la sauvegarde: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`,
        variant: "destructive",
      });
    }
  };

  const resetForm = async () => {
    const nextCode = await generateNextClientCode();
    setFormData({
      typeClient: "particulier",
      prenom: "",
      nom: "",
      raisonSociale: "",
      codeClient: nextCode,
      siret: "",
      codeNAF: "",
      activite: "",
      adresse: "",
      codePostal: "",
      ville: "",
      representantLegal: "",
      telephone: "",
      email: "",
      plaques: [],
      chantiers: [],
      tarifsPreferentiels: {},
    });
    setSelectedClient(null);
  };

  const handleEdit = async (client: Client) => {
    setSelectedClient(client);

    // Si le client n'a pas de codeClient, en générer un automatiquement
    let codeClient = client.codeClient;
    if (!codeClient) {
      codeClient = await generateNextClientCode();
    }

    setFormData({
      ...client,
      codeClient: codeClient,
      plaques: client.plaques || [],
      chantiers: client.chantiers || [],
      tarifsPreferentiels: client.tarifsPreferentiels || {},
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (client: Client) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce client ?")) {
      try {
        await db.clients.delete(client.id!);
        toast({
          title: "Succès",
          description: "Client supprimé avec succès.",
        });
        loadClients();
      } catch (error) {
        console.error("Erreur lors de la suppression:", error);
        toast({
          title: "Erreur",
          description: "Une erreur s'est produite lors de la suppression.",
          variant: "destructive",
        });
      }
    }
  };

  // Fonctions de gestion de sélection multiple
  const toggleClientSelection = (clientId: number) => {
    const newSelection = new Set(selectedClientIds);
    if (newSelection.has(clientId)) {
      newSelection.delete(clientId);
    } else {
      newSelection.add(clientId);
    }
    setSelectedClientIds(newSelection);
  };

  const selectAllClients = () => {
    setSelectedClientIds(new Set(paginatedClients.map((client) => client.id!)));
  };

  const deselectAllClients = () => {
    setSelectedClientIds(new Set());
  };

  const deleteSelectedClients = async () => {
    if (selectedClientIds.size === 0) {
      toast({
        title: "Aucune sélection",
        description: "Veuillez sélectionner au moins un client à supprimer.",
        variant: "destructive",
      });
      return;
    }

    const confirmMessage = `Êtes-vous sûr de vouloir supprimer ${selectedClientIds.size} client(s) ? Cette action est irréversible.`;
    if (window.confirm(confirmMessage)) {
      try {
        const deletePromises = Array.from(selectedClientIds).map((id) =>
          db.clients.delete(id)
        );
        await Promise.all(deletePromises);

        toast({
          title: "Succès",
          description: `${selectedClientIds.size} client(s) supprimé(s) avec succès.`,
        });

        setSelectedClientIds(new Set());
        loadClients();
      } catch (error) {
        console.error("Erreur lors de la suppression multiple:", error);
        toast({
          title: "Erreur",
          description: "Une erreur s'est produite lors de la suppression.",
          variant: "destructive",
        });
      }
    }
  };

  const getClientTypeIcon = (type: string) => {
    switch (type) {
      case "particulier":
        return <User className="h-4 w-4" />;
      case "professionnel":
        return <Building className="h-4 w-4" />;
      case "micro-entreprise":
        return <Briefcase className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getClientTypeBadge = (type: string) => {
    const variants = {
      particulier: "secondary",
      professionnel: "default",
      "micro-entreprise": "outline",
    } as const;

    return (
      <Badge
        variant={variants[type as keyof typeof variants] || "secondary"}
        className="flex items-center gap-1"
      >
        {getClientTypeIcon(type)}
        {type === "particulier"
          ? "Particulier"
          : type === "professionnel"
          ? "Professionnel"
          : "Micro-entreprise"}
      </Badge>
    );
  };

  const renderPlaques = (client: Client) => {
    const plaques = client.plaques || [];
    if (plaques.length === 0)
      return <span className="text-muted-foreground text-sm">-</span>;

    const [firstPlaque, ...otherPlaques] = plaques.sort();

    return (
      <div className="flex items-center gap-2">
        <span className="text-sm bg-muted px-2 py-1 rounded">
          {firstPlaque}
        </span>
        {otherPlaques.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            +{otherPlaques.length}
          </Badge>
        )}
      </div>
    );
  };

  const getClientDisplayName = (client: Client) => {
    if (client.typeClient === "particulier") {
      const fullName = `${client.prenom || ""} ${client.nom || ""}`.trim();
      if (fullName) return fullName;
    }
    
    if (client.raisonSociale) return client.raisonSociale;
    
    return "-";
  };

  const getRIBDisplay = (client: Client) => {
    if (client.codeBanque && client.codeGuichet && client.numeroCompte) {
      return (
        `${client.codeBanque}${client.codeGuichet}${client.numeroCompte}`.substring(
          0,
          10
        ) + "..."
      );
    }
    return null;
  };

  const getTransporteurName = (transporteurId?: number) => {
    if (!transporteurId)
      return <span className="text-muted-foreground text-sm">-</span>;
    const transporteur = transporteurs.find((t) => t.id === transporteurId);
    return transporteur ? (
      `${transporteur.prenom} ${transporteur.nom}`
    ) : (
      <span className="text-muted-foreground text-sm">-</span>
    );
  };

  const renderTarifsPreferentiels = (client: Client) => {
    const count = Object.keys(client.tarifsPreferentiels || {}).length;
    if (count === 0)
      return <span className="text-muted-foreground text-sm">-</span>;
    return (
      <Badge variant="secondary" className="text-xs">
        {count} produit{count > 1 ? "s" : ""}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header avec titre et bouton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Gestion des Clients
          </h2>
          <p className="text-muted-foreground">
            Gérez vos clients particuliers et professionnels
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Nouveau client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouveau client</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <ClientForm
                formData={formData}
                onFormDataChange={setFormData}
                transporteurs={transporteurs}
                trackDechetEnabled={trackDechetEnabled}
                onTrackDechetToggle={setTrackDechetEnabled}
              />
              <PreferentialPricingSection
                formData={formData}
                onFormDataChange={setFormData}
                products={products}
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button onClick={handleSave}>Créer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistiques */}
      <ClientStatsCards clients={clients} onStatClick={handleStatClick} />

      {/* Barre de recherche et toggle vue */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Rechercher un client par nom, code, ville, téléphone..."
                className="pl-10 h-12 text-base"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "cards" ? "default" : "outline"}
                size="icon"
                onClick={() => handleViewModeChange("cards")}
                className="h-12 w-12"
              >
                <LayoutGrid className="h-5 w-5" />
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="icon"
                onClick={() => handleViewModeChange("table")}
                className="h-12 w-12"
              >
                <LayoutList className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtres rapides */}
      <ClientQuickFilters
        activeFilter={quickFilter}
        onFilterChange={handleQuickFilterChange}
        onClearFilters={() => {
          setQuickFilter("all");
          setSearchQuery("");
        }}
      />

      {/* Filtres avancés */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Recherche et Filtres
          </CardTitle>
          <CardDescription>Recherchez et filtrez vos clients</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <TableFilters
            filters={clientFilterConfigs}
            onFiltersChange={setFilters}
            showPageSize={true}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>

      {/* Contenu des clients */}
      {displayedClients.length === 0 && clients.length === 0 ? (
        <EmptyClientState
          onCreateClient={() => {
          resetForm();
          setIsCreateDialogOpen(true);
          }}
        />
      ) : (
        <>
          {viewMode === "cards" ? (
            <div>
              {displayedClients.length === 0 ? (
                <Card className="border-dashed border-2">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      Aucun client trouvé
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Aucun client ne correspond à vos critères.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setQuickFilter("all");
                        setSearchQuery("");
                        setFilters({});
                      }}
                    >
                      Réinitialiser les filtres
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <ClientCardGrid
                  clients={paginatedClients}
                  selectedClientIds={selectedClientIds}
                  onSelect={toggleClientSelection}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggleFavorite={() => {}}
                />
              )}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Clients ({displayedClients.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {displayedClients.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      Aucun client trouvé
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Aucun client ne correspond à vos critères.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setQuickFilter("all");
                        setSearchQuery("");
                        setFilters({});
                      }}
                    >
                      Réinitialiser les filtres
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={selectAllClients}
                          disabled={paginatedClients.length === 0}
                        >
                          <CheckSquare className="h-4 w-4 mr-2" />
                          Tout sélectionner
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={deselectAllClients}
                          disabled={selectedClientIds.size === 0}
                        >
                          <Square className="h-4 w-4 mr-2" />
                          Désélectionner
                        </Button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox 
                                checked={
                                  paginatedClients.length > 0 &&
                                  paginatedClients.every((c) =>
                                    selectedClientIds.has(c.id!)
                                  )
                                }
                                onCheckedChange={(checked) => { 
                                  if (checked) selectAllClients(); 
                                  else deselectAllClients(); 
                                }} 
                              />
                            </TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Nom / Raison Sociale</TableHead>
                            <TableHead>SIRET</TableHead>
                            <TableHead>TVA Intra</TableHead>
                            <TableHead>RIB</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Adresse</TableHead>
                            <TableHead>Plaque(s)</TableHead>
                            <TableHead>Transporteur</TableHead>
                            <TableHead>Tarifs Préf.</TableHead>
                            <TableHead>Mode Paiement</TableHead>
                            <TableHead className="w-24">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedClients.map((client) => (
                            <TableRow key={client.id}>
                              <TableCell>
                                <Checkbox 
                                  checked={selectedClientIds.has(client.id!)} 
                                  onCheckedChange={() =>
                                    toggleClientSelection(client.id!)
                                  }
                                />
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {client.codeClient}
                              </TableCell>
                              <TableCell>
                                {getClientTypeBadge(client.typeClient)}
                              </TableCell>
                              <TableCell className="font-medium">
                                {getClientDisplayName(client)}
                              </TableCell>
                              <TableCell className="text-sm">
                                {client.siret ? (
                                  <span className="font-mono">
                                    {client.siret}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm">
                                {client.tvaIntracom || (
                                  <span className="text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm">
                                {getRIBDisplay(client) ? (
                                  <span className="font-mono text-xs">
                                    {getRIBDisplay(client)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm">
                                {client.telephone || (
                                  <span className="text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </TableCell>
                              <TableCell
                                className="text-sm max-w-[200px] truncate"
                                title={client.adresse || ""}
                              >
                                {client.adresse ? (
                                  <span>
                                    {client.adresse}
                                    {client.ville ? `, ${client.ville}` : ""}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>{renderPlaques(client)}</TableCell>
                              <TableCell className="text-sm">
                                {getTransporteurName(client.transporteurId)}
                              </TableCell>
                              <TableCell>
                                {renderTarifsPreferentiels(client)}
                              </TableCell>
                              <TableCell className="text-sm">
                                {client.modePaiementPreferentiel ? (
                                  <Badge variant="outline" className="text-xs">
                                    {client.modePaiementPreferentiel}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => handleEdit(client)}
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Modifier
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => handleDelete(client)} 
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Supprimer
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {displayedClients.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
              totalItems={displayedClients.length}
              pageSize={pageSize}
            />
          </CardContent>
        </Card>
      )}

      <BulkActionsBar
        selectedCount={selectedClientIds.size}
        onDelete={deleteSelectedClients}
        onMarkFavorites={() => {}}
        onClear={() => setSelectedClientIds(new Set())}
      />

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le client</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <ClientForm
              formData={formData}
              onFormDataChange={setFormData}
              isEditing={true}
              transporteurs={transporteurs}
              trackDechetEnabled={trackDechetEnabled}
              onTrackDechetToggle={setTrackDechetEnabled}
            />
            <PreferentialPricingSection
              formData={formData}
              onFormDataChange={setFormData}
              products={products}
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button onClick={handleSave}>Sauvegarder</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
