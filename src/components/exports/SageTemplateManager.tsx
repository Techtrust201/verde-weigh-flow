import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Trash2,
  Plus,
  Eye,
  Settings,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { SageTemplate } from "@/lib/database";
import { db } from "@/lib/database";
import { useToast } from "@/hooks/use-toast";
import SageTemplateCreator from "@/components/import/SageTemplateCreator";

export default function SageTemplateManager() {
  const [templates, setTemplates] = useState<SageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showTemplateCreator, setShowTemplateCreator] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SageTemplate | null>(
    null
  );
  const { toast } = useToast();

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="text-sm text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Liste des templates</CardTitle>
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
