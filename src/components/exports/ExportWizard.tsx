import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  Package,
  Calendar,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Database,
  Settings,
} from "lucide-react";
import ExportStepIndicator from "./ExportStepIndicator";
import ExportTypeCard from "./ExportTypeCard";
import ExportFormatCard from "./ExportFormatCard";
import ExportDatePicker from "./ExportDatePicker";
import ExportPreviewTable from "./ExportPreviewTable";
import ExportSummaryCard from "./ExportSummaryCard";
import SageTemplateSelector from "./SageTemplateSelector";
import SageTemplateCreator from "@/components/import/SageTemplateCreator";
import { useExportWizard, ExportType } from "@/hooks/useExportWizard";
import { ExportFormat, ExportStats, useExportData } from "@/hooks/useExportData";
import { db, Pesee, Product, SageTemplate } from "@/lib/database";
import { Badge } from "@/components/ui/badge";

const steps = [
  {
    number: 1,
    title: "Type d'export",
    description: "Choisissez vos données",
  },
  {
    number: 2,
    title: "Format",
    description: "Sélectionnez le format",
  },
  {
    number: 3,
    title: "Configuration",
    description: "Dates et options",
  },
  {
    number: 4,
    title: "Preview & Export",
    description: "Vérifiez et exportez",
  },
];

interface ExportWizardProps {
  onExportComplete?: () => void;
}

export default function ExportWizard({ onExportComplete }: ExportWizardProps) {
  const wizard = useExportWizard();
  const { exportToCSV, getExportStats, isLoading } = useExportData();

  const [previewPesees, setPreviewPesees] = useState<Pesee[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<ExportStats | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<SageTemplate | null>(null);
  const [showTemplateCreator, setShowTemplateCreator] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SageTemplate | null>(null);

  // Load products on mount
  useEffect(() => {
    loadProducts();
  }, []);

  // Load data when configuration changes
  useEffect(() => {
    if (wizard.state.currentStep >= 3 && wizard.state.startDate && wizard.state.endDate) {
      loadPreviewData();
      updateStats();
    }
  }, [
    wizard.state.startDate,
    wizard.state.endDate,
    wizard.state.exportType,
    wizard.state.currentStep,
  ]);

  // Load selected template
  useEffect(() => {
    const loadTemplate = async () => {
      if (wizard.state.templateId) {
        const template = await db.sageTemplates.get(wizard.state.templateId);
        setSelectedTemplate(template || null);
      } else {
        setSelectedTemplate(null);
      }
    };
    loadTemplate();
  }, [wizard.state.templateId]);

  const loadProducts = async () => {
    const productsData = await db.products.toArray();
    setProducts(productsData);
  };

  const loadPreviewData = async () => {
    if (!wizard.state.startDate || !wizard.state.endDate) return;

    try {
      let allPesees: Pesee[];

      if (wizard.state.exportType === "complete") {
        allPesees = await db.pesees.toArray();
      } else {
        const startDate = new Date(wizard.state.startDate);
        const endDate = new Date(wizard.state.endDate);
        endDate.setHours(23, 59, 59, 999);

        allPesees = await db.pesees
          .filter(
            (pesee) =>
              pesee.dateHeure >= startDate && pesee.dateHeure <= endDate
          )
          .toArray();
      }

      allPesees.sort(
        (a, b) =>
          new Date(b.dateHeure).getTime() - new Date(a.dateHeure).getTime()
      );

      let filteredPesees: Pesee[];
      switch (wizard.state.exportType) {
        case "new":
          filteredPesees = allPesees.filter(
            (pesee) => !pesee.exportedAt || pesee.exportedAt.length === 0
          );
          break;
        case "complete":
          filteredPesees = allPesees;
          break;
        case "selective":
        default:
          filteredPesees = allPesees;
          break;
      }

      setPreviewPesees(filteredPesees);

      // Auto-select all pesees when data loads
      if (wizard.state.currentStep === 4) {
        wizard.setSelectedPesees(new Set(filteredPesees.map((p) => p.id!)));
      }
    } catch (error) {
      console.error("Error loading preview data:", error);
    }
  };

  const updateStats = async () => {
    if (!wizard.state.startDate || !wizard.state.endDate) return;

    try {
      let exportStats: ExportStats;

      if (wizard.state.exportType === "complete") {
        const allPesees = await db.pesees.toArray();
        const newPesees = allPesees.filter(
          (pesee) => !pesee.exportedAt || pesee.exportedAt.length === 0
        );
        const alreadyExported = allPesees.filter(
          (pesee) => pesee.exportedAt && pesee.exportedAt.length > 0
        );

        exportStats = {
          totalPesees: allPesees.length,
          newPesees: newPesees.length,
          alreadyExported: alreadyExported.length,
        };
      } else {
        const startDate = new Date(wizard.state.startDate);
        const endDate = new Date(wizard.state.endDate);
        endDate.setHours(23, 59, 59, 999);

        exportStats = await getExportStats(startDate, endDate);
      }

      setStats(exportStats);
    } catch (error) {
      console.error("Error updating stats:", error);
    }
  };

  const handleExport = async () => {
    if (!wizard.state.startDate || !wizard.state.endDate || !wizard.state.format) return;

    let startDate: Date;
    let endDate: Date;

    if (wizard.state.exportType === "complete") {
      startDate = new Date(2000, 0, 1);
      endDate = new Date(2100, 11, 31);
    } else {
      startDate = new Date(wizard.state.startDate);
      endDate = new Date(wizard.state.endDate);
      endDate.setHours(23, 59, 59, 999);
    }

    const selectedPesees =
      wizard.state.selectedPeseeIds.size > 0
        ? previewPesees.filter((p) => wizard.state.selectedPeseeIds.has(p.id!))
        : undefined;

    await exportToCSV(
      startDate,
      endDate,
      wizard.state.exportType!,
      selectedPesees,
      wizard.state.format,
      selectedTemplate || undefined
    );

    // Reset wizard and reload data
    setTimeout(async () => {
      await loadPreviewData();
      await updateStats();
      wizard.resetWizard();
      onExportComplete?.();
    }, 100);
  };

  const handleNextStep = () => {
    if (wizard.state.currentStep === 4) {
      handleExport();
    } else {
      wizard.nextStep();
    }
  };

  const canProceed = () => {
    switch (wizard.state.currentStep) {
      case 1:
        return wizard.canProceedToStep2;
      case 2:
        return wizard.canProceedToStep3;
      case 3:
        return wizard.canProceedToStep4;
      case 4:
        return wizard.state.selectedPeseeIds.size > 0;
      default:
        return false;
    }
  };

  const totalAmount = Array.from(wizard.state.selectedPeseeIds)
    .map((id) => previewPesees.find((p) => p.id === id))
    .filter((p) => p !== undefined)
    .reduce((sum, p) => sum + (p!.prixTTC || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <ExportStepIndicator currentStep={wizard.state.currentStep} steps={steps} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Type d'export */}
          {wizard.state.currentStep === 1 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-6">Quel type de données souhaitez-vous exporter ?</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ExportTypeCard
                    icon={FileText}
                    title="Nouveaux BL"
                    description="Exportez uniquement les bons non encore exportés"
                    count={stats?.newPesees}
                    badge="Recommandé"
                    selected={wizard.state.exportType === "new"}
                    onClick={() => wizard.setExportType("new")}
                  />
                  <ExportTypeCard
                    icon={Calendar}
                    title="Période"
                    description="Choisissez une plage de dates spécifique"
                    count={stats?.totalPesees}
                    selected={wizard.state.exportType === "selective"}
                    onClick={() => wizard.setExportType("selective")}
                  />
                  <ExportTypeCard
                    icon={Database}
                    title="Tout"
                    description="Exportez l'intégralité de vos données"
                    selected={wizard.state.exportType === "complete"}
                    onClick={() => wizard.setExportType("complete")}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Format d'export */}
          {wizard.state.currentStep === 2 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-6">Choisissez le format d'export</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ExportFormatCard
                    icon={FileSpreadsheet}
                    title="CSV Standard"
                    description="Format universel compatible avec Excel et autres tableurs"
                    format=".csv"
                    selected={wizard.state.format === "csv"}
                    onClick={() => wizard.setFormat("csv")}
                  />
                  <ExportFormatCard
                    icon={FileText}
                    title="CSV Format TXT"
                    description="Format CSV au format texte, compatible Sage"
                    format=".txt"
                    selected={wizard.state.format === "csv-txt"}
                    onClick={() => wizard.setFormat("csv-txt")}
                  />
                  <ExportFormatCard
                    icon={Package}
                    title="Sage 50 Articles"
                    description="Import des articles dans Sage 50"
                    format=".txt"
                    selected={wizard.state.format === "sage-articles"}
                    onClick={() => wizard.setFormat("sage-articles")}
                  />
                  <ExportFormatCard
                    icon={Database}
                    title="Sage 50 Ventes"
                    description="Import des ventes dans Sage 50"
                    format=".txt"
                    selected={wizard.state.format === "sage-ventes"}
                    onClick={() => wizard.setFormat("sage-ventes")}
                  />
                  <ExportFormatCard
                    icon={FileText}
                    title="Sage 50 BL Complets"
                    description="Bons de livraison complets pour Sage 50"
                    format=".txt"
                    recommended
                    selected={wizard.state.format === "sage-bl-complet"}
                    onClick={() => wizard.setFormat("sage-bl-complet")}
                  />
                  <ExportFormatCard
                    icon={Settings}
                    title="Template personnalisé"
                    description="Utilisez vos propres templates d'export"
                    format=".txt"
                    selected={wizard.state.format === "sage-template"}
                    onClick={() => wizard.setFormat("sage-template")}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Configuration */}
          {wizard.state.currentStep === 3 && (
            <div className="space-y-6">
              {wizard.state.exportType !== "complete" && (
                <ExportDatePicker
                  startDate={wizard.state.startDate}
                  endDate={wizard.state.endDate}
                  onDateChange={wizard.setDateRange}
                />
              )}

              {wizard.state.format === "sage-template" && (
                <Card>
                  <CardContent className="p-6">
                    <SageTemplateSelector
                      selectedTemplateId={wizard.state.templateId}
                      onTemplateSelect={wizard.setTemplateId}
                      onCreateNew={() => {
                        setEditingTemplate(null);
                        setShowTemplateCreator(true);
                      }}
                      onEditExisting={(templateId) => {
                        if (selectedTemplate) {
                          setEditingTemplate(selectedTemplate);
                          setShowTemplateCreator(true);
                        }
                      }}
                    />
                  </CardContent>
                </Card>
              )}

              {stats && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Statistiques</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 rounded-lg bg-primary/5 border border-primary/20">
                        <div className="text-3xl font-bold text-primary">
                          {stats.totalPesees}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Total pesées
                        </div>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                        <div className="text-3xl font-bold text-green-600">
                          {stats.newPesees}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Nouvelles
                        </div>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-orange-500/5 border border-orange-500/20">
                        <div className="text-3xl font-bold text-orange-600">
                          {stats.alreadyExported}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Déjà exportées
                        </div>
                      </div>
                    </div>
                    {stats.totalPesees > 0 && (
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Progression d'export</span>
                          <span>
                            {Math.round(
                              (stats.alreadyExported / stats.totalPesees) * 100
                            )}
                            %
                          </span>
                        </div>
                        <Progress
                          value={(stats.alreadyExported / stats.totalPesees) * 100}
                          className="h-2"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 4: Preview & Export */}
          {wizard.state.currentStep === 4 && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Vérifiez et exportez</h2>
                  <Badge variant="secondary" className="text-lg px-4 py-1">
                    {wizard.state.selectedPeseeIds.size} sélectionnée(s)
                  </Badge>
                </div>
                {wizard.state.format !== "sage-articles" && (
                  <ExportPreviewTable
                    pesees={previewPesees}
                    products={products}
                    selectedIds={wizard.state.selectedPeseeIds}
                    onToggleSelection={(id) => {
                      const newSelection = new Set(wizard.state.selectedPeseeIds);
                      if (newSelection.has(id)) {
                        newSelection.delete(id);
                      } else {
                        newSelection.add(id);
                      }
                      wizard.setSelectedPesees(newSelection);
                    }}
                    onSelectAll={() => {
                      wizard.setSelectedPesees(new Set(previewPesees.map((p) => p.id!)));
                    }}
                    onDeselectAll={() => {
                      wizard.setSelectedPesees(new Set());
                    }}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Summary */}
        <div className="lg:col-span-1">
          <ExportSummaryCard
            exportType={wizard.state.exportType}
            format={wizard.state.format}
            startDate={wizard.state.startDate}
            endDate={wizard.state.endDate}
            selectedCount={wizard.state.selectedPeseeIds.size}
            totalCount={previewPesees.length}
            totalAmount={totalAmount}
            templateName={selectedTemplate?.name}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6 border-t">
        <Button
          variant="outline"
          onClick={wizard.prevStep}
          disabled={wizard.state.currentStep === 1}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>

        <Button
          onClick={handleNextStep}
          disabled={!canProceed() || isLoading}
          className="min-w-[150px]"
        >
          {isLoading ? (
            <>Export en cours...</>
          ) : wizard.state.currentStep === 4 ? (
            <>
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </>
          ) : (
            <>
              Suivant
              <ChevronRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>

      {/* Template Creator Dialog */}
      <SageTemplateCreator
        isOpen={showTemplateCreator}
        onClose={() => {
          setShowTemplateCreator(false);
          setEditingTemplate(null);
        }}
        editTemplate={editingTemplate}
        onTemplateCreated={() => {
          setShowTemplateCreator(false);
          setEditingTemplate(null);
        }}
      />
    </div>
  );
}
