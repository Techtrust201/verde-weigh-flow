import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Users,
  CheckCircle,
  AlertCircle,
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db, Client } from "@/lib/database";

interface ParsedClient {
  codeClient: string;
  nomClient: string;
  formeJuridique?: string;
  adresse1?: string;
  adresse2?: string;
  adresse3?: string;
  codePostal?: string;
  ville?: string;
  codePays?: string;
  pays?: string;
  siret?: string;
  email?: string;
  telephone?: string;
}

interface ImportResult {
  success: boolean;
  clients: ParsedClient[];
  errors: string[];
  warnings: string[];
}

export default function SageClientImportDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

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

  const parseSageClientFile = (content: string): ParsedClient[] => {
    const lines = content.split("\n").filter((line) => line.trim());

    if (lines.length === 0) {
      throw new Error("Le fichier est vide");
    }

    // Parse l'en-tête pour obtenir les noms de colonnes
    const headerLine = lines[0];
    const columns = headerLine.split("\t");

    const clients: ParsedClient[] = [];

    // Traiter chaque ligne (en sautant l'en-tête)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = line.split("\t");

      // Créer un objet avec les colonnes
      const rowData: Record<string, string> = {};
      columns.forEach((col, index) => {
        rowData[col] = values[index] || "";
      });

      // Extraire uniquement les lignes E (en-tête de document)
      if (rowData["Type de Ligne"] === "E") {
        const client: ParsedClient = {
          codeClient: rowData["Code client"] || "",
          nomClient: rowData["Nom client"] || "",
          formeJuridique: rowData["Forme juridique"],
          adresse1: rowData["Adresse 1"],
          adresse2: rowData["Adresse 2"],
          adresse3: rowData["Adresse 3"],
          codePostal: rowData["Code postal"],
          ville: rowData["Ville"],
          codePays: rowData["Code pays"],
          pays: rowData["Pays"],
        };

        // Ne pas ajouter les doublons
        const exists = clients.some(
          (c) =>
            c.codeClient === client.codeClient &&
            c.nomClient === client.nomClient
        );
        if (!exists && client.codeClient && client.nomClient) {
          clients.push(client);
        }
      }
    }

    return clients;
  };

  const processFile = useCallback(async () => {
    if (!file) return;

    setIsProcessing(true);
    try {
      const content = await file.text();

      const parsedClients = parseSageClientFile(content);

      // Valider les clients
      const errors: string[] = [];
      const warnings: string[] = [];

      parsedClients.forEach((client, index) => {
        if (!client.nomClient) {
          errors.push(`Client ${index + 1}: Nom manquant`);
        }
        if (!client.adresse1 && !client.ville) {
          warnings.push(`Client ${client.nomClient}: Adresse incomplète`);
        }
      });

      const result: ImportResult = {
        success: errors.length === 0,
        clients: parsedClients,
        errors,
        warnings,
      };

      setImportResult(result);

      if (result.success) {
        toast({
          title: "Analyse réussie",
          description: `${parsedClients.length} client(s) trouvé(s)`,
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
    if (!importResult?.success || !importResult.clients.length) return;

    setIsImporting(true);
    try {
      let imported = 0;
      let skipped = 0;

      for (const parsedClient of importResult.clients) {
        // Vérifier si le client existe déjà (par code client ou nom)
        const existingClient = await db.clients
          .filter(
            (c) =>
              c.raisonSociale === parsedClient.nomClient ||
              c.siret === parsedClient.codeClient
          )
          .first();

        if (existingClient) {
          skipped++;
          continue;
        }

        // Créer le client
        const newClient: Client = {
          typeClient: "professionnel", // Par défaut professionnel pour les imports Sage
          raisonSociale: parsedClient.nomClient,
          siret: parsedClient.codeClient,
          adresse: parsedClient.adresse1 || "",
          codePostal: parsedClient.codePostal || "",
          ville: parsedClient.ville || "",
          plaques: [], // Vide par défaut
          chantiers: [], // Vide par défaut
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await db.clients.add(newClient);
        imported++;
      }

      toast({
        title: "Import terminé",
        description: `${imported} client(s) importé(s), ${skipped} déjà existant(s)`,
      });

      setIsOpen(false);
      setFile(null);
      setImportResult(null);
    } catch (error) {
      console.error("Erreur lors de l'import:", error);
      toast({
        title: "Erreur d'import",
        description: "Impossible d'importer les clients",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  }, [importResult, toast]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Users className="h-4 w-4" />
          Importer des clients
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import de clients depuis Sage 50</DialogTitle>
          <DialogDescription>
            Importez vos clients existants depuis un fichier d'export Sage 50
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Sélection de fichier */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="client-file-upload">
                Fichier d'export Sage (.txt)
              </Label>
              <Input
                id="client-file-upload"
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
              <Alert variant={importResult.success ? "default" : "destructive"}>
                {importResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {importResult.success
                    ? `${importResult.clients.length} client(s) prêt(s) à être importé(s)`
                    : `${importResult.errors.length} erreur(s) détectée(s)`}
                </AlertDescription>
              </Alert>

              {/* Aperçu des clients */}
              {importResult.clients.length > 0 && (
                <div className="border rounded-lg max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Nom</TableHead>
                        <TableHead>Adresse</TableHead>
                        <TableHead>Ville</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importResult.clients
                        .slice(0, 50)
                        .map((client, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono text-xs">
                              {client.codeClient}
                            </TableCell>
                            <TableCell className="font-medium">
                              {client.nomClient}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {client.adresse1}
                            </TableCell>
                            <TableCell className="text-sm">
                              {client.codePostal} {client.ville}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                  {importResult.clients.length > 50 && (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      ... et {importResult.clients.length - 50} autre(s)
                      client(s)
                    </div>
                  )}
                </div>
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
                        {importResult.errors.slice(0, 5).map((error, index) => (
                          <li key={index} className="flex items-start gap-2">
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
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-orange-500">•</span>
                              <span>{warning}</span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Bouton d'import */}
              {importResult.success && (
                <Button
                  onClick={handleImport}
                  disabled={isImporting}
                  className="w-full gap-2"
                >
                  {isImporting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Import en cours...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Importer {importResult.clients.length} client(s)
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

