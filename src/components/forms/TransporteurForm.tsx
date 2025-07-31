import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Transporteur } from "@/lib/database";
import { CityPostalInput } from "@/components/ui/city-postal-input";
import { validateEmail, getEmailError } from "@/utils/validation";
import { AlertCircle } from "lucide-react";

interface TransporteurFormProps {
  formData: Partial<Transporteur>;
  onFormDataChange: (data: Partial<Transporteur>) => void;
  isEditing?: boolean;
}

export default function TransporteurForm({
  formData,
  onFormDataChange,
  isEditing = false,
}: TransporteurFormProps) {
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleEmailChange = (email: string) => {
    onFormDataChange({ ...formData, email });
    setEmailError(getEmailError(email));
  };
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="prenom" className="flex items-center gap-1">
            Prénom <span className="text-red-500">*</span>
          </Label>
          <Input
            id="prenom"
            value={formData.prenom || ""}
            onChange={(e) =>
              onFormDataChange({ ...formData, prenom: e.target.value })
            }
          />
        </div>
        <div>
          <Label htmlFor="nom" className="flex items-center gap-1">
            Nom <span className="text-red-500">*</span>
          </Label>
          <Input
            id="nom"
            value={formData.nom || ""}
            onChange={(e) =>
              onFormDataChange({ ...formData, nom: e.target.value })
            }
          />
        </div>
      </div>

      <div>
        <Label htmlFor="siret">SIRET (optionnel)</Label>
        <Input
          id="siret"
          value={formData.siret || ""}
          onChange={(e) =>
            onFormDataChange({ ...formData, siret: e.target.value })
          }
        />
      </div>

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

      <div>
        <Label htmlFor="plaque">Plaque d'immatriculation</Label>
        <Input
          id="plaque"
          value={formData.plaque || ""}
          onChange={(e) =>
            onFormDataChange({ ...formData, plaque: e.target.value })
          }
          placeholder="Plaque d'immatriculation"
        />
      </div>
    </div>
  );
}
