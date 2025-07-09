
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator } from 'lucide-react';
import { Product } from '@/lib/database';
import { PeseeTab } from '@/hooks/usePeseeTabs';

interface ProductWeightSectionProps {
  currentData: PeseeTab['formData'] | undefined;
  products: Product[];
  updateCurrentTab: (updates: Partial<PeseeTab['formData']>) => void;
}

export const ProductWeightSection = ({
  currentData,
  products,
  updateCurrentTab
}: ProductWeightSectionProps) => {
  const selectedProduct = products.find(p => p.id === currentData?.produitId);
  
  const parseWeight = (value: string): number => {
    return parseFloat(value.replace(',', '.')) || 0;
  };

  const poidsEntree = parseWeight(currentData?.poidsEntree || '');
  const poidsSortie = parseWeight(currentData?.poidsSortie || '');
  const net = Math.abs(poidsEntree - poidsSortie);

  const handleWeightChange = (field: 'poidsEntree' | 'poidsSortie', value: string) => {
    // Permettre les virgules et les points
    const formattedValue = value.replace(/[^0-9.,]/g, '');
    updateCurrentTab({ [field]: formattedValue });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Calculator className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Produit et Pesée</h3>
      </div>
      
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
                  {product.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="poidsEntree">Poids d'entrée (T)</Label>
          <Input
            id="poidsEntree"
            type="text"
            value={currentData?.poidsEntree || ''}
            onChange={(e) => handleWeightChange('poidsEntree', e.target.value)}
            placeholder="0.000"
          />
        </div>

        <div>
          <Label htmlFor="poidsSortie">Poids de sortie (T)</Label>
          <Input
            id="poidsSortie"
            type="text"
            value={currentData?.poidsSortie || ''}
            onChange={(e) => handleWeightChange('poidsSortie', e.target.value)}
            placeholder="0.000"
          />
        </div>
      </div>

      <div className="bg-muted p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Poids Net</Label>
            <div className="text-2xl font-bold">{net.toFixed(3)} T</div>
          </div>
          <div>
            <Label>Produit sélectionné</Label>
            <div className="text-lg">{selectedProduct?.nom || 'Aucun produit sélectionné'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
