import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Settings,
  Trash2,
  Eye,
  Save,
  X,
} from "lucide-react";
import {
  SageTemplate,
  SageColumn,
  ColumnMapping,
  DATA_SOURCES,
  TRANSFORMATION_FUNCTIONS,
  INTELLIGENT_MAPPINGS,
  DataSourceId,
} from "@/types/sageTemplate";
import { useToast } from "@/hooks/use-toast";

interface SageTemplateMapperProps {
  template: SageTemplate;
  onSave: (template: SageTemplate) => void;
  onCancel: () => void;
  onTest: (template: SageTemplate) => void;
  isTesting?: boolean;
  onTemplateUpdate?: (template: SageTemplate) => void;
}

export default function SageTemplateMapper({
  template,
  onSave,
  onCancel,
  onTest,
  isTesting = false,
  onTemplateUpdate,
}: SageTemplateMapperProps) {
  const [templateName, setTemplateName] = useState(template.name);
  const [templateDescription, setTemplateDescription] = useState(
    template.description || ""
  );
  const [mappings, setMappings] = useState<ColumnMapping[]>(template.mappings);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  // Mettre à jour le template parent quand le nom ou la description change
  useEffect(() => {
    if (onTemplateUpdate) {
      const updatedTemplate = {
        ...template,
        name: templateName,
        description: templateDescription,
        mappings,
      };
      onTemplateUpdate(updatedTemplate);
    }
  }, [templateName, templateDescription, mappings, template, onTemplateUpdate]);

  // Appliquer le mapping intelligent
  const applyIntelligentMapping = useCallback(() => {
    const newMappings = template.sageColumns.map((column) => {
      // Si la colonne est vide dans le fichier, la mapper à "vide"
      if (!column.example) {
        return {
          sageColumn: column.name,
          dataSource: "vide" as DataSourceId,
          dataField: "vide",
          transformation: "none",
          defaultValue: "",
          isConfigured: true,
        };
      }

      const intelligentMapping = INTELLIGENT_MAPPINGS[column.name];

      if (intelligentMapping) {
        return {
          sageColumn: column.name,
          dataSource: intelligentMapping.dataSource as DataSourceId,
          dataField: intelligentMapping.dataField,
          transformation: "none",
          defaultValue: "",
          isConfigured: true,
        };
      }

      // Si pas de mapping intelligent et pas vide, par défaut à "vide"
      return {
        sageColumn: column.name,
        dataSource: "vide" as DataSourceId,
        dataField: "vide",
        transformation: "none",
        defaultValue: "",
        isConfigured: true,
      };
    });

    setMappings(newMappings as ColumnMapping[]);
    toast({
      title: "Mapping intelligent (colonnes vides → vide) appliqué",
      description: "Les correspondances automatiques ont été configurées.",
    });
  }, [template.sageColumns, toast]);

  // Mettre à jour un mapping
  const updateMapping = useCallback(
    (
      columnName: string,
      field: keyof ColumnMapping,
      value: string | boolean
    ) => {
      setMappings((prev) =>
        prev.map((mapping) =>
          mapping.sageColumn === columnName
            ? {
                ...mapping,
                [field]: value,
                isConfigured: true,
                // Si la source est "vide", considérer comme configuré même sans champ spécifique
                ...(value === "vide" && field === "dataSource"
                  ? { dataField: "vide", transformation: "none" }
                  : {}),
              }
            : mapping
        )
      );
    },
    []
  );

  // Obtenir les champs disponibles pour une source de données
  const getAvailableFields = useCallback((dataSource: string) => {
    const source = DATA_SOURCES.find((s) => s.id === dataSource);
    return source?.fields || [];
  }, []);

  // Valider le template
  const validateTemplate = useCallback(() => {
    const configuredMappings = mappings.filter((m) => m.isConfigured);
    const requiredColumns = template.sageColumns.filter((c) => c.required);
    const configuredRequired = requiredColumns.filter((col) =>
      configuredMappings.some((m) => m.sageColumn === col.name)
    );

    return {
      isValid: configuredRequired.length === requiredColumns.length,
      configuredCount: configuredMappings.length,
      totalCount: template.sageColumns.length,
      missingRequired: requiredColumns.filter(
        (col) => !configuredMappings.some((m) => m.sageColumn === col.name)
      ),
    };
  }, [mappings, template.sageColumns]);

  const validation = validateTemplate();

  // Sauvegarder le template
  const handleSave = useCallback(() => {
    if (!templateName.trim()) {
      toast({
        title: "Nom requis",
        description: "Veuillez donner un nom à votre template.",
        variant: "destructive",
      });
      return;
    }

    const updatedTemplate: SageTemplate = {
      ...template,
      name: templateName.trim(),
      description: templateDescription.trim(),
      mappings,
      updatedAt: new Date(),
    };

    onSave(updatedTemplate);
  }, [template, templateName, templateDescription, mappings, onSave, toast]);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuration du template Sage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="template-name">Nom du template *</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Ex: Sage 50 - Comptabilité"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="template-description">Description</Label>
              <Input
                id="template-description"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Description optionnelle"
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button onClick={applyIntelligentMapping} variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Mapping intelligent (colonnes vides → vide)
            </Button>
            <div className="text-sm text-muted-foreground">
              {validation.configuredCount} / {validation.totalCount} colonnes
              configurées
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statut de validation */}
      {!validation.isValid && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Configuration incomplète</p>
              <p className="text-sm">
                {validation.missingRequired.length} colonne(s) obligatoire(s)
                non configurée(s) :
                {validation.missingRequired.map((col) => (
                  <Badge key={col.name} variant="outline" className="ml-2">
                    {col.name}
                  </Badge>
                ))}
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Interface de mapping */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration des correspondances</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {template.sageColumns.map((column, index) => {
              const mapping = mappings.find(
                (m) => m.sageColumn === column.name
              );
              const availableFields = getAvailableFields(
                mapping?.dataSource || "pesee"
              );

              return (
                <div key={column.name} className="border rounded-lg p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
                    {/* Colonne Sage */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            column.required
                              ? "destructive"
                              : column.example
                              ? "default"
                              : "outline"
                          }
                        >
                          {column.required
                            ? "Obligatoire"
                            : column.example
                            ? "Avec données"
                            : "Vide"}
                        </Badge>
                        {(mapping?.dataSource as DataSourceId) === "vide" &&
                          !column.example && (
                            <Badge variant="secondary" className="text-xs">
                              🤖 Auto-vide
                            </Badge>
                          )}
                        {(mapping?.dataSource as DataSourceId) !== "vide" &&
                          mapping?.isConfigured && (
                            <Badge variant="secondary" className="text-xs">
                              🎯 Auto-mappé
                            </Badge>
                          )}
                        {mapping?.isConfigured && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium">{column.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {column.type} • Position {column.position}
                        </p>
                        {column.example && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Ex: {column.example}
                          </p>
                        )}
                        {!column.example && (
                          <p className="text-xs text-orange-500 mt-1">
                            ⚠️ Colonne vide dans le fichier
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Flèche */}
                    <div className="flex justify-center">
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>

                    {/* Configuration */}
                    <div className="space-y-2">
                      <div>
                        <Label className="text-sm">Source de données</Label>
                        <Select
                          value={mapping?.dataSource || "vide"}
                          onValueChange={(value) =>
                            updateMapping(column.name, "dataSource", value)
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DATA_SOURCES.map((source) => (
                              <SelectItem key={source.id} value={source.id}>
                                <div className="flex items-center gap-2">
                                  <span>{source.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {(mapping?.dataSource as DataSourceId) !== "vide" && (
                        <div>
                          <Label className="text-sm">Champ spécifique</Label>
                          <Select
                            value={mapping?.dataField || ""}
                            onValueChange={(value) =>
                              updateMapping(column.name, "dataField", value)
                            }
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Sélectionner un champ" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableFields.map((field) => (
                                <SelectItem key={field.name} value={field.name}>
                                  <div>
                                    <div className="font-medium">
                                      {field.label}
                                    </div>
                                    {field.description && (
                                      <div className="text-xs text-muted-foreground">
                                        {field.description}
                                      </div>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {(mapping?.dataSource as DataSourceId) !== "vide" && (
                        <div>
                          <Label className="text-sm">Transformation</Label>
                          <Select
                            value={mapping?.transformation || "none"}
                            onValueChange={(value) =>
                              updateMapping(
                                column.name,
                                "transformation",
                                value
                              )
                            }
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TRANSFORMATION_FUNCTIONS.map((func) => (
                                <SelectItem key={func.id} value={func.id}>
                                  <div>
                                    <div className="font-medium">
                                      {func.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {func.description}
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-center gap-4 pt-6 border-t">
        <Button variant="outline" onClick={onCancel} className="px-6">
          <X className="h-4 w-4 mr-2" />
          Retour à l'import
        </Button>
        <Button
          onClick={() => onTest({ ...template, mappings })}
          disabled={!validation.isValid || isTesting}
          className="px-6"
        >
          <Eye className="h-4 w-4 mr-2" />
          {isTesting ? "Test en cours..." : "Tester le template"}
        </Button>
      </div>
    </div>
  );
}
