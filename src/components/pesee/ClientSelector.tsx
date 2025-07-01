
import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Client } from '@/lib/database';
import { PeseeTab } from '@/hooks/usePeseeTabs';

interface ClientSelectorProps {
  clients: Client[];
  currentData: PeseeTab['formData'] | undefined;
  updateCurrentTab: (updates: Partial<PeseeTab['formData']>) => void;
}

export const ClientSelector = ({ clients, currentData, updateCurrentTab }: ClientSelectorProps) => {
  const [showPlaqueOptions, setShowPlaqueOptions] = useState(false);
  const [showChantierOptions, setShowChantierOptions] = useState(false);

  const getClientTypeIcon = (type: string) => {
    const icons = {
      'particulier': '👤',
      'professionnel': '🏢',
      'micro-entreprise': '💼'
    };
    return icons[type as keyof typeof icons] || '👤';
  };

  const handleClientSelect = (clientId: string) => {
    const client = clients.find(c => c.id === parseInt(clientId));
    if (client) {
      const updates: Partial<PeseeTab['formData']> = {
        clientId: client.id!,
        nomEntreprise: client.raisonSociale,
        typeClient: client.typeClient
      };

      // Gestion des plaques
      if (client.plaques && client.plaques.length > 0) {
        if (client.plaques.length === 1) {
          updates.plaque = client.plaques[0];
          setShowPlaqueOptions(false);
        } else {
          updates.plaque = client.plaques[0]; // Par défaut la première
          setShowPlaqueOptions(true);
        }
      }

      // Gestion des chantiers
      if (client.chantiers && client.chantiers.length > 0) {
        if (client.chantiers.length === 1) {
          updates.chantier = client.chantiers[0];
          setShowChantierOptions(false);
        } else {
          updates.chantier = client.chantiers[0]; // Par défaut le premier
          setShowChantierOptions(true);
        }
      }

      updateCurrentTab(updates);
    }
  };

  const selectedClient = clients.find(c => c.id === currentData?.clientId);

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="client">Client existant</Label>
        <Select onValueChange={handleClientSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un client" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id!.toString()}>
                <div className="flex items-center gap-2">
                  <span>{getClientTypeIcon(client.typeClient)}</span>
                  {client.raisonSociale}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Options de plaques multiples */}
      {showPlaqueOptions && selectedClient && selectedClient.plaques && selectedClient.plaques.length > 1 && (
        <div>
          <Label>Plaques disponibles pour ce client</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedClient.plaques.map((plaque, index) => (
              <Badge
                key={index}
                variant={currentData?.plaque === plaque ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => updateCurrentTab({ plaque })}
              >
                {plaque}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Options de chantiers multiples */}
      {showChantierOptions && selectedClient && selectedClient.chantiers && selectedClient.chantiers.length > 1 && (
        <div>
          <Label>Chantiers disponibles pour ce client</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedClient.chantiers.map((chantier, index) => (
              <Badge
                key={index}
                variant={currentData?.chantier === chantier ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => updateCurrentTab({ chantier })}
              >
                {chantier}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
