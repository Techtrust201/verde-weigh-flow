import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Check, Plus } from "lucide-react";
import { Client } from "@/lib/database";
import { cn } from "@/lib/utils";

interface ChantierAutocompleteProps {
  value: string;
  clients: Client[];
  currentClientId?: number;
  onSelect: (chantier: string) => void;
  onChange: (value: string) => void;
  isAddChantierDialogOpen: boolean;
  setIsAddChantierDialogOpen: (open: boolean) => void;
  newChantier: string;
  setNewChantier: (chantier: string) => void;
  handleAddChantier: () => void;
  disabled?: boolean;
  isSuggested?: boolean;
  suggestedValue?: string;
  validationError?: boolean;
}

export const ChantierAutocomplete = ({
  value,
  clients,
  currentClientId,
  onSelect,
  onChange,
  isAddChantierDialogOpen,
  setIsAddChantierDialogOpen,
  newChantier,
  setNewChantier,
  handleAddChantier,
  disabled,
  isSuggested,
  suggestedValue,
  validationError = false,
}: ChantierAutocompleteProps) => {
  const [chantierMatches, setChantierMatches] = useState<string[]>([]);
  const [showChantierMatches, setShowChantierMatches] = useState(false);

  const handleChantierChange = (chantier: string) => {
    onChange(chantier);

    if (chantier.length > 1) {
      let chantiersToSearch: string[] = [];

      if (currentClientId) {
        // Si un client est sélectionné, chercher dans ses chantiers
        const client = clients.find((c) => c.id === currentClientId);
        chantiersToSearch = client?.chantiers || [];
      } else {
        // Sinon chercher dans tous les chantiers
        const allChantiers = clients.flatMap(
          (client) => client.chantiers || []
        );
        chantiersToSearch = [...new Set(allChantiers)];
      }

      const matches = chantiersToSearch.filter((c) =>
        c.toLowerCase().includes(chantier.toLowerCase())
      );
      setChantierMatches(matches);
      setShowChantierMatches(matches.length > 0);
    } else {
      setShowChantierMatches(false);
    }
  };

  const selectChantierMatch = (chantier: string) => {
    onSelect(chantier);
    setShowChantierMatches(false);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Label
            htmlFor="chantier"
            className={cn(
              "flex items-center gap-2",
              validationError && "text-red-600"
            )}
          >
            Chantier <span className="text-red-500">*</span>
            {validationError && <span className="text-red-500 ml-1">*</span>}
            {isSuggested && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium border border-green-200">
                ✓ Chantier suggéré automatiquement
              </span>
            )}
          </Label>
          <Input
            id="chantier"
            value={value}
            onChange={(e) => handleChantierChange(e.target.value)}
            placeholder="Nom du chantier..."
            className={cn(
              isSuggested ? "border-green-300 bg-green-50" : "",
              validationError &&
                "border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500"
            )}
          />
          {validationError && (
            <p className="text-red-600 text-sm mt-1">
              Ce champ est obligatoire
            </p>
          )}
          {isSuggested && suggestedValue && (
            <p className="text-xs text-green-600 mt-1 bg-green-50 p-2 rounded border border-green-200">
              💡 <strong>Chantier suggéré automatiquement</strong> à partir de
              l'adresse principale du client. Vous pouvez le remplacer si
              nécessaire.
            </p>
          )}
        </div>
        <Dialog
          open={isAddChantierDialogOpen}
          onOpenChange={setIsAddChantierDialogOpen}
        >
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="mt-6"
              disabled={disabled}
              title="Ajouter un nouveau chantier"
            >
              <Plus className="h-4 w-4" />
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
              <Button
                variant="outline"
                onClick={() => setIsAddChantierDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button onClick={handleAddChantier}>Ajouter</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {showChantierMatches && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {chantierMatches.map((chantier, index) => (
            <button
              key={index}
              className="block w-full text-left text-sm text-gray-600 hover:bg-gray-100 p-3 rounded border-b last:border-b-0"
              onClick={() => selectChantierMatch(chantier)}
            >
              <div className="flex items-center justify-between">
                <span>{chantier}</span>
                <Check className="h-4 w-4 text-green-500" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
