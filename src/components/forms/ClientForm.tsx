import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { Client, Transporteur } from "@/lib/database";
import { CityPostalInput } from "@/components/ui/city-postal-input";
import { validateEmail, getEmailError } from "@/utils/validation";

interface ClientFormProps {
  formData: Partial<Client>;
  onFormDataChange: (data: Partial<Client>) => void;
  isEditing?: boolean;
  transporteurs?: Transporteur[];
}

export default function ClientForm({
  formData,
  onFormDataChange,
  isEditing = false,
  transporteurs = [],
}: ClientFormProps) {
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleEmailChange = (email: string) => {
    onFormDataChange({ ...formData, email });
    setEmailError(getEmailError(email));
  };

  const addChantier = () => {
    onFormDataChange({
      ...formData,
      chantiers: [...(formData.chantiers || []), ""],
    });
  };

  const updateChantier = (index: number, value: string) => {
    const newChantiers = [...(formData.chantiers || [])];
    newChantiers[index] = value;
    onFormDataChange({
      ...formData,
      chantiers: newChantiers,
    });
  };

  const removeChantier = (index: number) => {
    const newChantiers =
      formData.chantiers?.filter((_, i) => i !== index) || [];
    onFormDataChange({
      ...formData,
      chantiers: newChantiers,
    });
  };

  // Gestion des plaques multiples pour les clients
  const addPlaque = () => {
    const plaques = formData.plaques || [];
    onFormDataChange({
      ...formData,
      plaques: [...plaques, ""],
    });
  };

  const updatePlaque = (index: number, value: string) => {
    const newPlaques = [...(formData.plaques || [])];
    newPlaques[index] = value;
    onFormDataChange({
      ...formData,
      plaques: newPlaques,
    });
  };

  const removePlaque = (index: number) => {
    const newPlaques = formData.plaques?.filter((_, i) => i !== index) || [];
    onFormDataChange({
      ...formData,
      plaques: newPlaques,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="typeClient">Type de client *</Label>
        <Select
          value={formData.typeClient}
          onValueChange={(
            value: "particulier" | "professionnel" | "micro-entreprise"
          ) => onFormDataChange({ ...formData, typeClient: value })}
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

      {formData.typeClient === "particulier" ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="prenom">Prénom *</Label>
            <Input
              id="prenom"
              value={formData.prenom || ""}
              onChange={(e) =>
                onFormDataChange({ ...formData, prenom: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="nom">Nom *</Label>
            <Input
              id="nom"
              value={formData.nom || ""}
              onChange={(e) =>
                onFormDataChange({ ...formData, nom: e.target.value })
              }
            />
          </div>
        </div>
      ) : (
        <div>
          <Label htmlFor="raisonSociale">Raison Sociale *</Label>
          <Input
            id="raisonSociale"
            value={formData.raisonSociale || ""}
            onChange={(e) =>
              onFormDataChange({ ...formData, raisonSociale: e.target.value })
            }
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="siret">
            SIRET{" "}
            {formData.typeClient === "professionnel" ? "*" : "(optionnel)"}
          </Label>
          <Input
            id="siret"
            value={formData.siret || ""}
            onChange={(e) =>
              onFormDataChange({ ...formData, siret: e.target.value })
            }
          />
        </div>
        {formData.typeClient !== "particulier" && (
          <div>
            <Label htmlFor="codeNAF">Code NAF</Label>
            <Input
              id="codeNAF"
              value={formData.codeNAF || ""}
              onChange={(e) =>
                onFormDataChange({ ...formData, codeNAF: e.target.value })
              }
            />
          </div>
        )}
      </div>

      {formData.typeClient !== "particulier" && (
        <>
          <div>
            <Label htmlFor="activite">Activité</Label>
            <Input
              id="activite"
              value={formData.activite || ""}
              onChange={(e) =>
                onFormDataChange({ ...formData, activite: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="representantLegal">Représentant Légal</Label>
            <Input
              id="representantLegal"
              value={formData.representantLegal || ""}
              onChange={(e) =>
                onFormDataChange({
                  ...formData,
                  representantLegal: e.target.value,
                })
              }
            />
          </div>
        </>
      )}

      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label htmlFor="adresse">Adresse</Label>
          <Input
            id="adresse"
            value={formData.adresse || ""}
            onChange={(e) =>
              onFormDataChange({ ...formData, adresse: e.target.value })
            }
          />
        </div>
        <div>
          <Label>Code Postal et Ville</Label>
          <CityPostalInput
            cityValue={formData.ville || ""}
            postalValue={formData.codePostal || ""}
            onBothChange={(city, postal) => {
              onFormDataChange({
                ...formData,
                ville: city,
                codePostal: postal,
              });
            }}
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email || ""}
            onChange={(e) => handleEmailChange(e.target.value)}
            className={emailError ? "border-red-300" : ""}
          />
          {emailError && (
            <div className="flex items-center gap-1 text-sm text-red-600 mt-1">
              <AlertCircle className="h-4 w-4" />
              {emailError}
            </div>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="telephone">Téléphone</Label>
        <Input
          id="telephone"
          value={formData.telephone || ""}
          onChange={(e) =>
            onFormDataChange({ ...formData, telephone: e.target.value })
          }
          placeholder="Numéro de téléphone"
        />
      </div>

      {/* Gestion des plaques multiples */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <Label>Plaques d'immatriculation</Label>
          <Button type="button" variant="outline" size="sm" onClick={addPlaque}>
            <Plus className="h-3 w-3 mr-1" />
            Ajouter
          </Button>
        </div>
        {(formData.plaques || []).map((plaque, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <Input
              value={plaque}
              onChange={(e) => updatePlaque(index, e.target.value)}
              placeholder="Plaque d'immatriculation (ex: AB-123-CD)"
              className="font-mono"
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
        {(!formData.plaques || formData.plaques.length === 0) && (
          <div className="flex gap-2 mb-2">
            <Input
              value=""
              onChange={(e) =>
                onFormDataChange({ ...formData, plaques: [e.target.value] })
              }
              placeholder="Plaque d'immatriculation (ex: AB-123-CD)"
              className="font-mono"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addPlaque}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          Format recommandé : AB-123-CD
        </p>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <Label>Chantiers</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addChantier}
          >
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

      <div>
        <Label htmlFor="transporteur">Transporteur par défaut</Label>
        <Select
          value={formData.transporteurId?.toString() || "none"}
          onValueChange={(value) =>
            onFormDataChange({
              ...formData,
              transporteurId: value === "none" ? undefined : parseInt(value),
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un transporteur" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucun transporteur</SelectItem>
            {transporteurs?.map((transporteur) => (
              <SelectItem
                key={transporteur.id}
                value={transporteur.id!.toString()}
              >
                {transporteur.prenom} {transporteur.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
