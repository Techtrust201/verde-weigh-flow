import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calculator, Info } from 'lucide-react';
import { Product, Client, db } from '@/lib/database';
interface ProductWeightSectionProps {
  currentData: any;
  products: Product[];
  updateCurrentTab: (updates: any) => void;
}
export const ProductWeightSection = ({
  currentData,
  products,
  updateCurrentTab
}: ProductWeightSectionProps) => {
  const [client, setClient] = useState<Client | null>(null);
  const [calculatedCost, setCalculatedCost] = useState<{
    ht: number;
    ttc: number;
  } | null>(null);
  useEffect(() => {
    if (currentData?.clientId) {
      loadClient();
    }
  }, [currentData?.clientId]);
  useEffect(() => {
    if (currentData?.produitId && currentData?.poidsEntree && currentData?.poidsSortie) {
      calculateCost();
    }
  }, [currentData?.produitId, currentData?.poidsEntree, currentData?.poidsSortie, client]);
  const loadClient = async () => {
    if (!currentData?.clientId) return;
    try {
      const clientData = await db.clients.get(currentData.clientId);
      setClient(clientData || null);
    } catch (error) {
      console.error('Erreur lors du chargement du client:', error);
    }
  };
  const calculateCost = () => {
    if (!currentData?.produitId || !currentData?.poidsEntree || !currentData?.poidsSortie) {
      setCalculatedCost(null);
      return;
    }
    const selectedProduct = products.find(p => p.id === currentData.produitId);
    if (!selectedProduct) {
      setCalculatedCost(null);
      return;
    }
    const poidsEntree = parseFloat(currentData.poidsEntree.replace(',', '.')) || 0;
    const poidsSortie = parseFloat(currentData.poidsSortie.replace(',', '.')) || 0;
    const net = Math.abs(poidsEntree - poidsSortie);

    // Vérifier les tarifs préférentiels
    let prixHT = selectedProduct.prixHT;
    let prixTTC = selectedProduct.prixTTC;
    if (client?.tarifsPreferentiels && client.tarifsPreferentiels[currentData.produitId]) {
      const tarifPref = client.tarifsPreferentiels[currentData.produitId];
      if (tarifPref.prixHT) prixHT = tarifPref.prixHT;
      if (tarifPref.prixTTC) prixTTC = tarifPref.prixTTC;
    }
    setCalculatedCost({
      ht: net * prixHT,
      ttc: net * prixTTC
    });
  };
  const selectedProduct = products.find(p => p.id === currentData?.produitId);
  const hasPrefPricing = client?.tarifsPreferentiels && selectedProduct && client.tarifsPreferentiels[selectedProduct.id!];
  const getProductDisplayPrice = (product: Product) => {
    if (client?.tarifsPreferentiels && client.tarifsPreferentiels[product.id!]) {
      const prefPrice = client.tarifsPreferentiels[product.id!];
      return `${prefPrice.prixTTC?.toFixed(2)}€ TTC (Tarif préférentiel)`;
    }
    return `${product.prixTTC}€ TTC`;
  };
  return <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Produit et Poids
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 ">
            <div>
              <Label htmlFor="produit">Produit *</Label>
              <Select value={currentData?.produitId?.toString() || ''} onValueChange={value => updateCurrentTab({
              produitId: parseInt(value)
            })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un produit" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(product => <SelectItem key={product.id} value={product.id!.toString()}>
                      <div className="flex flex-col">
                        <span>{product.nom}</span>
                        <span className="text-xs text-muted-foreground">
                          {getProductDisplayPrice(product)}
                        </span>
                      </div>
                    </SelectItem>)}
                </SelectContent>
              </Select>
              {hasPrefPricing && <div className="mt-1 flex items-center gap-1">
                  <Info className="h-3 w-3 text-blue-500" />
                  <span className="text-xs text-blue-600">Tarif préférentiel appliqué</span>
                </div>}
            </div>

            
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="poidsEntree">Poids d'entrée (kg)</Label>
              <Input id="poidsEntree" type="text" value={currentData?.poidsEntree || ''} onChange={e => updateCurrentTab({
              poidsEntree: e.target.value
            })} placeholder="0,00" />
            </div>

            <div>
              <Label htmlFor="poidsSortie">Poids de sortie (kg)</Label>
              <Input id="poidsSortie" type="text" value={currentData?.poidsSortie || ''} onChange={e => updateCurrentTab({
              poidsSortie: e.target.value
            })} placeholder="0,00" />
            </div>
          </div>

          {/* Calcul du coût en temps réel */}
          {calculatedCost && <Card className="border-l-4 border-l-blue-500 bg-blue-50">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-green-600">Coût calculé</h4>
                    <p className="text-sm text-blue-700">
                      Poids net: {Math.abs((parseFloat(currentData.poidsEntree?.replace(',', '.')) || 0) - (parseFloat(currentData.poidsSortie?.replace(',', '.')) || 0)).toFixed(2)} kg
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-900">
                      {calculatedCost.ttc.toFixed(2)}€ TTC
                    </div>
                    <div className="text-sm text-blue-700">
                      {calculatedCost.ht.toFixed(2)}€ HT
                    </div>
                  </div>
                </div>
                {hasPrefPricing && <Badge variant="outline" className="mt-2 text-green-600 border-green-300">
                    Tarif préférentiel appliqué
                  </Badge>}
              </CardContent>
            </Card>}
        </CardContent>
      </Card>
    </div>;
};