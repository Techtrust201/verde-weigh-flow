
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Star } from 'lucide-react';
import { db, Product } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';

export default function ProductsSpace() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const allProducts = await db.products.toArray();
      setProducts(allProducts);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const filteredProducts = products.filter(product =>
    product.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.codeProduct.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveProduct = async (productData: Partial<Product>) => {
    try {
      // Calculate TTC price
      const prixTTC = productData.prixHT! * (1 + productData.tauxTVA! / 100);
      
      const dataToSave = {
        ...productData,
        prixTTC,
        updatedAt: new Date()
      };

      if (selectedProduct?.id) {
        await db.products.update(selectedProduct.id, dataToSave);
        toast({
          title: "Produit mis à jour",
          description: "Les modifications ont été sauvegardées."
        });
      } else {
        await db.products.add({
          ...dataToSave as Product,
          createdAt: new Date()
        });
        toast({
          title: "Produit créé",
          description: "Le nouveau produit a été ajouté."
        });
      }
      loadProducts();
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving product:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le produit.",
        variant: "destructive"
      });
    }
  };

  const toggleFavorite = async (productId: number) => {
    try {
      const product = products.find(p => p.id === productId);
      if (product) {
        await db.products.update(productId, { 
          isFavorite: !product.isFavorite 
        });
        loadProducts();
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Produits</h1>
        <Button onClick={() => {
          setSelectedProduct(null);
          setIsEditing(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Produit
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher par nom ou code produit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className={`cursor-pointer transition-colors ${
                  selectedProduct?.id === product.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setSelectedProduct(product)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{product.nom}</h3>
                        {product.isFavorite && (
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{product.codeProduct}</p>
                      <p className="text-sm font-medium text-green-600">
                        {product.prixHT}€/T HT - {product.prixTTC.toFixed(2)}€/T TTC
                      </p>
                    </div>
                    <Badge variant="outline">
                      TVA {product.tauxTVA}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <ProductForm
            product={selectedProduct}
            isEditing={isEditing}
            onSave={handleSaveProduct}
            onEdit={() => setIsEditing(true)}
            onCancel={() => setIsEditing(false)}
            onToggleFavorite={selectedProduct ? () => toggleFavorite(selectedProduct.id!) : undefined}
          />
        </div>
      </div>
    </div>
  );
}

interface ProductFormProps {
  product: Product | null;
  isEditing: boolean;
  onSave: (product: Partial<Product>) => void;
  onEdit: () => void;
  onCancel: () => void;
  onToggleFavorite?: () => void;
}

function ProductForm({ product, isEditing, onSave, onEdit, onCancel, onToggleFavorite }: ProductFormProps) {
  const [formData, setFormData] = useState<Partial<Product>>({
    nom: '',
    prixHT: 0,
    tauxTVA: 20,
    codeProduct: ''
  });

  useEffect(() => {
    if (product) {
      setFormData(product);
    } else if (isEditing) {
      setFormData({
        nom: '',
        prixHT: 0,
        tauxTVA: 20,
        codeProduct: ''
      });
    }
  }, [product, isEditing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const prixTTC = (formData.prixHT || 0) * (1 + (formData.tauxTVA || 0) / 100);

  if (!product && !isEditing) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">Sélectionnez ou créez un produit</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          {isEditing ? (product ? 'Modifier Produit' : 'Nouveau Produit') : 'Détails Produit'}
          {!isEditing && product && (
            <div className="space-x-2">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
              {onToggleFavorite && (
                <Button variant="outline" size="sm" onClick={onToggleFavorite}>
                  <Star className={`h-4 w-4 mr-2 ${product.isFavorite ? 'fill-current text-yellow-500' : ''}`} />
                  {product.isFavorite ? 'Retirer favori' : 'Favori'}
                </Button>
              )}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nom">Nom du produit</Label>
            <Input
              id="nom"
              value={formData.nom || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
              disabled={!isEditing}
              required
            />
          </div>

          <div>
            <Label htmlFor="codeProduct">Code produit</Label>
            <Input
              id="codeProduct"
              value={formData.codeProduct || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, codeProduct: e.target.value }))}
              disabled={!isEditing}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="prixHT">Prix HT à la tonne</Label>
              <Input
                id="prixHT"
                type="number"
                step="0.01"
                value={formData.prixHT || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, prixHT: parseFloat(e.target.value) || 0 }))}
                disabled={!isEditing}
                required
              />
            </div>
            <div>
              <Label htmlFor="tauxTVA">Taux TVA (%)</Label>
              <Input
                id="tauxTVA"
                type="number"
                value={formData.tauxTVA || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, tauxTVA: parseFloat(e.target.value) || 0 }))}
                disabled={!isEditing}
                required
              />
            </div>
          </div>

          <div>
            <Label>Prix TTC à la tonne (calculé)</Label>
            <Input
              value={`${prixTTC.toFixed(2)} €`}
              disabled
              className="bg-gray-50"
            />
          </div>

          {isEditing && (
            <div className="flex space-x-2">
              <Button type="submit">Sauvegarder</Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Annuler
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
