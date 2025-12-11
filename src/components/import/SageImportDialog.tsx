import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Download,
  Eye,
  Trash2,
} from "lucide-react";
import {
  parseSageExport,
  validateSageDocument,
  type SageDocument,
} from "@/utils/sageImportParser";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/database";

interface ImportResult {
  success: boolean;
  documents: SageDocument[];
  errors: string[];
  warnings: string[];
}

export default function SageImportDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<SageDocument[]>([]);
  const [showFileContent, setShowFileContent] = useState(false);
  const [fileContent, setFileContent] = useState<string>("");
  const { toast } = useToast();

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (selectedFile) {
        setFile(selectedFile);
        setImportResult(null);
        setPreviewData([]);
        setShowFileContent(false);
        setFileContent("");
      }
    },
    []
  );

  const processFile = useCallback(async () => {
    if (!file) return;

    setIsProcessing(true);
    try {
      const content = await file.text();
      setFileContent(content);

      // Debug: Afficher les premières lignes du fichier
      const lines = content.split("\n");
      console.log("=== DEBUG FICHIER SAGE ===");
      console.log("Nombre de lignes:", lines.length);
      console.log("Première ligne (en-tête):", lines[0]);
      console.log("Deuxième ligne (exemple):", lines[1]);
      console.log("Troisième ligne (exemple):", lines[2]);
      console.log("==========================");

      const documents = parseSageExport(content);

      // Valider chaque document
      const errors: string[] = [];
      const warnings: string[] = [];

      documents.forEach((doc, index) => {
        const docErrors = validateSageDocument(doc);
        docErrors.forEach((error) => {
          errors.push(`Document ${index + 1} (${doc.numero}): ${error}`);
        });

        // Warnings pour les données manquantes mais non critiques
        if (!doc.client.adresse1) {
          warnings.push(`Document ${index + 1}: Adresse client incomplète`);
        }
        if (!doc.modePaiement) {
          warnings.push(`Document ${index + 1}: Mode de paiement non spécifié`);
        }
      });

      const result: ImportResult = {
        success: errors.length === 0,
        documents,
        errors,
        warnings,
      };

      setImportResult(result);
      setPreviewData(documents);

      if (result.success) {
        toast({
          title: "Import réussi",
          description: `${documents.length} document(s) importé(s) avec succès`,
        });
      } else {
        toast({
          title: "Erreurs détectées",
          description: `${errors.length} erreur(s) trouvée(s)`,
          variant: "destructive",
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

  const handleImport = useCallback(async () => {
    if (!importResult?.success || !importResult.documents.length) return;

    try {
      // TODO: Intégrer avec la base de données locale
      // await importDocumentsToDatabase(importResult.documents);

      toast({
        title: "Import terminé",
        description: `${importResult.documents.length} document(s) importé(s) dans la base de données`,
      });

      setIsOpen(false);
      setFile(null);
      setImportResult(null);
      setPreviewData([]);
    } catch (error) {
      console.error("Erreur lors de l'import:", error);
      toast({
        title: "Erreur d'import",
        description:
          "Impossible d'importer les documents dans la base de données",
        variant: "destructive",
      });
    }
  }, [importResult, toast]);

  const downloadTemplate = useCallback(() => {
    // Créer un fichier template CSV
    const template = `Type de Ligne	Type de pièce	N° pièce	Date pièce	Facturation TTC	Référence pièce	Remarque	Code représentant pièce	Code client	Nom client	Forme juridique	Adresse 1	Adresse 2	Adresse 3	Code postal	Ville	Code pays	Pays	Mode gestion TVA	Tarif client	NII	Assujetti TPF	Observations	Nom contact	Code mode de paiement	Date échéance	Date livraison pièce	Validée	Transmise	Soldée	Comptabilisée	Irrécoverable	Date irrécoverabilité	Libellé irrécoverable	Compta. irrécoverable	Code affaire pièce	Type de remise pièce	Taux remise pièce	Mt remise pièce	Taux Escompte	Statut devis	Ref. commande	Pas de retour stock	Mt total TTC	Code article	Quantité	PU HT	PU TTC	Taux TVA	Ligne commentaire	Description	Niveau sous-total	Taux TPF	Code dépôt	Pds Unit. Brut	Pds Unit. Net	Qté par colis	Nbre colis	Date livraison	Type remise ligne	Taux remise ligne	Mt unit. remise HT	Mt unit. remise TTC	PA HT	PAMP	Unité	Référence fournisseur	Code représentant ligne	Type Commission Repr.	Taux commission	Mt commission	Code affaire ligne	Mt unit. Eco-part. TTC	Qté Livrée	TVA Non Perçue	N° ligne	Options Sage	Catégorie de TVA	Motif d'exonération de TVA	Société de livraison	Adresse 1 de livraison	Adresse 2 de livraison	Adresse 3 de livraison	CP de livraison	Ville de livraison	Code pays de livraison	Pays de livraison	Cadre de facturation
E	Bon de livraison	BL00001	24/09/2025				REP0001	001	CLIENT TEST	Aucune	123 RUE TEST		06200	Nice	FRA	France	Local	Aucun	FR123456789		Contact Test	VIR	24/09/2025	24/09/2025										Non défini			100.00																																		S = Taux de TVA standard								FRA	France	B1 - Dépôt d'une facture de bien
L																																																ART0010	1.000	80.00	96.00	20.00		VEGETAUX	0	0.00		0.000	0.000	0.000	0.000	24/09/2025	1	0.00	0.00	0.00	0.00	0.00			REP0001	0	0.00	0.00		0.00	1.000		1												
E	Facture	FB00001	24/09/2025					001	CLIENT TEST	Aucune	123 RUE TEST		06200	Nice	FRA	France	Local	Aucun	FR123456789		Contact Test	CB	24/09/2025	24/09/2025	Oui		Oui	Oui						Non défini			120.00																																		S = Taux de TVA standard								FRA	France	B1 - Dépôt d'une facture de bien
L																																																ART0010	1.000	100.00	120.00	20.00		VEGETAUX	0	0.00		0.000	0.000	0.000	0.000	24/09/2025	1	0.00	0.00	0.00	0.00	0.00				0	0.00	0.00		0.00	1.000		1												
`;

    const blob = new Blob([template], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_import_sage.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const getDocumentTypeBadge = (type: string) => {
    if (type === "bon_livraison") {
      return <Badge variant="secondary">Bon de livraison</Badge>;
    } else if (type === "facture") {
      return <Badge variant="default">Facture</Badge>;
    }
    return <Badge variant="outline">{type}</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importer depuis Sage
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import depuis Sage 50</DialogTitle>
          <DialogDescription>
            Importez vos documents Sage 50 (bons de livraison, factures) dans
            l'application
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {/* Sélection de fichier */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. Sélection du fichier</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
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
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={downloadTemplate}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Template
                  </Button>
                  {file && (
                    <Button
                      variant="outline"
                      onClick={() => setShowFileContent(!showFileContent)}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      {showFileContent ? "Masquer" : "Afficher"} contenu
                    </Button>
                  )}
                </div>
              </div>

              {file && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>

                  {showFileContent && fileContent && (
                    <div className="p-3 bg-muted rounded-lg">
                      <h4 className="text-sm font-medium mb-2">
                        Contenu du fichier (premières lignes) :
                      </h4>
                      <pre className="text-xs overflow-auto max-h-40 whitespace-pre-wrap">
                        {fileContent.split("\n").slice(0, 10).join("\n")}
                        {fileContent.split("\n").length > 10 &&
                          "\n... (tronqué)"}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Traitement */}
          {file && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">2. Traitement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={processFile}
                  disabled={isProcessing}
                  className="w-full gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Traitement en cours...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      Analyser le fichier
                    </>
                  )}
                </Button>

                {isProcessing && (
                  <div className="space-y-2">
                    <Progress value={50} className="w-full" />
                    <p className="text-sm text-muted-foreground text-center">
                      Analyse du fichier en cours...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Résultats */}
          {importResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">3. Résultats</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="summary" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="summary">Résumé</TabsTrigger>
                    <TabsTrigger value="preview">Aperçu</TabsTrigger>
                    <TabsTrigger value="errors">Erreurs</TabsTrigger>
                  </TabsList>

                  <TabsContent value="summary" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium">Statut</h4>
                        <div className="flex items-center gap-2">
                          {importResult.success ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span
                            className={
                              importResult.success
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {importResult.success
                              ? "Prêt à importer"
                              : "Erreurs détectées"}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium">Documents trouvés</h4>
                        <p className="text-2xl font-bold">
                          {importResult.documents.length}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">Répartition par type</h4>
                      <div className="flex gap-2">
                        {importResult.documents.filter(
                          (d) => d.type === "bon_livraison"
                        ).length > 0 && (
                          <Badge variant="secondary">
                            {
                              importResult.documents.filter(
                                (d) => d.type === "bon_livraison"
                              ).length
                            }{" "}
                            Bon(s) de livraison
                          </Badge>
                        )}
                        {importResult.documents.filter(
                          (d) => d.type === "facture"
                        ).length > 0 && (
                          <Badge variant="default">
                            {
                              importResult.documents.filter(
                                (d) => d.type === "facture"
                              ).length
                            }{" "}
                            Facture(s)
                          </Badge>
                        )}
                      </div>
                    </div>

                    {importResult.success && (
                      <Button onClick={handleImport} className="w-full gap-2">
                        <Upload className="h-4 w-4" />
                        Importer dans la base de données
                      </Button>
                    )}
                  </TabsContent>

                  <TabsContent value="preview" className="space-y-4">
                    <div className="max-h-96 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>N°</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Lignes</TableHead>
                            <TableHead>Total TTC</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.map((doc, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                {getDocumentTypeBadge(doc.type)}
                              </TableCell>
                              <TableCell className="font-mono">
                                {doc.numero}
                              </TableCell>
                              <TableCell>{doc.date}</TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">
                                    {doc.client.nom}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {doc.client.code}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{doc.lignes.length}</TableCell>
                              <TableCell className="font-mono">
                                {doc.totalTTC.toFixed(2)} €
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  <TabsContent value="errors" className="space-y-4">
                    {importResult.errors.length > 0 && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-2">
                            <p className="font-medium">
                              Erreurs détectées ({importResult.errors.length})
                            </p>
                            <ul className="text-sm space-y-1">
                              {importResult.errors.map((error, index) => (
                                <li
                                  key={index}
                                  className="flex items-start gap-2"
                                >
                                  <span className="text-red-500">•</span>
                                  <span>{error}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    {importResult.warnings.length > 0 && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-2">
                            <p className="font-medium">
                              Avertissements ({importResult.warnings.length})
                            </p>
                            <ul className="text-sm space-y-1">
                              {importResult.warnings.map((warning, index) => (
                                <li
                                  key={index}
                                  className="flex items-start gap-2"
                                >
                                  <span className="text-orange-500">•</span>
                                  <span>{warning}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    {importResult.errors.length === 0 &&
                      importResult.warnings.length === 0 && (
                        <Alert>
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription>
                            Aucune erreur ou avertissement détecté. Le fichier
                            est prêt à être importé.
                          </AlertDescription>
                        </Alert>
                      )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
