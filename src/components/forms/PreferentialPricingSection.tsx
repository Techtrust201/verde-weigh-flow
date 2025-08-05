
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Euro, AlertCircle } from 'lucide-react';
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
  const [errors, setErrors] = useState<{[key: number]: string}>({});

  const addPreferentialPrice = () => {
    if (!selectedProductId) return;
    
    const productId = parseInt(selectedProductId);
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const newTarifs = {
      ...formData.tarifsPreferentiels,
      [productId]: {
        prixHT: product.prixHT, // Initialiser avec le prix normal du produit
        prixTTC: product.prixTTC // Initialiser avec le prix TTC normal
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

    // Récupérer le produit pour obtenir son taux de TVA spécifique
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Utiliser le taux de TVA spécifique au produit
    const tvaRate = product.tauxTVA / 100; // Convertir le pourcentage en décimal

    // Calculer automatiquement l'autre prix en utilisant le bon taux de TVA
    if (field === 'prixHT') {
      newTarifs[productId].prixHT = value;
      newTarifs[productId].prixTTC = value * (1 + tvaRate);
    } else {
      newTarifs[productId].prixTTC = value;
      newTarifs[productId].prixHT = value / (1 + tvaRate);
    }

    // Validation
    const newErrors = { ...errors };
    if (value <= 0) {
      newErrors[productId] = 'Le prix doit être supérieur à 0';
    } else {
      delete newErrors[productId];
    }
    setErrors(newErrors);

    onFormDataChange({
      ...formData,
      tarifsPreferentiels: newTarifs
    });
  };

  const removePreferentialPrice = (productId: number) => {
    const newTarifs = { ...formData.tarifsPreferentiels };
    delete newTarifs[productId];
    
    const newErrors = { ...errors };
    delete newErrors[productId];
    setErrors(newErrors);

    onFormDataChange({
      ...formData,
      tarifsPreferentiels: newTarifs
    });
  };

  const validatePricing = () => {
    const hasErrors = Object.keys(errors).length > 0;
    const hasEmptyHT = formData.tarifsPreferentiels && Object.values(formData.tarifsPreferentiels).some(
      tarif => !tarif.prixHT || tarif.prixHT <= 0
    );
    return !hasErrors && !hasEmptyHT;
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
                  {product.nom} (Tarif normal: {product.prixTTC.toFixed(2)}€ TTC - TVA {product.tauxTVA}%)
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

              const hasError = errors[productId];

              return (
                <div key={productId} className={`border rounded-lg p-3 space-y-2 ${hasError ? 'border-red-200 bg-red-50' : ''}`}>
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">{product.nom} (TVA {product.tauxTVA}%)</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removePreferentialPrice(productId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {hasError && (
                    <div className="flex items-center gap-1 text-sm text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      {hasError}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor={`prixHT-${productId}`}>Prix HT (€) *</Label>
                      <NumericInput
                        id={`prixHT-${productId}`}
                        value={pricing.prixHT || undefined}
                        onChange={(value) => updatePreferentialPrice(productId, 'prixHT', value)}
                        placeholder={`Normal: ${product.prixHT.toFixed(2)}€`}
                        className={hasError ? 'border-red-300' : ''}
                        min={0}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`prixTTC-${productId}`}>Prix TTC (€)</Label>
                      <NumericInput
                        id={`prixTTC-${productId}`}
                        value={pricing.prixTTC || undefined}
                        onChange={(value) => updatePreferentialPrice(productId, 'prixTTC', value)}
                        placeholder={`Normal: ${product.prixTTC.toFixed(2)}€`}
                        className="bg-gray-50"
                        disabled
                        min={0}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Calculé automatiquement (TVA {product.tauxTVA}%)
                      </p>
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

        {/* Validation globale */}
        {formData.tarifsPreferentiels && Object.keys(formData.tarifsPreferentiels).length > 0 && !validatePricing() && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-600">
              Veuillez corriger les erreurs avant de sauvegarder
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
