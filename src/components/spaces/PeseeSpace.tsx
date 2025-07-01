import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Scale, Save, Printer, Plus, X } from 'lucide-react';
import { db, Pesee, Client } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import { usePeseeData } from '@/hooks/usePeseeData';
import { usePeseeTabs } from '@/hooks/usePeseeTabs';
import { PeseeFormSection } from '@/components/pesee/PeseeFormSection';
import { ProductWeightSection } from '@/components/pesee/ProductWeightSection';
import { RecentPeseesTab } from '@/components/pesee/RecentPeseesTab';
import { handlePrint } from '@/utils/peseeUtils';

export default function PeseeSpace() {
  const { pesees, clients, products, loadData } = usePeseeData();
  const {
    tabs,
    activeTabId,
    setActiveTabId,
    createNewTab,
    closeTab,
    updateCurrentTab,
    getCurrentTabData,
    generateBonNumber
  } = usePeseeTabs();

  const [showRecentTab, setShowRecentTab] = useState(false);
  const [isAddClientDialogOpen, setIsAddClientDialogOpen] = useState(false);
  const [isAddChantierDialogOpen, setIsAddChantierDialogOpen] = useState(false);
  const [newChantier, setNewChantier] = useState('');
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

  const validateNewClient = (): boolean => {
    if (newClientForm.typeClient === 'particulier') {
      return Boolean(newClientForm.prenom && newClientForm.nom);
    } else {
      if (!newClientForm.raisonSociale) return false;
      if (newClientForm.typeClient === 'professionnel' && !newClientForm.siret) return false;
      return true;
    }
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
                <PeseeFormSection
                  currentData={tab.formData}
                  clients={clients}
                  updateCurrentTab={updateCurrentTab}
                  onAddClient={prepareNewClientForm}
                  isAddClientDialogOpen={isAddClientDialogOpen}
                  setIsAddClientDialogOpen={setIsAddClientDialogOpen}
                  newClientForm={newClientForm}
                  setNewClientForm={setNewClientForm}
                  handleAddNewClient={handleAddNewClient}
                  validateNewClient={validateNewClient}
                  isAddChantierDialogOpen={isAddChantierDialogOpen}
                  setIsAddChantierDialogOpen={setIsAddChantierDialogOpen}
                  newChantier={newChantier}
                  setNewChantier={setNewChantier}
                  handleAddChantier={handleAddChantier}
                />

                <ProductWeightSection
                  currentData={tab.formData}
                  products={products}
                  updateCurrentTab={updateCurrentTab}
                />

                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => handlePrint(tab.formData, products)}
                  >
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
          <RecentPeseesTab pesees={pesees} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
