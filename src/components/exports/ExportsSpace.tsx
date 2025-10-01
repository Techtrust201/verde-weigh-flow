import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  FileText,
  Calendar,
  Database,
  History,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Eye,
  Check,
  X,
  Upload,
  Plus,
} from "lucide-react";
import { db, Pesee, Product, SageTemplate } from "@/lib/database";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useExportData, ExportStats } from "@/hooks/useExportData";

// Types locaux pour l'export
type ExportFormat = "pdf" | "csv" | "excel" | "sage-articles" | "sage-template";

export default function ExportsSpace() {
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [exportStats, setExportStats] = useState<ExportStats | null>(null);
  const [selectedExportType, setSelectedExportType] = useState<
    "new" | "selective" | "complete"
  >("new");
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("csv");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    null
  );
  const [selectedTemplate, setSelectedTemplate] = useState<SageTemplate | null>(
    null
  );
  const [previewPesees, setPreviewPesees] = useState<Pesee[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedPeseeIds, setSelectedPeseeIds] = useState<Set<number>>(
    new Set()
  );
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplateCreator, setShowTemplateCreator] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SageTemplate | null>(
    null
  );

  const {
    exportLogs,
    isLoading,
    getExportStats,
    exportToCSV,
    redownloadExport,
    deleteExportLog,
    loadExportLogs,
  } = useExportData();

  useEffect(() => {
    // Set default to last month
    const now = new Date();
    const lastMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate()
    );
    setDateDebut(lastMonth.toISOString().split("T")[0]);
    setDateFin(now.toISOString().split("T")[0]);

    // Load products
    loadProducts();
  }, []);

  useEffect(() => {
    if (dateDebut && dateFin) {
      updateStats();
      loadPreviewData();
    }
  }, [dateDebut, dateFin, selectedExportType, selectedFormat]);

  // Recharger les données quand le type d'export change
  useEffect(() => {
    if (dateDebut && dateFin) {
      loadPreviewData();
    }
  }, [selectedExportType]);

  // Charger le template sélectionné
  useEffect(() => {
    const loadSelectedTemplate = async () => {
      if (selectedTemplateId) {
        try {
          const template = await db.sageTemplates.get(selectedTemplateId);
          setSelectedTemplate(template || null);
        } catch (error) {
          console.error("Error loading template:", error);
          setSelectedTemplate(null);
        }
      } else {
        setSelectedTemplate(null);
      }
    };
    loadSelectedTemplate();
  }, [selectedTemplateId]);

  const loadProducts = async () => {
    try {
      const productsData = await db.products.toArray();
      setProducts(productsData);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  // Fonctions pour gérer les templates
  const handleCreateNewTemplate = () => {
    setEditingTemplate(null);
    setShowTemplateCreator(true);
  };

  const handleEditExistingTemplate = (templateId: number) => {
    const template = selectedTemplate;
    if (template) {
      setEditingTemplate(template);
      setShowTemplateCreator(true);
    }
  };

  const loadPreviewData = async () => {
    if (!dateDebut || !dateFin) return;

    try {
      let allPesees: Pesee[];

      if (selectedExportType === "complete") {
        // Pour "Toutes les données", charger TOUTES les pesées de la base
        allPesees = await db.pesees.orderBy("dateHeure").reverse().toArray();
      } else {
        // Pour "Nouveau" et "Période sélectionnée", filtrer par période
        const startDate = new Date(dateDebut);
        const endDate = new Date(dateFin);
        endDate.setHours(23, 59, 59, 999);

        const query = db.pesees.filter(
          (pesee) => pesee.dateHeure >= startDate && pesee.dateHeure <= endDate
        );
        allPesees = await query.toArray();
      }

      let filteredPesees: Pesee[];
      switch (selectedExportType) {
        case "new":
          filteredPesees = allPesees.filter(
            (pesee) => !pesee.exportedAt || pesee.exportedAt.length === 0
          );
          break;
        case "complete":
          filteredPesees = allPesees; // Déjà toutes les pesées
          break;
        case "selective":
        default:
          filteredPesees = allPesees; // Déjà filtrées par période
          break;
      }

      setPreviewPesees(filteredPesees);

      // Forcer un re-render en mettant à jour l'état
      setPreviewPesees([...filteredPesees]);
    } catch (error) {
      console.error("Error loading preview data:", error);
    }
  };

  const updateStats = async () => {
    if (!dateDebut || !dateFin) return;

    try {
      let stats: ExportStats;

      if (selectedExportType === "complete") {
        // Pour "Toutes les données", calculer les stats sur TOUTES les pesées
        const allPesees = await db.pesees.toArray();
        const newPesees = allPesees.filter(
          (pesee) => !pesee.exportedAt || pesee.exportedAt.length === 0
        );
        const alreadyExported = allPesees.filter(
          (pesee) => pesee.exportedAt && pesee.exportedAt.length > 0
        );

        stats = {
          totalPesees: allPesees.length,
          newPesees: newPesees.length,
          alreadyExported: alreadyExported.length,
        };
      } else {
        // Pour "Nouveau" et "Période sélectionnée", utiliser la période
        const startDate = new Date(dateDebut);
        const endDate = new Date(dateFin);
        endDate.setHours(23, 59, 59, 999);

        stats = await getExportStats(startDate, endDate);
      }

      setExportStats(stats);
    } catch (error) {
      console.error("Error updating stats:", error);
    }
  };

  const handleExport = async () => {
    if (!dateDebut || !dateFin) {
      alert("Veuillez sélectionner une période");
      return;
    }

    let startDate: Date;
    let endDate: Date;
    let exportType = selectedExportType;

    if (selectedFormat === "sage-template") {
      // Pour sage-template, utiliser les pesées sélectionnées ou toutes selon le type
      if (selectedExportType === "complete") {
        startDate = new Date(2000, 0, 1); // 1er janvier 2000
        endDate = new Date(2100, 11, 31); // 31 décembre 2100
      } else {
        startDate = new Date(dateDebut);
        endDate = new Date(dateFin);
        endDate.setHours(23, 59, 59, 999);
      }
      exportType = selectedExportType;
    } else if (selectedExportType === "complete") {
      // Pour "Toutes les données", utiliser une période très large pour capturer toutes les pesées
      startDate = new Date(2000, 0, 1); // 1er janvier 2000
      endDate = new Date(2100, 11, 31); // 31 décembre 2100
    } else {
      // Pour "Nouveau" et "Période sélectionnée", utiliser la période sélectionnée
      startDate = new Date(dateDebut);
      endDate = new Date(dateFin);
      endDate.setHours(23, 59, 59, 999);
    }

    // Vérifier si un template est requis pour le format sage-template
    if (selectedFormat === "sage-template" && !selectedTemplate) {
      alert("Veuillez sélectionner un template Sage");
      return;
    }

    // Préparer les pesées sélectionnées pour l'export
    const selectedPesees =
      selectedPeseeIds.size > 0
        ? previewPesees.filter((p) => selectedPeseeIds.has(p.id!))
        : undefined;

    await exportToCSV(
      startDate,
      endDate,
      exportType,
      selectedPesees,
      selectedFormat,
      selectedTemplate || undefined
    );

    // Recharger les données après l'export pour mettre à jour les statuts
    // Petit délai pour s'assurer que la base de données est mise à jour
    setTimeout(async () => {
      await loadPreviewData();
      await updateStats();
    }, 100);

    // Désélectionner toutes les pesées après l'export
    setSelectedPeseeIds(new Set());
  };

  const handleTemplateSelect = (templateId: number | null) => {
    setSelectedTemplateId(templateId);
  };

  const togglePeseeSelection = (peseeId: number) => {
    const newSelection = new Set(selectedPeseeIds);
    if (newSelection.has(peseeId)) {
      newSelection.delete(peseeId);
    } else {
      newSelection.add(peseeId);
    }
    setSelectedPeseeIds(newSelection);
  };

  const selectAllPesees = () => {
    setSelectedPeseeIds(new Set(previewPesees.map((p) => p.id!)));
  };

  const deselectAllPesees = () => {
    setSelectedPeseeIds(new Set());
  };

  const getExportTypeLabel = (exportType: string) => {
    switch (exportType) {
      case "new":
        return "Nouveaux uniquement";
      case "selective":
        return "Période sélectionnée";
      case "complete":
        return "Toutes les données";
      default:
        return exportType;
    }
  };

  const getExportTypeBadgeVariant = (exportType: string) => {
    switch (exportType) {
      case "new":
        return "default";
      case "selective":
        return "secondary";
      case "complete":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Exports CSV</h1>
          <p className="text-muted-foreground">
            Exportez vos données vers différents formats
          </p>
        </div>
        <Button onClick={loadExportLogs} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      <Tabs defaultValue="new" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="new">Nouvel Export</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
          <TabsTrigger value="import">Import Sage</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  Configuration de l'export
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Période */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date-debut">Date de début</Label>
                    <Input
                      id="date-debut"
                      type="date"
                      value={dateDebut}
                      onChange={(e) => setDateDebut(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="date-fin">Date de fin</Label>
                    <Input
                      id="date-fin"
                      type="date"
                      value={dateFin}
                      onChange={(e) => setDateFin(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Format d'export */}
                <div>
                  <Label htmlFor="format-select">Format d'export</Label>
                  <Select
                    value={selectedFormat}
                    onValueChange={(value) => {
                      setSelectedFormat(value as ExportFormat);
                      // Réinitialiser le template si on change de format
                      if (value !== "sage-template") {
                        setSelectedTemplateId(null);
                      }
                    }}
                  >
                    <SelectTrigger id="format-select" className="mt-2">
                      <SelectValue placeholder="Sélectionner un format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">
                        CSV Standard - Compatible Excel (.csv)
                      </SelectItem>
                      <SelectItem value="csv-txt">
                        CSV Standard - Format TXT (.txt)
                      </SelectItem>
                      <SelectItem value="sage-articles">
                        Sage 50 - Import Articles (.txt)
                      </SelectItem>
                      <SelectItem value="sage-ventes">
                        Sage 50 - Import Ventes (.txt)
                      </SelectItem>
                      <SelectItem value="sage-template">
                        Sage 50 - Template personnalisé (.txt)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Type de données - toujours disponible sauf pour sage-articles */}
                {selectedFormat !== "sage-articles" && (
                  <div>
                    <Label>Type de données</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <Button
                        variant={
                          selectedExportType === "new" ? "default" : "outline"
                        }
                        onClick={() => setSelectedExportType("new")}
                        className="text-sm"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Nouveaux uniquement
                      </Button>
                      <Button
                        variant={
                          selectedExportType === "selective"
                            ? "default"
                            : "outline"
                        }
                        onClick={() => setSelectedExportType("selective")}
                        className="text-sm"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Période sélectionnée
                      </Button>
                      <Button
                        variant={
                          selectedExportType === "complete"
                            ? "default"
                            : "outline"
                        }
                        onClick={() => setSelectedExportType("complete")}
                        className="text-sm"
                      >
                        <Database className="h-4 w-4 mr-2" />
                        Toutes les données
                      </Button>
                    </div>
                  </div>
                )}

                {/* Bouton d'export */}
                <Button
                  onClick={handleExport}
                  disabled={
                    isLoading ||
                    !dateDebut ||
                    !dateFin ||
                    (selectedFormat !== "sage-articles" &&
                      selectedPeseeIds.size === 0)
                  }
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Export en cours...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Exporter
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Statistiques */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Statistiques d'export
                  </div>
                  {exportStats && (
                    <Badge variant="outline" className="text-xs">
                      {selectedExportType === "complete"
                        ? "Toutes les données"
                        : selectedExportType === "new"
                        ? "Nouveaux uniquement"
                        : "Période sélectionnée"}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {exportStats ? (
                  <div className="space-y-4">
                    {/* Statistiques principales */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-2xl font-bold text-blue-600">
                          {exportStats.totalPesees}
                        </div>
                        <div className="text-xs text-blue-700 font-medium">
                          Total pesées
                        </div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-2xl font-bold text-green-600">
                          {exportStats.newPesees}
                        </div>
                        <div className="text-xs text-green-700 font-medium">
                          Nouvelles
                        </div>
                      </div>
                      <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="text-2xl font-bold text-orange-600">
                          {exportStats.alreadyExported}
                        </div>
                        <div className="text-xs text-orange-700 font-medium">
                          Déjà exportées
                        </div>
                      </div>
                    </div>

                    {/* Barre de progression */}
                    {exportStats.totalPesees > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Progression d'export</span>
                          <span>
                            {Math.round(
                              (exportStats.alreadyExported /
                                exportStats.totalPesees) *
                                100
                            )}
                            %
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${
                                (exportStats.alreadyExported /
                                  exportStats.totalPesees) *
                                100
                              }%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Informations contextuelles */}
                    <div className="text-xs text-muted-foreground space-y-1">
                      {selectedFormat === "sage-template" &&
                        selectedTemplate && (
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              Template: {selectedTemplate.name}
                            </Badge>
                            <span>• Format Sage 50 (.txt)</span>
                          </div>
                        )}
                      {selectedFormat === "csv" && (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            Format CSV (.csv)
                          </Badge>
                          <span>• Compatible Excel</span>
                        </div>
                      )}
                      {selectedFormat === "csv-txt" && (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            Format CSV (.txt)
                          </Badge>
                          <span>• Compatible Sage</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      Sélectionnez une période pour voir les statistiques
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Aperçu des données */}
          {selectedFormat !== "sage-articles" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Eye className="h-5 w-5 mr-2" />
                    Aperçu des données
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllPesees}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Tout sélectionner
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={deselectAllPesees}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Désélectionner
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreview(!showPreview)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {showPreview ? "Masquer" : "Afficher"}
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {showPreview && (
                  <div className="space-y-4">
                    {selectedFormat === "sage-template" ? (
                      <div className="text-sm text-muted-foreground">
                        <div className="mb-2">
                          <strong>Export avec template Sage 50 :</strong>
                        </div>
                        <div className="mb-2">
                          • Toutes les données configurées dans le template
                          seront exportées
                        </div>
                        <div className="mb-2">
                          • Le fichier sera généré au format Sage 50 (.txt)
                        </div>
                        <div className="mb-2">
                          • {previewPesees.length} pesée(s) trouvée(s) dans la
                          base de données
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        {previewPesees.length} pesée(s) trouvée(s) pour la
                        période sélectionnée
                      </div>
                    )}
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>N° Bon</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Produit</TableHead>
                            <TableHead>Quantité</TableHead>
                            <TableHead>Prix TTC</TableHead>
                            <TableHead>Statut</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewPesees.map((pesee) => {
                            const product = products.find(
                              (p) => p.id === pesee.produitId
                            );
                            return (
                              <TableRow key={pesee.id}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedPeseeIds.has(pesee.id!)}
                                    onCheckedChange={() =>
                                      togglePeseeSelection(pesee.id!)
                                    }
                                  />
                                </TableCell>
                                <TableCell>
                                  {pesee.dateHeure.toLocaleDateString("fr-FR")}
                                </TableCell>
                                <TableCell>{pesee.numeroBon}</TableCell>
                                <TableCell>{pesee.nomEntreprise}</TableCell>
                                <TableCell>{product?.nom || "N/A"}</TableCell>
                                <TableCell>{pesee.net?.toFixed(2)} t</TableCell>
                                <TableCell>
                                  {pesee.prixTTC?.toFixed(2)} €
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      pesee.exportedAt &&
                                      pesee.exportedAt.length > 0
                                        ? "secondary"
                                        : "default"
                                    }
                                  >
                                    {pesee.exportedAt &&
                                    pesee.exportedAt.length > 0
                                      ? "Exporté"
                                      : "Nouveau"}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <History className="h-5 w-5 mr-2" />
                Historique des exports
              </CardTitle>
            </CardHeader>
            <CardContent>
              {exportLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun export réalisé</p>
                  <p className="text-sm">
                    Les exports que vous créerez apparaîtront ici
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {exportLogs.map((log) => (
                    <div key={log.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium">{log.fileName}</h3>
                            <Badge
                              variant={
                                getExportTypeBadgeVariant(log.exportType) as
                                  | "default"
                                  | "secondary"
                                  | "outline"
                              }
                            >
                              {getExportTypeLabel(log.exportType)}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>
                              Période:{" "}
                              {log.startDate.toLocaleDateString("fr-FR")} -{" "}
                              {log.endDate.toLocaleDateString("fr-FR")}
                            </p>
                            <p>
                              {log.totalRecords} enregistrement(s) •{" "}
                              {log.createdAt.toLocaleString("fr-FR")}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => redownloadExport(log)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Télécharger
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteExportLog(log.id!)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          <Card>
            {/* <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="h-5 w-5 mr-2" />
                Import depuis Sage 50
              </CardTitle>
            </CardHeader> */}
            <CardContent className="p-7">
              <div className="space-y-4">
                {/* <div className="space-y-2">
                  <h3 className="font-semibold">Import des documents Sage</h3>
                  <p className="text-sm text-gray-600">
                    Importez vos bons de livraison et factures depuis un fichier
                    d'export Sage 50. Les données importées seront intégrées
                    dans votre base de données locale.
                  </p>
                </div> */}

                <div className="space-y-2">
                  <h4 className="font-medium">Créer un template</h4>
                  <p className="text-sm text-muted-foreground">
                    Apprenez le format Sage et créez un template réutilisable
                  </p>
                  <Button
                    onClick={() => {
                      setEditingTemplate(null);
                      setShowTemplateCreator(true);
                    }}
                    variant="outline"
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Créer un template
                  </Button>
                </div>

                {/* Section de gestion des templates */}
                <div className="space-y-3">
                  <h4 className="font-medium">Templates Sage existants</h4>
                  <SageTemplateManager />
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">
                        Formats supportés : .txt (export Sage 50)
                      </p>
                      <p className="text-sm">
                        Le fichier doit contenir des lignes commençant par "E"
                        (en-tête) et "L" (ligne de détail) séparées par des
                        tabulations.
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
          // Recharger les templates dans SageTemplateManager
          window.dispatchEvent(new CustomEvent("templatesUpdated"));
        }}
        editTemplate={editingTemplate}
      />
    </div>
  );
}
