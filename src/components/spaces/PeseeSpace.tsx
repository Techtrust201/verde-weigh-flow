
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Scale, Save, Printer, Plus, Edit, Trash2 } from 'lucide-react';
import { db, Pesee, Client, Product } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';

export default function PeseeSpace() {
  const [pesees, setPesees] = useState<Pesee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState('nouvelle');
  const [formData, setFormData] = useState({
    numeroBon: '',
    moyenPaiement: 'Direct' as 'Direct' | 'En compte',
    plaque: '',
    nomEntreprise: '',
    chantier: '',
    produitId: 0,
    poidsEntree: 0,
    poidsSortie: 0,
    clientId: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    generateBonNumber();
  }, []);

  const loadData = async () => {
    try {
      const [peseesData, clientsData, productsData] = await Promise.all([
        db.pesees.orderBy('dateHeure').reverse().limit(50).toArray(),
        db.clients.toArray(),
        db.products.toArray()
      ]);
      
      setPesees(peseesData);
      setClients(clientsData);
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const generateBonNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const time = now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0');
    
    setFormData(prev => ({
      ...prev,
      numeroBon: `${year}${month}${day}-${time}`
    }));
  };

  const handleSave = async () => {
    try {
      if (!formData.numeroBon || !formData.plaque || !formData.nomEntreprise || !formData.produitId) {
        toast({
          title: "Erreur",
          description: "Veuillez remplir tous les champs obligatoires.",
          variant: "destructive"
        });
        return;
      }

      const selectedProduct = products.find(p => p.id === formData.produitId);
      if (!selectedProduct) {
        toast({
          title: "Erreur",
          description: "Veuillez sélectionner un produit.",
          variant: "destructive"
        });
        return;
      }

      const net = Math.abs(formData.poidsEntree - formData.poidsSortie);
      const prixHT = net * selectedProduct.prixHT;
      const prixTTC = net * selectedProduct.prixTTC;

      const peseeData: Pesee = {
        ...formData,
        dateHeure: new Date(),
        net,
        prixHT,
        prixTTC,
        synchronized: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.pesees.add(peseeData);
      
      toast({
        title: "Pesée enregistrée",
        description: `Bon n°${formData.numeroBon} créé avec succès.`
      });

      // Reset form
      generateBonNumber();
      setFormData(prev => ({
        numeroBon: prev.numeroBon,
        moyenPaiement: 'Direct',
        plaque: '',
        nomEntreprise: '',
        chantier: '',
        produitId: 0,
        poidsEntree: 0,
        poidsSortie: 0,
        clientId: 0
      }));

      loadData();
    } catch (error) {
      console.error('Error saving pesee:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la pesée.",
        variant: "destructive"
      });
    }
  };

  const handlePrint = () => {
    // Simulation d'impression
    toast({
      title: "Impression",
      description: "Bon de pesée envoyé à l'imprimante."
    });
  };

  const onClientSelect = (clientId: string) => {
    const client = clients.find(c => c.id === parseInt(clientId));
    if (client) {
      setFormData(prev => ({
        ...prev,
        clientId: client.id!,
        nomEntreprise: client.raisonSociale,
        plaque: client.plaques?.[0] || '',
        chantier: client.chantiers?.[0] || ''
      }));
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center">
        <Scale className="h-8 w-8 mr-3" />
        Station de Pesée
      </h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="nouvelle">Nouvelle Pesée</TabsTrigger>
          <TabsTrigger value="recentes">Pesées Récentes</TabsTrigger>
        </TabsList>

        <TabsContent value="nouvelle">
          <Card>
            <CardHeader>
              <CardTitle>Nouvelle Pesée</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="numeroBon">Numéro de bon</Label>
                  <Input
                    id="numeroBon"
                    value={formData.numeroBon}
                    onChange={(e) => setFormData({...formData, numeroBon: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="moyenPaiement">Moyen de paiement</Label>
                  <Select value={formData.moyenPaiement} onValueChange={(value: 'Direct' | 'En compte') => setFormData({...formData, moyenPaiement: value})}>
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
                  <Label htmlFor="client">Client</Label>
                  <Select onValueChange={onClientSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id!.toString()}>
                          {client.raisonSociale}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="plaque">Plaque *</Label>
                  <Input
                    id="plaque"
                    value={formData.plaque}
                    onChange={(e) => setFormData({...formData, plaque: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="nomEntreprise">Nom entreprise *</Label>
                  <Input
                    id="nomEntreprise"
                    value={formData.nomEntreprise}
                    onChange={(e) => setFormData({...formData, nomEntreprise: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="chantier">Chantier</Label>
                  <Input
                    id="chantier"
                    value={formData.chantier}
                    onChange={(e) => setFormData({...formData, chantier: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="produit">Produit *</Label>
                  <Select value={formData.produitId.toString()} onValueChange={(value) => setFormData({...formData, produitId: parseInt(value)})}>
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
                    value={formData.poidsEntree}
                    onChange={(e) => setFormData({...formData, poidsEntree: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="poidsSortie">Poids sortie (T)</Label>
                  <Input
                    id="poidsSortie"
                    type="number"
                    step="0.01"
                    value={formData.poidsSortie}
                    onChange={(e) => setFormData({...formData, poidsSortie: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>

              {/* Calcul automatique */}
              <Card className="bg-green-50">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {Math.abs(formData.poidsEntree - formData.poidsSortie).toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600">Net (T)</div>
                    </div>
                    <div>
                      <div className="text-xl font-semibold">
                        {products.find(p => p.id === formData.produitId)?.prixHT.toFixed(2) || '0.00'}€
                      </div>
                      <div className="text-sm text-gray-600">Prix HT/T</div>
                    </div>
                    <div>
                      <div className="text-xl font-semibold text-green-600">
                        {((Math.abs(formData.poidsEntree - formData.poidsSortie)) * (products.find(p => p.id === formData.produitId)?.prixHT || 0)).toFixed(2)}€
                      </div>
                      <div className="text-sm text-gray-600">Total HT</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-green-600">
                        {((Math.abs(formData.poidsEntree - formData.poidsSortie)) * (products.find(p => p.id === formData.produitId)?.prixTTC || 0)).toFixed(2)}€
                      </div>
                      <div className="text-sm text-gray-600">Total TTC</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimer
                </Button>
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recentes">
          <div className="space-y-4">
            {pesees.map((pesee) => (
              <Card key={pesee.id}>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <div className="font-semibold">{pesee.numeroBon}</div>
                      <div className="text-sm text-gray-600">
                        {pesee.dateHeure.toLocaleDateString()} à {pesee.dateHeure.toLocaleTimeString()}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">{pesee.nomEntreprise}</div>
                      <div className="text-sm text-gray-600">Plaque: {pesee.plaque}</div>
                    </div>
                    <div>
                      <Badge variant="outline" className="mb-2">
                        {pesee.net} T
                      </Badge>
                      <div className="text-sm text-gray-600">
                        {pesee.moyenPaiement}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-green-600">
                        {pesee.prixTTC.toFixed(2)}€ TTC
                      </div>
                      <Badge variant={pesee.synchronized ? "default" : "secondary"}>
                        {pesee.synchronized ? "Synchronisé" : "En attente"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
