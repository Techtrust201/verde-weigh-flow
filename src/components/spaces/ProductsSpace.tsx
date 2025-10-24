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
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Edit,
  Plus,
  Search,
  Trash2,
  Package,
  Star,
  Filter,
  CheckSquare,
  Square,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { db, Product } from "@/lib/database";
import { useToast } from "@/hooks/use-toast";

export default function ProductsSpace() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(
    new Set()
  );
  const [searchTerm, setSearchTerm] = useState("");

  const [categorieFilter, setcategorieFilter] = useState<string>("all");
  const [trackDechetFilter, setTrackDechetFilter] = useState<string>("all");
  const [favoriteFilter, setFavoriteFilter] = useState<string>("all");

  const [formData, setFormData] = useState<Partial<Product>>({
    nom: "",
    prixHT: undefined,
    tauxTVA: undefined,
    prixTTC: 0,
    codeProduct: "",
    unite: "tonne",
    isFavorite: false,
    categorieDechet: undefined,
    codeDechets: "",
    trackDechetEnabled: false,
    consistence: undefined,
    isSubjectToADR: false,
    onuCode: "",
    cap: "",
    conditionnementType: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    // Calculer le prix TTC automatiquement
    if (
      formData.prixHT !== undefined &&
      formData.prixHT !== null &&
      formData.tauxTVA
    ) {
      const prixTTC = formData.prixHT * (1 + formData.tauxTVA / 100);
      setFormData((prev) => ({ ...prev, prixTTC }));
    } else {
      setFormData((prev) => ({ ...prev, prixTTC: 0 }));
    }
  }, [formData.prixHT, formData.tauxTVA]);

  const loadProducts = async () => {
    try {
      const productsData = await db.products
        .orderBy("createdAt")
        .reverse()
        .toArray();
      setProducts(productsData);
    } catch (error) {
      console.error("Erreur lors du chargement des produits:", error);
    }
  };

  const filteredProducts = products.filter((product) => {
    const searchFields = [
      product.nom,
      product.codeProduct,
      product.codeDechets,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = searchFields.includes(searchTerm.toLowerCase());
    const matchesCategorie =
      categorieFilter === "all" ||
      product.categorieDechet === categorieFilter;
    const matchesTrackDechet =
      trackDechetFilter === "all" ||
      (trackDechetFilter === "enabled" && product.trackDechetEnabled) ||
      (trackDechetFilter === "disabled" && !product.trackDechetEnabled);
    const matchesFavorite =
      favoriteFilter === "all" ||
      (favoriteFilter === "favorite" && product.isFavorite) ||
      (favoriteFilter === "not-favorite" && !product.isFavorite);

    return (
      matchesSearch &&
      matchesCategorie &&
      matchesTrackDechet &&
      matchesFavorite
    );
  });

  const validateForm = () => {
    if (!formData.nom || !formData.codeProduct) {
      toast({
        title: "Erreur",
        description: "Le nom et le code produit sont obligatoires.",
        variant: "destructive",
      });
      return false;
    }

    // Validation Track Déchet
    if (formData.trackDechetEnabled) {
      if (!formData.categorieDechet) {
        toast({
          title: "Erreur",
          description:
            "La catégorie de déchet est obligatoire quand Track Déchet est activé.",
          variant: "destructive",
        });
        return false;
      }

      if (
        !formData.codeDechets ||
        (formData.codeDechets.length !== 6 &&
          formData.codeDechets.length !== 7)
      ) {
        toast({
          title: "Erreur",
          description:
            "Le code déchet est obligatoire et doit contenir 6 chiffres (ou 6 chiffres + *) quand Track Déchet est activé.",
          variant: "destructive",
        });
        return false;
      }

      if (!/^\d{6}\*?$/.test(formData.codeDechets)) {
        toast({
          title: "Erreur",
          description:
            "Le code déchet doit contenir 6 chiffres (ex: 160111) ou 6 chiffres + astérisque (ex: 160111*).",
          variant: "destructive",
        });
        return false;
      }

      if (!formData.consistence) {
        toast({
          title: "Erreur",
          description:
            "La consistance du déchet est obligatoire quand Track Déchet est activé.",
          variant: "destructive",
        });
        return false;
      }

      if (formData.isSubjectToADR === undefined) {
        toast({
          title: "Erreur",
          description:
            "Le statut ADR est obligatoire quand Track Déchet est activé.",
          variant: "destructive",
        });
        return false;
      }

      if (formData.isSubjectToADR && !formData.onuCode) {
        toast({
          title: "Erreur",
          description:
            "Le code ONU est obligatoire pour les déchets soumis à l'ADR.",
          variant: "destructive",
        });
        return false;
      }

      if (formData.categorieDechet === "dangereux" && !formData.cap) {
        toast({
          title: "Erreur",
          description:
            "Le numéro CAP est obligatoire pour les déchets dangereux.",
          variant: "destructive",
        });
        return false;
      }

      if (!formData.conditionnementType) {
        toast({
          title: "Erreur",
          description:
            "Le type de conditionnement est obligatoire quand Track Déchet est activé.",
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
      const productData = {
        ...formData,
        prixHT: formData.prixHT || 0,
        tva: formData.tauxTVA || 20,
        updatedAt: new Date(),
      } as Product;

      if (selectedProduct) {
        await db.products.update(selectedProduct.id!, productData);
        toast({
          title: "Succès",
          description: "Produit modifié avec succès.",
        });
      } else {
        await db.products.add({
          ...productData,
          createdAt: new Date(),
        });
        toast({
          title: "Succès",
          description: "Produit créé avec succès.",
        });
      }

      loadProducts();
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
      nom: "",
      prixHT: undefined,
      tauxTVA: undefined,
      prixTTC: 0,
      codeProduct: "",
      unite: "tonne",
      isFavorite: false,
      categorieDechet: undefined,
      codeDechets: "",
      trackDechetEnabled: false,
      consistence: undefined,
      isSubjectToADR: false,
      onuCode: "",
      cap: "",
      conditionnementType: "",
    });
    setSelectedProduct(null);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormData(product);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (product: Product) => {
    if (
      window.confirm(
        `Êtes-vous sûr de vouloir supprimer le produit "${product.nom}" ?`
      )
    ) {
      try {
        await db.products.delete(product.id!);
        toast({
          title: "Succès",
          description: "Produit supprimé avec succès.",
        });
        loadProducts();
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

  const toggleFavorite = async (product: Product) => {
    try {
      await db.products.update(product.id!, {
        isFavorite: !product.isFavorite,
        updatedAt: new Date(),
      });
      loadProducts();
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
    }
  };

  // Fonctions de gestion de sélection multiple
  const toggleProductSelection = (productId: number) => {
    const newSelection = new Set(selectedProductIds);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedProductIds(newSelection);
  };

  const selectAllProducts = () => {
    setSelectedProductIds(
      new Set(filteredProducts.map((product) => product.id!))
    );
  };

  const deselectAllProducts = () => {
    setSelectedProductIds(new Set());
  };

  const deleteSelectedProducts = async () => {
    if (selectedProductIds.size === 0) {
      toast({
        title: "Aucune sélection",
        description: "Veuillez sélectionner au moins un produit à supprimer.",
        variant: "destructive",
      });
      return;
    }

    const confirmMessage = `Êtes-vous sûr de vouloir supprimer ${selectedProductIds.size} produit(s) ? Cette action est irréversible.`;
    if (window.confirm(confirmMessage)) {
      try {
        const deletePromises = Array.from(selectedProductIds).map((id) =>
          db.products.delete(id)
        );
        await Promise.all(deletePromises);

        toast({
          title: "Succès",
          description: `${selectedProductIds.size} produit(s) supprimé(s) avec succès.`,
        });

        setSelectedProductIds(new Set());
        loadProducts();
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

  const getCategorieDechetBadge = (categorie?: string) => {
    if (!categorie) return null;

    const variants = {
      inerte: "secondary",
      "non-dangereux": "default",
      dangereux: "destructive",
    } as const;

    const labels = {
      inerte: "Inerte",
      "non-dangereux": "Non-dangereux",
      dangereux: "Dangereux",
    };

    return (
      <Badge variant={variants[categorie as keyof typeof variants] || "secondary"}>
        {labels[categorie as keyof typeof labels] || categorie}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Gestion des Produits
          </h2>
          <p className="text-muted-foreground">
            Gérez vos produits et articles
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau produit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouveau produit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="nom">Nom du produit *</Label>
                <Input
                  id="nom"
                  value={formData.nom}
                  onChange={(e) =>
                    setFormData({ ...formData, nom: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="codeProduct">Code article *</Label>
                <Input
                  id="codeProduct"
                  value={formData.codeProduct}
                  onChange={(e) =>
                    setFormData({ ...formData, codeProduct: e.target.value })
                  }
                  placeholder="Code unique pour l'article"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="prixHT">Prix HT (€)</Label>
                  <NumericInput
                    id="prixHT"
                    value={formData.prixHT}
                    onChange={(value) =>
                      setFormData({ ...formData, prixHT: value })
                    }
                    placeholder="Entrez un prix"
                    min={0}
                  />
                </div>
                <div>
                  <Label htmlFor="tauxTVA">Taux TVA (%)</Label>
                  <NumericInput
                    id="tauxTVA"
                    value={formData.tauxTVA}
                    onChange={(value) =>
                      setFormData({ ...formData, tauxTVA: value })
                    }
                    placeholder="Entrez le taux"
                    allowDecimals={false}
                    min={0}
                    max={100}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="prixTTC">Prix TTC (€)</Label>
                <Input
                  id="prixTTC"
                  type="number"
                  step="0.01"
                  value={formData.prixTTC?.toFixed(2) || "0.00"}
                  readOnly
                  className="bg-gray-100"
                />
              </div>

              {/* Champs Track Déchet */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-primary">
                    Track Déchet
                  </h3>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="trackDechetEnabled"
                      checked={formData.trackDechetEnabled || false}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          trackDechetEnabled: checked,
                        })
                      }
                    />
                    <Label htmlFor="trackDechetEnabled" className="text-sm">
                      À suivre dans Track Déchets
                    </Label>
                  </div>
                </div>

                {/* Obligations légales - toujours visible */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-sm text-amber-900 mb-2">
                    ⚖️ Obligations légales Track Déchets
                  </h4>
                  <div className="text-xs text-amber-800 space-y-2">
                    <p>
                      <strong>Déchets inertes ou non dangereux :</strong> Pas d'obligation de passer par Trackdéchets. 
                      Vous pouvez gérer vos pesées via votre registre interne.
                    </p>
                    <p>
                      <strong>Si vous choisissez Trackdéchets :</strong> Chaque acteur (producteur, transporteur, destinataire) 
                      doit avoir un compte sur la plateforme. Impossible de valider une pesée si un des acteur est non inscrit.
                    </p>
                  </div>
                </div>

                {formData.trackDechetEnabled && (
                  <div className="space-y-4 bg-blue-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="categorieDechet">
                          Catégorie déchet *
                        </Label>
                        <Select
                          value={formData.categorieDechet || ""}
                          onValueChange={(
                            value: "dangereux" | "non-dangereux" | "inerte"
                          ) =>
                            setFormData({ ...formData, categorieDechet: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="non-dangereux">
                              Non dangereux
                            </SelectItem>
                            <SelectItem value="inerte">Inerte</SelectItem>
                            <SelectItem value="dangereux">Dangereux</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="codeDechets">Code déchet *</Label>
                        <Input
                          id="codeDechets"
                          value={formData.codeDechets || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              codeDechets: e.target.value,
                            })
                          }
                          placeholder="160111* ou 170101"
                          maxLength={7}
                          pattern="[0-9]{6}\*?"
                        />
                      </div>

                      <div>
                        <Label htmlFor="consistence">
                          Consistance du déchet *
                        </Label>
                        <Select
                          value={formData.consistence || ""}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              consistence: value as
                                | "SOLID"
                                | "LIQUID"
                                | "GASEOUS"
                                | "DOUGHY",
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SOLID">Solide</SelectItem>
                            <SelectItem value="LIQUID">Liquide</SelectItem>
                            <SelectItem value="GASEOUS">Gazeux</SelectItem>
                            <SelectItem value="DOUGHY">Pâteux</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="isSubjectToADR">Soumis à l'ADR *</Label>
                        <Select
                          value={formData.isSubjectToADR?.toString() || ""}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              isSubjectToADR: value === "true",
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="false">
                              Non soumis à l'ADR
                            </SelectItem>
                            <SelectItem value="true">Soumis à l'ADR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.isSubjectToADR && (
                        <div>
                          <Label htmlFor="onuCode">Code ONU *</Label>
                          <Input
                            id="onuCode"
                            value={formData.onuCode || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                onuCode: e.target.value,
                              })
                            }
                            placeholder="UN 3082"
                          />
                        </div>
                      )}

                      <div>
                        <Label htmlFor="cap">
                          Numéro CAP {formData.categorieDechet === "dangereux" ? "*" : ""}
                        </Label>
                        <Input
                          id="cap"
                          value={formData.cap || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              cap: e.target.value,
                            })
                          }
                          placeholder="CAP-123456"
                        />
                      </div>

                      <div>
                        <Label htmlFor="conditionnementType">
                          Conditionnement Type *
                        </Label>
                        <Select
                          value={formData.conditionnementType || ""}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              conditionnementType: value as
                                | "BENNE"
                                | "CITERNE"
                                | "FUT"
                                | "GRV"
                                | "",
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BENNE">Benne</SelectItem>
                            <SelectItem value="CITERNE">Citerne</SelectItem>
                            <SelectItem value="FUT">Fût</SelectItem>
                            <SelectItem value="GRV">
                              Grand Récipient Vrac (GRV)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Guide des termes */}
                    <div className="space-y-3 mt-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold text-sm text-blue-900 mb-3">
                          📚 Guide des termes Track Déchets
                        </h4>
                        <div className="text-xs text-blue-800 space-y-3">
                          <div>
                            <strong>Code déchet :</strong> Code européen à 6 chiffres identifiant la nature du déchet 
                            (ex: 170101 pour béton, 160111* pour amiante). L'astérisque (*) indique un déchet dangereux.
                          </div>
                          <div>
                            <strong>Catégorie déchet :</strong> Classification selon la dangerosité :
                            <ul className="list-disc ml-5 mt-1 space-y-1">
                              <li><strong>Inerte :</strong> Déchets stables (béton, tuiles, briques...)</li>
                              <li><strong>Non-dangereux :</strong> Déchets sans risque particulier (bois, plastique...)</li>
                              <li><strong>Dangereux :</strong> Déchets présentant un risque (amiante, produits chimiques...)</li>
                            </ul>
                          </div>
                          <div>
                            <strong>Consistance :</strong> État physique du déchet lors du transport (Solide, Liquide, Gazeux, Pâteux). 
                            Obligatoire pour Track Déchets.
                          </div>
                          <div>
                            <strong>Soumis à l'ADR :</strong> ADR = Accord européen relatif au transport international des marchandises 
                            Dangereuses par Route. Indiquez "Oui" si votre déchet est classé matière dangereuse nécessitant des précautions 
                            spéciales de transport.
                          </div>
                          <div>
                            <strong>Code ONU :</strong> Numéro d'identification des matières dangereuses pour le transport (ex: UN 3082). 
                            Obligatoire uniquement si le déchet est soumis à l'ADR.
                          </div>
                          <div>
                            <strong>Numéro CAP :</strong> Certificat d'Acceptation Préalable délivré par l'installation de destination. 
                            Il certifie que le site accepte de recevoir ce type de déchet. Obligatoire pour les déchets dangereux, 
                            optionnel pour les autres.
                          </div>
                          <div>
                            <strong>Conditionnement Type :</strong> Mode de transport du déchet :
                            <ul className="list-disc ml-5 mt-1 space-y-1">
                              <li><strong>Benne :</strong> Conteneur ouvert ou fermé</li>
                              <li><strong>Citerne :</strong> Pour liquides ou pulvérulents</li>
                              <li><strong>Fût :</strong> Conteneur cylindrique fermé</li>
                              <li><strong>GRV :</strong> Grand Récipient pour Vrac (conteneur intermédiaire)</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-xs text-green-800 font-medium">
                          ✓ Les pesées de ce produit généreront automatiquement un BSD Track Déchets
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
          <CardDescription>Recherchez et filtrez vos produits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, code article, code déchet..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Catégorie déchet</label>
              <Select value={categorieFilter} onValueChange={setcategorieFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les catégories</SelectItem>
                  <SelectItem value="inerte">Inerte</SelectItem>
                  <SelectItem value="non-dangereux">Non-dangereux</SelectItem>
                  <SelectItem value="dangereux">Dangereux</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Track Déchet</label>
              <Select
                value={trackDechetFilter}
                onValueChange={setTrackDechetFilter}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="enabled">Activé</SelectItem>
                  <SelectItem value="disabled">Désactivé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Favoris</label>
              <Select value={favoriteFilter} onValueChange={setFavoriteFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="favorite">Favoris uniquement</SelectItem>
                  <SelectItem value="not-favorite">Non favoris</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Produits ({filteredProducts.length})</CardTitle>
            {selectedProductIds.size > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {selectedProductIds.size} sélectionné(s)
                </Badge>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={deleteSelectedProducts}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer sélectionnés
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllProducts}
                disabled={filteredProducts.length === 0}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Tout sélectionner
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={deselectAllProducts}
                disabled={selectedProductIds.size === 0}
              >
                <Square className="h-4 w-4 mr-2" />
                Désélectionner tout
              </Button>
            </div>
            {selectedProductIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={deleteSelectedProducts}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer {selectedProductIds.size} produit(s)
              </Button>
            )}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      filteredProducts.length > 0 &&
                      selectedProductIds.size === filteredProducts.length
                    }
                    onCheckedChange={(checked) => {
                      if (checked) {
                        selectAllProducts();
                      } else {
                        deselectAllProducts();
                      }
                    }}
                  />
                </TableHead>
                <TableHead className="w-24">Code Article</TableHead>
                <TableHead>Nom du Produit</TableHead>
                <TableHead className="w-28">Prix HT</TableHead>
                <TableHead className="w-20">TVA</TableHead>
                <TableHead className="w-28">Prix TTC</TableHead>
                <TableHead className="w-32">Catégorie</TableHead>
                <TableHead className="w-24">Code Déchet</TableHead>
                <TableHead className="w-24">Track Déchet</TableHead>
                <TableHead className="w-20">Favori</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedProductIds.has(product.id!)}
                      onCheckedChange={() =>
                        toggleProductSelection(product.id!)
                      }
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {product.codeProduct}
                  </TableCell>
                  <TableCell className="font-medium">{product.nom}</TableCell>
                  <TableCell>{product.prixHT?.toFixed(2) || "0.00"}€</TableCell>
                  <TableCell>{product.tauxTVA || 20}%</TableCell>
                  <TableCell className="font-semibold text-green-600">
                    {product.prixTTC?.toFixed(2) || "0.00"}€
                  </TableCell>
                  <TableCell>
                    {getCategorieDechetBadge(product.categorieDechet)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {product.codeDechets || "-"}
                  </TableCell>
                  <TableCell>
                    {product.trackDechetEnabled && (
                      <Badge className="bg-blue-100 text-blue-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Activé
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleFavorite(product)}
                    >
                      {product.isFavorite ? (
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ) : (
                        <Star className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(product)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(product)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Aucun produit trouvé
              </h3>
              <p className="text-gray-500 mb-4">
                Aucun produit ne correspond à vos critères de recherche.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le produit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nom-edit">Nom du produit *</Label>
              <Input
                id="nom-edit"
                value={formData.nom}
                onChange={(e) =>
                  setFormData({ ...formData, nom: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="codeProduct-edit">Code article *</Label>
              <Input
                id="codeProduct-edit"
                value={formData.codeProduct}
                onChange={(e) =>
                  setFormData({ ...formData, codeProduct: e.target.value })
                }
                placeholder="Code unique pour l'article"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="prixHT-edit">Prix HT (€)</Label>
                <NumericInput
                  id="prixHT-edit"
                  value={formData.prixHT}
                  onChange={(value) =>
                    setFormData({ ...formData, prixHT: value })
                  }
                  placeholder="Entrez un prix"
                  min={0}
                />
              </div>
              <div>
                <Label htmlFor="tauxTVA-edit">Taux TVA (%)</Label>
                <NumericInput
                  id="tauxTVA-edit"
                  value={formData.tauxTVA}
                  onChange={(value) =>
                    setFormData({ ...formData, tauxTVA: value })
                  }
                  placeholder="Entrez le taux"
                  allowDecimals={false}
                  min={0}
                  max={100}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="prixTTC-edit">Prix TTC (€)</Label>
              <Input
                id="prixTTC-edit"
                type="number"
                step="0.01"
                value={formData.prixTTC?.toFixed(2) || "0.00"}
                readOnly
                className="bg-gray-100"
              />
            </div>

            {/* Champs Track Déchet */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-primary">
                  Track Déchet
                </h3>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="trackDechetEnabled-edit"
                    checked={formData.trackDechetEnabled || false}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        trackDechetEnabled: checked,
                      })
                    }
                  />
                  <Label htmlFor="trackDechetEnabled-edit" className="text-sm">
                    À suivre dans Track Déchets
                  </Label>
                </div>
              </div>

              {/* Obligations légales - toujours visible */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-sm text-amber-900 mb-2">
                  ⚖️ Obligations légales Track Déchets
                </h4>
                <div className="text-xs text-amber-800 space-y-2">
                  <p>
                    <strong>Déchets inertes ou non dangereux :</strong> Pas d'obligation de passer par Trackdéchets. 
                    Vous pouvez gérer vos pesées via votre registre interne.
                  </p>
                  <p>
                    <strong>Si vous choisissez Trackdéchets :</strong> Chaque acteur (producteur, transporteur, destinataire) 
                    doit avoir un compte sur la plateforme. Impossible de valider une pesée si un des acteur est non inscrit.
                  </p>
                </div>
              </div>

              {formData.trackDechetEnabled && (
                <div className="space-y-4 bg-blue-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="categorieDechet-edit">
                        Catégorie déchet *
                      </Label>
                      <Select
                        value={formData.categorieDechet || ""}
                        onValueChange={(
                          value: "dangereux" | "non-dangereux" | "inerte"
                        ) =>
                          setFormData({ ...formData, categorieDechet: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="non-dangereux">
                            Non dangereux
                          </SelectItem>
                          <SelectItem value="inerte">Inerte</SelectItem>
                          <SelectItem value="dangereux">Dangereux</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="codeDechets-edit">Code déchet *</Label>
                      <Input
                        id="codeDechets-edit"
                        value={formData.codeDechets || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            codeDechets: e.target.value,
                          })
                        }
                        placeholder="160111* ou 170101"
                        maxLength={7}
                      />
                    </div>

                    <div>
                      <Label htmlFor="consistence-edit">
                        Consistance du déchet *
                      </Label>
                      <Select
                        value={formData.consistence || ""}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            consistence: value as
                              | "SOLID"
                              | "LIQUID"
                              | "GASEOUS"
                              | "DOUGHY",
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SOLID">Solide</SelectItem>
                          <SelectItem value="LIQUID">Liquide</SelectItem>
                          <SelectItem value="GASEOUS">Gazeux</SelectItem>
                          <SelectItem value="DOUGHY">Pâteux</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="isSubjectToADR-edit">Soumis à l'ADR *</Label>
                      <Select
                        value={formData.isSubjectToADR?.toString() || ""}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            isSubjectToADR: value === "true",
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="false">
                            Non soumis à l'ADR
                          </SelectItem>
                          <SelectItem value="true">Soumis à l'ADR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.isSubjectToADR && (
                      <div>
                        <Label htmlFor="onuCode-edit">Code ONU *</Label>
                        <Input
                          id="onuCode-edit"
                          value={formData.onuCode || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              onuCode: e.target.value,
                            })
                          }
                          placeholder="UN 3082"
                        />
                      </div>
                    )}

                    <div>
                      <Label htmlFor="cap-edit">
                        Numéro CAP {formData.categorieDechet === "dangereux" ? "*" : ""}
                      </Label>
                      <Input
                        id="cap-edit"
                        value={formData.cap || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            cap: e.target.value,
                          })
                        }
                        placeholder="CAP-123456"
                      />
                    </div>

                    <div>
                      <Label htmlFor="conditionnementType-edit">
                        Conditionnement Type *
                      </Label>
                      <Select
                        value={formData.conditionnementType || ""}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            conditionnementType: value as
                              | "BENNE"
                              | "CITERNE"
                              | "FUT"
                              | "GRV"
                              | "",
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BENNE">Benne</SelectItem>
                          <SelectItem value="CITERNE">Citerne</SelectItem>
                          <SelectItem value="FUT">Fût</SelectItem>
                          <SelectItem value="GRV">
                            Grand Récipient Vrac (GRV)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Guide des termes */}
                  <div className="space-y-3 mt-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-sm text-blue-900 mb-3">
                        📚 Guide des termes Track Déchets
                      </h4>
                      <div className="text-xs text-blue-800 space-y-3">
                        <div>
                          <strong>Code déchet :</strong> Code européen à 6 chiffres identifiant la nature du déchet 
                          (ex: 170101 pour béton, 160111* pour amiante). L'astérisque (*) indique un déchet dangereux.
                        </div>
                        <div>
                          <strong>Catégorie déchet :</strong> Classification selon la dangerosité :
                          <ul className="list-disc ml-5 mt-1 space-y-1">
                            <li><strong>Inerte :</strong> Déchets stables (béton, tuiles, briques...)</li>
                            <li><strong>Non-dangereux :</strong> Déchets sans risque particulier (bois, plastique...)</li>
                            <li><strong>Dangereux :</strong> Déchets présentant un risque (amiante, produits chimiques...)</li>
                          </ul>
                        </div>
                        <div>
                          <strong>Consistance :</strong> État physique du déchet lors du transport (Solide, Liquide, Gazeux, Pâteux). 
                          Obligatoire pour Track Déchets.
                        </div>
                        <div>
                          <strong>Soumis à l'ADR :</strong> ADR = Accord européen relatif au transport international des marchandises 
                          Dangereuses par Route. Indiquez "Oui" si votre déchet est classé matière dangereuse nécessitant des précautions 
                          spéciales de transport.
                        </div>
                        <div>
                          <strong>Code ONU :</strong> Numéro d'identification des matières dangereuses pour le transport (ex: UN 3082). 
                          Obligatoire uniquement si le déchet est soumis à l'ADR.
                        </div>
                        <div>
                          <strong>Numéro CAP :</strong> Certificat d'Acceptation Préalable délivré par l'installation de destination. 
                          Il certifie que le site accepte de recevoir ce type de déchet. Obligatoire pour les déchets dangereux, 
                          optionnel pour les autres.
                        </div>
                        <div>
                          <strong>Conditionnement Type :</strong> Mode de transport du déchet :
                          <ul className="list-disc ml-5 mt-1 space-y-1">
                            <li><strong>Benne :</strong> Conteneur ouvert ou fermé</li>
                            <li><strong>Citerne :</strong> Pour liquides ou pulvérulents</li>
                            <li><strong>Fût :</strong> Conteneur cylindrique fermé</li>
                            <li><strong>GRV :</strong> Grand Récipient pour Vrac (conteneur intermédiaire)</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-xs text-green-800 font-medium">
                        ✓ Les pesées de ce produit généreront automatiquement un BSD Track Déchets
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
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
