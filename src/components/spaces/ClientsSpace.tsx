
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Users, Phone, Mail } from 'lucide-react';
import { db, Client } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';

export default function ClientsSpace() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<Partial<Client>>({
    raisonSociale: '',
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

  const handleSave = async () => {
    try {
      if (!formData.raisonSociale) {
        toast({
          title: "Erreur",
          description: "La raison sociale est obligatoire.",
          variant: "destructive"
        });
        return;
      }

      const clientData = {
        ...formData,
        telephones: formData.telephones || [],
        plaques: formData.plaques || [],
        chantiers: formData.chantiers || [],
        updatedAt: new Date()
      } as Client;

      if (editingClient) {
        await db.clients.update(editingClient.id!, clientData);
        toast({
          title: "Client modifié",
          description: "Les informations du client ont été mises à jour."
        });
      } else {
        await db.clients.add({
          ...clientData,
          createdAt: new Date()
        });
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
      raisonSociale: '',
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingClient ? 'Modifier le client' : 'Nouveau client'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="raisonSociale">Raison Sociale *</Label>
                <Input
                  id="raisonSociale"
                  value={formData.raisonSociale}
                  onChange={(e) => setFormData({...formData, raisonSociale: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="siret">SIRET</Label>
                <Input
                  id="siret"
                  value={formData.siret}
                  onChange={(e) => setFormData({...formData, siret: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="codeNAF">Code NAF</Label>
                <Input
                  id="codeNAF"
                  value={formData.codeNAF || ''}
                  onChange={(e) => setFormData({...formData, codeNAF: e.target.value})}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="activite">Activité</Label>
                <Input
                  id="activite"
                  value={formData.activite || ''}
                  onChange={(e) => setFormData({...formData, activite: e.target.value})}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="adresse">Adresse</Label>
                <Input
                  id="adresse"
                  value={formData.adresse || ''}
                  onChange={(e) => setFormData({...formData, adresse: e.target.value})}
                />
              </div>
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
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
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
            </div>
            <div className="flex justify-end space-x-2 mt-4">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map((client) => (
          <Card key={client.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  {client.raisonSociale}
                </span>
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
              {client.siret && (
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
                </div>
              )}
              {client.plaques && client.plaques.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {client.plaques.map((plaque, index) => (
                    <Badge key={index} variant="outline">{plaque}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {clients.length === 0 && (
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
    </div>
  );
}
