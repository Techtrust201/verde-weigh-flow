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
  Building,
  Briefcase,
  Filter,
} from "lucide-react";
import { Client, db, Transporteur, Product } from "@/lib/database";
import { useToast } from "@/hooks/use-toast";
import ClientForm from "@/components/forms/ClientForm";

export default function ClientsSpace() {
  const [clients, setClients] = useState<Client[]>([]);
  const [transporteurs, setTransporteurs] = useState<Transporteur[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [transporteurFilter, setTransporteurFilter] = useState<string>("all");
  const [villeFilter, setVilleFilter] = useState<string>("all");

  const [formData, setFormData] = useState<Partial<Client>>({
    typeClient: "particulier",
    prenom: "",
    nom: "",
    raisonSociale: "",
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
      setClients(clientsData);
    } catch (error) {
      console.error("Erreur lors du chargement des clients:", error);
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

  const filteredClients = clients.filter((client) => {
    const searchFields = [
      client.raisonSociale,
      client.siret,
      client.email,
      client.adresse,
      client.ville,
      client.telephone,
      ...(client.plaques || []),
      ...(client.chantiers || []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = searchFields.includes(searchTerm.toLowerCase());
    const matchesType =
      typeFilter === "all" || client.typeClient === typeFilter;
    const matchesTransporteur =
      transporteurFilter === "all" ||
      client.transporteurId?.toString() === transporteurFilter;
    const matchesVille = villeFilter === "all" || client.ville === villeFilter;

    return matchesSearch && matchesType && matchesTransporteur && matchesVille;
  });

  const uniqueVilles = [
    ...new Set(clients.map((c) => c.ville).filter(Boolean)),
  ].sort();

  const validateForm = () => {
    if (!formData.typeClient) {
      toast({
        title: "Erreur",
        description: "Le type de client est obligatoire.",
        variant: "destructive",
      });
      return false;
    }

    if (formData.typeClient === "particulier") {
      if (!formData.prenom || !formData.nom) {
        toast({
          title: "Erreur",
          description:
            "Le prénom et le nom sont obligatoires pour un particulier.",
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

      // Activité obligatoire pour les entreprises (requis pour Sage)
      if (!formData.activite) {
        toast({
          title: "Erreur",
          description: "L'activité est obligatoire pour les entreprises.",
          variant: "destructive",
        });
        return false;
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
        raisonSociale:
          formData.typeClient === "particulier"
            ? `${formData.prenom} ${formData.nom}`
            : formData.raisonSociale,
        telephone: formData.telephone || "",
        plaques: formData.plaques || [],
        chantiers: formData.chantiers || [],
        tarifsPreferentiels: formData.tarifsPreferentiels || {},
      };

      if (selectedClient) {
        await db.clients.update(selectedClient.id!, {
          ...clientData,
          updatedAt: new Date(),
        });
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
      resetForm();
      setIsCreateDialogOpen(false);
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de la sauvegarde.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      typeClient: "particulier",
      prenom: "",
      nom: "",
      raisonSociale: "",
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

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setFormData({
      ...client,
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
    if (plaques.length === 0) return null;

    const [firstPlaque, ...otherPlaques] = plaques.sort();

    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
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
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Recherche et Filtres
          </CardTitle>
          <CardDescription>Recherchez et filtrez vos clients</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, SIRET, email, adresse, plaque..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Type de client</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="particulier">Particulier</SelectItem>
                  <SelectItem value="professionnel">Professionnel</SelectItem>
                  <SelectItem value="micro-entreprise">
                    Micro-entreprise
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Transporteur</label>
              <Select
                value={transporteurFilter}
                onValueChange={setTransporteurFilter}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les transporteurs</SelectItem>
                  {transporteurs.map((transporteur) => (
                    <SelectItem
                      key={transporteur.id}
                      value={transporteur.id!.toString()}
                    >
                      {transporteur.prenom} {transporteur.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Ville</label>
              <Select value={villeFilter} onValueChange={setVilleFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les villes</SelectItem>
                  {uniqueVilles.map((ville) => (
                    <SelectItem key={ville} value={ville}>
                      {ville}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clients ({filteredClients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Raison Sociale</TableHead>
                <TableHead>SIRET</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>Plaque(s)</TableHead>
                <TableHead>Transporteur</TableHead>
                <TableHead>Tarifs Préf.</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => {
                const transporteur = transporteurs.find(
                  (t) => t.id === client.transporteurId
                );
                const hasPrefPricing =
                  client.tarifsPreferentiels &&
                  Object.keys(client.tarifsPreferentiels).length > 0;

                return (
                  <TableRow key={client.id}>
                    <TableCell>
                      {getClientTypeBadge(client.typeClient)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {client.raisonSociale}
                    </TableCell>
                    <TableCell>{client.siret}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {client.telephone && (
                          <div className="text-sm">{client.telephone}</div>
                        )}
                        {client.email && (
                          <div className="text-sm text-muted-foreground">
                            {client.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {client.adresse && <div>{client.adresse}</div>}
                        {client.codePostal && client.ville && (
                          <div className="text-muted-foreground">
                            {client.codePostal} {client.ville}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{renderPlaques(client)}</TableCell>
                    <TableCell>
                      {transporteur && (
                        <Badge variant="secondary">
                          {transporteur.prenom} {transporteur.nom}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {hasPrefPricing && (
                        <Badge variant="outline" className="text-green-600">
                          {Object.keys(client.tarifsPreferentiels!).length}{" "}
                          produit(s)
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(client)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(client)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
