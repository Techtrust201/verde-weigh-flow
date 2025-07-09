import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Transporteur } from '@/lib/database';

interface TransporteurFormProps {
  formData: Partial<Transporteur>;
  onFormDataChange: (data: Partial<Transporteur>) => void;
  isEditing?: boolean;
}

export default function TransporteurForm({ formData, onFormDataChange, isEditing = false }: TransporteurFormProps) {
  return (
    <div className="space-y-6">
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

      <div>
        <Label htmlFor="siret">SIRET (optionnel)</Label>
        <Input
          id="siret"
          value={formData.siret || ''}
          onChange={(e) => onFormDataChange({...formData, siret: e.target.value})}
        />
      </div>

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
        <Label htmlFor="telephone">Téléphone</Label>
        <Input
          id="telephone"
          value={formData.telephone || ''}
          onChange={(e) => onFormDataChange({...formData, telephone: e.target.value})}
          placeholder="Numéro de téléphone"
        />
      </div>

      <div>
        <Label htmlFor="plaque">Plaque d'immatriculation</Label>
        <Input
          id="plaque"
          value={formData.plaque || ''}
          onChange={(e) => onFormDataChange({...formData, plaque: e.target.value})}
          placeholder="Plaque d'immatriculation"
        />
      </div>
    </div>
  );
}