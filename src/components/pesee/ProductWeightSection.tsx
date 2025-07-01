
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Product } from '@/lib/database';
import { PeseeTab } from '@/hooks/usePeseeTabs';

interface ProductWeightSectionProps {
  currentData: PeseeTab['formData'] | undefined;
  products: Product[];
  updateCurrentTab: (updates: Partial<PeseeTab['formData']>) => void;
}

export const ProductWeightSection = ({ currentData, products, updateCurrentTab }: ProductWeightSectionProps) => {
  const selectedProduct = products.find(p => p.id === currentData?.produitId);
  const net = Math.abs((currentData?.poidsEntree || 0) - (currentData?.poidsSortie || 0));
  const prixHT = net * (selectedProduct?.prixHT || 0);
  const prixTTC = net * (selectedProduct?.prixTTC || 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="produit">Produit *</Label>
          <Select 
            value={currentData?.produitId?.toString() || ''} 
            onValueChange={(value) => updateCurrentTab({ produitId: parseInt(value) })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un produit" />
            </SelectTrigger>
            <SelectContent>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id!.toString()}>
                  {product.nom} - {product.prixTTC.toFixed(2)}€/T
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="poidsEntree">Poids entrée (T)</Label>
          <Input
            id="poidsEntree"
            type="number"
            step="0.01"
            value={currentData?.poidsEntree || 0}
            onChange={(e) => updateCurrentTab({ poidsEntree: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div>
          <Label htmlFor="poidsSortie">Poids sortie (T)</Label>
          <Input
            id="poidsSortie"
            type="number"
            step="0.01"
            value={currentData?.poidsSortie || 0}
            onChange={(e) => updateCurrentTab({ poidsSortie: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>

      <Card className="bg-green-50">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {net.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Net (T)</div>
            </div>
            <div>
              <div className="text-xl font-semibold">
                {selectedProduct?.prixHT.toFixed(2) || '0.00'}€
              </div>
              <div className="text-sm text-gray-600">Prix HT/T</div>
            </div>
            <div>
              <div className="text-xl font-semibold text-green-600">
                {prixHT.toFixed(2)}€
              </div>
              <div className="text-sm text-gray-600">Total HT</div>
            </div>
            <div>
              <div className="text-xl font-bold text-green-600">
                {prixTTC.toFixed(2)}€
              </div>
              <div className="text-sm text-gray-600">Total TTC</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
