import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, CheckCircle, ExternalLink, Loader2 } from 'lucide-react';
import { Client } from '@/lib/database';
import { validateTrackDechetToken } from '@/utils/trackdechetApi';
import { useToast } from '@/hooks/use-toast';

interface TrackDechetSectionProps {
  formData: Partial<Client>;
  onFormDataChange: (data: Partial<Client>) => void;
  isEditing?: boolean;
}

export default function TrackDechetSection({
  formData,
  onFormDataChange,
  isEditing = false
}: TrackDechetSectionProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const { toast } = useToast();

  const handleTrackDechetToggle = (enabled: boolean) => {
    onFormDataChange({
      ...formData,
      trackDechetEnabled: enabled,
      trackDechetValidated: enabled ? formData.trackDechetValidated : false
    });
  };

  const handleTokenChange = (token: string) => {
    onFormDataChange({
      ...formData,
      trackDechetToken: token,
      trackDechetValidated: false,
      trackDechetValidatedAt: undefined
    });
  };

  const validateToken = async () => {
    if (!formData.trackDechetToken) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un token API",
        variant: "destructive"
      });
      return;
    }

    setIsValidating(true);
    try {
      const isValid = await validateTrackDechetToken(formData.trackDechetToken);
      
      if (isValid) {
        onFormDataChange({
          ...formData,
          trackDechetValidated: true,
          trackDechetValidatedAt: new Date()
        });
        toast({
          title: "Token validé",
          description: "Votre token Track Déchet est valide et fonctionnel"
        });
      } else {
        onFormDataChange({
          ...formData,
          trackDechetValidated: false,
          trackDechetValidatedAt: undefined
        });
        toast({
          title: "Token invalide",
          description: "Le token fourni n'est pas valide ou a expiré",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erreur de validation",
        description: "Impossible de valider le token. Vérifiez votre connexion.",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

  // N'afficher la section que pour les professionnels
  if (formData.typeClient === 'particulier') {
    return null;
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="text-primary">Track Déchet</span>
            <Badge variant="secondary" className="text-xs">
              Professionnel
            </Badge>
          </span>
          <Switch
            checked={formData.trackDechetEnabled || false}
            onCheckedChange={handleTrackDechetToggle}
          />
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Activez Track Déchet pour générer automatiquement des bordereaux de suivi des déchets (BSD)
        </p>
      </CardHeader>

      {formData.trackDechetEnabled && (
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trackDechetToken">Token API Track Déchet *</Label>
            <div className="flex gap-2">
              <Input
                id="trackDechetToken"
                type={showToken ? "text" : "password"}
                value={formData.trackDechetToken || ""}
                onChange={(e) => handleTokenChange(e.target.value)}
                placeholder="Votre token API Track Déchet"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowToken(!showToken)}
                className="shrink-0"
              >
                {showToken ? "Masquer" : "Afficher"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={validateToken}
                disabled={!formData.trackDechetToken || isValidating}
                className="shrink-0"
              >
                {isValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Tester"
                )}
              </Button>
            </div>
          </div>

          {/* Statut de validation */}
          {formData.trackDechetToken && (
            <div className="flex items-center gap-2">
              {formData.trackDechetValidated ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">
                    Token validé le {formData.trackDechetValidatedAt ? 
                      new Date(formData.trackDechetValidatedAt).toLocaleDateString() : 
                      'récemment'
                    }
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm text-orange-600">
                    Token non validé - testez la connexion
                  </span>
                </>
              )}
            </div>
          )}

          {/* Guide d'aide */}
          <div className="bg-muted/50 p-3 rounded-lg space-y-2">
            <h4 className="text-sm font-medium">Comment obtenir votre token ?</h4>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Connectez-vous à votre compte Track Déchet</li>
              <li>Allez dans "Mon compte" → "Intégrations"</li>
              <li>Générez un nouveau token API</li>
              <li>Copiez et collez le token ci-dessus</li>
            </ol>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              asChild
            >
              <a
                href="https://trackdechets.beta.gouv.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1"
              >
                Accéder à Track Déchet
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>

          {/* Avantages */}
          <div className="text-xs text-muted-foreground">
            <strong>Avantages :</strong> Génération automatique des BSD, 
            traçabilité complète, conformité réglementaire.
          </div>
        </CardContent>
      )}
    </Card>
  );
}