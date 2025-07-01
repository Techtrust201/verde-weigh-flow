
import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Check, User, Building, Briefcase } from 'lucide-react';
import { Client } from '@/lib/database';

interface PlaqueMatch {
  client: Client;
  plaque: string;
}

interface PlaqueAutocompleteProps {
  value: string;
  clients: Client[];
  onSelect: (match: PlaqueMatch) => void;
  onChange: (value: string) => void;
}

export const PlaqueAutocomplete = ({ value, clients, onSelect, onChange }: PlaqueAutocompleteProps) => {
  const [plaqueMatches, setPlaqueMatches] = useState<PlaqueMatch[]>([]);
  const [showPlaqueMatches, setShowPlaqueMatches] = useState(false);

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

  const handlePlaqueChange = (plaque: string) => {
    onChange(plaque);
    
    if (plaque.length > 1) {
      const matches: PlaqueMatch[] = [];
      clients.forEach(client => {
        client.plaques.forEach(clientPlaque => {
          if (clientPlaque.toLowerCase().includes(plaque.toLowerCase())) {
            matches.push({ client, plaque: clientPlaque });
          }
        });
      });
      setPlaqueMatches(matches);
      setShowPlaqueMatches(matches.length > 0);
    } else {
      setShowPlaqueMatches(false);
    }
  };

  const selectPlaqueMatch = (match: PlaqueMatch) => {
    onSelect(match);
    setShowPlaqueMatches(false);
  };

  return (
    <div className="relative">
      <Label htmlFor="plaque">Plaque *</Label>
      <Input
        id="plaque"
        value={value}
        onChange={(e) => handlePlaqueChange(e.target.value)}
        placeholder="Saisir une plaque..."
      />
      {showPlaqueMatches && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {plaqueMatches.map((match, index) => (
            <div 
              key={index} 
              className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
              onClick={() => selectPlaqueMatch(match)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-sm">{match.client.raisonSociale}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    {getClientTypeBadge(match.client.typeClient)}
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                      {match.plaque}
                    </span>
                  </div>
                  {match.client.chantiers && match.client.chantiers.length > 0 && (
                    <div className="text-xs text-gray-400 mt-1">
                      Chantiers: {match.client.chantiers.slice(0, 2).join(', ')}
                      {match.client.chantiers.length > 2 && '...'}
                    </div>
                  )}
                </div>
                <Check className="h-4 w-4 text-green-500" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
