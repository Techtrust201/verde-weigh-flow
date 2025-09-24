import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, CheckCircle, ExternalLink, Loader2, XCircle, Info, Settings } from 'lucide-react';
import { validateTrackDechetTokenDetailed, ValidationResult } from '@/utils/trackdechetApi';
import { getGlobalSettings, updateTrackDechetSettings, GlobalSettings } from '@/lib/globalSettings';
import { useToast } from '@/hooks/use-toast';

export default function TrackDechetGlobalSettings() {
  const [settings, setSettings] = useState<GlobalSettings>({});
  const [isValidating, setIsValidating] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [validationTimeoutId, setValidationTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Charger les paramètres au montage
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const globalSettings = await getGlobalSettings();
      setSettings(globalSettings);
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les paramètres",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
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
    
    // Mettre à jour les paramètres
    try {
      await updateTrackDechetSettings({
        validated: result.isValid,
        validatedAt: result.isValid ? new Date() : undefined
      });
      
      // Recharger les paramètres
      await loadSettings();
    } catch (error) {
      console.error('Erreur sauvegarde validation:', error);
    }
    
    setIsValidating(false);
  }, []);

  const handleTrackDechetToggle = async (enabled: boolean) => {
    try {
      await updateTrackDechetSettings({ enabled });
      setSettings(prev => ({ ...prev, trackDechetEnabled: enabled }));
      
      toast({
        title: enabled ? "Track Déchet activé" : "Track Déchet désactivé",
        description: enabled 
          ? "Vous pouvez maintenant configurer votre token API" 
          : "Track Déchet est désormais désactivé pour tous les clients"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le paramètre",
        variant: "destructive"
      });
    }
  };

  const handleTokenChange = async (token: string) => {
    try {
      await updateTrackDechetSettings({ 
        token,
        validated: false,
        validatedAt: undefined
      });
      
      setSettings(prev => ({ 
        ...prev, 
        trackDechetToken: token,
        trackDechetValidated: false,
        trackDechetValidatedAt: undefined
      }));

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
        }, 2000);
        
        setValidationTimeoutId(timeoutId);
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le token",
        variant: "destructive"
      });
    }
  };

  const handleSandboxToggle = async (sandboxMode: boolean) => {
    try {
      await updateTrackDechetSettings({ 
        sandboxMode,
        validated: false, // Revalider avec le nouvel environnement
        validatedAt: undefined
      });
      
      setSettings(prev => ({ 
        ...prev, 
        trackDechetSandboxMode: sandboxMode,
        trackDechetValidated: false,
        trackDechetValidatedAt: undefined
      }));
      
      // Si on a un token, le revalider
      if (settings.trackDechetToken) {
        debouncedValidation(settings.trackDechetToken);
      }
      
      toast({
        title: sandboxMode ? "Mode sandbox activé" : "Mode production activé",
        description: sandboxMode 
          ? "Vous utilisez maintenant l'environnement de test" 
          : "Vous utilisez maintenant l'environnement de production"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'environnement",
        variant: "destructive"
      });
    }
  };

  const validateToken = async () => {
    if (!settings.trackDechetToken) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un token API",
        variant: "destructive"
      });
      return;
    }

    await debouncedValidation(settings.trackDechetToken);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (validationTimeoutId) {
        clearTimeout(validationTimeoutId);
      }
    };
  }, [validationTimeoutId]);

  // Fonction pour obtenir l'icône et la couleur selon le statut
  const getValidationStatus = () => {
    if (isValidating) {
      return {
        icon: <Loader2 className="h-4 w-4 animate-spin text-blue-500" />,
        message: "Validation en cours...",
        className: "text-blue-600"
      };
    }

    if (!settings.trackDechetToken) {
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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Chargement des paramètres...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <span className="text-primary">Configuration Track Déchet</span>
            <Badge variant="secondary" className="text-xs">
              Global
            </Badge>
          </span>
          <Switch
            checked={settings.trackDechetEnabled || false}
            onCheckedChange={handleTrackDechetToggle}
          />
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configuration globale pour générer automatiquement des bordereaux de suivi des déchets (BSD)
        </p>
      </CardHeader>

      {settings.trackDechetEnabled && (
        <CardContent className="space-y-6">
          {/* Mode sandbox/production */}
          <div className="space-y-2">
            <Label>Environnement</Label>
            <div className="flex items-center space-x-2">
              <Switch
                checked={settings.trackDechetSandboxMode || false}
                onCheckedChange={handleSandboxToggle}
              />
              <span className="text-sm">
                {settings.trackDechetSandboxMode ? 'Mode sandbox (test)' : 'Mode production'}
              </span>
              <Badge variant={settings.trackDechetSandboxMode ? "secondary" : "default"} className="text-xs">
                {settings.trackDechetSandboxMode ? 'TEST' : 'PROD'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Utilisez le mode sandbox pour vos tests, puis basculez en production
            </p>
          </div>

          {/* Token API */}
          <div className="space-y-2">
            <Label htmlFor="trackDechetToken">Token API Track Déchet *</Label>
            <div className="flex gap-2">
              <Input
                id="trackDechetToken"
                type={showToken ? "text" : "password"}
                value={settings.trackDechetToken || ""}
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
                disabled={!settings.trackDechetToken || isValidating}
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
                href={settings.trackDechetSandboxMode 
                  ? "https://sandbox.trackdechets.beta.gouv.fr" 
                  : "https://trackdechets.beta.gouv.fr"
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1"
              >
                Accéder à Track Déchet {settings.trackDechetSandboxMode && '(Sandbox)'}
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>

          {/* Configuration globale info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="text-sm font-medium text-blue-800 mb-1">
              Configuration globale
            </h4>
            <p className="text-xs text-blue-700">
              Ce token sera utilisé pour tous les clients professionnels ayant Track Déchet activé. 
              Vous n'avez besoin de le configurer qu'une seule fois.
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}