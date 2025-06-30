
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { db, Client } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';

export default function ClientsSpace() {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const allClients = await db.clients.toArray();
      setClients(allClients);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const filteredClients = clients.filter(client =>
    client.raisonSociale.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.plaques.some(plaque => plaque.toLowerCase().includes(searchTerm.toLowerCase())) ||
    client.chantiers.some(chantier => chantier.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setIsEditing(false);
  };

  const handleSaveClient = async (clientData: Partial<Client>) => {
    try {
      if (selectedClient?.id) {
        await db.clients.update(selectedClient.id, {
          ...clientData,
          updatedAt: new Date()
        });
        toast({
          title: "Client mis à jour",
          description: "Les modifications ont été sauvegardées."
        });
      } else {
        await db.clients.add({
          ...clientData as Client,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        toast({
          title: "Client créé",
          description: "Le nouveau client a été ajouté."
        });
      }
      loadClients();
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving client:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le client.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteClient = async (clientId: number) => {
    try {
      await db.clients.delete(clientId);
      toast({
        title: "Client supprimé",
        description: "Le client a été supprimé avec succès."
      });
      loadClients();
      setSelectedClient(null);
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le client.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Clients</h1>
        <Button onClick={() => {
          setSelectedClient(null);
          setIsEditing(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Client
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client List */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher par raison sociale, plaque ou chantier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredClients.map((client) => (
              <Card
                key={client.id}
                className={`cursor-pointer transition-colors ${
                  selectedClient?.id === client.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => handleClientSelect(client)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{client.raisonSociale}</h3>
                      <p className="text-sm text-gray-600">{client.siret}</p>
                      {client.ville && (
                        <p className="text-sm text-gray-500">{client.ville}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <Badge variant="outline">
                        {client.plaques.length} plaques
                      </Badge>
                      <Badge variant="outline">
                        {client.chantiers.length} chantiers
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Client Details/Form */}
        <div>
          <ClientForm
            client={selectedClient}
            isEditing={isEditing}
            onSave={handleSaveClient}
            onEdit={() => setIsEditing(true)}
            onCancel={() => setIsEditing(false)}
            onDelete={selectedClient ? () => handleDeleteClient(selectedClient.id!) : undefined}
          />
        </div>
      </div>
    </div>
  );
}

interface ClientFormProps {
  client: Client | null;
  isEditing: boolean;
  onSave: (client: Partial<Client>) => void;
  onEdit: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}

function ClientForm({ client, isEditing, onSave, onEdit, onCancel, onDelete }: ClientFormProps) {
  const [formData, setFormData] = useState<Partial<Client>>({
    raisonSociale: '',
    siret: '',
    telephones: [],
    plaques: [],
    chantiers: []
  });

  useEffect(() => {
    if (client) {
      setFormData(client);
    } else if (isEditing) {
      setFormData({
        raisonSociale: '',
        siret: '',
        telephones: [],
        plaques: [],
        chantiers: []
      });
    }
  }, [client, isEditing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const addArrayItem = (field: 'telephones' | 'plaques' | 'chantiers', value: string) => {
    if (value.trim()) {
      setFormData(prev => ({
        ...prev,
        [field]: [...(prev[field] || []), value.trim()]
      }));
    }
  };

  const removeArrayItem = (field: 'telephones' | 'plaques' | 'chantiers', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field]?.filter((_, i) => i !== index)
    }));
  };

  if (!client && !isEditing) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">Sélectionnez ou créez un client</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          {isEditing ? (client ? 'Modifier Client' : 'Nouveau Client') : 'Détails Client'}
          {!isEditing && client && (
            <div className="space-x-2">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
              {onDelete && (
                <Button variant="destructive" size="sm" onClick={onDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </Button>
              )}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="raisonSociale">Raison sociale *</Label>
              <Input
                id="raisonSociale"
                value={formData.raisonSociale || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, raisonSociale: e.target.value }))}
                disabled={!isEditing}
                required
              />
            </div>
            <div>
              <Label htmlFor="siret">SIRET *</Label>
              <Input
                id="siret"
                value={formData.siret || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, siret: e.target.value }))}
                disabled={!isEditing}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="adresse">Adresse</Label>
              <Input
                id="adresse"
                value={formData.adresse || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, adresse: e.target.value }))}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="ville">Ville</Label>
              <Input
                id="ville"
                value={formData.ville || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, ville: e.target.value }))}
                disabled={!isEditing}
              />
            </div>
          </div>

          {/* Array fields would be implemented here with add/remove functionality */}
          
          {isEditing && (
            <div className="flex space-x-2">
              <Button type="submit">Sauvegarder</Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Annuler
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
