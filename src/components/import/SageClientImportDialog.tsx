import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, Users, CheckCircle, AlertCircle, Check, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db, Client } from "@/lib/database";
import { normalizeClientCode, matchClientCodes } from "@/utils/clientCodeUtils";

interface ParsedClient {
  codeClient: string;
  nomClient: string;
  societe?: string; // Raison sociale
  formeJuridique?: string;
  adresse1?: string;
  adresse2?: string;
  adresse3?: string;
  codePostal?: string;
  ville?: string;
  pays?: string;
  codePays?: string; // Code du pays
  telephone?: string;
  portable?: string;
  email?: string;
  siret?: string;
  representant?: string; // Nom du représentant
  nomRepresentant?: string; // Nom complet du représentant
  modePaiement?: string; // Code du mode de paiement (ESP, VIR, etc.)
  modePaiementLibelle?: string; // Libellé du mode de paiement
  typeClient?: string; // Type de client (Professionnel, Particulier, etc.)
  tvaIntracom?: string; // Numéro TVA intracommunautaire
  nomBanque?: string; // Nom de la banque
  codeBanque?: string; // Code banque
  codeGuichet?: string; // Code guichet
  numeroCompte?: string; // Numéro de compte
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

  // Fonction pour corriger l'encodage des caractères spéciaux
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

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImportResult(null);
    }
  }, []);

  const parseSageClientFile = (content: string): ParsedClient[] => {
    const lines = content.split("\n").filter((line) => line.trim());

    if (lines.length === 0) {
      throw new Error("Le fichier est vide");
    }

    // Parse l'en-tête pour obtenir les noms de colonnes
    const headerLine = lines[0];
    const columns = headerLine.split("\t");
    const typeClientIndex = columns.findIndex((col) => col.trim() === "Type de client");

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

      // Vérifier si c'est un fichier d'export de clients Sage (pas un fichier de BL)
      // Si on trouve "Code" et "Nom" comme colonnes, c'est un export clients
      if (rowData["Code"] && rowData["Nom"]) {
        const client: ParsedClient = {
          codeClient: normalizeClientCode(rowData["Code"]), // Normaliser le code client
          nomClient: rowData["Nom"] || "",
          societe: rowData["Soci�t�"] || "", // Gérer l'encodage mal fait
          formeJuridique: rowData["Forme juridique"],
          adresse1: rowData["Adresse 1"],
          adresse2: rowData["Adresse 2"],
          adresse3: rowData["Adresse 3"],
          codePostal: rowData["Code Postal"],
          ville: rowData["Ville"],
          pays: rowData["Pays"],
          telephone: rowData["T�l�phone"], // Gérer l'encodage mal fait
          portable: rowData["Portable"],
          email: rowData["E-mail"],
          siret: rowData["SIRET"],
          representant: rowData["Repr�sentant"], // Gérer l'encodage mal fait
          nomRepresentant: rowData["Nom Repr�sentant"], // Gérer l'encodage mal fait
          modePaiement: rowData["Mode de paiement"], // ESP, VIR, PRVT, CB, CHQ
          modePaiementLibelle: rowData["Libell� mode de paiement"], // Gérer l'encodage mal fait
          typeClient:
            (typeClientIndex >= 0 ? values[typeClientIndex] || "" : "").replace(/^["']|["']$/g, "").trim() || "",
          tvaIntracom: rowData["N� TVA intracom"], // TVA intracommunautaire
          nomBanque: rowData["Nom Banque"], // Nom de la banque
          codeBanque: rowData["Code Banque"], // Code banque
          codeGuichet: rowData["Code Guichet"], // Code guichet
          numeroCompte: rowData["Num�ro Compte"], // Numéro de compte
        };

        // Ajouter le client si les données minimales sont présentes
        if (client.codeClient && client.nomClient) {
          clients.push(client);
        }
      }
      // Sinon, vérifier si c'est un fichier de BL (format ancien)
      else if (rowData["Type de Ligne"] === "E") {
        const client: ParsedClient = {
          codeClient: normalizeClientCode(rowData["Code client"]), // Normaliser le code client
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
        const exists = clients.some((c) => c.codeClient === client.codeClient && c.nomClient === client.nomClient);
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
      console.error("Erreur lors du traitement du fichier");
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
      let newPaymentMethods = 0;

      for (const parsedClient of importResult.clients) {
        // Vérifier si le client existe déjà (par code client ou nom)
        const existingClient = await db.clients
          .filter((c) => c.raisonSociale === parsedClient.nomClient || c.siret === parsedClient.codeClient)
          .first();

        if (existingClient) {
          skipped++;
          continue;
        }

        // Si un mode de paiement est présent, vérifier s'il existe dans la table
        if (parsedClient.modePaiement && parsedClient.modePaiementLibelle) {
          const existingMethod = await db.paymentMethods.filter((pm) => pm.code === parsedClient.modePaiement).first();

          if (!existingMethod) {
            // Créer le nouveau mode de paiement
            await db.paymentMethods.add({
              code: parsedClient.modePaiement,
              libelle: parsedClient.modePaiementLibelle,
              active: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            newPaymentMethods++;
          }
        }

        // Déterminer le type de client
        let typeClient: "particulier" | "professionnel" | "micro-entreprise" = "professionnel";
        if (parsedClient.typeClient) {
          const typeLower = parsedClient.typeClient.toLowerCase().trim();
          if (typeLower.includes("particulier")) {
            typeClient = "particulier";
          } else if (typeLower.includes("micro")) {
            typeClient = "micro-entreprise";
          }
        }

        // Construire l'adresse complète avec correction d'encodage
        let adresseComplete = fixEncoding(parsedClient.adresse1) || "";
        if (parsedClient.adresse2) {
          adresseComplete += (adresseComplete ? ", " : "") + fixEncoding(parsedClient.adresse2);
        }
        if (parsedClient.adresse3) {
          adresseComplete += (adresseComplete ? ", " : "") + fixEncoding(parsedClient.adresse3);
        }

        // Créer le client avec toutes les données extraites et corrigées
        const newClient: Client = {
          typeClient: typeClient,
          raisonSociale: fixEncoding(parsedClient.societe) || fixEncoding(parsedClient.nomClient),
          prenom: fixEncoding(parsedClient.representant) || undefined,
          nom: fixEncoding(parsedClient.nomRepresentant) || undefined,
          siret: parsedClient.siret || undefined,
          adresse: adresseComplete,
          codePostal: fixEncoding(parsedClient.codePostal) || "",
          ville: fixEncoding(parsedClient.ville) || "",
          email: fixEncoding(parsedClient.email) || undefined,
          telephone: fixEncoding(parsedClient.telephone) || fixEncoding(parsedClient.portable) || undefined,
          modePaiementPreferentiel: parsedClient.modePaiement, // Mode de paiement importé
          plaques: [], // Vide par défaut - sera rempli manuellement
          chantiers: [], // Vide par défaut - sera rempli manuellement

          // Nouveaux champs importés depuis Sage
          codeClient: parsedClient.codeClient,
          tvaIntracom: parsedClient.tvaIntracom || undefined,
          nomBanque: fixEncoding(parsedClient.nomBanque) || undefined,
          codeBanque: parsedClient.codeBanque || undefined,
          codeGuichet: parsedClient.codeGuichet || undefined,
          numeroCompte: parsedClient.numeroCompte || undefined,

          // Champs pour Track Déchet
          codeNAF: undefined, // Sera rempli manuellement si nécessaire
          activite: undefined, // Sera rempli manuellement si nécessaire
          representantLegal: undefined, // Sera rempli manuellement si nécessaire

          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await db.clients.add(newClient);
        imported++;
      }

      toast({
        title: "Import terminé",
        description: `${imported} client(s) importé(s), ${skipped} déjà existant(s)${
          newPaymentMethods > 0 ? `, ${newPaymentMethods} mode(s) de paiement créé(s)` : ""
        }`,
      });

      setIsOpen(false);
      setFile(null);
      setImportResult(null);
    } catch (error) {
      console.error("Erreur lors de l'import");
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

      <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import de clients depuis Sage 50</DialogTitle>
          <DialogDescription>Importez vos clients existants depuis un fichier d'export Sage 50</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto overflow-x-hidden flex-1 px-1">
          {/* Sélection de fichier */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="client-file-upload">Fichier d'export Sage (.txt)</Label>
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
                  Fichier sélectionné : {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Traitement */}
          {file && !importResult && (
            <Button onClick={processFile} disabled={isProcessing} className="w-full gap-2">
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
                {importResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertDescription>
                  {importResult.success
                    ? `${importResult.clients.length} client(s) prêt(s) à être importé(s)`
                    : `${importResult.errors.length} erreur(s) détectée(s)`}
                </AlertDescription>
              </Alert>

              {/* Aperçu des clients */}
              {importResult.clients.length > 0 && (
                <>
                  {/* Vue mobile - Cards */}
                  <div className="md:hidden space-y-3 max-h-[500px] overflow-y-auto">
                    {importResult.clients.slice(0, 50).map((client, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3 bg-card">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-base break-words">
                              {fixEncoding(client.societe) || fixEncoding(client.nomClient)}
                            </div>
                            {client.representant && (
                              <div className="text-sm text-muted-foreground">{fixEncoding(client.representant)}</div>
                            )}
                          </div>
                          <Badge variant="outline" className="shrink-0">
                            {fixEncoding(client.typeClient) || "Non défini"}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Code:</span>
                            <div className="font-mono">{client.codeClient}</div>
                          </div>
                          {client.siret && (
                            <div>
                              <span className="text-muted-foreground">SIRET:</span>
                              <div className="font-mono text-xs break-all">{fixEncoding(client.siret)}</div>
                            </div>
                          )}
                        </div>

                        {(client.codePostal || client.ville) && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Adresse:</span>
                            <div>
                              {fixEncoding(client.adresse1)}
                              {client.adresse2 && <div>{fixEncoding(client.adresse2)}</div>}
                              <div className="font-medium">
                                {fixEncoding(client.codePostal)} {fixEncoding(client.ville)}
                              </div>
                            </div>
                          </div>
                        )}

                        {(client.telephone || client.portable || client.email) && (
                          <div className="text-sm space-y-1">
                            {client.telephone && <div>📞 {fixEncoding(client.telephone)}</div>}
                            {client.portable && <div>📱 {fixEncoding(client.portable)}</div>}
                            {client.email && <div className="break-all">✉️ {fixEncoding(client.email)}</div>}
                          </div>
                        )}

                        {client.modePaiement && (
                          <div>
                            <Badge variant="secondary" className="text-xs">
                              {fixEncoding(client.modePaiement)} - {fixEncoding(client.modePaiementLibelle)}
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))}
                    {importResult.clients.length > 50 && (
                      <div className="p-2 text-center text-sm text-muted-foreground">
                        ... et {importResult.clients.length - 50} autre(s) client(s)
                      </div>
                    )}
                  </div>

                  {/* Vue desktop - Table */}
                  <div className="hidden md:block border rounded-lg max-h-[500px] overflow-auto">
                    <div className="min-w-[1200px]">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                          <TableRow>
                            <TableHead className="w-20">Code</TableHead>
                            <TableHead className="min-w-[200px]">Nom/Société</TableHead>
                            <TableHead className="w-32">Type</TableHead>
                            <TableHead className="w-36">SIRET</TableHead>
                            <TableHead className="w-32">TVA Intra</TableHead>
                            <TableHead className="min-w-[180px]">RIB</TableHead>
                            <TableHead className="min-w-[200px]">Adresse</TableHead>
                            <TableHead className="min-w-[160px]">Contact</TableHead>
                            <TableHead className="min-w-[140px]">Mode Paiement</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importResult.clients.slice(0, 50).map((client, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-mono text-xs">{client.codeClient}</TableCell>
                              <TableCell className="font-medium">
                                <div>
                                  <div>{fixEncoding(client.societe) || fixEncoding(client.nomClient)}</div>
                                  {client.representant && (
                                    <div className="text-xs text-muted-foreground">
                                      {fixEncoding(client.representant)}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">
                                <Badge variant="outline">{fixEncoding(client.typeClient) || "Non défini"}</Badge>
                              </TableCell>
                              <TableCell className="text-sm font-mono">{fixEncoding(client.siret) || "N/A"}</TableCell>
                              <TableCell className="text-sm font-mono">
                                {fixEncoding(client.tvaIntracom) || "N/A"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {fixEncoding(client.nomBanque) && fixEncoding(client.codeBanque) ? (
                                  <div>
                                    <div className="font-medium">{fixEncoding(client.nomBanque)}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {fixEncoding(client.codeBanque)} {fixEncoding(client.codeGuichet)}{" "}
                                      {fixEncoding(client.numeroCompte)}
                                    </div>
                                  </div>
                                ) : (
                                  "N/A"
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                <div>
                                  {fixEncoding(client.adresse1)}
                                  {client.adresse2 && <div>{fixEncoding(client.adresse2)}</div>}
                                  <div className="font-medium">
                                    {fixEncoding(client.codePostal)} {fixEncoding(client.ville)}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">
                                <div>
                                  {client.telephone && <div>📞 {fixEncoding(client.telephone)}</div>}
                                  {client.portable && <div>📱 {fixEncoding(client.portable)}</div>}
                                  {client.email && <div>✉️ {fixEncoding(client.email)}</div>}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">
                                {client.modePaiement && (
                                  <Badge variant="secondary">
                                    {fixEncoding(client.modePaiement)} - {fixEncoding(client.modePaiementLibelle)}
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {importResult.clients.length > 50 && (
                      <div className="p-2 text-center text-sm text-muted-foreground">
                        ... et {importResult.clients.length - 50} autre(s) client(s)
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
                      <p className="font-medium">Erreurs ({importResult.errors.length})</p>
                      <ul className="text-sm space-y-1">
                        {importResult.errors.slice(0, 5).map((error, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-red-500">•</span>
                            <span>{error}</span>
                          </li>
                        ))}
                        {importResult.errors.length > 5 && (
                          <li className="text-xs">... et {importResult.errors.length - 5} autre(s) erreur(s)</li>
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
                      <p className="font-medium">Avertissements ({importResult.warnings.length})</p>
                      <ul className="text-sm space-y-1">
                        {importResult.warnings.slice(0, 5).map((warning, index) => (
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
                        Importer {importResult.clients.length} client(s)
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
  );
}
