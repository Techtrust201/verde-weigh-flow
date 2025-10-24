import { useState, useEffect } from "react";
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
import { Client, Transporteur, PaymentMethod, db } from "@/lib/database";
import { CityPostalInput } from "@/components/ui/city-postal-input";
import { validateEmail, getEmailError } from "@/utils/validation";
import {
  ValidationInput,
  ValidationSelect,
  ValidationTextarea,
} from "@/components/ui/validation-input";
import { Switch } from "@/components/ui/switch";

interface ClientFormProps {
  formData: Partial<Client>;
  onFormDataChange: (data: Partial<Client>) => void;
  isEditing?: boolean;
  transporteurs?: Transporteur[];
  trackDechetEnabled?: boolean;
  onTrackDechetToggle?: (enabled: boolean) => void;
}

export default function ClientForm({
  formData,
  onFormDataChange,
  isEditing = false,
  transporteurs = [],
  trackDechetEnabled,
  onTrackDechetToggle,
}: ClientFormProps) {
  const [emailError, setEmailError] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [localTrackDechetEnabled, setLocalTrackDechetEnabled] = useState<boolean>(trackDechetEnabled ?? false);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const methods = await db.paymentMethods
        .filter((pm) => pm.active)
        .toArray();
      setPaymentMethods(methods);
    } catch (error) {
      console.error("Erreur chargement modes de paiement:", error);
    }
  };

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

      <ValidationInput
        label="Code client"
        required
        value={formData.codeClient || ""}
        onChange={(e) =>
          onFormDataChange({ ...formData, codeClient: e.target.value })
        }
        placeholder="Code client (auto-généré)"
      />
      <p className="text-xs text-muted-foreground mt-1">
        Code unique pour identifier le client. Généré automatiquement mais
        modifiable.
      </p>

      <ValidationInput
        label={
          formData.typeClient === "particulier"
            ? "Raison sociale (nom et prénom de l'individu)"
            : "Raison Sociale"
        }
        required
        value={formData.raisonSociale || ""}
        onChange={(e) =>
          onFormDataChange({ ...formData, raisonSociale: e.target.value })
        }
      />

      <ValidationInput
        label="SIRET"
        required={formData.typeClient === "professionnel"}
        value={formData.siret || ""}
        onChange={(e) =>
          onFormDataChange({ ...formData, siret: e.target.value })
        }
      />

      <div className="grid grid-cols-1 gap-4">
        <ValidationInput
          label="Adresse"
          required={formData.typeClient !== "particulier"}
          value={formData.adresse || ""}
          onChange={(e) =>
            onFormDataChange({ ...formData, adresse: e.target.value })
          }
        />
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
        <ValidationInput
          label="Email"
          type="email"
          value={formData.email || ""}
          onChange={(e) => handleEmailChange(e.target.value)}
          error={emailError || undefined}
        />
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

      {/* Section Track Déchets avec Toggle - Visible uniquement pour professionnels et micro-entreprises */}
      {(formData.typeClient === "professionnel" ||
        formData.typeClient === "micro-entreprise") && (
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="trackdechet-toggle" className="text-base font-medium">
                Informations Track Déchets
              </Label>
              <p className="text-xs text-muted-foreground">
                Activer uniquement si ce client effectue des pesées avec des déchets nécessitant un suivi Track Déchet
              </p>
            </div>
            <Switch
              id="trackdechet-toggle"
              checked={trackDechetEnabled ?? localTrackDechetEnabled}
              onCheckedChange={(checked) => {
                setLocalTrackDechetEnabled(checked);
                onTrackDechetToggle?.(checked);
              }}
            />
          </div>

          {(trackDechetEnabled ?? localTrackDechetEnabled) && (
            <div className="grid grid-cols-1 gap-4 pt-4 border-t">
              <div>
                <Label htmlFor="codeNAF">Code NAF</Label>
                <Input
                  id="codeNAF"
                  value={formData.codeNAF || ""}
                  onChange={(e) =>
                    onFormDataChange({ ...formData, codeNAF: e.target.value })
                  }
                  placeholder="Ex: 4673Z (Commerce de gros de matériaux de construction)"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Code d'activité principale de l'entreprise
                </p>
              </div>

              <div>
                <Label htmlFor="representantLegal">Représentant légal</Label>
                <Input
                  id="representantLegal"
                  value={formData.representantLegal || ""}
                  onChange={(e) =>
                    onFormDataChange({
                      ...formData,
                      representantLegal: e.target.value,
                    })
                  }
                  placeholder="Nom et prénom du représentant légal"
                />
              </div>

              <div>
                <Label htmlFor="activite">Activité</Label>
                <Input
                  id="activite"
                  value={formData.activite || ""}
                  onChange={(e) =>
                    onFormDataChange({ ...formData, activite: e.target.value })
                  }
                  placeholder="Description de l'activité principale"
                />
              </div>
            </div>
          )}
        </div>
      )}

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
              list={`plaques-datalist-${index}`}
            />
            <datalist id={`plaques-datalist-${index}`}>
              {Array.from(
                new Set(
                  formData.plaques?.filter((p) => p && p !== plaque) || []
                )
              ).map((p, i) => (
                <option key={i} value={p} />
              ))}
            </datalist>
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
          Format recommandé : AB-123-CD. Les plaques suggérées proviennent de
          vos clients existants.
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
              list={`chantiers-datalist-${index}`}
            />
            <datalist id={`chantiers-datalist-${index}`}>
              {Array.from(
                new Set(
                  formData.chantiers?.filter((c) => c && c !== chantier) || []
                )
              ).map((c, i) => (
                <option key={i} value={c} />
              ))}
            </datalist>
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
        <p className="text-xs text-muted-foreground mt-1">
          Les chantiers suggérés proviennent de vos clients existants.
        </p>
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

      <div>
        <Label htmlFor="modePaiement">Mode de paiement préférentiel</Label>
        <Select
          value={formData.modePaiementPreferentiel || "none"}
          onValueChange={(value) =>
            onFormDataChange({
              ...formData,
              modePaiementPreferentiel: value === "none" ? undefined : value,
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un mode de paiement" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucun (défaut: Direct)</SelectItem>
            {paymentMethods?.map((method) => (
              <SelectItem key={method.id} value={method.code}>
                {method.code} - {method.libelle}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          Ce mode de paiement sera automatiquement sélectionné lors des pesées
          avec ce client
        </p>
      </div>
    </div>
  );
}
