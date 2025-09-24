import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Client } from '@/lib/database';
import { getGlobalSettings, isTrackDechetReady } from '@/lib/globalSettings';
import { useToast } from '@/hooks/use-toast';

interface ClientTrackDechetSectionProps {
  formData: Partial<Client>;
  onFormDataChange: (data: Partial<Client>) => void;
  isEditing?: boolean;
}

export default function ClientTrackDechetSection({
  formData,
  onFormDataChange,
  isEditing = false
}: ClientTrackDechetSectionProps) {
  const [isTrackDechetGloballyConfigured, setIsTrackDechetGloballyConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkGlobalConfiguration();
  }, []);

  const checkGlobalConfiguration = async () => {
    try {
      setLoading(true);
      const isReady = await isTrackDechetReady();
      setIsTrackDechetGloballyConfigured(isReady);
    } catch (error) {
      console.error('Erreur vérification configuration globale:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTrackDechetToggle = (enabled: boolean) => {
    if (enabled && !isTrackDechetGloballyConfigured) {
      toast({
        title: "Configuration requise",
        description: "Veuillez d'abord configurer Track Déchet dans les Paramètres",
        variant: "destructive"
      });
      return;
    }

    onFormDataChange({
      ...formData,
      trackDechetEnabled: enabled
    });

    toast({
      title: enabled ? "Track Déchet activé" : "Track Déchet désactivé",
      description: enabled 
        ? "Ce client pourra maintenant générer des BSD automatiquement" 
        : "Ce client ne générera plus de BSD automatiquement"
    });
  };

  // N'afficher la section que pour les professionnels
  if (formData.typeClient === 'particulier') {
    return null;
  }

  if (loading) {
    return (
      <Card className="border-muted">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <span className="text-sm text-muted-foreground">Vérification de la configuration...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={isTrackDechetGloballyConfigured ? "border-primary/20" : "border-orange-200 bg-orange-50/30"}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className={isTrackDechetGloballyConfigured ? "text-primary" : "text-orange-600"}>
              Track Déchet
            </span>
            <Badge variant="secondary" className="text-xs">
              Client
            </Badge>
            {!isTrackDechetGloballyConfigured && (
              <Badge variant="outline" className="text-xs border-orange-200 text-orange-600">
                Configuration requise
              </Badge>
            )}
          </span>
          <Switch
            checked={formData.trackDechetEnabled || false}
            onCheckedChange={handleTrackDechetToggle}
            disabled={!isTrackDechetGloballyConfigured}
          />
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Activez Track Déchet pour ce client pour générer automatiquement des bordereaux de suivi des déchets (BSD)
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Statut de configuration globale */}
        <div className="flex items-center gap-2">
          {isTrackDechetGloballyConfigured ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600">
                Configuration globale Track Déchet active
              </span>
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-orange-600">
                Track Déchet non configuré globalement
              </span>
            </>
          )}
        </div>

        {/* Message selon le statut */}
        {isTrackDechetGloballyConfigured ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <h4 className="text-sm font-medium text-green-800 mb-1">
              Prêt à utiliser
            </h4>
            <p className="text-xs text-green-700">
              Track Déchet est configuré globalement. Vous pouvez activer cette fonctionnalité pour ce client.
            </p>
          </div>
        ) : (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-2">
            <h4 className="text-sm font-medium text-orange-800">
              Configuration requise
            </h4>
            <p className="text-xs text-orange-700 mb-2">
              Pour utiliser Track Déchet, vous devez d'abord configurer votre token API dans les paramètres globaux.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-auto py-1 px-2 text-xs border-orange-200 text-orange-700 hover:bg-orange-100"
              onClick={() => {
                // Ici on pourrait naviguer vers les paramètres
                toast({
                  title: "Configuration globale",
                  description: "Allez dans Paramètres → Track Déchet pour configurer votre token API"
                });
              }}
            >
              Configurer Track Déchet
            </Button>
          </div>
        )}

        {/* Avantages */}
        {formData.trackDechetEnabled && (
          <div className="text-xs text-muted-foreground">
            <strong>Avantages :</strong> Génération automatique des BSD, 
            traçabilité complète, conformité réglementaire.
          </div>
        )}
      </CardContent>
    </Card>
  );
}