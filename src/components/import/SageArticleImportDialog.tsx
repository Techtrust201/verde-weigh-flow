import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Upload,
  Package,
  CheckCircle,
  AlertCircle,
  Check,
  RefreshCw,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db, Product } from "@/lib/database";
import { cleanupDuplicateProducts } from "@/utils/productCleanup";
import {
  validateAndFixMissingFields,
  type MissingFieldsResult,
} from "@/utils/validateMissingFields";
import { MissingFieldsDialog } from "./MissingFieldsDialog";

interface ParsedArticle {
  code: string; // Code article (colonne "Code")
  designationCourte: string; // Désignation courte
  designationLongue?: string; // Désignation longue
  prixVenteHT: number; // Prix de vente HT
  prixVenteTTC: number; // Prix de vente TTC
  tauxTVA: number; // Taux TVA
  unite?: string; // Unité (si disponible)
}

interface ImportResult {
  success: boolean;
  articles: ParsedArticle[];
  errors: string[];
  warnings: string[];
}

interface DuplicateArticleDialogProps {
  article: ParsedArticle;
  existingProduct: Product;
  onResolve: (action: "skip" | "update") => void;
  isOpen: boolean;
}

const DuplicateArticleDialog = ({
  article,
  existingProduct,
  onResolve,
  isOpen,
}: DuplicateArticleDialogProps) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={() => onResolve("skip")}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Article en doublon détecté</AlertDialogTitle>
          <AlertDialogDescription>
            L'article avec le code "{article.code}" existe déjà dans votre base
            de données.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="border rounded-lg p-4 bg-gray-50">
            <h4 className="font-medium text-sm mb-2">Article existant :</h4>
            <div className="text-sm space-y-1">
              <div>
                <strong>Code :</strong> {existingProduct.codeProduct}
              </div>
              <div>
                <strong>Nom :</strong> {existingProduct.nom}
              </div>
              <div>
                <strong>Prix HT :</strong> {existingProduct.prixHT}€
              </div>
              <div>
                <strong>Prix TTC :</strong> {existingProduct.prixTTC}€
              </div>
              <div>
                <strong>TVA :</strong> {existingProduct.tauxTVA}%
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-4 bg-blue-50">
            <h4 className="font-medium text-sm mb-2">
              Nouvel article (Sage) :
            </h4>
            <div className="text-sm space-y-1">
              <div>
                <strong>Code :</strong> {article.code}
              </div>
              <div>
                <strong>Nom :</strong> {article.designationCourte}
              </div>
              <div>
                <strong>Prix HT :</strong> {article.prixVenteHT}€
              </div>
              <div>
                <strong>Prix TTC :</strong> {article.prixVenteTTC}€
              </div>
              <div>
                <strong>TVA :</strong> {article.tauxTVA}%
              </div>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onResolve("skip")}>
            Ignorer (garder l'existant)
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => onResolve("update")}>
            Mettre à jour
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default function SageArticleImportDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [missingFields, setMissingFields] =
    useState<MissingFieldsResult | null>(null);
  const [isMissingFieldsDialogOpen, setIsMissingFieldsDialogOpen] =
    useState(false);
  const [duplicateDialog, setDuplicateDialog] = useState<{
    isOpen: boolean;
    article: ParsedArticle | null;
    existingProduct: Product | null;
    resolve: ((action: "skip" | "update") => void) | null;
  }>({
    isOpen: false,
    article: null,
    existingProduct: null,
    resolve: null,
  });
  const { toast } = useToast();

  // Fonction pour corriger l'encodage des caractères spéciaux (réutilisée de SageClientImportDialog)
  const fixEncoding = (text: string | undefined): string => {
    if (!text) return "";

    return text
      .replace(/�/g, "é") // Corriger les é mal encodés
      .replace(/�/g, "è") // Corriger les è mal encodés
      .replace(/�/g, "à") // Corriger les à mal encodés
      .replace(/�/g, "ç") // Corriger les ç mal encodés
      .replace(/�/g, "ù") // Corriger les ù mal encodés
      .replace(/�/g, "ê") // Corriger les ê mal encodés
      .replace(/�/g, "î") // Corriger les î mal encodés
      .replace(/�/g, "ô") // Corriger les ô mal encodés
      .replace(/�/g, "û") // Corriger les û mal encodés
      .replace(/�/g, "â") // Corriger les â mal encodés
      .replace(/�/g, "É") // Corriger les É mal encodés
      .replace(/�/g, "È") // Corriger les È mal encodés
      .replace(/�/g, "À") // Corriger les À mal encodés
      .replace(/�/g, "Ç") // Corriger les Ç mal encodés
      .replace(/�/g, "Ù") // Corriger les Ù mal encodés
      .replace(/�/g, "Ê") // Corriger les Ê mal encodés
      .replace(/�/g, "Î") // Corriger les Î mal encodés
      .replace(/�/g, "Ô") // Corriger les Ô mal encodés
      .replace(/�/g, "Û") // Corriger les Û mal encodés
      .replace(/�/g, "Â"); // Corriger les Â mal encodés
  };

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (selectedFile) {
        setFile(selectedFile);
        setImportResult(null);
      }
    },
    []
  );

  const parseSageArticleFile = (content: string): ParsedArticle[] => {
    const lines = content.split("\n").filter((line) => line.trim());

    if (lines.length === 0) {
      throw new Error("Le fichier est vide");
    }

    // Parse l'en-tête pour obtenir les noms de colonnes
    const headerLine = lines[0];
    const columns = headerLine.split("\t");

    const articles: ParsedArticle[] = [];

    // Traiter chaque ligne (en sautant l'en-tête)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = line.split("\t");

      // Créer un objet avec les colonnes
      const rowData: Record<string, string> = {};
      columns.forEach((col, index) => {
        rowData[col] = values[index] || "";
      });

      // Vérifier si c'est un fichier d'export d'articles Sage
      // Colonnes attendues : Code, Désignation courte, Prix de vente HT, Prix de vente TTC, Taux TVA, Unité
      if (rowData["Code"] && rowData["D�signation courte"]) {
        const prixHT = parseFloat(
          rowData["Prix de vente HT"]?.replace(",", ".") || "0"
        );
        const prixTTC = parseFloat(
          rowData["Prix de vente TTC"]?.replace(",", ".") || "0"
        );
        const tauxTVA = parseFloat(
          rowData["Taux TVA"]?.replace(",", ".") || "0"
        );

        const article: ParsedArticle = {
          code: rowData["Code"] || "",
          designationCourte: rowData["D�signation courte"] || "",
          designationLongue: rowData["D�signation longue"] || undefined,
          prixVenteHT: prixHT,
          prixVenteTTC: prixTTC,
          tauxTVA: tauxTVA,
          unite: rowData["Unit�"] || "tonne", // Unité par défaut si non spécifiée
        };

        // Ajouter l'article si les données minimales sont présentes
        if (article.code && article.designationCourte) {
          articles.push(article);
        }
      }
    }

    return articles;
  };

  const processFile = useCallback(async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const content = await file.text();
      const parsedArticles = parseSageArticleFile(content);

      // Valider les articles
      const errors: string[] = [];
      const warnings: string[] = [];

      parsedArticles.forEach((article, index) => {
        if (!article.code) {
          errors.push(`Article ${index + 1}: Code manquant`);
        }
        if (!article.designationCourte) {
          errors.push(`Article ${index + 1}: Désignation courte manquante`);
        }
        if (article.prixVenteHT <= 0) {
          warnings.push(
            `Article ${article.code}: Prix HT invalide (${article.prixVenteHT}€)`
          );
        }
        if (article.prixVenteTTC <= 0) {
          warnings.push(
            `Article ${article.code}: Prix TTC invalide (${article.prixVenteTTC}€)`
          );
        }
      });

      const result: ImportResult = {
        success: errors.length === 0,
        articles: parsedArticles,
        errors,
        warnings,
      };

      setImportResult(result);

      if (result.success) {
        toast({
          title: "Analyse réussie",
          description: `${parsedArticles.length} article(s) trouvé(s)`,
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
    if (!importResult?.success || !importResult.articles.length) return;

    setIsImporting(true);
    try {
      // Hypothèse B : Vérifier les champs obligatoires avant le nettoyage
      const missingFieldsResult = await validateAndFixMissingFields();
      if (
        missingFieldsResult.clients.length > 0 ||
        missingFieldsResult.products.length > 0
      ) {
        setMissingFields(missingFieldsResult);
        setIsMissingFieldsDialogOpen(true);
        setIsImporting(false);
        return; // Attendre la correction avant de continuer
      }

      // Nettoyer les doublons avant l'import pour fusionner les données existantes
      await cleanupDuplicateProducts();

      let imported = 0;
      let updated = 0;
      let skipped = 0;

      for (const parsedArticle of importResult.articles) {
        // Vérifier si l'article existe déjà (par code article)
        const existingProduct = await db.products
          .filter((p) => p.codeProduct === parsedArticle.code)
          .first();

        if (existingProduct) {
          // Gérer le doublon avec dialog
          const resolution = await new Promise<"skip" | "update">((resolve) => {
            setDuplicateDialog({
              isOpen: true,
              article: parsedArticle,
              existingProduct: existingProduct,
              resolve: resolve,
            });
          });

          if (resolution === "skip") {
            skipped++;
            continue;
          } else if (resolution === "update") {
            // Récupérer le produit complet depuis la DB pour préserver toutes les données
            const fullProduct = await db.products.get(existingProduct.id!);
            if (!fullProduct) {
              updated++;
              continue;
            }

            // Créer les updates en préservant les champs absents du fichier
            // Ces champs ne sont pas dans le fichier Sage, donc on ne les touche pas
            const updates: Partial<Product> = {
              nom: fixEncoding(parsedArticle.designationCourte),
              prixHT: parsedArticle.prixVenteHT,
              prixTTC: parsedArticle.prixVenteTTC,
              tauxTVA: parsedArticle.tauxTVA,
              unite: parsedArticle.unite || "tonne",
              updatedAt: new Date(),
            };

            // Utiliser put() avec merge explicite pour garantir la préservation de tous les champs
            // Pattern cohérent avec ClientsSpace.tsx et PeseeSpace.tsx
            // Les champs suivants seront préservés car présents dans fullProduct :
            // - isFavorite
            // - description (si déjà présente)
            // - categorieDechet
            // - codeDechets
            // - trackDechetEnabled
            // - Tous les autres champs Track Déchet
            const mergedProduct = {
              ...fullProduct, // Toutes les données existantes (isFavorite, description, Track Déchet, etc.)
              ...updates, // Les nouvelles données du fichier Sage
              id: existingProduct.id,
              updatedAt: new Date(),
            } as Product;
            await db.products.put(mergedProduct);
            updated++;
          }
        } else {
          // Créer un nouvel article
          const newProduct: Product = {
            nom: fixEncoding(parsedArticle.designationCourte),
            description: parsedArticle.designationLongue
              ? fixEncoding(parsedArticle.designationLongue)
              : undefined,
            prixHT: parsedArticle.prixVenteHT,
            prixTTC: parsedArticle.prixVenteTTC,
            unite: parsedArticle.unite || "tonne",
            tva: parsedArticle.tauxTVA,
            tauxTVA: parsedArticle.tauxTVA,
            codeProduct: parsedArticle.code,
            isFavorite: false,
            // Champs Track Déchet restent vides (à remplir manuellement)
            categorieDechet: undefined,
            codeDechets: "",
            trackDechetEnabled: false,
            consistence: undefined,
            isSubjectToADR: false,
            onuCode: "",
            cap: "",
            conditionnementType: "",
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          await db.products.add(newProduct);
          imported++;
        }
      }

      toast({
        title: "Import terminé",
        description: `${imported} article(s) importé(s), ${updated} mis à jour, ${skipped} ignoré(s)`,
      });

      setIsOpen(false);
      setFile(null);
      setImportResult(null);
    } catch (error) {
      console.error("Erreur lors de l'import");
      toast({
        title: "Erreur d'import",
        description: "Impossible d'importer les articles",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  }, [importResult, toast]);

  const handleDuplicateResolve = (action: "skip" | "update") => {
    if (duplicateDialog.resolve) {
      duplicateDialog.resolve(action);
    }
    setDuplicateDialog({
      isOpen: false,
      article: null,
      existingProduct: null,
      resolve: null,
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Package className="h-4 w-4" />
            Importer des articles
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Import d'articles depuis Sage 50</DialogTitle>
            <DialogDescription>
              Importez vos articles existants depuis un fichier d'export Sage 50
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 overflow-y-auto overflow-x-hidden flex-1 px-1">
            {/* Sélection de fichier */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="article-file-upload">
                  Fichier d'export Sage (.txt)
                </Label>
                <Input
                  id="article-file-upload"
                  type="file"
                  accept=".txt,.csv"
                  onChange={handleFileSelect}
                  className="mt-1"
                />
              </div>

              {file && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Fichier sélectionné : {file.name} (
                    {(file.size / 1024).toFixed(1)} KB)
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Traitement */}
            {file && !importResult && (
              <Button
                onClick={processFile}
                disabled={isProcessing}
                className="w-full gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Analyse en cours...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Analyser le fichier
                  </>
                )}
              </Button>
            )}

            {/* Résultats */}
            {importResult && (
              <div className="space-y-4">
                <Alert
                  variant={importResult.success ? "default" : "destructive"}
                >
                  {importResult.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    {importResult.success
                      ? `${importResult.articles.length} article(s) prêt(s) à être importé(s)`
                      : `${importResult.errors.length} erreur(s) détectée(s)`}
                  </AlertDescription>
                </Alert>

                {/* Aperçu des articles */}
                {importResult.articles.length > 0 && (
                  <>
                    {/* Vue mobile - Cards */}
                    <div className="md:hidden space-y-3 max-h-[500px] overflow-y-auto">
                      {importResult.articles
                        .slice(0, 50)
                        .map((article, index) => (
                          <div
                            key={index}
                            className="border rounded-lg p-4 space-y-3 bg-card"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-base break-words">
                                  {fixEncoding(article.designationCourte)}
                                </div>
                                <div className="text-sm text-muted-foreground font-mono">
                                  Code: {article.code}
                                </div>
                              </div>
                              <Badge variant="outline" className="shrink-0">
                                {article.unite || "tonne"}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">
                                  Prix HT:
                                </span>
                                <div className="font-semibold">
                                  {article.prixVenteHT}€
                                </div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Prix TTC:
                                </span>
                                <div className="font-semibold">
                                  {article.prixVenteTTC}€
                                </div>
                              </div>
                            </div>

                            <div className="text-sm">
                              <span className="text-muted-foreground">
                                TVA:
                              </span>
                              <div className="font-semibold">
                                {article.tauxTVA}%
                              </div>
                            </div>
                          </div>
                        ))}
                      {importResult.articles.length > 50 && (
                        <div className="p-2 text-center text-sm text-muted-foreground">
                          ... et {importResult.articles.length - 50} autre(s)
                          article(s)
                        </div>
                      )}
                    </div>

                    {/* Vue desktop - Table */}
                    <div className="hidden md:block border rounded-lg max-h-[500px] overflow-auto">
                      <div className="min-w-[800px]">
                        <Table>
                          <TableHeader className="sticky top-0 bg-background z-10">
                            <TableRow>
                              <TableHead className="w-20">Code</TableHead>
                              <TableHead className="min-w-[200px]">
                                Nom
                              </TableHead>
                              <TableHead className="w-24">Prix HT</TableHead>
                              <TableHead className="w-24">Prix TTC</TableHead>
                              <TableHead className="w-20">TVA</TableHead>
                              <TableHead className="w-20">Unité</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {importResult.articles
                              .slice(0, 50)
                              .map((article, index) => (
                                <TableRow key={index}>
                                  <TableCell className="font-mono text-xs">
                                    {article.code}
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    <div>
                                      <div>
                                        {fixEncoding(article.designationCourte)}
                                      </div>
                                      {article.designationLongue && (
                                        <div className="text-xs text-muted-foreground">
                                          {fixEncoding(
                                            article.designationLongue
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-sm font-semibold">
                                    {article.prixVenteHT}€
                                  </TableCell>
                                  <TableCell className="text-sm font-semibold">
                                    {article.prixVenteTTC}€
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {article.tauxTVA}%
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    <Badge variant="outline">
                                      {article.unite || "tonne"}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                      {importResult.articles.length > 50 && (
                        <div className="p-2 text-center text-sm text-muted-foreground">
                          ... et {importResult.articles.length - 50} autre(s)
                          article(s)
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Erreurs */}
                {importResult.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-medium">
                          Erreurs ({importResult.errors.length})
                        </p>
                        <ul className="text-sm space-y-1">
                          {importResult.errors
                            .slice(0, 5)
                            .map((error, index) => (
                              <li
                                key={index}
                                className="flex items-start gap-2"
                              >
                                <span className="text-red-500">•</span>
                                <span>{error}</span>
                              </li>
                            ))}
                          {importResult.errors.length > 5 && (
                            <li className="text-xs">
                              ... et {importResult.errors.length - 5} autre(s)
                              erreur(s)
                            </li>
                          )}
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Warnings */}
                {importResult.warnings.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-medium">
                          Avertissements ({importResult.warnings.length})
                        </p>
                        <ul className="text-sm space-y-1">
                          {importResult.warnings
                            .slice(0, 5)
                            .map((warning, index) => (
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

                {/* Boutons d'import et annulation */}
                {importResult.success && (
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button
                      onClick={() => {
                        setFile(null);
                        setImportResult(null);
                      }}
                      disabled={isImporting}
                      variant="outline"
                      size="lg"
                      className="sm:w-auto order-2 sm:order-1"
                    >
                      Annuler
                    </Button>
                    <Button
                      onClick={handleImport}
                      disabled={isImporting}
                      size="lg"
                      className="flex-1 gap-2 order-1 sm:order-2"
                    >
                      {isImporting ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Import en cours...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Importer {importResult.articles.length} article(s)
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de gestion des doublons */}
      {duplicateDialog.isOpen &&
        duplicateDialog.article &&
        duplicateDialog.existingProduct && (
          <DuplicateArticleDialog
            article={duplicateDialog.article}
            existingProduct={duplicateDialog.existingProduct}
            onResolve={handleDuplicateResolve}
            isOpen={duplicateDialog.isOpen}
          />
        )}

      {/* Dialog pour corriger les champs obligatoires manquants */}
      {missingFields && (
        <MissingFieldsDialog
          open={isMissingFieldsDialogOpen}
          onOpenChange={setIsMissingFieldsDialogOpen}
          missingFields={missingFields}
          onFixed={async () => {
            // Relancer l'import après correction
            setMissingFields(null);
            await handleImport();
          }}
        />
      )}
    </>
  );
}
