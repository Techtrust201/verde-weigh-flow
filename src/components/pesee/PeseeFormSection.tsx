
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Combobox } from '@/components/ui/combobox';
import { UserPlus, RotateCcw } from 'lucide-react';
import { Client, Transporteur } from '@/lib/database';
import { PeseeTab } from '@/hooks/usePeseeTabs';
import ClientForm from '@/components/forms/ClientForm';
import { PlaqueAutocomplete } from './PlaqueAutocomplete';
import { ChantierAutocomplete } from './ChantierAutocomplete';
import { ClientSelector } from './ClientSelector';

interface PeseeFormSectionProps {
  currentData: PeseeTab['formData'] | undefined;
  clients: Client[];
  transporteurs: Transporteur[];
  updateCurrentTab: (updates: Partial<PeseeTab['formData']>) => void;
  onAddClient: () => void;
  isAddClientDialogOpen: boolean;
  setIsAddClientDialogOpen: (open: boolean) => void;
  newClientForm: Partial<Client>;
  setNewClientForm: (form: Partial<Client>) => void;
  handleAddNewClient: () => void;
  validateNewClient: () => boolean;
  isAddChantierDialogOpen: boolean;
  setIsAddChantierDialogOpen: (open: boolean) => void;
  newChantier: string;
  setNewChantier: (chantier: string) => void;
  handleAddChantier: () => void;
  isAddTransporteurDialogOpen: boolean;
  setIsAddTransporteurDialogOpen: (open: boolean) => void;
  newTransporteurForm: Partial<Transporteur>;
  setNewTransporteurForm: (form: Partial<Transporteur>) => void;
  handleAddNewTransporteur: () => void;
  validateNewTransporteur: () => boolean;
}

export const PeseeFormSection = ({
  currentData,
  clients,
  transporteurs,
  updateCurrentTab,
  onAddClient,
  isAddClientDialogOpen,
  setIsAddClientDialogOpen,
  newClientForm,
  setNewClientForm,
  handleAddNewClient,
  validateNewClient,
  isAddChantierDialogOpen,
  setIsAddChantierDialogOpen,
  newChantier,
  setNewChantier,
  handleAddChantier,
  isAddTransporteurDialogOpen,
  setIsAddTransporteurDialogOpen,
  newTransporteurForm,
  setNewTransporteurForm,
  handleAddNewTransporteur,
  validateNewTransporteur
}: PeseeFormSectionProps) => {
  
  const getEntrepriseLabel = () => {
    if (currentData?.typeClient === 'particulier') {
      return 'Nom *';
    }
    return 'Nom entreprise *';
  };

  const resetForm = () => {
    updateCurrentTab({
      clientId: 0,
      transporteurId: 0,
      nomEntreprise: '',
      typeClient: 'particulier',
      plaque: '',
      chantier: '',
      moyenPaiement: 'Direct'
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="numeroBon">Numéro de bon</Label>
          <Input
            id="numeroBon"
            value={currentData?.numeroBon || ''}
            onChange={(e) => updateCurrentTab({ numeroBon: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="moyenPaiement">Moyen de paiement</Label>
          <Select 
            value={currentData?.moyenPaiement || 'Direct'} 
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
        {/* Si pas de client sélectionné, afficher le sélecteur de type */}
        {!currentData?.clientId ? (
          <div>
            <Label htmlFor="typeClient">Type de client</Label>
            <Select 
              value={currentData?.typeClient || 'particulier'} 
              onValueChange={(value: 'particulier' | 'professionnel' | 'micro-entreprise') => 
                updateCurrentTab({ typeClient: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="particulier">👤 Particulier</SelectItem>
                <SelectItem value="professionnel">🏢 Professionnel</SelectItem>
                <SelectItem value="micro-entreprise">💼 Micro-entreprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div>
            <Label htmlFor="client">Client existant</Label>
            <div className="flex gap-2">
              <Select 
                value={currentData?.clientId?.toString() || ''} 
                onValueChange={(clientId) => {
                  const client = clients.find(c => c.id === parseInt(clientId));
                  if (client) {
                    updateCurrentTab({
                      clientId: client.id!,
                      nomEntreprise: client.raisonSociale,
                      typeClient: client.typeClient,
                      plaque: client.plaque || '',
                      chantier: client.chantiers?.[0] || '',
                      transporteurId: client.transporteurId || 0
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id!.toString()}>
                      <div className="flex items-center gap-2">
                        <span>
                          {client.typeClient === 'particulier' ? '👤' : 
                           client.typeClient === 'professionnel' ? '🏢' : '💼'}
                        </span>
                        {client.raisonSociale}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={resetForm}
                title="Réinitialiser le formulaire"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {!currentData?.clientId && (
        <div>
          <Label htmlFor="client">Client existant</Label>
          <Select 
            value={currentData?.clientId?.toString() || ''} 
            onValueChange={(clientId) => {
              const client = clients.find(c => c.id === parseInt(clientId));
              if (client) {
                updateCurrentTab({
                  clientId: client.id!,
                  nomEntreprise: client.raisonSociale,
                  typeClient: client.typeClient,
                  plaque: client.plaque || '',
                  chantier: client.chantiers?.[0] || '',
                  transporteurId: client.transporteurId || 0
                });
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un client ou saisir manuellement ci-dessous" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id!.toString()}>
                  <div className="flex items-center gap-2">
                    <span>
                      {client.typeClient === 'particulier' ? '👤' : 
                       client.typeClient === 'professionnel' ? '🏢' : '💼'}
                    </span>
                    {client.raisonSociale}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="plaque">Plaque *</Label>
          <Combobox
            options={(() => {
              if (currentData?.clientId) {
                const client = clients.find(c => c.id === currentData.clientId);
                return client?.plaque ? [{ value: client.plaque, label: client.plaque }] : [];
              }
              return [];
            })()}
            value={currentData?.plaque || ''}
            onValueChange={(value) => updateCurrentTab({ plaque: value })}
            placeholder="Sélectionner ou saisir une plaque..."
            searchPlaceholder="Rechercher ou saisir une plaque..."
            emptyText="Aucune plaque trouvée. Vous pouvez saisir directement."
          />
        </div>
        
        <div>
          <Label htmlFor="nomEntreprise">{getEntrepriseLabel()}</Label>
          <Input
            id="nomEntreprise"
            value={currentData?.nomEntreprise || ''}
            onChange={(e) => updateCurrentTab({ nomEntreprise: e.target.value })}
            placeholder={currentData?.typeClient === 'particulier' ? 'Nom du particulier...' : 'Nom de l\'entreprise...'}
          />
        </div>
        
        <div>
          <Label htmlFor="chantier">Chantier</Label>
          <div className="flex gap-2">
            <Combobox
              options={(() => {
                if (currentData?.clientId) {
                  const client = clients.find(c => c.id === currentData.clientId);
                  return client?.chantiers?.map(chantier => ({ value: chantier, label: chantier })) || [];
                }
                return [];
              })()}
              value={currentData?.chantier || ''}
              onValueChange={(value) => updateCurrentTab({ chantier: value })}
              placeholder="Sélectionner ou saisir un chantier..."
              searchPlaceholder="Rechercher ou saisir un chantier..."
              emptyText="Aucun chantier trouvé. Vous pouvez saisir directement."
            />
            <Dialog open={isAddChantierDialogOpen} onOpenChange={setIsAddChantierDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="mt-0 self-start shrink-0"
                  disabled={!currentData?.clientId}
                  title="Ajouter un nouveau chantier au client"
                >
                  <UserPlus className="h-4 w-4" />
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
        </div>

        <div>
          <Label htmlFor="transporteur">Transporteur</Label>
          <div className="flex gap-2">
            <Select 
              value={currentData?.transporteurId?.toString() || ''} 
              onValueChange={(value) => updateCurrentTab({ transporteurId: parseInt(value) || 0 })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un transporteur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Aucun transporteur</SelectItem>
                {transporteurs.map((transporteur) => (
                  <SelectItem key={transporteur.id} value={transporteur.id!.toString()}>
                    {transporteur.prenom} {transporteur.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isAddTransporteurDialogOpen} onOpenChange={setIsAddTransporteurDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="mt-0 self-start shrink-0"
                  title="Ajouter un nouveau transporteur"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nouveau Transporteur</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Prénom *</Label>
                      <Input
                        value={newTransporteurForm.prenom || ''}
                        onChange={(e) => setNewTransporteurForm({...newTransporteurForm, prenom: e.target.value})}
                        placeholder="Prénom du transporteur"
                      />
                    </div>
                    <div>
                      <Label>Nom *</Label>
                      <Input
                        value={newTransporteurForm.nom || ''}
                        onChange={(e) => setNewTransporteurForm({...newTransporteurForm, nom: e.target.value})}
                        placeholder="Nom du transporteur"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>SIRET</Label>
                    <Input
                      value={newTransporteurForm.siret || ''}
                      onChange={(e) => setNewTransporteurForm({...newTransporteurForm, siret: e.target.value})}
                      placeholder="SIRET (optionnel)"
                    />
                  </div>
                  <div>
                    <Label>Adresse</Label>
                    <Input
                      value={newTransporteurForm.adresse || ''}
                      onChange={(e) => setNewTransporteurForm({...newTransporteurForm, adresse: e.target.value})}
                      placeholder="Adresse"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Code postal</Label>
                      <Input
                        value={newTransporteurForm.codePostal || ''}
                        onChange={(e) => setNewTransporteurForm({...newTransporteurForm, codePostal: e.target.value})}
                        placeholder="Code postal"
                      />
                    </div>
                    <div>
                      <Label>Ville</Label>
                      <Input
                        value={newTransporteurForm.ville || ''}
                        onChange={(e) => setNewTransporteurForm({...newTransporteurForm, ville: e.target.value})}
                        placeholder="Ville"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={newTransporteurForm.email || ''}
                      onChange={(e) => setNewTransporteurForm({...newTransporteurForm, email: e.target.value})}
                      placeholder="Email"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddTransporteurDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button 
                    onClick={handleAddNewTransporteur}
                    disabled={!validateNewTransporteur()}
                  >
                    Créer et sélectionner
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <Dialog open={isAddClientDialogOpen} onOpenChange={setIsAddClientDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" onClick={onAddClient}>
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
              transporteurs={transporteurs}
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
    </div>
  );
};
