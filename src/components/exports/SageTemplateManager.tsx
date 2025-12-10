import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, Settings, AlertCircle, CheckCircle } from "lucide-react";
import {
  SageTemplate,
  ExportFormatConfig,
  db,
  DEFAULT_EXPORT_FORMAT_NAMES,
} from "@/lib/database";
import { useToast } from "@/hooks/use-toast";
import SageTemplateCreator from "@/components/import/SageTemplateCreator";
import ExportFormatNameEditor from "./ExportFormatNameEditor";

export default function SageTemplateManager() {
  const [templates, setTemplates] = useState<SageTemplate[]>([]);
  const [exportFormats, setExportFormats] = useState<ExportFormatConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showTemplateCreator, setShowTemplateCreator] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SageTemplate | null>(
    null
  );
  const { toast } = useToast();

  // Initialiser les formats par défaut s'ils n'existent pas
  const initializeDefaultFormats = async () => {
    try {
      // Charger tous les formats et filtrer côté client pour éviter les problèmes avec les booléens
      const allFormats = await db.exportFormats.toArray();
      const existingDefaultFormats = allFormats.filter(
        (f) => f.isDefault === true
      );

      // Vérifier si tous les formats par défaut existent
      const defaultFormatIds = Object.keys(DEFAULT_EXPORT_FORMAT_NAMES);
      const existingFormatIds = new Set(
        existingDefaultFormats.map((f) => f.formatId)
      );
      const missingFormatIds = defaultFormatIds.filter(
        (id) => !existingFormatIds.has(id)
      );

      if (missingFormatIds.length > 0) {
        const formatsToAdd: ExportFormatConfig[] = missingFormatIds.map(
          (formatId) => ({
            formatId,
            displayName: DEFAULT_EXPORT_FORMAT_NAMES[formatId],
            isDefault: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        );
        await db.exportFormats.bulkAdd(formatsToAdd);
      }
    } catch (error) {
      console.error("Error initializing default formats:", error);
    }
  };

  const loadTemplates = async () => {
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
  };

  const loadExportFormats = async () => {
    try {
      const formatsData = await db.exportFormats.toArray();
      setExportFormats(formatsData);
    } catch (error) {
      console.error("Error loading export formats:", error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger les formats d'export.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const initializeAndLoad = async () => {
      await initializeDefaultFormats();
      await loadExportFormats();
      await loadTemplates();
    };

    initializeAndLoad();

    // Écouter les événements de mise à jour
    const handleTemplatesUpdated = () => {
      loadTemplates();
      loadExportFormats();
    };

    const handleExportFormatsUpdated = () => {
      loadExportFormats();
    };

    window.addEventListener("templatesUpdated", handleTemplatesUpdated);
    window.addEventListener("exportFormatsUpdated", handleExportFormatsUpdated);

    return () => {
      window.removeEventListener("templatesUpdated", handleTemplatesUpdated);
      window.removeEventListener(
        "exportFormatsUpdated",
        handleExportFormatsUpdated
      );
    };
  }, []);

  const handleDeleteTemplate = async (templateId: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce template ?")) {
      return;
    }

    try {
      await db.sageTemplates.delete(templateId);
      await loadTemplates();

      // Notifier les autres composants de la suppression
      window.dispatchEvent(new CustomEvent("templatesUpdated"));

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

  const handleTemplateCreated = () => {
    loadTemplates();
    setShowTemplateCreator(false);
  };

  const handleFormatUpdate = () => {
    loadExportFormats();
    window.dispatchEvent(new CustomEvent("exportFormatsUpdated"));
  };

  // Obtenir tous les formats par défaut (depuis la DB ou depuis les constantes)
  const defaultFormatsList = useMemo(() => {
    // Créer une map des formats depuis la DB
    const dbFormatsMap = new Map<string, ExportFormatConfig>();
    exportFormats
      .filter((f) => f.isDefault === true)
      .forEach((format) => {
        dbFormatsMap.set(format.formatId, format);
      });

    // Pour chaque format par défaut, utiliser celui de la DB s'il existe, sinon utiliser la constante
    return Object.keys(DEFAULT_EXPORT_FORMAT_NAMES).map((formatId) => {
      const dbFormat = dbFormatsMap.get(formatId);
      if (dbFormat) {
        return dbFormat;
      }
      // Format pas encore dans la DB, utiliser la constante par défaut
      return {
        formatId,
        displayName: DEFAULT_EXPORT_FORMAT_NAMES[formatId],
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });
  }, [exportFormats]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="text-sm text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Section Formats d'export par défaut */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Formats d'export par défaut</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Format ID</TableHead>
                <TableHead>Nom d'affichage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {defaultFormatsList.map((format) => {
                // Trouver le format dans la DB pour avoir l'ID si disponible
                const dbFormat = exportFormats.find(
                  (f) => f.formatId === format.formatId
                );
                const formatToEdit = dbFormat || format;

                return (
                  <TableRow key={format.formatId}>
                    <TableCell className="font-mono text-sm">
                      {format.formatId}
                    </TableCell>
                    <TableCell>
                      <ExportFormatNameEditor
                        formatConfig={formatToEdit}
                        onUpdate={handleFormatUpdate}
                        isDefault={true}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Section Templates personnalisés */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Templates personnalisés</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Colonnes</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => {
                const configuredCount = template.mappings.filter(
                  (m) => m.isConfigured
                ).length;
                const totalCount = template.sageColumns.length;
                const requiredCount = template.sageColumns.filter(
                  (c) => c.required
                ).length;
                const configuredRequiredCount = template.sageColumns
                  .filter((c) => c.required)
                  .filter((col) =>
                    template.mappings.some(
                      (m) => m.sageColumn === col.name && m.isConfigured
                    )
                  ).length;

                const isComplete = configuredRequiredCount === requiredCount;
                const isEmpty = configuredCount === 0;

                return (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                      {template.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {template.description || "Aucune description"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {configuredCount} / {totalCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isEmpty ? (
                        <Badge variant="secondary">Vide</Badge>
                      ) : isComplete ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Complet
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Incomplet
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(template.createdAt).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingTemplate(template);
                            setShowTemplateCreator(true);
                          }}
                          className="h-8 w-8 p-0"
                          title="Éditer le template"
                        >
                          <Settings className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTemplate(template.id!)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog pour créer/éditer un template Sage */}
      <SageTemplateCreator
        isOpen={showTemplateCreator}
        onClose={() => {
          setShowTemplateCreator(false);
          setEditingTemplate(null);
        }}
        onTemplateCreated={() => {
          setShowTemplateCreator(false);
          setEditingTemplate(null);
          loadTemplates();
        }}
        editTemplate={editingTemplate}
      />
    </div>
  );
}
