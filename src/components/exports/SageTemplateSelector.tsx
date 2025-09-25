import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Settings,
  Eye,
  Trash2,
  Plus,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { SageTemplate } from "@/lib/database";
import { db } from "@/lib/database";
import { useToast } from "@/hooks/use-toast";
import SageTemplateCreator from "@/components/import/SageTemplateCreator";

interface SageTemplateSelectorProps {
  selectedTemplateId: number | null;
  onTemplateSelect: (templateId: number | null) => void;
  onCreateNew?: () => void;
  onEditExisting?: (templateId: number) => void;
}

export default function SageTemplateSelector({
  selectedTemplateId,
  onTemplateSelect,
  onCreateNew,
  onEditExisting,
}: SageTemplateSelectorProps) {
  const [templates, setTemplates] = useState<SageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showTemplateCreator, setShowTemplateCreator] = useState(false);
  const { toast } = useToast();

  const loadTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      const templatesData = await db.sageTemplates
        .orderBy("createdAt")
        .reverse()
        .toArray();
      setTemplates(templatesData);
    } catch (error) {
      console.error("Error loading Sage templates:", error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger les templates Sage.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadTemplates();

    // Écouter les événements de mise à jour des templates
    const handleTemplatesUpdated = () => {
      loadTemplates();
    };

    window.addEventListener("templatesUpdated", handleTemplatesUpdated);

    return () => {
      window.removeEventListener("templatesUpdated", handleTemplatesUpdated);
    };
  }, [loadTemplates]);

  const handleDeleteTemplate = async (templateId: number) => {
    try {
      await db.sageTemplates.delete(templateId);
      await loadTemplates();

      // Si le template supprimé était sélectionné, désélectionner
      if (selectedTemplateId === templateId) {
        onTemplateSelect(null);
      }

      toast({
        title: "Template supprimé",
        description: "Le template a été supprimé avec succès.",
      });
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({
        title: "Erreur de suppression",
        description: "Impossible de supprimer le template.",
        variant: "destructive",
      });
    }
  };

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="template-select">Template Sage</Label>
        <div className="flex gap-2 mt-2">
          <Select
            value={selectedTemplateId?.toString() || ""}
            onValueChange={(value) =>
              onTemplateSelect(value ? parseInt(value) : null)
            }
          >
            <SelectTrigger id="template-select" className="flex-1">
              <SelectValue placeholder="Sélectionner un template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id!.toString()}>
                  <div className="flex items-center justify-between w-full">
                    <span>{template.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="ml-2">
                        {template.mappings.filter((m) => m.isConfigured).length}{" "}
                        / {template.sageColumns.length}
                      </Badge>
                      {/* <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template.id!);
                        }}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button> */}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={() => setShowTemplateCreator(true)}
            variant="outline"
            size="sm"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {selectedTemplate && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuration du template
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{selectedTemplate.name}</h4>
                {selectedTemplate.description && (
                  <p className="text-sm text-muted-foreground">
                    {selectedTemplate.description}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  Colonnes configurées :
                </span>
                <Badge variant="secondary">
                  {
                    selectedTemplate.mappings.filter((m) => m.isConfigured)
                      .length
                  }{" "}
                  / {selectedTemplate.sageColumns.length}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  Colonnes obligatoires :
                </span>
                <Badge
                  variant={
                    selectedTemplate.sageColumns
                      .filter((c) => c.required)
                      .every((col) =>
                        selectedTemplate.mappings.some(
                          (m) => m.sageColumn === col.name && m.isConfigured
                        )
                      )
                      ? "default"
                      : "destructive"
                  }
                >
                  {
                    selectedTemplate.sageColumns
                      .filter((c) => c.required)
                      .filter((col) =>
                        selectedTemplate.mappings.some(
                          (m) => m.sageColumn === col.name && m.isConfigured
                        )
                      ).length
                  }{" "}
                  /{" "}
                  {
                    selectedTemplate.sageColumns.filter((c) => c.required)
                      .length
                  }
                </Badge>
              </div>
            </div>

            {selectedTemplate.mappings.filter((m) => m.isConfigured).length ===
              0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Ce template n'a aucune colonne configurée. Créez un nouveau
                  template ou configurez celui-ci.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  if (onEditExisting && selectedTemplateId) {
                    onEditExisting(selectedTemplateId);
                  } else {
                    setShowTemplateCreator(true);
                  }
                }}
              >
                <Settings className="h-4 w-4 mr-2" />
                Éditer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {templates.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p>Aucun template Sage configuré.</p>
              <p className="text-sm">
                Créez votre premier template en important un fichier Sage 50 et
                en configurant les correspondances.
              </p>
              <Button
                onClick={() => {
                  if (onCreateNew) {
                    onCreateNew();
                  } else {
                    setShowTemplateCreator(true);
                  }
                }}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Créer un template
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Dialog pour créer/modifier un template */}
      <SageTemplateCreator
        isOpen={showTemplateCreator}
        onClose={() => {
          setShowTemplateCreator(false);
          loadTemplates(); // Recharger les templates après fermeture
        }}
      />
    </div>
  );
}
