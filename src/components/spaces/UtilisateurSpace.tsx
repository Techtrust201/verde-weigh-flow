import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Upload, User } from 'lucide-react';
import { db, UserSettings } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';

export default function UtilisateurSpace() {
  const [settings, setSettings] = useState<UserSettings>({
    nomEntreprise: '',
    adresse: '',
    email: '',
    telephone: '',
    siret: '',
    codeAPE: '',
    logo: '',
    cleAPISage: '',
    createdAt: new Date(),
    updatedAt: new Date()
  });
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const userSettings = await db.userSettings.toCollection().first();
      if (userSettings) {
        setSettings(userSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSave = async () => {
    try {
      if (settings.id) {
        await db.userSettings.update(settings.id, {
          ...settings,
          updatedAt: new Date()
        });
      } else {
        await db.userSettings.add({
          ...settings,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      toast({
        title: "Paramètres sauvegardés",
        description: "Vos informations ont été mises à jour."
      });
      setIsEditing(false);
      loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres.",
        variant: "destructive"
      });
    }
  };

  const handleInputChange = (field: keyof UserSettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Paramètres Utilisateur</h1>
        <div className="space-x-2">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              <User className="h-4 w-4 mr-2" />
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
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informations de l'entreprise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="nomEntreprise">Nom de l'entreprise</Label>
              <Input
                id="nomEntreprise"
                value={settings.nomEntreprise}
                onChange={(e) => handleInputChange('nomEntreprise', e.target.value)}
                disabled={!isEditing}
              />
            </div>

            <div>
              <Label htmlFor="adresse">Adresse</Label>
              <Input
                id="adresse"
                value={settings.adresse}
                onChange={(e) => handleInputChange('adresse', e.target.value)}
                disabled={!isEditing}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="telephone">Téléphone</Label>
                <Input
                  id="telephone"
                  value={settings.telephone}
                  onChange={(e) => handleInputChange('telephone', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="siret">SIRET</Label>
                <Input
                  id="siret"
                  value={settings.siret}
                  onChange={(e) => handleInputChange('siret', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="codeAPE">Code APE</Label>
                <Input
                  id="codeAPE"
                  value={settings.codeAPE}
                  onChange={(e) => handleInputChange('codeAPE', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logo and API Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Logo et API</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="logo">Logo de l'entreprise</Label>
              <div className="mt-2 space-y-2">
                {settings.logo && (
                  <img
                    src={settings.logo}
                    alt="Logo"
                    className="w-32 h-32 object-contain border rounded"
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
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="cleAPISage">Clé API Sage</Label>
              <Input
                id="cleAPISage"
                type="password"
                value={settings.cleAPISage || ''}
                onChange={(e) => handleInputChange('cleAPISage', e.target.value)}
                disabled={!isEditing}
                placeholder="Votre clé API Sage"
              />
              <p className="text-sm text-gray-600 mt-1">
                Cette clé est utilisée pour la synchronisation avec votre logiciel de comptabilité Sage.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Informations de contact du prestataire</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-semibold">Tech-Trust Agency</h4>
              <p>123 Rue du Développement</p>
              <p>75000 Paris</p>
            </div>
            <div>
              <h4 className="font-semibold">Contact</h4>
              <p>Email: contact@tech-trust.fr</p>
              <p>Tél: 01 23 45 67 89</p>
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
