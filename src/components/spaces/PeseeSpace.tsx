import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Scale, Save, Printer, Plus, Edit, Trash2, X, UserPlus, Building, User, Briefcase, Check } from 'lucide-react';
import { db, Pesee, Client, Product } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import ClientForm from '@/components/forms/ClientForm';

interface PeseeTab {
  id: string;
  label: string;
  formData: {
    numeroBon: string;
    moyenPaiement: 'Direct' | 'En compte';
    plaque: string;
    nomEntreprise: string;
    chantier: string;
    produitId: number;
    poidsEntree: number;
    poidsSortie: number;
    clientId: number;
  };
}

interface PlaqueMatch {
  client: Client;
  plaque: string;
}

export default function PeseeSpace() {
  const [pesees, setPesees] = useState<Pesee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tabs, setTabs] = useState<PeseeTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [showRecentTab, setShowRecentTab] = useState(false);
  const [isAddClientDialogOpen, setIsAddClientDialogOpen] = useState(false);
  const [isAddChantierDialogOpen, setIsAddChantierDialogOpen] = useState(false);
  const [plaqueMatches, setPlaqueMatches] = useState<PlaqueMatch[]>([]);
  const [showPlaqueMatches, setShowPlaqueMatches] = useState(false);
  const [chantierMatches, setChantierMatches] = useState<string[]>([]);
  const [showChantierMatches, setShowChantierMatches] = useState(false);
  const [newChantier, setNewChantier] = useState('');
  
  // Formulaire pour nouveau client - avec réutilisation des champs
  const [newClientForm, setNewClientForm] = useState<Partial<Client>>({
    typeClient: 'particulier',
    raisonSociale: '',
    prenom: '',
    nom: '',
    siret: '',
    telephones: [],
    plaques: [],
    chantiers: []
  });

  const { toast } = useToast();

  useEffect(() => {
    loadData();
    loadTabsFromStorage();
  }, []);

  useEffect(() => {
    saveTabsToStorage();
  }, [tabs, activeTabId]);

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

  const saveTabsToStorage = () => {
    localStorage.setItem('pesee-tabs', JSON.stringify({ tabs, activeTabId }));
  };

  const loadTabsFromStorage = () => {
    const stored = localStorage.getItem('pesee-tabs');
    if (stored) {
      const { tabs: storedTabs, activeTabId: storedActiveId } = JSON.parse(stored);
      if (storedTabs.length > 0) {
        setTabs(storedTabs);
        setActiveTabId(storedActiveId || storedTabs[0].id);
        return;
      }
    }
    createNewTab();
  };

  const generateBonNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const time = now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0');
    return `${year}${month}${day}-${time}`;
  };

  const createNewTab = () => {
    const newTabId = Date.now().toString();
    const newTab: PeseeTab = {
      id: newTabId,
      label: `Pesée ${tabs.length + 1}`,
      formData: {
        numeroBon: generateBonNumber(),
        moyenPaiement: 'Direct',
        plaque: '',
        nomEntreprise: '',
        chantier: '',
        produitId: 0,
        poidsEntree: 0,
        poidsSortie: 0,
        clientId: 0
      }
    };
    
    setTabs([...tabs, newTab]);
    setActiveTabId(newTabId);
  };

  const closeTab = (tabId: string) => {
    const newTabs = tabs.filter(tab => tab.id !== tabId);
    setTabs(newTabs);
    
    if (activeTabId === tabId) {
      if (newTabs.length > 0) {
        setActiveTabId(newTabs[0].id);
      } else {
        createNewTab();
      }
    }
  };

  const updateCurrentTab = (updates: Partial<PeseeTab['formData']>) => {
    setTabs(tabs.map(tab => 
      tab.id === activeTabId 
        ? { ...tab, formData: { ...tab.formData, ...updates } }
        : tab
    ));
  };

  const getCurrentTabData = () => {
    return tabs.find(tab => tab.id === activeTabId)?.formData || tabs[0]?.formData;
  };

  // Amélioration de la gestion des plaques avec interface plus user-friendly
  const handlePlaqueChange = (plaque: string) => {
    updateCurrentTab({ plaque });
    
    if (plaque.length > 1) {
      const matches: PlaqueMatch[] = [];
      clients.forEach(client => {
        client.plaques.forEach(clientPlaque => {
          if (clientPlaque.toLowerCase().includes(plaque.toLowerCase())) {
            matches.push({ client, plaque: clientPlaque });
          }
        });
      });
      setPlaqueMatches(matches);
      setShowPlaqueMatches(matches.length > 0);
    } else {
      setShowPlaqueMatches(false);
    }
  };

  const selectPlaqueMatch = (match: PlaqueMatch) => {
    updateCurrentTab({
      plaque: match.plaque,
      nomEntreprise: match.client.raisonSociale,
      clientId: match.client.id!,
      chantier: match.client.chantiers?.[0] || ''
    });
    setShowPlaqueMatches(false);
  };

  const handleChantierChange = (chantier: string) => {
    updateCurrentTab({ chantier });
    
    if (chantier.length > 1) {
      const currentData = getCurrentTabData();
      let chantiersToSearch: string[] = [];
      
      if (currentData?.clientId) {
        // Si un client est sélectionné, chercher dans ses chantiers
        const client = clients.find(c => c.id === currentData.clientId);
        chantiersToSearch = client?.chantiers || [];
      } else {
        // Sinon chercher dans tous les chantiers
        const allChantiers = clients.flatMap(client => client.chantiers || []);
        chantiersToSearch = [...new Set(allChantiers)];
      }
      
      const matches = chantiersToSearch.filter(c => 
        c.toLowerCase().includes(chantier.toLowerCase())
      );
      setChantierMatches(matches);
      setShowChantierMatches(matches.length > 0);
    } else {
      setShowChantierMatches(false);
    }
  };

  const selectChantierMatch = (chantier: string) => {
    updateCurrentTab({ chantier });
    setShowChantierMatches(false);
  };

  const handleAddChantier = async () => {
    const currentData = getCurrentTabData();
    if (!currentData?.clientId || !newChantier.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un client et saisir un nom de chantier.",
        variant: "destructive"
      });
      return;
    }

    try {
      const client = clients.find(c => c.id === currentData.clientId);
      if (client) {
        const updatedChantiers = [...(client.chantiers || []), newChantier.trim()];
        await db.clients.update(client.id!, { chantiers: updatedChantiers });
        
        updateCurrentTab({ chantier: newChantier.trim() });
        setNewChantier('');
        setIsAddChantierDialogOpen(false);
        
        toast({
          title: "Chantier ajouté",
          description: "Le nouveau chantier a été ajouté au client."
        });
        
        loadData();
      }
    } catch (error) {
      console.error('Error adding chantier:', error);
    }
  };

  // Fonction pour pré-remplir le formulaire nouveau client avec les données actuelles
  const prepareNewClientForm = () => {
    const currentData = getCurrentTabData();
    if (currentData) {
      setNewClientForm({
        typeClient: 'particulier',
        raisonSociale: currentData.nomEntreprise || '',
        prenom: '',
        nom: '',
        siret: '',
        telephones: [],
        plaques: currentData.plaque ? [currentData.plaque] : [],
        chantiers: currentData.chantier ? [currentData.chantier] : []
      });
    }
    setIsAddClientDialogOpen(true);
  };

  const handleSave = async () => {
    const currentData = getCurrentTabData();
    
    try {
      if (!currentData?.numeroBon || !currentData?.plaque || !currentData?.nomEntreprise || !currentData?.produitId) {
        toast({
          title: "Erreur",
          description: "Veuillez remplir tous les champs obligatoires.",
          variant: "destructive"
        });
        return;
      }

      const selectedProduct = products.find(p => p.id === currentData.produitId);
      if (!selectedProduct) {
        toast({
          title: "Erreur",
          description: "Veuillez sélectionner un produit.",
          variant: "destructive"
        });
        return;
      }

      const net = Math.abs(currentData.poidsEntree - currentData.poidsSortie);
      const prixHT = net * selectedProduct.prixHT;
      const prixTTC = net * selectedProduct.prixTTC;

      const peseeData: Pesee = {
        ...currentData,
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
        description: `Bon n°${currentData.numeroBon} créé avec succès.`
      });

      updateCurrentTab({
        numeroBon: generateBonNumber(),
        moyenPaiement: 'Direct',
        plaque: '',
        nomEntreprise: '',
        chantier: '',
        produitId: 0,
        poidsEntree: 0,
        poidsSortie: 0,
        clientId: 0
      });

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
    const currentData = getCurrentTabData();
    if (!currentData) return;

    const printContent = generatePrintContent(currentData);
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
    
    toast({
      title: "Impression",
      description: "Document envoyé à l'imprimante."
    });
  };

  const generatePrintContent = (formData: any) => {
    const selectedProduct = products.find(p => p.id === formData.produitId);
    const net = Math.abs(formData.poidsEntree - formData.poidsSortie);
    const prixHT = net * (selectedProduct?.prixHT || 0);
    const prixTTC = net * (selectedProduct?.prixTTC || 0);
    
    const bonContent = `
      <div class="bon">
        <div class="header">
          <h2>BON DE PESÉE</h2>
          <p>N° ${formData.numeroBon}</p>
        </div>
        <div class="row">
          <span class="label">Date:</span>
          <span>${new Date().toLocaleDateString()}</span>
        </div>
        <div class="row">
          <span class="label">Entreprise:</span>
          <span>${formData.nomEntreprise}</span>
        </div>
        <div class="row">
          <span class="label">Plaque:</span>
          <span>${formData.plaque}</span>
        </div>
        <div class="row">
          <span class="label">Chantier:</span>
          <span>${formData.chantier}</span>
        </div>
        <div class="row">
          <span class="label">Produit:</span>
          <span>${selectedProduct?.nom || 'Non défini'}</span>
        </div>
        <div class="row">
          <span class="label">Poids Net:</span>
          <span>${net.toFixed(2)} T</span>
        </div>
        <div class="total">
          <strong>Total HT: ${prixHT.toFixed(2)}€</strong><br>
          <strong>Total TTC: ${prixTTC.toFixed(2)}€</strong>
        </div>
      </div>
    `;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bon de pesée</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .bon { border: 2px solid #000; padding: 20px; margin-bottom: 20px; width: calc(50% - 40px); float: left; box-sizing: border-box; }
          .header { text-align: center; margin-bottom: 20px; }
          .row { display: flex; justify-content: space-between; margin: 8px 0; }
          .label { font-weight: bold; }
          .total { background: #f0f0f0; padding: 10px; margin-top: 15px; text-align: center; }
          @media print { 
            @page { size: A5 landscape; margin: 10mm; } 
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        ${bonContent}
        ${formData.moyenPaiement === 'Direct' ? bonContent : ''}
      </body>
      </html>
    `;
  };

  const handleAddNewClient = async () => {
    try {
      if (newClientForm.typeClient === 'particulier') {
        if (!newClientForm.prenom || !newClientForm.nom) {
          toast({
            title: "Erreur",
            description: "Le prénom et le nom sont obligatoires.",
            variant: "destructive"
          });
          return;
        }
      } else {
        if (!newClientForm.raisonSociale) {
          toast({
            title: "Erreur",
            description: "La raison sociale est obligatoire.",
            variant: "destructive"
          });
          return;
        }
      }

      const clientData = {
        ...newClientForm,
        raisonSociale: newClientForm.typeClient === 'particulier' 
          ? `${newClientForm.prenom} ${newClientForm.nom}` 
          : newClientForm.raisonSociale,
        telephones: newClientForm.telephones || [],
        plaques: newClientForm.plaques || [],
        chantiers: newClientForm.chantiers || [],
        createdAt: new Date(),
        updatedAt: new Date()
      } as Client;

      const newClientId = await db.clients.add(clientData);
      
      updateCurrentTab({
        nomEntreprise: clientData.raisonSociale,
        clientId: newClientId as number,
        plaque: clientData.plaques?.[0] || '',
        chantier: clientData.chantiers?.[0] || ''
      });

      setIsAddClientDialogOpen(false);
      setNewClientForm({
        typeClient: 'particulier',
        raisonSociale: '',
        prenom: '',
        nom: '',
        siret: '',
        telephones: [],
        plaques: [],
        chantiers: []
      });
      
      toast({
        title: "Client ajouté",
        description: "Le nouveau client a été créé et sélectionné."
      });

      loadData();
    } catch (error) {
      console.error('Error adding client:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le client.",
        variant: "destructive"
      });
    }
  };

  const validateNewClient = () => {
    if (newClientForm.typeClient === 'particulier') {
      return newClientForm.prenom && newClientForm.nom;
    } else {
      if (!newClientForm.raisonSociale) return false;
      if (newClientForm.typeClient === 'professionnel' && !newClientForm.siret) return false;
      return true;
    }
  };

  const getClientTypeIcon = (type: string) => {
    switch (type) {
      case 'particulier':
        return <User className="h-4 w-4" />;
      case 'professionnel':
        return <Building className="h-4 w-4" />;
      case 'micro-entreprise':
        return <Briefcase className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getClientTypeBadge = (type: string) => {
    const variants = {
      'particulier': 'secondary',
      'professionnel': 'default',
      'micro-entreprise': 'outline'
    } as const;
    
    return (
      <Badge variant={variants[type as keyof typeof variants] || 'secondary'} className="flex items-center gap-1">
        {getClientTypeIcon(type)}
        {type === 'particulier' ? 'Particulier' : 
         type === 'professionnel' ? 'Professionnel' : 
         'Micro-entreprise'}
      </Badge>
    );
  };

  const currentData = getCurrentTabData();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center">
        <Scale className="h-8 w-8 mr-3" />
        Station de Pesée
      </h1>

      <Tabs value={showRecentTab ? 'recentes' : activeTabId} onValueChange={(value) => {
        if (value === 'recentes') {
          setShowRecentTab(true);
        } else {
          setShowRecentTab(false);
          setActiveTabId(value);
        }
      }}>
        <div className="flex items-center justify-between">
          <TabsList className="flex-1">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="relative group">
                {tab.label}
                {tabs.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </TabsTrigger>
            ))}
            <TabsTrigger value="recentes">Pesées Récentes</TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" onClick={createNewTab}>
            <Plus className="h-4 w-4 mr-1" />
            Nouvel onglet
          </Button>
        </div>

        {tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id}>
            <Card>
              <CardHeader>
                <CardTitle>Nouvelle Pesée - {tab.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="numeroBon">Numéro de bon</Label>
                    <Input
                      id="numeroBon"
                      value={tab.formData.numeroBon}
                      onChange={(e) => updateCurrentTab({ numeroBon: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="moyenPaiement">Moyen de paiement</Label>
                    <Select 
                      value={tab.formData.moyenPaiement} 
                      onValueChange={(value: 'Direct' | 'En compte') => updateCurrentTab({ moyenPaiement: value })}
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
                    <Label htmlFor="client">Client existant</Label>
                    <Select onValueChange={(clientId) => {
                      const client = clients.find(c => c.id === parseInt(clientId));
                      if (client) {
                        updateCurrentTab({
                          clientId: client.id!,
                          nomEntreprise: client.raisonSociale,
                          plaque: client.plaques?.[0] || '',
                          chantier: client.chantiers?.[0] || ''
                        });
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id!.toString()}>
                            <div className="flex items-center gap-2">
                              {getClientTypeIcon(client.typeClient)}
                              {client.raisonSociale}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <Label htmlFor="plaque">Plaque *</Label>
                    <Input
                      id="plaque"
                      value={tab.formData.plaque}
                      onChange={(e) => handlePlaqueChange(e.target.value)}
                      placeholder="Saisir une plaque..."
                    />
                    {showPlaqueMatches && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                        {plaqueMatches.map((match, index) => (
                          <div 
                            key={index} 
                            className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            onClick={() => selectPlaqueMatch(match)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-sm">{match.client.raisonSociale}</div>
                                <div className="text-xs text-gray-500 flex items-center gap-2">
                                  {getClientTypeBadge(match.client.typeClient)}
                                  <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                                    {match.plaque}
                                  </span>
                                </div>
                                {match.client.chantiers && match.client.chantiers.length > 0 && (
                                  <div className="text-xs text-gray-400 mt-1">
                                    Chantiers: {match.client.chantiers.slice(0, 2).join(', ')}
                                    {match.client.chantiers.length > 2 && '...'}
                                  </div>
                                )}
                              </div>
                              <Check className="h-4 w-4 text-green-500" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="nomEntreprise">Nom entreprise *</Label>
                    <Input
                      id="nomEntreprise"
                      value={tab.formData.nomEntreprise}
                      onChange={(e) => updateCurrentTab({ nomEntreprise: e.target.value })}
                      placeholder="Nom de l'entreprise..."
                    />
                  </div>
                  <div className="relative">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Label htmlFor="chantier">Chantier</Label>
                        <Input
                          id="chantier"
                          value={tab.formData.chantier}
                          onChange={(e) => handleChantierChange(e.target.value)}
                          placeholder="Nom du chantier..."
                        />
                      </div>
                      <Dialog open={isAddChantierDialogOpen} onOpenChange={setIsAddChantierDialogOpen}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="mt-6"
                            disabled={!tab.formData.clientId}
                            title="Ajouter un nouveau chantier"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Ajouter un nouveau chantier</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Nom du chantier</Label>
                              <Input
                                value={newChantier}
                                onChange={(e) => setNewChantier(e.target.value)}
                                placeholder="Nom du nouveau chantier"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => setIsAddChantierDialogOpen(false)}>
                              Annuler
                            </Button>
                            <Button onClick={handleAddChantier}>
                              Ajouter
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    {showChantierMatches && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                        {chantierMatches.map((chantier, index) => (
                          <button
                            key={index}
                            className="block w-full text-left text-sm text-gray-600 hover:bg-gray-100 p-3 rounded border-b last:border-b-0"
                            onClick={() => selectChantierMatch(chantier)}
                          >
                            <div className="flex items-center justify-between">
                              <span>{chantier}</span>
                              <Check className="h-4 w-4 text-green-500" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-center">
                  <Dialog open={isAddClientDialogOpen} onOpenChange={setIsAddClientDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" onClick={prepareNewClientForm}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Ajouter nouveau client
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Nouveau Client</DialogTitle>
                      </DialogHeader>
                      <ClientForm 
                        formData={newClientForm} 
                        onFormDataChange={setNewClientForm} 
                      />
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setIsAddClientDialogOpen(false)}>
                          Annuler
                        </Button>
                        <Button 
                          onClick={handleAddNewClient}
                          disabled={!validateNewClient()}
                        >
                          Créer et sélectionner
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="produit">Produit *</Label>
                    <Select 
                      value={tab.formData.produitId.toString()} 
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
                      value={tab.formData.poidsEntree}
                      onChange={(e) => updateCurrentTab({ poidsEntree: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="poidsSortie">Poids sortie (T)</Label>
                    <Input
                      id="poidsSortie"
                      type="number"
                      step="0.01"
                      value={tab.formData.poidsSortie}
                      onChange={(e) => updateCurrentTab({ poidsSortie: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <Card className="bg-green-50">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {Math.abs(tab.formData.poidsEntree - tab.formData.poidsSortie).toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-600">Net (T)</div>
                      </div>
                      <div>
                        <div className="text-xl font-semibold">
                          {products.find(p => p.id === tab.formData.produitId)?.prixHT.toFixed(2) || '0.00'}€
                        </div>
                        <div className="text-sm text-gray-600">Prix HT/T</div>
                      </div>
                      <div>
                        <div className="text-xl font-semibold text-green-600">
                          {((Math.abs(tab.formData.poidsEntree - tab.formData.poidsSortie)) * (products.find(p => p.id === tab.formData.produitId)?.prixHT || 0)).toFixed(2)}€
                        </div>
                        <div className="text-sm text-gray-600">Total HT</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-green-600">
                          {((Math.abs(tab.formData.poidsEntree - tab.formData.poidsSortie)) * (products.find(p => p.id === tab.formData.produitId)?.prixTTC || 0)).toFixed(2)}€
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
        ))}

        <TabsContent value="recentes">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Pesées récentes</h3>
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
