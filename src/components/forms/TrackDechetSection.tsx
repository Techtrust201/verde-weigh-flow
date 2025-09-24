import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, CheckCircle, ExternalLink, Loader2, XCircle, Info } from 'lucide-react';
import { Client } from '@/lib/database';
import { validateTrackDechetTokenDetailed, ValidationResult } from '@/utils/trackdechetApi';
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
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [validationTimeoutId, setValidationTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const handleTrackDechetToggle = (enabled: boolean) => {
    onFormDataChange({
      ...formData,
      trackDechetEnabled: enabled,
      trackDechetValidated: enabled ? formData.trackDechetValidated : false
    });
  };

  // Validation automatique avec debounce
  const debouncedValidation = useCallback(async (token: string) => {
    if (!token || token.trim().length === 0) {
      setValidationResult(null);
      return;
    }

    setIsValidating(true);
    const result = await validateTrackDechetTokenDetailed(token);
    setValidationResult(result);
    
    if (result.isValid) {
      onFormDataChange({
        ...formData,
        trackDechetValidated: true,
        trackDechetValidatedAt: new Date()
      });
    } else {
      onFormDataChange({
        ...formData,
        trackDechetValidated: false,
        trackDechetValidatedAt: undefined
      });
    }
    
    setIsValidating(false);
  }, [formData, onFormDataChange]);

  const handleTokenChange = (token: string) => {
    onFormDataChange({
      ...formData,
      trackDechetToken: token,
      trackDechetValidated: false,
      trackDechetValidatedAt: undefined
    });

    // Clear previous validation
    setValidationResult(null);
    
    // Clear existing timeout
    if (validationTimeoutId) {
      clearTimeout(validationTimeoutId);
    }

    // Set new timeout for auto-validation
    if (token && token.trim().length >= 10) {
      const timeoutId = setTimeout(() => {
        debouncedValidation(token);
      }, 2000); // 2 secondes de délai
      
      setValidationTimeoutId(timeoutId);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (validationTimeoutId) {
        clearTimeout(validationTimeoutId);
      }
    };
  }, [validationTimeoutId]);

  const validateToken = async () => {
    if (!formData.trackDechetToken) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un token API",
        variant: "destructive"
      });
      return;
    }

    await debouncedValidation(formData.trackDechetToken);
  };

  // Fonction pour obtenir l'icône et la couleur selon le statut
  const getValidationStatus = () => {
    if (isValidating) {
      return {
        icon: <Loader2 className="h-4 w-4 animate-spin text-blue-500" />,
        message: "Validation en cours...",
        className: "text-blue-600"
      };
    }

    if (!formData.trackDechetToken) {
      return null;
    }

    if (validationResult) {
      if (validationResult.isValid) {
        return {
          icon: <CheckCircle className="h-4 w-4 text-green-500" />,
          message: `Token validé pour ${validationResult.userInfo?.name || 'utilisateur inconnu'}`,
          className: "text-green-600"
        };
      } else {
        let icon = <XCircle className="h-4 w-4 text-red-500" />;
        let className = "text-red-600";
        
        if (validationResult.errorType === 'format') {
          icon = <Info className="h-4 w-4 text-orange-500" />;
          className = "text-orange-600";
        }

        return {
          icon,
          message: validationResult.errorMessage || "Token invalide",
          className
        };
      }
    }

    // Token présent mais pas encore validé
    return {
      icon: <AlertCircle className="h-4 w-4 text-orange-500" />,
      message: "Token en attente de validation...",
      className: "text-orange-600"
    };
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
          {(() => {
            const status = getValidationStatus();
            if (!status) return null;
            
            return (
              <div className="flex items-center gap-2">
                {status.icon}
                <span className={`text-sm ${status.className}`}>
                  {status.message}
                </span>
              </div>
            );
          })()}

          {/* Conseils selon le type d'erreur */}
          {validationResult && !validationResult.isValid && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-red-800 mb-2">
                Que faire ?
              </h4>
              <div className="text-xs text-red-700 space-y-1">
                {validationResult.errorType === 'format' && (
                  <p>Vérifiez que vous avez copié le token complet depuis Track Déchet.</p>
                )}
                {validationResult.errorType === 'invalid_token' && (
                  <>
                    <p>• Vérifiez que le token n'a pas expiré</p>
                    <p>• Générez un nouveau token si nécessaire</p>
                    <p>• Assurez-vous d'avoir copié le token complet</p>
                  </>
                )}
                {validationResult.errorType === 'permissions' && (
                  <p>Ce token n'a pas les permissions nécessaires. Contactez votre administrateur Track Déchet.</p>
                )}
                {validationResult.errorType === 'network' && (
                  <p>Problème de connexion. Vérifiez votre réseau et réessayez.</p>
                )}
              </div>
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