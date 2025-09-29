import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Upload, Building2 } from 'lucide-react';
import { UserSettings } from '@/lib/database';

interface CompanySettingsProps {
  settings: UserSettings;
  onSettingsChange: (settings: UserSettings) => void;
  onSave: () => Promise<void>;
}

export default function CompanySettings({ settings, onSettingsChange, onSave }: CompanySettingsProps) {
  const [isEditing, setIsEditing] = useState(false);

  const handleInputChange = (field: keyof UserSettings, value: string) => {
    onSettingsChange({
      ...settings,
      [field]: value
    });
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        handleInputChange('logo', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    await onSave();
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Informations de l'entreprise
        </h2>
        <div className="space-x-2">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              <Building2 className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          ) : (
            <>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Annuler
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informations générales */}
        <Card>
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="nomEntreprise">Nom de l'entreprise *</Label>
              <Input
                id="nomEntreprise"
                value={settings.nomEntreprise}
                onChange={(e) => handleInputChange('nomEntreprise', e.target.value)}
                disabled={!isEditing}
                placeholder="Nom de votre entreprise"
              />
            </div>

            <div>
              <Label htmlFor="adresse">Adresse (rue) *</Label>
              <Input
                id="adresse"
                value={settings.adresse}
                onChange={(e) => handleInputChange('adresse', e.target.value)}
                disabled={!isEditing}
                placeholder="Numéro et nom de rue"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="codePostal">Code postal *</Label>
                <Input
                  id="codePostal"
                  value={settings.codePostal}
                  onChange={(e) => handleInputChange('codePostal', e.target.value)}
                  disabled={!isEditing}
                  placeholder="06000"
                />
              </div>
              <div>
                <Label htmlFor="ville">Ville *</Label>
                <Input
                  id="ville"
                  value={settings.ville}
                  onChange={(e) => handleInputChange('ville', e.target.value)}
                  disabled={!isEditing}
                  placeholder="Nice"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informations légales */}
        <Card>
          <CardHeader>
            <CardTitle>Informations légales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="siret">SIRET *</Label>
                <Input
                  id="siret"
                  value={settings.siret}
                  onChange={(e) => handleInputChange('siret', e.target.value)}
                  disabled={!isEditing}
                  placeholder="12345678901234"
                />
              </div>
              <div>
                <Label htmlFor="codeAPE">Code APE *</Label>
                <Input
                  id="codeAPE"
                  value={settings.codeAPE}
                  onChange={(e) => handleInputChange('codeAPE', e.target.value)}
                  disabled={!isEditing}
                  placeholder="3821Z"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="representantLegal">Représentant légal</Label>
              <Input
                id="representantLegal"
                value={settings.representantLegal || ''}
                onChange={(e) => handleInputChange('representantLegal', e.target.value)}
                disabled={!isEditing}
                placeholder="Nom du responsable"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Informations de contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={settings.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={!isEditing}
                placeholder="contact@entreprise.fr"
              />
            </div>

            <div>
              <Label htmlFor="telephone">Téléphone *</Label>
              <Input
                id="telephone"
                value={settings.telephone}
                onChange={(e) => handleInputChange('telephone', e.target.value)}
                disabled={!isEditing}
                placeholder="04 93 00 00 00"
              />
            </div>
          </CardContent>
        </Card>

        {/* Logo */}
        <Card>
          <CardHeader>
            <CardTitle>Logo de l'entreprise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              {settings.logo && (
                <img
                  src={settings.logo}
                  alt="Logo"
                  className="w-32 h-32 object-contain border rounded mb-4"
                />
              )}
              {isEditing && (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="logo-upload"
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('logo-upload')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Charger un logo
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Formats acceptés : PNG, JPG, SVG (max 2MB)
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informations prestataire */}
      <Card>
        <CardHeader>
          <CardTitle>Informations du prestataire</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-semibold">
                <a href="https://www.tech-trust.fr" className="hover:underline">Tech-Trust Agency</a>
              </h4>
              <p>62 Imp. Font-Roubert</p>
              <p>06250 Mougins</p>
            </div>
            <div>
              <h4 className="font-semibold">Contact</h4>
              <p>Email: contact@tech-trust.fr</p>
              <p>Tél: 06 99 48 66 29</p>
            </div>
            <div>
              <h4 className="font-semibold">Support</h4>
              <p>Pour toute assistance technique</p>
              <p>ou demande de modification</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}