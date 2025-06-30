
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, X, Printer, Save } from 'lucide-react';
import { db, Pesee, Client, Product } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';

interface PeseeTab {
  id: string;
  label: string;
  data: Partial<Pesee>;
  isDirty: boolean;
}

export default function PeseeSpace() {
  const [tabs, setTabs] = useState<PeseeTab[]>([
    { id: '1', label: 'Pesée 1', data: {}, isDirty: false }
  ]);
  const [activeTab, setActiveTab] = useState('1');
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [clientsData, productsData] = await Promise.all([
        db.clients.toArray(),
        db.products.toArray()
      ]);
      setClients(clientsData);
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const addTab = () => {
    const newTabId = (tabs.length + 1).toString();
    const newTab: PeseeTab = {
      id: newTabId,
      label: `Pesée ${newTabId}`,
      data: {
        dateHeure: new Date(),
        moyenPaiement: 'Direct'
      },
      isDirty: false
    };
    setTabs([...tabs, newTab]);
    setActiveTab(newTabId);
  };

  const closeTab = (tabId: string) => {
    if (tabs.length === 1) return;
    
    const newTabs = tabs.filter(tab => tab.id !== tabId);
    setTabs(newTabs);
    
    if (activeTab === tabId) {
      setActiveTab(newTabs[0].id);
    }
  };

  const updateTabData = (tabId: string, newData: Partial<Pesee>) => {
    setTabs(tabs.map(tab => 
      tab.id === tabId 
        ? { ...tab, data: { ...tab.data, ...newData }, isDirty: true }
        : tab
    ));
  };

  const getCurrentTab = () => tabs.find(tab => tab.id === activeTab);

  const generateBonNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const timestamp = now.getTime().toString().slice(-4);
    return `BON-${year}-${timestamp}`;
  };

  const calculatePrices = (net: number, productId: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return { prixHT: 0, prixTTC: 0 };
    
    const prixHT = net * product.prixHT;
    const prixTTC = net * product.prixTTC;
    
    return { prixHT, prixTTC };
  };

  const handleValidation = (printBon: boolean = false, printFacture: boolean = false) => {
    const currentTab = getCurrentTab();
    if (!currentTab) return;

    // Validation logic here
    const numeroBon = generateBonNumber();
    
    toast({
      title: "Pesée enregistrée",
      description: `Bon n°${numeroBon} créé avec succès`
    });

    // Reset tab
    updateTabData(activeTab, {
      dateHeure: new Date(),
      moyenPaiement: 'Direct'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Pesée</h1>
        <Button onClick={addTab} disabled={tabs.length >= 4}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvel Onglet
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          {tabs.map(tab => (
            <TabsTrigger key={tab.id} value={tab.id} className="relative">
              {tab.label}
              {tab.isDirty && <div className="w-2 h-2 bg-orange-500 rounded-full absolute -top-1 -right-1" />}
              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map(tab => (
          <TabsContent key={tab.id} value={tab.id}>
            <PeseeForm
              data={tab.data}
              clients={clients}
              products={products}
              onDataChange={(newData) => updateTabData(tab.id, newData)}
              onValidation={handleValidation}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

interface PeseeFormProps {
  data: Partial<Pesee>;
  clients: Client[];
  products: Product[];
  onDataChange: (data: Partial<Pesee>) => void;
  onValidation: (printBon?: boolean, printFacture?: boolean) => void;
}

function PeseeForm({ data, clients, products, onDataChange, onValidation }: PeseeFormProps) {
  const [poidsEntree, setPoidsEntree] = useState(data.poidsEntree || 0);
  const [poidsSortie, setPoidsSortie] = useState(data.poidsSortie || 0);

  const net = poidsEntree > poidsSortie ? poidsEntree - poidsSortie : poidsSortie - poidsEntree;
  
  useEffect(() => {
    onDataChange({ 
      ...data, 
      poidsEntree, 
      poidsSortie, 
      net 
    });
  }, [poidsEntree, poidsSortie, net]);

  const selectedProduct = products.find(p => p.id === data.produitId);
  const prixHT = selectedProduct ? net * selectedProduct.prixHT : 0;
  const prixTTC = selectedProduct ? net * selectedProduct.prixTTC : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouvelle Pesée</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Moyen de paiement</Label>
            <Select 
              value={data.moyenPaiement || 'Direct'} 
              onValueChange={(value: 'Direct' | 'En compte') => onDataChange({ moyenPaiement: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Direct">Direct</SelectItem>
                <SelectItem value="En compte">En compte</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date et heure</Label>
            <Input 
              type="datetime-local" 
              value={data.dateHeure ? new Date(data.dateHeure).toISOString().slice(0, 16) : ''}
              onChange={(e) => onDataChange({ dateHeure: new Date(e.target.value) })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Plaque</Label>
            <Input 
              value={data.plaque || ''}
              onChange={(e) => onDataChange({ plaque: e.target.value })}
              placeholder="AB-123-CD"
            />
          </div>
          <div>
            <Label>Nom de l'entreprise</Label>
            <Input 
              value={data.nomEntreprise || ''}
              onChange={(e) => onDataChange({ nomEntreprise: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Chantier</Label>
            <Input 
              value={data.chantier || ''}
              onChange={(e) => onDataChange({ chantier: e.target.value })}
            />
          </div>
          <div>
            <Label>Produit</Label>
            <Select 
              value={data.produitId?.toString() || ''} 
              onValueChange={(value) => onDataChange({ produitId: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un produit" />
              </SelectTrigger>
              <SelectContent>
                {products.map(product => (
                  <SelectItem key={product.id} value={product.id!.toString()}>
                    {product.nom} - {product.prixHT}€/T HT
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Poids entrée (T)</Label>
            <Input 
              type="number" 
              step="0.01"
              value={poidsEntree}
              onChange={(e) => setPoidsEntree(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <Label>Poids sortie (T)</Label>
            <Input 
              type="number" 
              step="0.01"
              value={poidsSortie}
              onChange={(e) => setPoidsSortie(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <Label>Net (T)</Label>
            <Input 
              type="number" 
              value={net.toFixed(2)}
              disabled
              className="bg-gray-50"
            />
          </div>
        </div>

        {data.moyenPaiement === 'Direct' && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
            <div>
              <Label>Prix HT</Label>
              <Input 
                value={`${prixHT.toFixed(2)} €`}
                disabled
                className="bg-white"
              />
            </div>
            <div>
              <Label>Prix TTC</Label>
              <Input 
                value={`${prixTTC.toFixed(2)} €`}
                disabled
                className="bg-white"
              />
            </div>
          </div>
        )}

        <div className="flex space-x-2">
          <Button onClick={() => onValidation(true, false)}>
            <Printer className="h-4 w-4 mr-2" />
            Confirmer & Imprimer Bon
          </Button>
          <Button variant="outline" onClick={() => onValidation(false, false)}>
            <Save className="h-4 w-4 mr-2" />
            Confirmer
          </Button>
          {data.moyenPaiement === 'Direct' && (
            <Button onClick={() => onValidation(true, true)}>
              <Printer className="h-4 w-4 mr-2" />
              Confirmer & Imprimer Tout
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
