import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Truck, FileSpreadsheet } from 'lucide-react';
import { db, UserSettings } from '@/lib/database';
import TrackDechetGlobalSettings from '@/components/settings/TrackDechetGlobalSettings';
import CompanySettings from '@/components/settings/CompanySettings';
import SageSettings from '@/components/settings/SageSettings';
import { useToast } from '@/hooks/use-toast';

export default function UtilisateurSpace() {
  const [settings, setSettings] = useState<UserSettings>({
    nomEntreprise: '',
    adresse: '',
    codePostal: '',
    ville: '',
    email: '',
    telephone: '',
    siret: '',
    codeAPE: '',
    logo: '',
    cleAPISage: '',
    representantLegal: '',
    createdAt: new Date(),
    updatedAt: new Date()
  });
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


  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <User className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Paramètres & Utilisateur</h1>
      </div>

      <Tabs defaultValue="company" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="company" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Entreprise
          </TabsTrigger>
          <TabsTrigger value="trackdechet" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Track Déchet
          </TabsTrigger>
          <TabsTrigger value="sage" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Sage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-6">
          <CompanySettings 
            settings={settings}
            onSettingsChange={setSettings}
            onSave={handleSave}
          />
        </TabsContent>

        <TabsContent value="trackdechet" className="space-y-4">
          <TrackDechetGlobalSettings />
        </TabsContent>

        <TabsContent value="sage" className="space-y-4">
          <SageSettings 
            settings={settings}
            onSettingsChange={setSettings}
            onSave={handleSave}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
