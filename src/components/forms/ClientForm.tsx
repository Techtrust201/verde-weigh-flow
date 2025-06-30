
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { Client } from '@/lib/database';

interface ClientFormProps {
  formData: Partial<Client>;
  onFormDataChange: (data: Partial<Client>) => void;
  isEditing?: boolean;
}

export default function ClientForm({ formData, onFormDataChange, isEditing = false }: ClientFormProps) {
  const addTelephone = () => {
    onFormDataChange({
      ...formData,
      telephones: [...(formData.telephones || []), '']
    });
  };

  const updateTelephone = (index: number, value: string) => {
    const newTelephones = [...(formData.telephones || [])];
    newTelephones[index] = value;
    onFormDataChange({
      ...formData,
      telephones: newTelephones
    });
  };

  const removeTelephone = (index: number) => {
    const newTelephones = formData.telephones?.filter((_, i) => i !== index) || [];
    onFormDataChange({
      ...formData,
      telephones: newTelephones
    });
  };

  const addPlaque = () => {
    onFormDataChange({
      ...formData,
      plaques: [...(formData.plaques || []), '']
    });
  };

  const updatePlaque = (index: number, value: string) => {
    const newPlaques = [...(formData.plaques || [])];
    newPlaques[index] = value;
    onFormDataChange({
      ...formData,
      plaques: newPlaques
    });
  };

  const removePlaque = (index: number) => {
    const newPlaques = formData.plaques?.filter((_, i) => i !== index) || [];
    onFormDataChange({
      ...formData,
      plaques: newPlaques
    });
  };

  const addChantier = () => {
    onFormDataChange({
      ...formData,
      chantiers: [...(formData.chantiers || []), '']
    });
  };

  const updateChantier = (index: number, value: string) => {
    const newChantiers = [...(formData.chantiers || [])];
    newChantiers[index] = value;
    onFormDataChange({
      ...formData,
      chantiers: newChantiers
    });
  };

  const removeChantier = (index: number) => {
    const newChantiers = formData.chantiers?.filter((_, i) => i !== index) || [];
    onFormDataChange({
      ...formData,
      chantiers: newChantiers
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="typeClient">Type de client *</Label>
        <Select 
          value={formData.typeClient} 
          onValueChange={(value: 'particulier' | 'professionnel' | 'micro-entreprise') => 
            onFormDataChange({...formData, typeClient: value})
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
              onChange={(e) => onFormDataChange({...formData, prenom: e.target.value})}
            />
          </div>
          <div>
            <Label htmlFor="nom">Nom *</Label>
            <Input
              id="nom"
              value={formData.nom || ''}
              onChange={(e) => onFormDataChange({...formData, nom: e.target.value})}
            />
          </div>
        </div>
      ) : (
        <div>
          <Label htmlFor="raisonSociale">Raison Sociale *</Label>
          <Input
            id="raisonSociale"
            value={formData.raisonSociale || ''}
            onChange={(e) => onFormDataChange({...formData, raisonSociale: e.target.value})}
          />
        </div>
      )}

      {formData.typeClient !== 'particulier' && (
        <div>
          <Label htmlFor="dateCreation">Date de création de la société</Label>
          <Input
            id="dateCreation"
            type="date"
            value={formData.dateCreation || ''}
            onChange={(e) => onFormDataChange({...formData, dateCreation: e.target.value})}
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
            onChange={(e) => onFormDataChange({...formData, siret: e.target.value})}
          />
        </div>
        {formData.typeClient !== 'particulier' && (
          <div>
            <Label htmlFor="codeNAF">Code NAF</Label>
            <Input
              id="codeNAF"
              value={formData.codeNAF || ''}
              onChange={(e) => onFormDataChange({...formData, codeNAF: e.target.value})}
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
              onChange={(e) => onFormDataChange({...formData, activite: e.target.value})}
            />
          </div>
          <div>
            <Label htmlFor="representantLegal">Représentant Légal</Label>
            <Input
              id="representantLegal"
              value={formData.representantLegal || ''}
              onChange={(e) => onFormDataChange({...formData, representantLegal: e.target.value})}
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
            onChange={(e) => onFormDataChange({...formData, adresse: e.target.value})}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="codePostal">Code Postal</Label>
            <Input
              id="codePostal"
              value={formData.codePostal || ''}
              onChange={(e) => onFormDataChange({...formData, codePostal: e.target.value})}
            />
          </div>
          <div>
            <Label htmlFor="ville">Ville</Label>
            <Input
              id="ville"
              value={formData.ville || ''}
              onChange={(e) => onFormDataChange({...formData, ville: e.target.value})}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email || ''}
            onChange={(e) => onFormDataChange({...formData, email: e.target.value})}
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

      <div>
        <div className="flex justify-between items-center mb-2">
          <Label>Chantiers</Label>
          <Button type="button" variant="outline" size="sm" onClick={addChantier}>
            <Plus className="h-3 w-3 mr-1" />
            Ajouter
          </Button>
        </div>
        {formData.chantiers?.map((chantier, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <Input
              value={chantier}
              onChange={(e) => updateChantier(index, e.target.value)}
              placeholder="Nom du chantier"
            />
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={() => removeChantier(index)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
