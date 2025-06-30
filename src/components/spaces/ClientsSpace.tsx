
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Users, Phone, Mail, Search, Filter } from 'lucide-react';
import { db, Client } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';

export default function ClientsSpace() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'particulier' | 'professionnel' | 'micro-entreprise'>('all');
  const [formData, setFormData] = useState<Partial<Client>>({
    typeClient: 'particulier',
    raisonSociale: '',
    prenom: '',
    nom: '',
    siret: '',
    codeNAF: '',
    activite: '',
    adresse: '',
    codePostal: '',
    ville: '',
    representantLegal: '',
    telephones: [],
    email: '',
    plaques: [],
    chantiers: []
  });
  const { toast } = useToast();

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const clientsData = await db.clients.toArray();
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchesSearch = searchTerm === '' || 
        client.raisonSociale.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.siret?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.ville?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.plaques.some(plaque => plaque.toLowerCase().includes(searchTerm.toLowerCase())) ||
        client.telephones.some(tel => tel.includes(searchTerm));
      
      const matchesType = typeFilter === 'all' || client.typeClient === typeFilter;
      
      return matchesSearch && matchesType;
    });
  }, [clients, searchTerm, typeFilter]);

  const validateForm = () => {
    if (!formData.typeClient) {
      toast({
        title: "Erreur",
        description: "Le type de client est obligatoire.",
        variant: "destructive"
      });
      return false;
    }

    if (formData.typeClient === 'particulier') {
      if (!formData.prenom || !formData.nom) {
        toast({
          title: "Erreur",
          description: "Le prénom et le nom sont obligatoires pour un particulier.",
          variant: "destructive"
        });
        return false;
      }
    } else {
      if (!formData.raisonSociale) {
        toast({
          title: "Erreur",
          description: "La raison sociale est obligatoire.",
          variant: "destructive"
        });
        return false;
      }
      if (formData.typeClient === 'professionnel' && !formData.siret) {
        toast({
          title: "Erreur",
          description: "Le SIRET est obligatoire pour un professionnel.",
          variant: "destructive"
        });
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      const clientData = {
        ...formData,
        raisonSociale: formData.typeClient === 'particulier' 
          ? `${formData.prenom} ${formData.nom}` 
          : formData.raisonSociale,
        telephones: formData.telephones || [],
        plaques: formData.plaques || [],
        chantiers: formData.chantiers || [],
        updatedAt: new Date()
      };

      if (editingClient && editingClient.id) {
        await db.clients.update(editingClient.id, clientData);
        toast({
          title: "Client modifié",
          description: "Les informations du client ont été mises à jour."
        });
      } else {
        await db.clients.add({
          ...clientData,
          createdAt: new Date()
        } as Client);
        toast({
          title: "Client ajouté",
          description: "Le nouveau client a été créé avec succès."
        });
      }

      setIsDialogOpen(false);
      setEditingClient(null);
      resetForm();
      loadClients();
    } catch (error) {
      console.error('Error saving client:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le client.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (client: Client) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le client "${client.raisonSociale}" ?`)) {
      try {
        await db.clients.delete(client.id!);
        toast({
          title: "Client supprimé",
          description: "Le client a été supprimé avec succès."
        });
        loadClients();
      } catch (error) {
        console.error('Error deleting client:', error);
        toast({
          title: "Erreur",
          description: "Impossible de supprimer le client.",
          variant: "destructive"
        });
      }
    }
  };

  const resetForm = () => {
    setFormData({
      typeClient: 'particulier',
      raisonSociale: '',
      prenom: '',
      nom: '',
      siret: '',
      codeNAF: '',
      activite: '',
      adresse: '',
      codePostal: '',
      ville: '',
      representantLegal: '',
      telephones: [],
      email: '',
      plaques: [],
      chantiers: []
    });
  };

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    setFormData(client);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingClient(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const getClientBadge = (type: string) => {
    switch (type) {
      case 'particulier':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Particulier</Badge>;
      case 'professionnel':
        return <Badge variant="default" className="bg-green-100 text-green-800">Professionnel</Badge>;
      case 'micro-entreprise':
        return <Badge variant="outline" className="bg-orange-100 text-orange-800">Micro-entreprise</Badge>;
      default:
        return <Badge variant="secondary">Non défini</Badge>;
    }
  };

  const addTelephone = () => {
    setFormData({
      ...formData,
      telephones: [...(formData.telephones || []), '']
    });
  };

  const updateTelephone = (index: number, value: string) => {
    const newTelephones = [...(formData.telephones || [])];
    newTelephones[index] = value;
    setFormData({
      ...formData,
      telephones: newTelephones
    });
  };

  const removeTelephone = (index: number) => {
    const newTelephones = formData.telephones?.filter((_, i) => i !== index) || [];
    setFormData({
      ...formData,
      telephones: newTelephones
    });
  };

  const addPlaque = () => {
    setFormData({
      ...formData,
      plaques: [...(formData.plaques || []), '']
    });
  };

  const updatePlaque = (index: number, value: string) => {
    const newPlaques = [...(formData.plaques || [])];
    newPlaques[index] = value;
    setFormData({
      ...formData,
      plaques: newPlaques
    });
  };

  const removePlaque = (index: number) => {
    const newPlaques = formData.plaques?.filter((_, i) => i !== index) || [];
    setFormData({
      ...formData,
      plaques: newPlaques
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gestion des Clients</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingClient ? 'Modifier le client' : 'Nouveau client'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <Label htmlFor="typeClient">Type de client *</Label>
                <Select 
                  value={formData.typeClient} 
                  onValueChange={(value: 'particulier' | 'professionnel' | 'micro-entreprise') => 
                    setFormData({...formData, typeClient: value})
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="particulier">Particulier</SelectItem>
                    <SelectItem value="professionnel">Professionnel</SelectItem>
                    <SelectItem value="micro-entreprise">Micro-entreprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.typeClient === 'particulier' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="prenom">Prénom *</Label>
                    <Input
                      id="prenom"
                      value={formData.prenom || ''}
                      onChange={(e) => setFormData({...formData, prenom: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="nom">Nom *</Label>
                    <Input
                      id="nom"
                      value={formData.nom || ''}
                      onChange={(e) => setFormData({...formData, nom: e.target.value})}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <Label htmlFor="raisonSociale">Raison Sociale *</Label>
                  <Input
                    id="raisonSociale"
                    value={formData.raisonSociale || ''}
                    onChange={(e) => setFormData({...formData, raisonSociale: e.target.value})}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="siret">
                    SIRET {formData.typeClient === 'professionnel' ? '*' : '(optionnel)'}
                  </Label>
                  <Input
                    id="siret"
                    value={formData.siret || ''}
                    onChange={(e) => setFormData({...formData, siret: e.target.value})}
                  />
                </div>
                {formData.typeClient !== 'particulier' && (
                  <div>
                    <Label htmlFor="codeNAF">Code NAF</Label>
                    <Input
                      id="codeNAF"
                      value={formData.codeNAF || ''}
                      onChange={(e) => setFormData({...formData, codeNAF: e.target.value})}
                    />
                  </div>
                )}
              </div>

              {formData.typeClient !== 'particulier' && (
                <>
                  <div>
                    <Label htmlFor="activite">Activité</Label>
                    <Input
                      id="activite"
                      value={formData.activite || ''}
                      onChange={(e) => setFormData({...formData, activite: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="representantLegal">Représentant Légal</Label>
                    <Input
                      id="representantLegal"
                      value={formData.representantLegal || ''}
                      onChange={(e) => setFormData({...formData, representantLegal: e.target.value})}
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="adresse">Adresse</Label>
                  <Input
                    id="adresse"
                    value={formData.adresse || ''}
                    onChange={(e) => setFormData({...formData, adresse: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="codePostal">Code Postal</Label>
                    <Input
                      id="codePostal"
                      value={formData.codePostal || ''}
                      onChange={(e) => setFormData({...formData, codePostal: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="ville">Ville</Label>
                    <Input
                      id="ville"
                      value={formData.ville || ''}
                      onChange={(e) => setFormData({...formData, ville: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Téléphones</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addTelephone}>
                    <Plus className="h-3 w-3 mr-1" />
                    Ajouter
                  </Button>
                </div>
                {formData.telephones?.map((tel, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Input
                      value={tel}
                      onChange={(e) => updateTelephone(index, e.target.value)}
                      placeholder="Numéro de téléphone"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => removeTelephone(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Plaques d'immatriculation</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addPlaque}>
                    <Plus className="h-3 w-3 mr-1" />
                    Ajouter
                  </Button>
                </div>
                {formData.plaques?.map((plaque, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Input
                      value={plaque}
                      onChange={(e) => updatePlaque(index, e.target.value)}
                      placeholder="Plaque d'immatriculation"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => removePlaque(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSave}>
                {editingClient ? 'Modifier' : 'Créer'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Rechercher par nom, SIRET, email, téléphone, plaque..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="particulier">Particuliers</SelectItem>
              <SelectItem value="professionnel">Professionnels</SelectItem>
              <SelectItem value="micro-entreprise">Micro-entreprises</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map((client) => (
          <Card key={client.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    {client.raisonSociale}
                  </span>
                  <div className="mt-2">
                    {getClientBadge(client.typeClient)}
                  </div>
                </div>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(client)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(client)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {client.siret && client.siret !== '00000000000000' && (
                <div className="text-sm">
                  <strong>SIRET:</strong> {client.siret}
                </div>
              )}
              {client.adresse && (
                <div className="text-sm">
                  <strong>Adresse:</strong> {client.adresse}
                  {client.codePostal && client.ville && `, ${client.codePostal} ${client.ville}`}
                </div>
              )}
              {client.email && (
                <div className="flex items-center text-sm">
                  <Mail className="h-3 w-3 mr-1" />
                  {client.email}
                </div>
              )}
              {client.telephones && client.telephones.length > 0 && (
                <div className="flex items-center text-sm">
                  <Phone className="h-3 w-3 mr-1" />
                  {client.telephones[0]}
                  {client.telephones.length > 1 && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      +{client.telephones.length - 1}
                    </Badge>
                  )}
                </div>
              )}
              {client.plaques && client.plaques.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {client.plaques.map((plaque, index) => (
                    <Badge key={index} variant="outline" className="text-xs">{plaque}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredClients.length === 0 && searchTerm === '' && typeFilter === 'all' && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Aucun client</h3>
          <p className="text-gray-500 mb-4">Commencez par ajouter votre premier client.</p>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un client
          </Button>
        </div>
      )}

      {filteredClients.length === 0 && (searchTerm !== '' || typeFilter !== 'all') && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Aucun résultat</h3>
          <p className="text-gray-500">Aucun client ne correspond à vos critères de recherche.</p>
        </div>
      )}
    </div>
  );
}
