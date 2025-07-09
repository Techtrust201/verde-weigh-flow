
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Truck, Plus, Edit, Trash2, Search } from 'lucide-react';
import { db, Transporteur } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import { useTransporteurData } from '@/hooks/useTransporteurData';
import TransporteurForm from '@/components/forms/TransporteurForm';

export default function TransporteursSpace() {
  const { transporteurs, loadTransporteurs } = useTransporteurData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTransporteur, setEditingTransporteur] = useState<Transporteur | null>(null);
  const [formData, setFormData] = useState<Partial<Transporteur>>({
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

  const filteredTransporteurs = transporteurs.filter(transporteur =>
    transporteur.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transporteur.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transporteur.siret?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.prenom || !formData.nom) {
      toast({
        title: "Erreur",
        description: "Le prénom et le nom sont obligatoires.",
        variant: "destructive"
      });
      return;
    }

    try {
      const transporteurData = {
        ...formData,
        telephone: formData.telephone || '',
        plaque: formData.plaque || '',
        updatedAt: new Date()
      };

      if (editingTransporteur && editingTransporteur.id) {
        await db.transporteurs.update(editingTransporteur.id, transporteurData);
        toast({
          title: "Transporteur modifié",
          description: "Le transporteur a été mis à jour avec succès."
        });
      } else {
        await db.transporteurs.add({
          ...transporteurData,
          createdAt: new Date()
        } as Transporteur);
        toast({
          title: "Transporteur ajouté",
          description: "Le nouveau transporteur a été créé avec succès."
        });
      }

      setIsAddDialogOpen(false);
      setEditingTransporteur(null);
      setFormData({
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
      loadTransporteurs();
    } catch (error) {
      console.error('Error saving transporteur:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer le transporteur.",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (transporteur: Transporteur) => {
    setEditingTransporteur(transporteur);
    setFormData(transporteur);
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce transporteur ?')) {
      try {
        await db.transporteurs.delete(id);
        toast({
          title: "Transporteur supprimé",
          description: "Le transporteur a été supprimé avec succès."
        });
        loadTransporteurs();
      } catch (error) {
        console.error('Error deleting transporteur:', error);
        toast({
          title: "Erreur",
          description: "Impossible de supprimer le transporteur.",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center">
          <Truck className="h-8 w-8 mr-3" />
          Gestion des Transporteurs
        </h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingTransporteur(null);
              setFormData({
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
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Transporteur
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTransporteur ? 'Modifier le transporteur' : 'Nouveau transporteur'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <TransporteurForm 
                formData={formData} 
                onFormDataChange={setFormData}
                isEditing={!!editingTransporteur}
              />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit">
                  {editingTransporteur ? 'Modifier' : 'Créer'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des Transporteurs</CardTitle>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4" />
            <Input
              placeholder="Rechercher par nom, prénom ou SIRET..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>SIRET</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Plaque</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransporteurs.map((transporteur) => (
                <TableRow key={transporteur.id}>
                  <TableCell className="font-medium">
                    {transporteur.prenom} {transporteur.nom}
                  </TableCell>
                  <TableCell>{transporteur.siret}</TableCell>
                  <TableCell>{transporteur.ville}</TableCell>
                  <TableCell>{transporteur.telephone}</TableCell>
                  <TableCell>{transporteur.plaque}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(transporteur)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(transporteur.id!)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
