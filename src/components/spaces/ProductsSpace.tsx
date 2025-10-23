import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Edit,
  Trash2,
  Package,
  Star,
  StarOff,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { db, Product } from "@/lib/database";
import { useToast } from "@/hooks/use-toast";

export default function ProductsSpace() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
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
    // Champs Track Déchet supplémentaires
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
      const productsData = await db.products.orderBy("nom").toArray();
      setProducts(productsData);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.nom || !formData.codeProduct) {
        toast({
          title: "Erreur",
          description: "Le nom et le code produit sont obligatoires.",
          variant: "destructive",
        });
        return;
      }

      // Validation Track Déchet : si Track Déchet est activé, catégorie et code déchets sont obligatoires
      if (formData.trackDechetEnabled) {
        if (!formData.categorieDechet) {
          toast({
            title: "Erreur",
            description:
              "La catégorie de déchet est obligatoire quand Track Déchet est activé.",
            variant: "destructive",
          });
          return;
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
          return;
        }

        // Validation format du code déchet (6 chiffres ou 6 chiffres + astérisque)
        if (!/^\d{6}\*?$/.test(formData.codeDechets)) {
          toast({
            title: "Erreur",
            description:
              "Le code déchet doit contenir 6 chiffres (ex: 160111) ou 6 chiffres + astérisque (ex: 160111*).",
            variant: "destructive",
          });
          return;
        }

        // Validation des champs Track Déchet supplémentaires
        if (!formData.consistence) {
          toast({
            title: "Erreur",
            description:
              "La consistance du déchet est obligatoire quand Track Déchet est activé.",
            variant: "destructive",
          });
          return;
        }

        if (formData.isSubjectToADR === undefined) {
          toast({
            title: "Erreur",
            description:
              "Le statut ADR est obligatoire quand Track Déchet est activé.",
            variant: "destructive",
          });
          return;
        }

        if (formData.isSubjectToADR && !formData.onuCode) {
          toast({
            title: "Erreur",
            description:
              "Le code ONU est obligatoire pour les déchets soumis à l'ADR.",
            variant: "destructive",
          });
          return;
        }

        // Validation CAP obligatoire pour déchets dangereux
        if (formData.categorieDechet === "dangereux" && !formData.cap) {
          toast({
            title: "Erreur",
            description:
              "Le numéro CAP est obligatoire pour les déchets dangereux.",
            variant: "destructive",
          });
          return;
        }

        // Validation du type de conditionnement
        if (!formData.conditionnementType) {
          toast({
            title: "Erreur",
            description:
              "Le type de conditionnement est obligatoire quand Track Déchet est activé.",
            variant: "destructive",
          });
          return;
        }
      }

      const productData = {
        ...formData,
        prixHT: formData.prixHT || 0, // Valeur par défaut si undefined
        tva: formData.tauxTVA || 20, // Valeur par défaut si undefined
        updatedAt: new Date(),
      } as Product;

      if (editingProduct) {
        await db.products.update(editingProduct.id!, productData);
        toast({
          title: "Produit modifié",
          description: "Les informations du produit ont été mises à jour.",
        });
      } else {
        await db.products.add({
          ...productData,
          createdAt: new Date(),
        });
        toast({
          title: "Produit ajouté",
          description: "Le nouveau produit a été créé avec succès.",
        });
      }

      setIsDialogOpen(false);
      setEditingProduct(null);
      resetForm();
      loadProducts();
    } catch (error) {
      console.error("Error saving product:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le produit.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (product: Product) => {
    if (
      confirm(
        `Êtes-vous sûr de vouloir supprimer le produit "${product.nom}" ?`
      )
    ) {
      try {
        await db.products.delete(product.id!);
        toast({
          title: "Produit supprimé",
          description: "Le produit a été supprimé avec succès.",
        });
        loadProducts();
      } catch (error) {
        console.error("Error deleting product:", error);
        toast({
          title: "Erreur",
          description: "Impossible de supprimer le produit.",
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
      console.error("Error updating favorite:", error);
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
    });
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData(product);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingProduct(null);
    resetForm();
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gestion des Produits</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Produit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Modifier le produit" : "Nouveau produit"}
              </DialogTitle>
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

                {/* Information Track Déchet */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <Package className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="space-y-3 text-xs text-amber-800">
                      <p className="font-medium text-amber-900">
                        Obligations légales Track Déchets
                      </p>

                      <div className="space-y-2">
                        <p>
                          <strong>Déchets inertes ou non dangereux :</strong>{" "}
                          Pas d'obligation de passer par Trackdéchets. Vous
                          pouvez gérer vos pesées via votre registre interne.
                        </p>

                        <p>
                          <strong>Si vous choisissez Trackdéchets :</strong>{" "}
                          Chaque acteur (producteur, transporteur, destinataire)
                          doit avoir un compte sur la plateforme. Impossible de
                          valider une pesée si un des acteur est non inscrit.
                        </p>
                      </div>
                    </div>
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
                        {/* <div className="flex items-center justify-between"> */}
                        <Label htmlFor="codeDechets">Code déchet *</Label>
                        {/* </div> */}
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

                      {/* Champs Track Déchet supplémentaires */}
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
                            placeholder="UN 3082 ou non soumis"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Code ONU pour le transport de marchandises
                            dangereuses
                          </p>
                        </div>
                      )}

                      <div>
                        <Label htmlFor="cap">Numéro CAP *</Label>
                        <Input
                          id="cap"
                          value={formData.cap || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              cap: e.target.value,
                            })
                          }
                          placeholder={
                            formData.categorieDechet === "dangereux"
                              ? "CAP-123456 (obligatoire)"
                              : "CAP-123456 (optionnel)"
                          }
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Le Certificat d’Acceptation Préalable est
                          {formData.categorieDechet === "dangereux" && (
                            <span className="text-red-500 ml-1">
                              obligatoire pour les déchets dangereux et doit
                              être obtenu auprès du site destinataire
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Conditionnement Type */}
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
                            <SelectValue placeholder="Sélectionner le type de conditionnement" />
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
                        <p className="text-xs text-muted-foreground mt-1">
                          Type de conditionnement pour le transport des déchets
                        </p>
                      </div>
                    </div>

                    {/* Aide et ressources officielles */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                      <div className="flex items-start gap-2">
                        <Package className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-blue-800">
                            📚 Guide des termes Track Déchets
                          </p>
                          <div className="space-y-3 text-xs text-blue-700">
                            <div>
                              <strong>Code déchet :</strong> Code européen à 6 chiffres identifiant la nature du déchet (ex: 170101 pour béton, 160111* pour amiante). L'astérisque (*) indique un déchet dangereux.
                              <a
                                href="https://www.eure.gouv.fr/contenu/telechargement/46147/292609/file/A2%20Liste%20code%20d%C3%A9chet.pdf"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline ml-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Liste officielle
                              </a>
                            </div>
                            
                            <div>
                              <strong>Catégorie déchet :</strong> Classification selon la dangerosité :
                              <ul className="list-disc ml-4 mt-1 space-y-0.5">
                                <li><strong>Inerte</strong> : Déchets stables (béton, tuiles, briques...)</li>
                                <li><strong>Non-dangereux</strong> : Déchets sans risque particulier (bois, plastique...)</li>
                                <li><strong>Dangereux</strong> : Déchets présentant un risque (amiante, produits chimiques...)</li>
                              </ul>
                            </div>

                            <div>
                              <strong>Consistance :</strong> État physique du déchet lors du transport (Solide, Liquide, Gazeux, Pâteux). Obligatoire pour Track Déchets.
                            </div>

                            <div>
                              <strong>Soumis à l'ADR :</strong> ADR = Accord européen relatif au transport international des marchandises Dangereuses par Route. Indiquez "Oui" si votre déchet est classé matière dangereuse nécessitant des précautions spéciales de transport.
                            </div>

                            <div>
                              <strong>Code ONU :</strong> Numéro d'identification des matières dangereuses pour le transport (ex: UN 3082). Obligatoire uniquement si le déchet est soumis à l'ADR.
                              <a
                                href="https://fr.wikipedia.org/wiki/Liste_des_num%C3%A9ros_ONU"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline ml-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Liste des codes
                              </a>
                            </div>

                            <div>
                              <strong>Numéro CAP :</strong> Certificat d'Acceptation Préalable délivré par l'installation de destination. Il certifie que le site accepte de recevoir ce type de déchet. <span className="text-red-600 font-semibold">Obligatoire pour les déchets dangereux</span>, optionnel pour les autres.
                            </div>

                            <div>
                              <strong>Conditionnement Type :</strong> Mode de transport du déchet :
                              <ul className="list-disc ml-4 mt-1 space-y-0.5">
                                <li><strong>Benne</strong> : Conteneur ouvert ou fermé</li>
                                <li><strong>Citerne</strong> : Pour liquides ou pulvérulents</li>
                                <li><strong>Fût</strong> : Conteneur cylindrique fermé</li>
                                <li><strong>GRV</strong> : Grand Récipient pour Vrac (conteneur intermédiaire)</li>
                              </ul>
                            </div>

                            <p className="text-blue-600 font-medium pt-2 border-t border-blue-200">
                              ✓ Les pesées de ce produit généreront automatiquement un BSD Track Déchets
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSave}>
                {editingProduct ? "Modifier" : "Créer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <Card key={product.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  {product.nom}
                </span>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleFavorite(product)}
                  >
                    {product.isFavorite ? (
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ) : (
                      <StarOff className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(product)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(product)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <Badge variant="outline">{product.codeProduct}</Badge>
                <div className="flex space-x-1">
                  {product.isFavorite && (
                    <Badge className="bg-yellow-100 text-yellow-800">
                      Favori
                    </Badge>
                  )}
                  {product.trackDechetEnabled && (
                    <Badge className="bg-blue-100 text-blue-800 flex items-center">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Track Déchets
                    </Badge>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">HT:</span>
                  <span className="font-medium">
                    {product.prixHT.toFixed(2)}€
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">TVA:</span>
                  <span className="text-sm">{product.tauxTVA}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">TTC:</span>
                  <span className="font-bold text-green-600">
                    {product.prixTTC.toFixed(2)}€
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            Aucun produit
          </h3>
          <p className="text-gray-500 mb-4">
            Commencez par ajouter votre premier produit.
          </p>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un produit
          </Button>
        </div>
      )}
    </div>
  );
}
