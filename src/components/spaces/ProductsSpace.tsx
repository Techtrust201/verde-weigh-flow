
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Package, Star, StarOff } from 'lucide-react';
import { db, Product } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';

export default function ProductsSpace() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({
    nom: '',
    prixHT: 0,
    tauxTVA: 20,
    prixTTC: 0,
    codeProduct: '',
    isFavorite: false
  });
  const { toast } = useToast();

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    // Calculer le prix TTC automatiquement
    if (formData.prixHT && formData.tauxTVA) {
      const prixTTC = formData.prixHT * (1 + formData.tauxTVA / 100);
      setFormData(prev => ({ ...prev, prixTTC }));
    }
  }, [formData.prixHT, formData.tauxTVA]);

  const loadProducts = async () => {
    try {
      const productsData = await db.products.orderBy('nom').toArray();
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.nom || !formData.codeProduct) {
        toast({
          title: "Erreur",
          description: "Le nom et le code produit sont obligatoires.",
          variant: "destructive"
        });
        return;
      }

      const productData = {
        ...formData,
        tva: formData.tauxTVA || 20, // Mapper tauxTVA vers tva pour la compatibilité
        updatedAt: new Date()
      } as Product;

      if (editingProduct) {
        await db.products.update(editingProduct.id!, productData);
        toast({
          title: "Produit modifié",
          description: "Les informations du produit ont été mises à jour."
        });
      } else {
        await db.products.add({
          ...productData,
          createdAt: new Date()
        });
        toast({
          title: "Produit ajouté",
          description: "Le nouveau produit a été créé avec succès."
        });
      }

      setIsDialogOpen(false);
      setEditingProduct(null);
      resetForm();
      loadProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le produit.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (product: Product) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le produit "${product.nom}" ?`)) {
      try {
        await db.products.delete(product.id!);
        toast({
          title: "Produit supprimé",
          description: "Le produit a été supprimé avec succès."
        });
        loadProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
        toast({
          title: "Erreur",
          description: "Impossible de supprimer le produit.",
          variant: "destructive"
        });
      }
    }
  };

  const toggleFavorite = async (product: Product) => {
    try {
      await db.products.update(product.id!, {
        isFavorite: !product.isFavorite,
        updatedAt: new Date()
      });
      loadProducts();
    } catch (error) {
      console.error('Error updating favorite:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      prixHT: 0,
      tauxTVA: 20,
      prixTTC: 0,
      codeProduct: '',
      isFavorite: false
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="nom">Nom du produit *</Label>
                <Input
                  id="nom"
                  value={formData.nom}
                  onChange={(e) => setFormData({...formData, nom: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="codeProduct">Code produit *</Label>
                <Input
                  id="codeProduct"
                  value={formData.codeProduct}
                  onChange={(e) => setFormData({...formData, codeProduct: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="prixHT">Prix HT (€)</Label>
                  <Input
                    id="prixHT"
                    type="number"
                    step="0.01"
                    value={formData.prixHT}
                    onChange={(e) => setFormData({...formData, prixHT: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="tauxTVA">Taux TVA (%)</Label>
                  <Input
                    id="tauxTVA"
                    type="number"
                    value={formData.tauxTVA}
                    onChange={(e) => setFormData({...formData, tauxTVA: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="prixTTC">Prix TTC (€)</Label>
                <Input
                  id="prixTTC"
                  type="number"
                  step="0.01"
                  value={formData.prixTTC?.toFixed(2) || '0.00'}
                  readOnly
                  className="bg-gray-100"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSave}>
                {editingProduct ? 'Modifier' : 'Créer'}
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
                    {product.isFavorite ? 
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> : 
                      <StarOff className="h-4 w-4" />
                    }
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
                {product.isFavorite && (
                  <Badge className="bg-yellow-100 text-yellow-800">
                    Favori
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">HT:</span>
                  <span className="font-medium">{product.prixHT.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">TVA:</span>
                  <span className="text-sm">{product.tauxTVA}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">TTC:</span>
                  <span className="font-bold text-green-600">{product.prixTTC.toFixed(2)}€</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Aucun produit</h3>
          <p className="text-gray-500 mb-4">Commencez par ajouter votre premier produit.</p>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un produit
          </Button>
        </div>
      )}
    </div>
  );
}
