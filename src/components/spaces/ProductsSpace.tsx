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
  ValidationInput,
  ValidationTextarea,
} from "@/components/ui/validation-input";
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
  LayoutGrid,
  LayoutList,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { db, Product } from "@/lib/database";
import { useToast } from "@/hooks/use-toast";
import ProductStatsCards from "./ProductStatsCards";
import ProductCardGrid from "./ProductCardGrid";
import BulkActionsBar from "./BulkActionsBar";
import EmptyProductState from "./EmptyProductState";
import ProductQuickFilters from "./ProductQuickFilters";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

export default function ProductsSpace() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(
    new Set()
  );
  const [pageSize, setPageSize] = useState(20);
  const [viewMode, setViewMode] = useState<"cards" | "table">(() => {
    return (localStorage.getItem("productsViewMode") as "cards" | "table") || "cards";
  });
  const [quickFilter, setQuickFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Configuration des filtres pour les produits
  const productFilterConfigs: FilterConfig[] = [
    {
      key: "codeProduct",
      label: "Code Article",
      type: "text",
    },
    {
      key: "nom",
      label: "Nom du Produit",
      type: "text",
    },
    {
      key: "prixHT",
      label: "Prix HT",
      type: "text",
    },
    {
      key: "tauxTVA",
      label: "TVA",
      type: "text",
    },
    {
      key: "prixTTC",
      label: "Prix TTC",
      type: "text",
    },
    {
      key: "categorie",
      label: "Catégorie",
      type: "text",
    },
    {
      key: "codeDechet",
      label: "Code Déchet",
      type: "text",
    },
    {
      key: "trackDechet",
      label: "Track Déchet",
      type: "text",
    },
    {
      key: "favori",
      label: "Favori",
      type: "select",
      options: [
        { value: "true", label: "Oui" },
        { value: "false", label: "Non" },
      ],
    },
  ];

  // Fonction pour extraire les valeurs des champs des produits
  const getProductFieldValue = (product: Product, field: string): string => {
    switch (field) {
      case "codeProduct":
        return product.codeProduct || "";
      case "nom":
        return product.nom || "";
      case "prixHT":
        return product.prixHT?.toString() || "";
      case "tauxTVA":
        return product.tauxTVA?.toString() || "";
      case "prixTTC":
        return product.prixTTC?.toString() || "";
      case "categorie":
        return product.categorieDechet || "";
      case "codeDechet":
        return product.codeDechets || "";
      case "trackDechet":
        return product.trackDechetEnabled ? "Activé" : "Désactivé";
      case "favori":
        return product.isFavorite ? "true" : "false";
      default:
        return "";
    }
  };

  // Utilisation du hook de filtrage SANS pagination (on pagine après les filtres rapides)
  const {
    filteredData: filteredProducts,
    filters,
    setFilters,
  } = useTableFilters(
    products,
    productFilterConfigs,
    getProductFieldValue,
    999999 // Pas de pagination dans le hook, on pagine manuellement après
  );

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
        (formData.codeDechets.length !== 6 && formData.codeDechets.length !== 7)
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

  // Gestion du changement de vue
  const handleViewModeChange = (mode: "cards" | "table") => {
    setViewMode(mode);
    localStorage.setItem("productsViewMode", mode);
  };

  // Gestion des filtres rapides
  const handleQuickFilterChange = (filter: string) => {
    setQuickFilter(filter);
  };

  // Appliquer les filtres rapides et la recherche
  const getFilteredProducts = () => {
    let filtered = [...filteredProducts];

    // Filtre rapide
    if (quickFilter === "favorites") {
      filtered = filtered.filter((p) => p.isFavorite);
    } else if (quickFilter === "trackDechet") {
      filtered = filtered.filter((p) => p.trackDechetEnabled);
    } else if (quickFilter === "noPrice") {
      filtered = filtered.filter((p) => !p.prixHT || p.prixHT === 0);
    }

    // Recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.nom?.toLowerCase().includes(query) ||
          p.codeProduct?.toLowerCase().includes(query) ||
          p.categorieDechet?.toLowerCase().includes(query) ||
          p.codeDechets?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const displayedProducts = getFilteredProducts();

  // Pagination manuelle après filtrage
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(displayedProducts.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedProducts = displayedProducts.slice(startIndex, endIndex);

  // Reset à la page 1 quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [quickFilter, searchQuery, filters, products]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Fonction pour gérer le clic sur les stats
  const handleStatClick = (filterType: string) => {
    setQuickFilter(filterType);
  };

  // Marquer les produits sélectionnés comme favoris
  const markSelectedAsFavorites = async () => {
    if (selectedProductIds.size === 0) return;

    try {
      const updatePromises = Array.from(selectedProductIds).map((id) =>
        db.products.update(id, { isFavorite: true, updatedAt: new Date() })
      );
      await Promise.all(updatePromises);

      toast({
        title: "Succès",
        description: `${selectedProductIds.size} produit(s) marqué(s) comme favoris.`,
      });

      setSelectedProductIds(new Set());
      loadProducts();
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite.",
        variant: "destructive",
      });
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
      new Set(paginatedProducts.map((product) => product.id!))
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
      <Badge
        variant={variants[categorie as keyof typeof variants] || "secondary"}
      >
        {labels[categorie as keyof typeof labels] || categorie}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header avec titre et bouton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
            <Button onClick={resetForm} size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Nouveau produit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouveau produit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <ValidationInput
                label="Nom du produit"
                required
                value={formData.nom}
                onChange={(e) =>
                  setFormData({ ...formData, nom: e.target.value })
                }
              />
              <ValidationInput
                label="Code article"
                required
                value={formData.codeProduct}
                onChange={(e) =>
                  setFormData({ ...formData, codeProduct: e.target.value })
                }
                placeholder="Code unique pour l'article"
              />
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
                      <strong>Déchets inertes ou non dangereux :</strong> Pas
                      d'obligation de passer par Trackdéchets. Vous pouvez gérer
                      vos pesées via votre registre interne.
                    </p>
                    <p>
                      <strong>Si vous choisissez Trackdéchets :</strong> Chaque
                      acteur (producteur, transporteur, destinataire) doit avoir
                      un compte sur la plateforme. Impossible de valider une
                      pesée si un des acteur est non inscrit.
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
                          Numéro CAP{" "}
                          {formData.categorieDechet === "dangereux" ? "*" : ""}
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
                            <strong>Code déchet :</strong> Code européen à 6
                            chiffres identifiant la nature du déchet (ex: 170101
                            pour béton, 160111* pour amiante). L'astérisque (*)
                            indique un déchet dangereux.
                          </div>
                          <div>
                            <strong>Catégorie déchet :</strong> Classification
                            selon la dangerosité :
                            <ul className="list-disc ml-5 mt-1 space-y-1">
                              <li>
                                <strong>Inerte :</strong> Déchets stables
                                (béton, tuiles, briques...)
                              </li>
                              <li>
                                <strong>Non-dangereux :</strong> Déchets sans
                                risque particulier (bois, plastique...)
                              </li>
                              <li>
                                <strong>Dangereux :</strong> Déchets présentant
                                un risque (amiante, produits chimiques...)
                              </li>
                            </ul>
                          </div>
                          <div>
                            <strong>Consistance :</strong> État physique du
                            déchet lors du transport (Solide, Liquide, Gazeux,
                            Pâteux). Obligatoire pour Track Déchets.
                          </div>
                          <div>
                            <strong>Soumis à l'ADR :</strong> ADR = Accord
                            européen relatif au transport international des
                            marchandises Dangereuses par Route. Indiquez "Oui"
                            si votre déchet est classé matière dangereuse
                            nécessitant des précautions spéciales de transport.
                          </div>
                          <div>
                            <strong>Code ONU :</strong> Numéro d'identification
                            des matières dangereuses pour le transport (ex: UN
                            3082). Obligatoire uniquement si le déchet est
                            soumis à l'ADR.
                          </div>
                          <div>
                            <strong>Numéro CAP :</strong> Certificat
                            d'Acceptation Préalable délivré par l'installation
                            de destination. Il certifie que le site accepte de
                            recevoir ce type de déchet. Obligatoire pour les
                            déchets dangereux, optionnel pour les autres.
                          </div>
                          <div>
                            <strong>Conditionnement Type :</strong> Mode de
                            transport du déchet :
                            <ul className="list-disc ml-5 mt-1 space-y-1">
                              <li>
                                <strong>Benne :</strong> Conteneur ouvert ou
                                fermé
                              </li>
                              <li>
                                <strong>Citerne :</strong> Pour liquides ou
                                pulvérulents
                              </li>
                              <li>
                                <strong>Fût :</strong> Conteneur cylindrique
                                fermé
                              </li>
                              <li>
                                <strong>GRV :</strong> Grand Récipient pour Vrac
                                (conteneur intermédiaire)
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-xs text-green-800 font-medium">
                          ✓ Les pesées de ce produit généreront automatiquement
                          un BSD Track Déchets
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

      {/* Statistiques */}
      <ProductStatsCards products={products} onStatClick={handleStatClick} />

      {/* Barre de recherche et toggle vue */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Rechercher un produit par nom, code, catégorie..."
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
      <ProductQuickFilters
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
          <CardDescription>Recherchez et filtrez vos produits</CardDescription>
        </CardHeader>
        <CardContent>
          <TableFilters
            filters={productFilterConfigs}
            onFiltersChange={setFilters}
            showPageSize={true}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>

      {/* Contenu des produits */}
      {displayedProducts.length === 0 && products.length === 0 ? (
        <EmptyProductState onCreateProduct={() => {
          resetForm();
          setIsCreateDialogOpen(true);
        }} />
      ) : (
        <>
          {viewMode === "cards" ? (
            <div>
              {displayedProducts.length === 0 ? (
                <Card className="border-dashed border-2">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Package className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      Aucun produit trouvé
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Aucun produit ne correspond à vos critères.
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
                <ProductCardGrid
                  products={paginatedProducts}
                  selectedProductIds={selectedProductIds}
                  onSelect={toggleProductSelection}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggleFavorite={toggleFavorite}
                />
              )}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Produits ({displayedProducts.length})</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {displayedProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      Aucun produit trouvé
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Aucun produit ne correspond à vos critères.
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
                          onClick={selectAllProducts}
                          disabled={paginatedProducts.length === 0}
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
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={
                                paginatedProducts.length > 0 &&
                                paginatedProducts.every((p) =>
                                  selectedProductIds.has(p.id!)
                                )
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
                          <TableHead className="w-24">Code</TableHead>
                          <TableHead>Nom</TableHead>
                          <TableHead className="w-28">Prix TTC</TableHead>
                          <TableHead className="w-32">Catégorie</TableHead>
                          <TableHead className="w-24">Track Déchet</TableHead>
                          <TableHead className="w-20">Favori</TableHead>
                          <TableHead className="w-24">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedProducts.map((product) => (
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
                            <TableCell className="font-medium">
                              {product.nom}
                            </TableCell>
                            <TableCell className="font-semibold text-primary">
                              {product.prixTTC?.toFixed(2) || "0.00"}€
                              <div className="text-xs text-muted-foreground">
                                HT: {product.prixHT?.toFixed(2) || "0.00"}€
                              </div>
                            </TableCell>
                            <TableCell>
                              {getCategorieDechetBadge(product.categorieDechet)}
                            </TableCell>
                            <TableCell>
                              {product.trackDechetEnabled && (
                                <Badge className="bg-green-100 text-green-800">
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
                                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                                ) : (
                                  <Star className="h-4 w-4" />
                                )}
                              </Button>
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
                                    onClick={() => handleEdit(product)}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Modifier
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => toggleFavorite(product)}
                                  >
                                    <Star className="h-4 w-4 mr-2" />
                                    {product.isFavorite
                                      ? "Retirer favori"
                                      : "Marquer favori"}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(product)}
                                    className="text-destructive focus:text-destructive"
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
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Pagination */}
      {displayedProducts.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
              totalItems={displayedProducts.length}
              pageSize={pageSize}
            />
          </CardContent>
        </Card>
      )}

      {/* Barre d'actions bulk */}
      <BulkActionsBar
        selectedCount={selectedProductIds.size}
        onDelete={deleteSelectedProducts}
        onMarkFavorites={markSelectedAsFavorites}
        onClear={() => setSelectedProductIds(new Set())}
      />

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
                    <strong>Déchets inertes ou non dangereux :</strong> Pas
                    d'obligation de passer par Trackdéchets. Vous pouvez gérer
                    vos pesées via votre registre interne.
                  </p>
                  <p>
                    <strong>Si vous choisissez Trackdéchets :</strong> Chaque
                    acteur (producteur, transporteur, destinataire) doit avoir
                    un compte sur la plateforme. Impossible de valider une pesée
                    si un des acteur est non inscrit.
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
                      <Label htmlFor="isSubjectToADR-edit">
                        Soumis à l'ADR *
                      </Label>
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
                        Numéro CAP{" "}
                        {formData.categorieDechet === "dangereux" ? "*" : ""}
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
                          <strong>Code déchet :</strong> Code européen à 6
                          chiffres identifiant la nature du déchet (ex: 170101
                          pour béton, 160111* pour amiante). L'astérisque (*)
                          indique un déchet dangereux.
                        </div>
                        <div>
                          <strong>Catégorie déchet :</strong> Classification
                          selon la dangerosité :
                          <ul className="list-disc ml-5 mt-1 space-y-1">
                            <li>
                              <strong>Inerte :</strong> Déchets stables (béton,
                              tuiles, briques...)
                            </li>
                            <li>
                              <strong>Non-dangereux :</strong> Déchets sans
                              risque particulier (bois, plastique...)
                            </li>
                            <li>
                              <strong>Dangereux :</strong> Déchets présentant un
                              risque (amiante, produits chimiques...)
                            </li>
                          </ul>
                        </div>
                        <div>
                          <strong>Consistance :</strong> État physique du déchet
                          lors du transport (Solide, Liquide, Gazeux, Pâteux).
                          Obligatoire pour Track Déchets.
                        </div>
                        <div>
                          <strong>Soumis à l'ADR :</strong> ADR = Accord
                          européen relatif au transport international des
                          marchandises Dangereuses par Route. Indiquez "Oui" si
                          votre déchet est classé matière dangereuse nécessitant
                          des précautions spéciales de transport.
                        </div>
                        <div>
                          <strong>Code ONU :</strong> Numéro d'identification
                          des matières dangereuses pour le transport (ex: UN
                          3082). Obligatoire uniquement si le déchet est soumis
                          à l'ADR.
                        </div>
                        <div>
                          <strong>Numéro CAP :</strong> Certificat d'Acceptation
                          Préalable délivré par l'installation de destination.
                          Il certifie que le site accepte de recevoir ce type de
                          déchet. Obligatoire pour les déchets dangereux,
                          optionnel pour les autres.
                        </div>
                        <div>
                          <strong>Conditionnement Type :</strong> Mode de
                          transport du déchet :
                          <ul className="list-disc ml-5 mt-1 space-y-1">
                            <li>
                              <strong>Benne :</strong> Conteneur ouvert ou fermé
                            </li>
                            <li>
                              <strong>Citerne :</strong> Pour liquides ou
                              pulvérulents
                            </li>
                            <li>
                              <strong>Fût :</strong> Conteneur cylindrique fermé
                            </li>
                            <li>
                              <strong>GRV :</strong> Grand Récipient pour Vrac
                              (conteneur intermédiaire)
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-xs text-green-800 font-medium">
                        ✓ Les pesées de ce produit généreront automatiquement un
                        BSD Track Déchets
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
