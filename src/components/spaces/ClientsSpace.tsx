import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Edit, Plus, Search, Trash2, User, Building, Briefcase } from 'lucide-react';
import { Client, db, Transporteur } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import ClientForm from '@/components/forms/ClientForm';

export default function ClientsSpace() {
  const [clients, setClients] = useState<Client[]>([]);
  const [transporteurs, setTransporteurs] = useState<Transporteur[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<Partial<Client>>({
    typeClient: 'particulier',
    prenom: '',
    nom: '',
    raisonSociale: '',
    siret: '',
    codeNAF: '',
    activite: '',
    adresse: '',
    codePostal: '',
    ville: '',
    representantLegal: '',
    telephone: '',
    email: '',
    plaque: '',
    chantiers: []
  });
  const { toast } = useToast();

  useEffect(() => {
    loadClients();
    loadTransporteurs();
  }, []);

  const loadClients = async () => {
    try {
      const clientsData = await db.clients.orderBy('createdAt').reverse().toArray();
      setClients(clientsData);
    } catch (error) {
      console.error('Erreur lors du chargement des clients:', error);
    }
  };

  const loadTransporteurs = async () => {
    try {
      const transporteursData = await db.transporteurs.orderBy('createdAt').reverse().toArray();
      setTransporteurs(transporteursData);
    } catch (error) {
      console.error('Erreur lors du chargement des transporteurs:', error);
    }
  };

  const filteredClients = clients.filter(client =>
    client.raisonSociale.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.siret?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.adresse?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.ville?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.plaque?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.telephone?.includes(searchTerm) ||
    client.chantiers.some(chantier => chantier.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
        telephone: formData.telephone || '',
        plaque: formData.plaque || '',
        chantiers: formData.chantiers || []
      };

      if (selectedClient) {
        await db.clients.update(selectedClient.id!, {
          ...clientData,
          updatedAt: new Date()
        });
        toast({
          title: "Succès",
          description: "Client modifié avec succès."
        });
      } else {
        await db.clients.add({
          ...clientData,
          createdAt: new Date(),
          updatedAt: new Date()
        } as Client);
        toast({
          title: "Succès",
          description: "Client créé avec succès."
        });
      }

      loadClients();
      resetForm();
      setIsCreateDialogOpen(false);
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de la sauvegarde.",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      typeClient: 'particulier',
      prenom: '',
      nom: '',
      raisonSociale: '',
      siret: '',
      codeNAF: '',
      activite: '',
      adresse: '',
      codePostal: '',
      ville: '',
      representantLegal: '',
      telephone: '',
      email: '',
      plaque: '',
      chantiers: []
    });
    setSelectedClient(null);
  };

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setFormData({
      ...client,
      chantiers: client.chantiers || []
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (client: Client) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      try {
        await db.clients.delete(client.id!);
        toast({
          title: "Succès",
          description: "Client supprimé avec succès."
        });
        loadClients();
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        toast({
          title: "Erreur",
          description: "Une erreur s'est produite lors de la suppression.",
          variant: "destructive"
        });
      }
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestion des Clients</h2>
          <p className="text-muted-foreground">Gérez vos clients particuliers et professionnels</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouveau client</DialogTitle>
            </DialogHeader>
            <ClientForm 
              formData={formData} 
              onFormDataChange={setFormData}
              transporteurs={transporteurs}
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSave}>
                Créer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rechercher des clients</CardTitle>
          <CardDescription>Recherchez par nom, SIRET, email, adresse ou plaque</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clients ({filteredClients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Raison Sociale</TableHead>
                <TableHead>SIRET</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>Plaque</TableHead>
                <TableHead>Transporteur</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => {
                const transporteur = transporteurs.find(t => t.id === client.transporteurId);
                return (
                  <TableRow key={client.id}>
                    <TableCell>{getClientTypeBadge(client.typeClient)}</TableCell>
                    <TableCell>{client.raisonSociale}</TableCell>
                    <TableCell>{client.siret}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {client.telephone && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{client.telephone}</span>
                          </div>
                        )}
                        {client.email && (
                          <div className="text-sm text-muted-foreground">{client.email}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {client.adresse && <div>{client.adresse}</div>}
                        {client.codePostal && client.ville && (
                          <div className="text-muted-foreground">{client.codePostal} {client.ville}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.plaque && (
                        <Badge variant="outline" className="font-mono">
                          {client.plaque}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {transporteur && (
                        <Badge variant="secondary">
                          {transporteur.prenom} {transporteur.nom}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(client)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(client)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le client</DialogTitle>
          </DialogHeader>
          <ClientForm 
            formData={formData} 
            onFormDataChange={setFormData}
            isEditing={true}
            transporteurs={transporteurs}
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave}>
              Sauvegarder
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}