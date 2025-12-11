import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  Settings,
  Key,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Package,
} from "lucide-react";
import { UserSettings } from "@/lib/database";

interface SageSettingsProps {
  settings: UserSettings;
  onSettingsChange: (settings: UserSettings) => void;
  onSave: () => Promise<void>;
}

export default function SageSettings({
  settings,
  onSettingsChange,
  onSave,
}: SageSettingsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const handleInputChange = (
    field: keyof UserSettings,
    value: string | number
  ) => {
    onSettingsChange({
      ...settings,
      [field]: value,
    });
  };

  const handleSave = async () => {
    await onSave();
    setIsEditing(false);
  };

  const hasApiKey =
    settings.cleAPISage && settings.cleAPISage.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          Configuration Sage
          <Badge
            variant={hasApiKey ? "default" : "secondary"}
            className="text-xs"
          >
            {hasApiKey ? "Configuré" : "Non configuré"}
          </Badge>
        </h2>
        <div className="space-x-2">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              <Settings className="h-4 w-4 mr-2" />
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
        {/* Configuration API */}
        <Card
          className={
            hasApiKey
              ? "border-green-200 bg-green-50/50"
              : "border-orange-200 bg-orange-50/50"
          }
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Authentification API Sage
              {hasApiKey ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-orange-600" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="cleAPISage">Clé API Sage</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="cleAPISage"
                  type={showApiKey ? "text" : "password"}
                  value={settings.cleAPISage || ""}
                  onChange={(e) =>
                    handleInputChange("cleAPISage", e.target.value)
                  }
                  disabled={!isEditing}
                  placeholder="Votre clé API Sage"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowApiKey(!showApiKey)}
                  disabled={!isEditing}
                >
                  {showApiKey ? "Masquer" : "Afficher"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Cette clé permet la synchronisation automatique avec votre
                logiciel Sage
              </p>
            </div>

            {/* Statut de la configuration */}
            <div
              className={`p-3 rounded-lg border ${
                hasApiKey
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-orange-50 border-orange-200 text-orange-700"
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-medium mb-1">
                {hasApiKey ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    API Sage configurée
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4" />
                    API Sage non configurée
                  </>
                )}
              </div>
              <p className="text-xs">
                {hasApiKey
                  ? "L'export vers Sage est disponible. Vous pouvez synchroniser vos données comptables."
                  : "Configurez votre clé API pour activer l'export automatique vers Sage."}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Paramètres d'export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Paramètres d'export
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">
                Fonctionnalités disponibles :
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      hasApiKey ? "bg-green-500" : "bg-gray-300"
                    }`}
                  ></div>
                  <span
                    className={
                      hasApiKey ? "text-foreground" : "text-muted-foreground"
                    }
                  >
                    Export automatique des pesées
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      hasApiKey ? "bg-green-500" : "bg-gray-300"
                    }`}
                  ></div>
                  <span
                    className={
                      hasApiKey ? "text-foreground" : "text-muted-foreground"
                    }
                  >
                    Synchronisation des clients
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      hasApiKey ? "bg-green-500" : "bg-gray-300"
                    }`}
                  ></div>
                  <span
                    className={
                      hasApiKey ? "text-foreground" : "text-muted-foreground"
                    }
                  >
                    Templates d'import personnalisés
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      hasApiKey ? "bg-green-500" : "bg-gray-300"
                    }`}
                  ></div>
                  <span
                    className={
                      hasApiKey ? "text-foreground" : "text-muted-foreground"
                    }
                  >
                    Mapping des données automatique
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Guide d'aide */}
      <Card>
        <CardHeader>
          <CardTitle>Comment configurer Sage ?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-2">
                Étapes de configuration :
              </h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Connectez-vous à votre interface Sage</li>
                <li>Accédez aux paramètres d'API/intégrations</li>
                <li>
                  Générez une nouvelle clé API avec les droits de
                  lecture/écriture
                </li>
                <li>Copiez et collez la clé dans le champ ci-dessus</li>
                <li>Testez la connexion depuis l'espace "Exports"</li>
              </ol>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h5 className="text-sm font-medium text-blue-800 mb-1">
                Besoin d'aide ?
              </h5>
              <p className="text-xs text-blue-700">
                Contactez votre administrateur Sage ou notre support technique
                pour obtenir assistance dans la configuration de l'API.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
