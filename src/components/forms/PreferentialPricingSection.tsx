
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Euro } from 'lucide-react';
import { Product, Client } from '@/lib/database';

interface PreferentialPricingSectionProps {
  formData: Partial<Client>;
  onFormDataChange: (data: Partial<Client>) => void;
  products: Product[];
}

export default function PreferentialPricingSection({ 
  formData, 
  onFormDataChange, 
  products 
}: PreferentialPricingSectionProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  const addPreferentialPrice = () => {
    if (!selectedProductId) return;
    
    const productId = parseInt(selectedProductId);
    const newTarifs = {
      ...formData.tarifsPreferentiels,
      [productId]: {
        prixHT: 0,
        prixTTC: 0
      }
    };

    onFormDataChange({
      ...formData,
      tarifsPreferentiels: newTarifs
    });
    setSelectedProductId('');
  };

  const updatePreferentialPrice = (productId: number, field: 'prixHT' | 'prixTTC', value: number) => {
    const newTarifs = { ...formData.tarifsPreferentiels };
    if (!newTarifs[productId]) {
      newTarifs[productId] = {};
    }
    newTarifs[productId][field] = value;

    onFormDataChange({
      ...formData,
      tarifsPreferentiels: newTarifs
    });
  };

  const removePreferentialPrice = (productId: number) => {
    const newTarifs = { ...formData.tarifsPreferentiels };
    delete newTarifs[productId];

    onFormDataChange({
      ...formData,
      tarifsPreferentiels: newTarifs
    });
  };

  const availableProducts = products.filter(product => 
    !formData.tarifsPreferentiels?.[product.id!]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Euro className="h-5 w-5" />
          Tarifs Préférentiels
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ajout d'un nouveau tarif */}
        <div className="flex gap-2">
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Sélectionner un produit" />
            </SelectTrigger>
            <SelectContent>
              {availableProducts.map((product) => (
                <SelectItem key={product.id} value={product.id!.toString()}>
                  {product.nom} (Tarif normal: {product.prixTTC}€ TTC)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            type="button" 
            onClick={addPreferentialPrice}
            disabled={!selectedProductId}
            size="sm"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Liste des tarifs préférentiels */}
        {formData.tarifsPreferentiels && Object.keys(formData.tarifsPreferentiels).length > 0 && (
          <div className="space-y-3">
            {Object.entries(formData.tarifsPreferentiels).map(([productIdStr, pricing]) => {
              const productId = parseInt(productIdStr);
              const product = products.find(p => p.id === productId);
              if (!product) return null;

              return (
                <div key={productId} className="border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">{product.nom}</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removePreferentialPrice(productId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor={`prixHT-${productId}`}>Prix HT (€)</Label>
                      <Input
                        id={`prixHT-${productId}`}
                        type="number"
                        step="0.01"
                        value={pricing.prixHT || ''}
                        onChange={(e) => updatePreferentialPrice(productId, 'prixHT', parseFloat(e.target.value) || 0)}
                        placeholder={`Normal: ${product.prixHT}€`}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`prixTTC-${productId}`}>Prix TTC (€)</Label>
                      <Input
                        id={`prixTTC-${productId}`}
                        type="number"
                        step="0.01"
                        value={pricing.prixTTC || ''}
                        onChange={(e) => updatePreferentialPrice(productId, 'prixTTC', parseFloat(e.target.value) || 0)}
                        placeholder={`Normal: ${product.prixTTC}€`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {(!formData.tarifsPreferentiels || Object.keys(formData.tarifsPreferentiels).length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun tarif préférentiel défini pour ce client
          </p>
        )}
      </CardContent>
    </Card>
  );
}
