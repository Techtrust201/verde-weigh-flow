import { useState, useEffect } from 'react';
import { db, SageTemplate } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';

export const useSageTemplates = () => {
  const [templates, setTemplates] = useState<SageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const templatesData = await db.sageTemplates
        .orderBy('createdAt')
        .reverse()
        .toArray();
      setTemplates(templatesData);
    } catch (error) {
      console.error('Error loading Sage templates:', error);
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
  }, []);

  const saveTemplate = async (template: SageTemplate): Promise<void> => {
    try {
      if (template.id) {
        await db.sageTemplates.update(template.id, {
          ...template,
          updatedAt: new Date(),
        });
      } else {
        await db.sageTemplates.add({
          ...template,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      await loadTemplates();
      toast({
        title: "Template sauvegardé",
        description: `Le template "${template.name}" a été sauvegardé avec succès.`,
      });
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Erreur de sauvegarde",
        description: "Impossible de sauvegarder le template.",
        variant: "destructive",
      });
    }
  };

  const deleteTemplate = async (templateId: number): Promise<void> => {
    try {
      await db.sageTemplates.delete(templateId);
      await loadTemplates();
      toast({
        title: "Template supprimé",
        description: "Le template a été supprimé avec succès.",
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Erreur de suppression",
        description: "Impossible de supprimer le template.",
        variant: "destructive",
      });
    }
  };

  const getActiveTemplates = (): SageTemplate[] => {
    return templates.filter(template => template.isActive);
  };

  return {
    templates,
    isLoading,
    loadTemplates,
    saveTemplate,
    deleteTemplate,
    getActiveTemplates,
  };
};
