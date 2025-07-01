
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserPlus } from 'lucide-react';
import { Client } from '@/lib/database';
import { PeseeTab } from '@/hooks/usePeseeTabs';
import ClientForm from '@/components/forms/ClientForm';
import { PlaqueAutocomplete } from './PlaqueAutocomplete';
import { ChantierAutocomplete } from './ChantierAutocomplete';
import { ClientSelector } from './ClientSelector';

interface PeseeFormSectionProps {
  currentData: PeseeTab['formData'] | undefined;
  clients: Client[];
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
}

export const PeseeFormSection = ({
  currentData,
  clients,
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
  handleAddChantier
}: PeseeFormSectionProps) => {
  
  const getEntrepriseLabel = () => {
    if (currentData?.typeClient === 'particulier') {
      return 'Nom *';
    }
    return 'Nom entreprise *';
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
        {!currentData?.clientId && (
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
        )}
      </div>

      <ClientSelector
        clients={clients}
        currentData={currentData}
        updateCurrentTab={updateCurrentTab}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PlaqueAutocomplete
          value={currentData?.plaque || ''}
          clients={clients}
          onSelect={(match) => {
            updateCurrentTab({
              plaque: match.plaque,
              nomEntreprise: match.client.raisonSociale,
              clientId: match.client.id!,
              typeClient: match.client.typeClient,
              chantier: match.client.chantiers?.[0] || ''
            });
          }}
          onChange={(plaque) => updateCurrentTab({ plaque })}
        />
        
        <div>
          <Label htmlFor="nomEntreprise">{getEntrepriseLabel()}</Label>
          <Input
            id="nomEntreprise"
            value={currentData?.nomEntreprise || ''}
            onChange={(e) => updateCurrentTab({ nomEntreprise: e.target.value })}
            placeholder={currentData?.typeClient === 'particulier' ? 'Nom du particulier...' : 'Nom de l\'entreprise...'}
          />
        </div>
        
        <ChantierAutocomplete
          value={currentData?.chantier || ''}
          clients={clients}
          currentClientId={currentData?.clientId}
          onSelect={(chantier) => updateCurrentTab({ chantier })}
          onChange={(chantier) => updateCurrentTab({ chantier })}
          isAddChantierDialogOpen={isAddChantierDialogOpen}
          setIsAddChantierDialogOpen={setIsAddChantierDialogOpen}
          newChantier={newChantier}
          setNewChantier={setNewChantier}
          handleAddChantier={handleAddChantier}
          disabled={!currentData?.clientId}
        />
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
