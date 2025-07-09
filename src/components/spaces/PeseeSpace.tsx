
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Scale, Save, Printer, Plus, X } from 'lucide-react';
import { db, Pesee, Client, Transporteur } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import { usePeseeData } from '@/hooks/usePeseeData';
import { useTransporteurData } from '@/hooks/useTransporteurData';
import { usePeseeTabs } from '@/hooks/usePeseeTabs';
import { PeseeFormSection } from '@/components/pesee/PeseeFormSection';
import { ProductWeightSection } from '@/components/pesee/ProductWeightSection';
import { RecentPeseesTab } from '@/components/pesee/RecentPeseesTab';
import { SaveConfirmDialog } from '@/components/pesee/SaveConfirmDialog';
import { handlePrint, handlePrintBothBonAndInvoice } from '@/utils/peseeUtils';

export default function PeseeSpace() {
  const { pesees, clients, products, loadData } = usePeseeData();
  const { transporteurs, loadTransporteurs } = useTransporteurData();
  const {
    tabs,
    activeTabId,
    setActiveTabId,
    createNewTab,
    closeTab,
    updateCurrentTab,
    getCurrentTabData,
    generateBonNumber,
    getTabLabel
  } = usePeseeTabs();

  const [showRecentTab, setShowRecentTab] = useState(false);
  const [isAddClientDialogOpen, setIsAddClientDialogOpen] = useState(false);
  const [isAddChantierDialogOpen, setIsAddChantierDialogOpen] = useState(false);
  const [isAddTransporteurDialogOpen, setIsAddTransporteurDialogOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [newChantier, setNewChantier] = useState('');
  const [newClientForm, setNewClientForm] = useState<Partial<Client>>({
    typeClient: 'particulier',
    raisonSociale: '',
    prenom: '',
    nom: '',
    siret: '',
    telephone: '',
    plaques: [],
    chantiers: [],
    transporteurId: 0,
    tarifsPreferentiels: {}
  });
  const [newTransporteurForm, setNewTransporteurForm] = useState<Partial<Transporteur>>({
    prenom: '',
    nom: '',
    siret: '',
    adresse: '',
    codePostal: '',
    ville: '',
    email: '',
    telephone: '',
    plaque: ''
  });

  const { toast } = useToast();

  const prepareNewClientForm = () => {
    const currentData = getCurrentTabData();
    if (currentData) {
      setNewClientForm({
        typeClient: currentData.typeClient || 'particulier',
        raisonSociale: currentData.nomEntreprise || '',
        prenom: currentData.typeClient === 'particulier' ? currentData.nomEntreprise || '' : '',
        nom: '',
        siret: '',
        telephone: '',
        plaques: currentData.plaque ? [currentData.plaque] : [],
        chantiers: currentData.chantier ? [currentData.chantier] : [],
        transporteurId: currentData.transporteurId || 0,
        tarifsPreferentiels: {}
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
            description: "Le prénom and le nom sont obligatoires.",
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
        telephone: newClientForm.telephone || '',
        plaques: newClientForm.plaques || [],
        chantiers: newClientForm.chantiers || [],
        transporteurId: newClientForm.transporteurId || 0,
        tarifsPreferentiels: newClientForm.tarifsPreferentiels || {},
        createdAt: new Date(),
        updatedAt: new Date()
      } as Client;

      const newClientId = await db.clients.add(clientData);
      
      updateCurrentTab({
        nomEntreprise: clientData.raisonSociale,
        clientId: newClientId as number,
        typeClient: clientData.typeClient,
        plaque: clientData.plaques?.[0] || '',
        chantier: clientData.chantiers?.[0] || '',
        transporteurId: clientData.transporteurId || 0
      });

      setIsAddClientDialogOpen(false);
      setNewClientForm({
        typeClient: 'particulier',
        raisonSociale: '',
        prenom: '',
        nom: '',
        siret: '',
        telephone: '',
        plaques: [],
        chantiers: [],
        transporteurId: 0,
        tarifsPreferentiels: {}
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

  const validateNewTransporteur = (): boolean => {
    return Boolean(newTransporteurForm.prenom && newTransporteurForm.nom);
  };

  const handleAddNewTransporteur = async () => {
    if (!validateNewTransporteur()) return;

    try {
      const transporteurData = {
        ...newTransporteurForm,
        telephone: newTransporteurForm.telephone || '',
        plaque: newTransporteurForm.plaque || '',
        createdAt: new Date(),
        updatedAt: new Date()
      } as Transporteur;

      const id = await db.transporteurs.add(transporteurData);
      await loadData();
      await loadTransporteurs();
      
      // Sélectionner le nouveau transporteur
      updateCurrentTab({ transporteurId: id as number });
      
      toast({
        title: "Transporteur créé",
        description: "Le transporteur a été créé et sélectionné avec succès."
      });
      
      setIsAddTransporteurDialogOpen(false);
      setNewTransporteurForm({
        prenom: '',
        nom: '',
        siret: '',
        adresse: '',
        codePostal: '',
        ville: '',
        email: '',
        telephone: '',
        plaque: ''
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer le transporteur.",
        variant: "destructive"
      });
    }
  };

  const handleSaveOnly = async () => {
    await savePesee();
    setIsSaveDialogOpen(false);
  };

  const handleSaveAndPrint = async () => {
    const success = await savePesee();
    if (success) {
      const currentData = getCurrentTabData();
      if (currentData) {
        handlePrint(currentData, products, transporteurs, false);
      }
    }
    setIsSaveDialogOpen(false);
  };

  const handleSavePrintBonAndInvoice = async () => {
    const success = await savePesee();
    if (success) {
      const currentData = getCurrentTabData();
      if (currentData) {
        handlePrintBothBonAndInvoice(currentData, products, transporteurs);
      }
    }
    setIsSaveDialogOpen(false);
  };

  const savePesee = async (): Promise<boolean> => {
    const currentData = getCurrentTabData();
    
    try {
      if (!currentData?.numeroBon || !currentData?.plaque || !currentData?.nomEntreprise || !currentData?.produitId) {
        toast({
          title: "Erreur",
          description: "Veuillez remplir tous les champs obligatoires.",
          variant: "destructive"
        });
        return false;
      }

      const selectedProduct = products.find(p => p.id === currentData.produitId);
      if (!selectedProduct) {
        toast({
          title: "Erreur",
          description: "Veuillez sélectionner un produit.",
          variant: "destructive"
        });
        return false;
      }

      const poidsEntree = parseFloat(currentData.poidsEntree.replace(',', '.')) || 0;
      const poidsSortie = parseFloat(currentData.poidsSortie.replace(',', '.')) || 0;
      const net = Math.abs(poidsEntree - poidsSortie);

      // Utiliser le tarif standard par défaut
      let prixHT = selectedProduct.prixHT;
      let prixTTC = selectedProduct.prixTTC;

      // Appliquer le tarif préférentiel UNIQUEMENT si :
      // 1. Un client est sélectionné (clientId existe)
      // 2. Le client existe en base de données
      // 3. Ce client a des tarifs préférentiels définis
      // 4. Ce client a un tarif préférentiel pour ce produit spécifique
      if (currentData.clientId) {
        const client = clients.find(c => c.id === currentData.clientId);
        if (client && 
            client.tarifsPreferentiels && 
            client.tarifsPreferentiels[currentData.produitId]) {
          
          const tarifPref = client.tarifsPreferentiels[currentData.produitId];
          if (tarifPref.prixHT && tarifPref.prixTTC) {
            prixHT = tarifPref.prixHT;
            prixTTC = tarifPref.prixTTC;
            console.log(`Tarif préférentiel appliqué lors de la sauvegarde pour le client ${client.raisonSociale} - Produit ${selectedProduct.nom}: ${prixHT}€ HT`);
          }
        }
      }

      const peseeData: Pesee = {
        ...currentData,
        dateHeure: new Date(),
        poidsEntree,
        poidsSortie,
        net,
        prixHT: net * prixHT,
        prixTTC: net * prixTTC,
        transporteurId: currentData.transporteurId || undefined,
        typeClient: currentData.typeClient || 'particulier',
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
        poidsEntree: '',
        poidsSortie: '',
        clientId: 0,
        transporteurId: 0,
        typeClient: 'particulier'
      });

      loadData();
      return true;
    } catch (error) {
      console.error('Error saving pesee:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la pesée.",
        variant: "destructive"
      });
      return false;
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
                {getTabLabel(tab.id)}
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
                  transporteurs={transporteurs}
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
                  isAddTransporteurDialogOpen={isAddTransporteurDialogOpen}
                  setIsAddTransporteurDialogOpen={setIsAddTransporteurDialogOpen}
                  newTransporteurForm={newTransporteurForm}
                  setNewTransporteurForm={setNewTransporteurForm}
                  handleAddNewTransporteur={handleAddNewTransporteur}
                  validateNewTransporteur={validateNewTransporteur}
                />

                <ProductWeightSection
                  currentData={tab.formData}
                  products={products}
                  updateCurrentTab={updateCurrentTab}
                />

                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      if (tab.formData) {
                        handlePrint(tab.formData, products, transporteurs, false);
                      }
                    }}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimer
                  </Button>
                  <Button onClick={() => setIsSaveDialogOpen(true)}>
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

      <SaveConfirmDialog
        isOpen={isSaveDialogOpen}
        onClose={() => setIsSaveDialogOpen(false)}
        onConfirm={handleSaveOnly}
        onConfirmAndPrint={handleSaveAndPrint}
        onConfirmPrintAndInvoice={handleSavePrintBonAndInvoice}
        moyenPaiement={currentData?.moyenPaiement || 'Direct'}
      />
    </div>
  );
}
