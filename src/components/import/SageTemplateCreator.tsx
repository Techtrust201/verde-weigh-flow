import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Download,
  Eye,
  Settings,
  Trash2,
  Plus,
  ArrowRight,
} from "lucide-react";
import {
  parseSageExport,
  validateSageDocument,
  type SageDocument,
} from "@/utils/sageImportParser";
import {
  INTELLIGENT_MAPPINGS,
  type ColumnMapping,
  DataSourceId,
} from "@/types/sageTemplate";
import { SageTemplate, SageColumn, DATA_SOURCES } from "@/types/sageTemplate";
import { db } from "@/lib/database";
import { useToast } from "@/hooks/use-toast";
import SageTemplateMapper from "./SageTemplateMapper";

interface SageTemplateCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateCreated?: () => void;
  editTemplate?: SageTemplate | null;
}

export default function SageTemplateCreator({
  isOpen,
  onClose,
  onTemplateCreated,
  editTemplate,
}: SageTemplateCreatorProps) {
  const [file, setFile] = useState<File | null>(null);
  const [sageDocuments, setSageDocuments] = useState<SageDocument[]>([]);
  const [sageColumns, setSageColumns] = useState<SageColumn[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<
    "import" | "configure" | "test"
  >("import");
  const [currentTemplate, setCurrentTemplate] = useState<SageTemplate | null>(
    null
  );
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();

  // Initialiser le template à éditer
  useEffect(() => {
    if (editTemplate) {
      setCurrentTemplate(editTemplate);
      setCurrentStep("configure"); // Aller directement à la configuration
    } else {
      // Reset pour nouveau template
      setCurrentTemplate(null);
      setFile(null);
      setSageDocuments([]);
      setSageColumns([]);
      setCurrentStep("import");
    }
  }, [editTemplate]);

  // Fonction pour supprimer le template actuel et recommencer
  const handleDeleteTemplate = useCallback(() => {
    setCurrentTemplate(null);
    setFile(null);
    setSageDocuments([]);
    setSageColumns([]);
    setCurrentStep("import");
    toast({
      title: "Template supprimé",
      description: "Vous pouvez maintenant créer un nouveau template.",
    });
  }, [toast]);

  // Fonction pour naviguer entre les onglets
  const handleStepChange = useCallback(
    (step: "import" | "configure" | "test") => {
      if (step === "import" && currentTemplate) {
        // Si on veut revenir à l'import, on demande confirmation
        if (
          confirm(
            "Voulez-vous vraiment recommencer ? Le template actuel sera perdu."
          )
        ) {
          handleDeleteTemplate();
        } else {
          return; // Annuler le changement d'onglet
        }
      } else {
        setCurrentStep(step);
      }
    },
    [currentTemplate, handleDeleteTemplate]
  );

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (selectedFile) {
        setFile(selectedFile);
        setSageDocuments([]);
        setSageColumns([]);
        setCurrentStep("import");
      }
    },
    []
  );

  const processFile = useCallback(async () => {
    if (!file) return;

    setIsProcessing(true);
    try {
      // Gérer l'encodage automatiquement (Sage utilise souvent ISO-8859-1)
      let content: string;
      try {
        // Essayer d'abord en UTF-8
        content = await file.text();

        // Si on détecte des caractères d'encodage problématiques, essayer ISO-8859-1
        if (
          content.includes("�") ||
          (content.includes("é") === false && content.includes("é"))
        ) {
          const arrayBuffer = await file.arrayBuffer();
          const decoder = new TextDecoder("iso-8859-1");
          content = decoder.decode(arrayBuffer);
        }
      } catch (error) {
        // Fallback : essayer ISO-8859-1 directement
        const arrayBuffer = await file.arrayBuffer();
        const decoder = new TextDecoder("iso-8859-1");
        content = decoder.decode(arrayBuffer);
      }
      const documents = parseSageExport(content);

      // Extraire les colonnes du premier document
      if (documents.length > 0) {
        const firstDoc = documents[0];
        const columns: SageColumn[] = [];

        // Analyser la structure pour détecter TOUTES les colonnes
        const lines = content.split("\n").filter((line) => line.trim());
        if (lines.length < 2) {
          throw new Error("Fichier invalide : pas assez de lignes");
        }

        const headerLine = lines[0];
        const allColumns = headerLine.split("\t");
        const dataLines = lines.slice(1);

        // Analyser chaque colonne pour détecter le type et la présence de données
        const columnAnalysis = allColumns
          .map((colName, index) => {
            const cleanName = colName.trim();
            if (!cleanName) return null;

            // Analyser les données de cette colonne
            const columnData = dataLines
              .map((line) => line.split("\t")[index]?.trim() || "")
              .filter((value) => value !== "");

            // Détecter le type de données
            let type: "text" | "number" | "date" = "text";
            if (columnData.length > 0) {
              const sampleValue = columnData[0];

              // Détecter les dates (DD/MM/YYYY)
              if (/^\d{2}\/\d{2}\/\d{4}$/.test(sampleValue)) {
                type = "date";
              }
              // Détecter les nombres
              else if (/^\d+(\.\d+)?$/.test(sampleValue)) {
                type = "number";
              }
            }

            // Calculer le score d'importance (colonnes avec plus de données = plus importantes)
            const dataScore = columnData.length / dataLines.length;

            return {
              name: cleanName,
              type,
              required: [
                "Type de pièce",
                "N° pièce",
                "Date pièce",
                "Code client",
                "Nom client",
              ].includes(cleanName),
              example: columnData[0] || "",
              position: index,
              dataScore, // Score de 0 à 1 (1 = toutes les lignes ont des données)
              hasData: columnData.length > 0,
            };
          })
          .filter((col): col is NonNullable<typeof col> => col !== null);

        // Trier les colonnes : d'abord celles avec des données, puis par score
        const sortedColumns = columnAnalysis
          .sort((a, b) => {
            // D'abord : colonnes avec données vs sans données
            if (a.hasData && !b.hasData) return -1;
            if (!a.hasData && b.hasData) return 1;

            // Ensuite : par score de données (plus de données = plus important)
            return b.dataScore - a.dataScore;
          })
          .map((col) => ({
            name: col.name,
            type: col.type,
            required: col.required,
            example: col.example,
            position: col.position,
          }));

        columns.push(...sortedColumns);

        setSageColumns(columns);
        setSageDocuments(documents);

        // Créer des mappings intelligents par défaut
        const intelligentMappings: ColumnMapping[] = columns.map((column) => {
          // Si la colonne n'a pas de données, la mettre en "vide" par défaut
          if (!column.example) {
            return {
              sageColumn: column.name,
              dataSource: "vide" as DataSourceId,
              dataField: "vide",
              transformation: "none",
              defaultValue: "",
              isConfigured: true, // Les colonnes vides sont automatiquement configurées
            };
          }

          // Pour les colonnes avec données, essayer un mapping intelligent
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

          // Par défaut, mettre en "vide" si pas de mapping intelligent trouvé
          return {
            sageColumn: column.name,
            dataSource: "vide" as DataSourceId,
            dataField: "vide",
            transformation: "none",
            defaultValue: "",
            isConfigured: true,
          };
        });

        // Créer le template initial avec mappings intelligents
        const template: SageTemplate = {
          name: `Template Sage - ${new Date().toLocaleDateString()}`,
          description: `Template créé à partir de ${file.name}`,
          sageColumns: columns,
          mappings: intelligentMappings,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        setCurrentTemplate(template);
        setCurrentStep("configure");

        toast({
          title: "Fichier analysé avec succès",
          description: `${documents.length} document(s) trouvé(s), ${columns.length} colonnes détectées.`,
        });
      }
    } catch (error) {
      console.error("Erreur lors du traitement du fichier:", error);
      toast({
        title: "Erreur de traitement",
        description: "Impossible de traiter le fichier. Vérifiez le format.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [file, toast]);

  const handleSaveTemplate = useCallback(
    async (template: SageTemplate) => {
      try {
        await db.sageTemplates.add(template);
        toast({
          title: "Template sauvegardé",
          description: `Le template "${template.name}" a été sauvegardé avec succès.`,
        });
        onTemplateCreated?.();
        onClose();
      } catch (error) {
        console.error("Erreur lors de la sauvegarde:", error);
        toast({
          title: "Erreur de sauvegarde",
          description: "Impossible de sauvegarder le template.",
          variant: "destructive",
        });
      }
    },
    [toast, onClose]
  );

  // Fonction pour générer des données de test organisées par source
  const generateTestData = (
    template: SageTemplate
  ): Record<string, Record<string, any>> => {
    return {
      pesee: {
        numeroBon: "BL-TEST-001",
        dateHeure: "15/01/2024",
        plaque: "AB-123-CD",
        nomEntreprise: "ENTREPRISE TEST SARL",
        chantier: "Chantier Test",
        poidsEntree: "2.500",
        poidsSortie: "1.200",
        net: "1.300",
        prixHT: "150.00",
        prixTTC: "180.00",
        moyenPaiement: "VIR",
        typeClient: "professionnel",
      },
      client: {
        raisonSociale: "ENTREPRISE TEST SARL",
        prenom: "Jean",
        nom: "Dupont",
        siret: "12345678901234",
        codeNAF: "4673Z",
        activite: "Commerce de gros",
        adresse: "123 Rue de la Paix",
        codePostal: "75001",
        ville: "Paris",
        representantLegal: "Jean Dupont",
        telephone: "01 23 45 67 89",
        email: "contact@test.fr",
        typeClient: "professionnel",
      },
      product: {
        nom: "DÉCHETS VÉGÉTAUX",
        prixHT: "150.00",
        prixTTC: "180.00",
        unite: "tonne",
        codeProduct: "ART001",
        tauxTVA: "20",
      },
      transporteur: {
        prenom: "Pierre",
        nom: "Martin",
        siret: "98765432109876",
        adresse: "456 Avenue des Champs",
        codePostal: "69000",
        ville: "Lyon",
        telephone: "04 56 78 90 12",
        email: "transport@test.fr",
      },
      userSettings: {
        nomEntreprise: "VERDE WEIGH FLOW",
        adresse: "789 Boulevard de la République",
        codePostal: "13000",
        ville: "Marseille",
        email: "contact@verde.fr",
        telephone: "04 91 23 45 67",
        siret: "11122233344455",
        codeAPE: "4673Z",
        codeNAF: "4673Z",
        numeroRecepisse: "REC-2024-001",
        dateValiditeRecepisse: "31/12/2024",
        numeroAutorisation: "AUT-2024-001",
        representantLegal: "Directeur Général",
      },
      static: {
        deliveryNote: "Bon de livraison",
        currentDate: new Date().toLocaleDateString("fr-FR"),
        companyName: "VERDE WEIGH FLOW",
        france: "France",
        oui: "Oui",
        non: "Non",
        zero: "0",
        un: "1",
        tva20: "20",
        aucune: "Aucune",
        tvaStandard: "S = Taux de TVA standard",
        facturationStandard: "B1 - Dépôt d'une facture de bien",
      },
      vide: {
        vide: "",
      },
    };
  };

  // Fonction pour générer un aperçu de l'export Sage
  interface TestData {
    pesee: Record<string, any>;
    client: Record<string, any>;
    product: Record<string, any>;
    transporteur: Record<string, any>;
    userSettings: Record<string, any>;
  }

  const generateSagePreview = (
    template: SageTemplate,
    testData: TestData
  ): string => {
    const headers = template.sageColumns.map((col) => col.name);
    const headerLine = headers.join("\t");

    const dataLines: string[] = [];

    // Générer une ligne d'en-tête (E)
    const enTeteValues: string[] = [];
    template.sageColumns.forEach((column) => {
      const mapping = template.mappings.find(
        (m) => m.sageColumn === column.name
      );
      if (!mapping || !mapping.isConfigured) {
        enTeteValues.push("");
        return;
      }

      let value = "";
      switch (mapping.dataSource) {
        case "pesee":
          value = getPeseeValue(testData.pesee, mapping.dataField) || "";
          break;
        case "client":
          value = getClientValue(testData.client, mapping.dataField) || "";
          break;
        case "product":
          value = getProductValue(testData.product, mapping.dataField) || "";
          break;
        case "transporteur":
          value =
            getTransporteurValue(testData.transporteur, mapping.dataField) ||
            "";
          break;
        case "userSettings":
          value =
            getUserSettingsValue(testData.userSettings, mapping.dataField) ||
            "";
          break;
        case "static":
          value = getStaticValue(mapping.dataField) || "";
          break;
        case "vide":
          value = "";
          break;
        default:
          value = "";
      }

      enTeteValues.push(value);
    });

    dataLines.push(enTeteValues.join("\t"));

    // Générer une ligne de détail (L)
    const detailValues: string[] = [];
    template.sageColumns.forEach((column) => {
      const mapping = template.mappings.find(
        (m) => m.sageColumn === column.name
      );
      if (!mapping || !mapping.isConfigured) {
        detailValues.push("");
        return;
      }

      let value = "";
      switch (mapping.dataSource) {
        case "pesee":
          value = getPeseeValue(testData.pesee, mapping.dataField) || "";
          break;
        case "client":
          value = getClientValue(testData.client, mapping.dataField) || "";
          break;
        case "product":
          value = getProductValue(testData.product, mapping.dataField) || "";
          break;
        case "transporteur":
          value =
            getTransporteurValue(testData.transporteur, mapping.dataField) ||
            "";
          break;
        case "userSettings":
          value =
            getUserSettingsValue(testData.userSettings, mapping.dataField) ||
            "";
          break;
        case "static":
          value = getStaticValue(mapping.dataField) || "";
          break;
        case "vide":
          value = "";
          break;
        default:
          value = "";
      }

      detailValues.push(value);
    });

    dataLines.push(detailValues.join("\t"));

    return [headerLine, ...dataLines].join("\n");
  };

  // Fonctions utilitaires pour extraire les valeurs
  const getPeseeValue = (pesee: Record<string, any>, field: string): string => {
    const value = pesee[field];
    if (value instanceof Date) {
      return value.toLocaleDateString("fr-FR");
    }
    return value?.toString() || "";
  };

  const getClientValue = (
    client: Record<string, any>,
    field: string
  ): string => {
    const value = client[field];
    return value?.toString() || "";
  };

  const getProductValue = (
    product: Record<string, any>,
    field: string
  ): string => {
    const value = product[field];
    return value?.toString() || "";
  };

  const getTransporteurValue = (
    transporteur: Record<string, any>,
    field: string
  ): string => {
    const value = transporteur[field];
    return value?.toString() || "";
  };

  const getUserSettingsValue = (
    userSettings: Record<string, any>,
    field: string
  ): string => {
    const value = userSettings[field];
    return value?.toString() || "";
  };

  const getStaticValue = (field: string): string => {
    const staticValues: Record<string, string> = {
      deliveryNote: "Bon de livraison",
      currentDate: new Date().toLocaleDateString("fr-FR"),
      companyName: "VERDE WEIGH FLOW",
      france: "France",
      oui: "Oui",
      non: "Non",
      zero: "0",
      un: "1",
      tva20: "20",
      aucune: "Aucune",
      tvaStandard: "S = Taux de TVA standard",
      facturationStandard: "B1 - Dépôt d'une facture de bien",
    };
    return staticValues[field] || "";
  };

  const handleTestTemplate = useCallback(
    async (template: SageTemplate) => {
      setIsTesting(true);
      try {
        // Charger les vraies données de l'application
        const [pesees, clients, products, transporteurs, userSettings] =
          await Promise.all([
            db.pesees.orderBy("createdAt").reverse().limit(1).toArray(),
            db.clients.orderBy("createdAt").reverse().limit(1).toArray(),
            db.products.orderBy("createdAt").reverse().limit(1).toArray(),
            db.transporteurs.orderBy("createdAt").reverse().limit(1).toArray(),
            db.userSettings.toCollection().first(),
          ]);

        // Utiliser les vraies données ou des valeurs par défaut si aucune donnée
        const testData = {
          pesee: pesees[0] || {
            id: 1,
            numeroBon: "BL-DEMO-001",
            dateHeure: new Date(),
            plaque: "DEMO-001",
            nomEntreprise: "Entreprise Demo",
            chantier: "Chantier Demo",
            produitId: 1,
            poidsEntree: 2.5,
            poidsSortie: 1.2,
            net: 1.3,
            prixHT: 150.0,
            prixTTC: 180.0,
            moyenPaiement: "VIR",
            clientId: 1,
            transporteurId: 1,
            typeClient: "professionnel" as const,
            synchronized: false,
            version: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          client: clients[0] || {
            id: 1,
            typeClient: "professionnel" as const,
            raisonSociale: "Client Demo SARL",
            prenom: "Jean",
            nom: "Dupont",
            siret: "12345678901234",
            codeNAF: "4673Z",
            activite: "Commerce de gros",
            adresse: "123 Rue de la Paix",
            codePostal: "75001",
            ville: "Paris",
            representantLegal: "Jean Dupont",
            telephone: "01 23 45 67 89",
            email: "contact@demo.fr",
            plaques: ["DEMO-001"],
            chantiers: ["Chantier Demo"],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          product: products[0] || {
            id: 1,
            nom: "DÉCHETS VÉGÉTAUX",
            prixHT: 150.0,
            prixTTC: 180.0,
            unite: "tonne",
            codeProduct: "ART001",
            isFavorite: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          transporteur: transporteurs[0] || {
            id: 1,
            prenom: "Pierre",
            nom: "Martin",
            siret: "98765432109876",
            adresse: "456 Avenue des Champs",
            codePostal: "69000",
            ville: "Lyon",
            telephone: "04 56 78 90 12",
            email: "transport@demo.fr",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          userSettings: userSettings || {
            id: 1,
            nomEntreprise: "VERDE WEIGH FLOW",
            adresse: "789 Boulevard de la République",
            codePostal: "13000",
            ville: "Marseille",
            email: "contact@verde.fr",
            telephone: "04 91 23 45 67",
            siret: "11122233344455",
            codeAPE: "4673Z",
            codeNAF: "4673Z",
            logo: "",
            cleAPISage: "",
            numeroRecepisse: "REC-2024-001",
            dateValiditeRecepisse: new Date("2024-12-31"),
            numeroAutorisation: "AUT-2024-001",
            representantLegal: "Directeur Général",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        };

        // Générer un aperçu de l'export
        const preview = generateSagePreview(template, testData);

        // Créer une interface de test avec scroll horizontal et affichage vertical
        const newWindow = window.open("", "_blank", "width=1200,height=800");
        if (newWindow) {
          newWindow.document.write(`
            <html>
              <head>
                <title>Test Template Sage - ${template.name}</title>
                <style>
                  body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                    margin: 0; 
                    padding: 20px; 
                    background: #f8f9fa;
                  }
                  .header { 
                    background: white; 
                    padding: 20px; 
                    margin-bottom: 20px; 
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                  }
                  .test-container {
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    overflow: hidden;
                  }
                  .table-wrapper {
                    overflow-x: auto;
                    max-height: 500px;
                    overflow-y: auto;
                  }
                  table {
                    width: 100%;
                    border-collapse: collapse;
                    min-width: max-content;
                  }
                  th {
                    background: #f1f5f9;
                    padding: 12px 8px;
                    text-align: left;
                    font-weight: 600;
                    border: 1px solid #e2e8f0;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                    white-space: nowrap;
                    font-size: 12px;
                  }
                  td {
                    padding: 8px;
                    border: 1px solid #e2e8f0;
                    font-size: 12px;
                    max-width: 200px;
                    word-wrap: break-word;
                  }
                  .row-header {
                    background: #e0f2fe;
                    font-weight: 600;
                  }
                  .row-data {
                    background: #f8fafc;
                  }
                  .empty-cell {
                    background: #fef2f2;
                    color: #dc2626;
                    font-style: italic;
                  }
                  .success { 
                    color: #059669; 
                    font-weight: bold; 
                    margin-top: 20px;
                    padding: 15px;
                    background: #ecfdf5;
                    border-radius: 8px;
                    border: 1px solid #a7f3d0;
                  }
                  .stats {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                    margin-bottom: 20px;
                  }
                  .stat-card {
                    background: #f1f5f9;
                    padding: 15px;
                    border-radius: 8px;
                    text-align: center;
                  }
                  .stat-number {
                    font-size: 24px;
                    font-weight: bold;
                    color: #1e40af;
                  }
                  .stat-label {
                    font-size: 14px;
                    color: #64748b;
                    margin-top: 5px;
                  }
                </style>
              </head>
              <body>
                <div class="header">
                  <h2>🧪 Test Template Sage</h2>
                  <div class="stats">
                    <div class="stat-card">
                      <div class="stat-number">${template.name}</div>
                      <div class="stat-label">Template</div>
                    </div>
                    <div class="stat-card">
                      <div class="stat-number">${
                        template.sageColumns.length
                      }</div>
                      <div class="stat-label">Colonnes</div>
                    </div>
                    <div class="stat-card">
                      <div class="stat-number">${
                        template.mappings.filter((m) => m.isConfigured).length
                      }</div>
                      <div class="stat-label">Mappings</div>
                    </div>
                    <div class="stat-card">
                      <div class="stat-number">${
                        template.mappings.filter((m) => m.dataSource === "vide")
                          .length
                      }</div>
                      <div class="stat-label">Colonnes vides</div>
                    </div>
                  </div>
                  <p><strong>Description:</strong> ${template.description}</p>
                </div>
                
                <div class="test-container">
                  <div class="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th style="position: sticky; left: 0; background: #f1f5f9; z-index: 20;">Type</th>
                          ${template.sageColumns
                            .map(
                              (col) => `
                            <th title="${col.name}">
                              ${
                                col.name.length > 15
                                  ? col.name.substring(0, 15) + "..."
                                  : col.name
                              }
                            </th>
                          `
                            )
                            .join("")}
                        </tr>
                      </thead>
                      <tbody>
                        <tr class="row-header">
                          <td style="position: sticky; left: 0; background: #e0f2fe; z-index: 10;">En-tête (E)</td>
                          ${template.sageColumns
                            .map((col) => {
                              const mapping = template.mappings.find(
                                (m) => m.sageColumn === col.name
                              );
                              const value =
                                mapping && mapping.isConfigured
                                  ? testData[mapping.dataSource]?.[
                                      mapping.dataField
                                    ] || ""
                                  : "";
                              const isEmpty =
                                mapping?.dataSource === "vide" || !value;
                              return `<td class="${
                                isEmpty ? "empty-cell" : ""
                              }" title="${col.name}: ${value || "Vide"}">${
                                value || "Vide"
                              }</td>`;
                            })
                            .join("")}
                        </tr>
                        <tr class="row-data">
                          <td style="position: sticky; left: 0; background: #f8fafc; z-index: 10;">Détail (L)</td>
                          ${template.sageColumns
                            .map((col) => {
                              const mapping = template.mappings.find(
                                (m) => m.sageColumn === col.name
                              );
                              const value =
                                mapping && mapping.isConfigured
                                  ? testData[mapping.dataSource]?.[
                                      mapping.dataField
                                    ] || ""
                                  : "";
                              const isEmpty =
                                mapping?.dataSource === "vide" || !value;
                              return `<td class="${
                                isEmpty ? "empty-cell" : ""
                              }" title="${col.name}: ${value || "Vide"}">${
                                value || "Vide"
                              }</td>`;
                            })
                            .join("")}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div class="success">
                  ✅ Test réussi ! Le template est prêt à être utilisé.
                  <br>
                  <small>💡 Utilisez le scroll horizontal pour voir toutes les colonnes. Les colonnes vides sont marquées en rouge.</small>
                </div>
              </body>
            </html>
          `);
          newWindow.document.close();
        }

        toast({
          title: "Test réussi",
          description: "Aperçu de l'export généré dans une nouvelle fenêtre.",
        });

        // Passer à l'étape de test
        setCurrentStep("test");
      } catch (error) {
        console.error("Erreur lors du test:", error);
        toast({
          title: "Erreur de test",
          description:
            "Impossible de générer l'aperçu. Vérifiez la configuration.",
          variant: "destructive",
        });
      } finally {
        setIsTesting(false);
      }
    },
    [toast]
  );

  const resetForm = useCallback(() => {
    setFile(null);
    setSageDocuments([]);
    setSageColumns([]);
    setCurrentTemplate(null);
    setCurrentStep("import");
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editTemplate
              ? "Éditer le template Sage 50"
              : "Créer un template Sage 50"}
          </DialogTitle>
          <DialogDescription>
            {editTemplate
              ? "Modifiez la configuration de votre template existant."
              : "Importez un fichier Sage 50, configurez les correspondances, et créez un template réutilisable."}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={currentStep}
          onValueChange={handleStepChange}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="import">1. Import</TabsTrigger>
              <TabsTrigger value="configure" disabled={!sageColumns.length}>
                2. Configuration
              </TabsTrigger>
              <TabsTrigger value="test" disabled={!currentTemplate}>
                3. Test
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Étape 1: Import */}
          <TabsContent value="import" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Import du fichier Sage 50
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file-upload">
                    Fichier d'export Sage (.txt)
                  </Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".txt,.csv"
                    onChange={handleFileSelect}
                    className="mt-1"
                  />
                </div>

                {file && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                )}

                <Button
                  onClick={processFile}
                  disabled={!file || isProcessing}
                  className="w-full gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Analyse en cours...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      Analyser le fichier
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Aperçu des données détectées */}
            {sageDocuments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Aperçu des données détectées</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {sageDocuments.length}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Documents trouvés
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {sageColumns.length}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Colonnes détectées
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">Types de documents :</h4>
                      <div className="flex gap-2">
                        {sageDocuments.filter((d) => d.type === "bon_livraison")
                          .length > 0 && (
                          <Badge variant="secondary">
                            {
                              sageDocuments.filter(
                                (d) => d.type === "bon_livraison"
                              ).length
                            }{" "}
                            Bon(s) de livraison
                          </Badge>
                        )}
                        {sageDocuments.filter((d) => d.type === "facture")
                          .length > 0 && (
                          <Badge variant="default">
                            {
                              sageDocuments.filter((d) => d.type === "facture")
                                .length
                            }{" "}
                            Facture(s)
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">Colonnes détectées :</h4>
                      <div className="flex flex-wrap gap-2">
                        {sageColumns.map((column) => (
                          <Badge
                            key={column.name}
                            variant={
                              column.required ? "destructive" : "outline"
                            }
                          >
                            {column.name}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={() => setCurrentStep("configure")}>
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Configurer le template
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Étape 2: Configuration */}
          <TabsContent value="configure" className="space-y-6">
            {currentTemplate && (
              <SageTemplateMapper
                template={currentTemplate}
                onSave={handleSaveTemplate}
                onCancel={() => setCurrentStep("import")}
                onTest={handleTestTemplate}
                isTesting={isTesting}
                onTemplateUpdate={setCurrentTemplate}
              />
            )}
          </TabsContent>

          {/* Étape 3: Test */}
          <TabsContent value="test" className="space-y-6">
            {currentTemplate && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Test du template
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Aperçu de l'export</h4>
                    <p className="text-sm text-muted-foreground">
                      Testez votre template avec les{" "}
                      <strong>vraies données</strong> de votre application
                      (pesées, clients, produits, transporteurs) pour vérifier
                      le format de sortie.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium">{currentTemplate.name}</h5>
                        {currentTemplate.description && (
                          <p className="text-sm text-muted-foreground">
                            {currentTemplate.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {
                            currentTemplate.mappings.filter(
                              (m) => m.isConfigured
                            ).length
                          }{" "}
                          / {currentTemplate.sageColumns.length} colonnes
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h6 className="font-medium text-sm">
                        Statut de configuration :
                      </h6>
                      <div className="flex items-center gap-2">
                        {currentTemplate.sageColumns
                          .filter((c) => c.required)
                          .every((col) =>
                            currentTemplate.mappings.some(
                              (m) => m.sageColumn === col.name && m.isConfigured
                            )
                          ) ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Configuration complète
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Configuration incomplète
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep("configure")}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Modifier la configuration
                    </Button>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleTestTemplate(currentTemplate)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Tester l'export
                      </Button>
                      <Button
                        onClick={() => handleSaveTemplate(currentTemplate)}
                        className="gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Sauvegarder le template
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
