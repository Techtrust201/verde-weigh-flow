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
  Upload,
  Users,
  CheckCircle,
  AlertCircle,
  Check,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db, Client } from "@/lib/database";
import { normalizeClientCode, matchClientCodes } from "@/utils/clientCodeUtils";
import { cleanupDuplicateClients } from "@/utils/clientCleanup";
import {
  validateAndFixMissingFields,
  type MissingFieldsResult,
} from "@/utils/validateMissingFields";
import { MissingFieldsDialog } from "./MissingFieldsDialog";

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

// Mapping des colonnes avec leurs mots-clés de recherche
const COLUMN_MAPPINGS = {
  societe: [["société"], ["societe"]],
  formeJuridique: [["forme", "juridique"]],
  telephone: [["téléphone"], ["telephone"]],
  siret: [["siret"]],
  representant: [["représentant"], ["representant"]],
  nomRepresentant: [
    ["nom", "représentant"],
    ["nom", "representant"],
  ],
  modePaiementLibelle: [
    ["libellé", "mode", "paiement"],
    ["libelle", "mode", "paiement"],
  ],
  tvaIntracom: [["tva", "intra"]],
  nomBanque: [["nom", "banque"]],
  codeBanque: [["code", "banque"]],
  codeGuichet: [["code", "guichet"]],
  numeroCompte: [
    ["numero", "compte"],
    ["numéro", "compte"],
  ],
} as const;

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
    .replace(/�/g, "Â") // Corriger les Â mal encodés
    .replace(/�/g, "°") // Corriger les ° mal encodés (pour "N° TVA intracom")
    .replace(/�/g, "°"); // Autre variante du symbole degré
};

// Fonction helper pour trouver une valeur de colonne avec fallback
const findColumnValue = (
  rowData: Record<string, string>,
  columns: string[],
  keywords: readonly (readonly string[])[],
  fallback?: string
): string | undefined => {
  const findColumnByKeywords = (
    keywords: readonly string[]
  ): string | undefined => {
    const normalize = (str: string): string =>
      str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "")
        .replace(/[°'"]/g, "");

    for (const colName of columns) {
      const normalizedCol = normalize(colName);
      if (
        keywords.every((keyword) =>
          normalizedCol.includes(normalize(keyword))
        ) &&
        rowData[colName] &&
        rowData[colName] !== ""
      ) {
        return rowData[colName];
      }
    }
    return undefined;
  };

  for (const keywordSet of keywords) {
    const value = findColumnByKeywords(keywordSet);
    if (value) return value;
  }
  return fallback;
};

export default function SageClientImportDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [missingFields, setMissingFields] =
    useState<MissingFieldsResult | null>(null);
  const [isMissingFieldsDialogOpen, setIsMissingFieldsDialogOpen] =
    useState(false);
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
    const typeClientIndex = columns.findIndex(
      (col) => col.trim() === "Type de client"
    );

    // Debug : Afficher toutes les colonnes disponibles (seulement en mode développement)
    if (process.env.NODE_ENV === "development") {
      console.log("=== DEBUG IMPORT CLIENTS SAGE ===");
      console.log("Nombre de colonnes:", columns.length);
      console.log("Colonnes trouvées:", columns);
      console.log("\n=== RECHERCHE COLONNES IMPORTANTES ===");
      console.log(
        "SIRET:",
        columns.find((c) => c.toLowerCase().includes("siret"))
      );
      console.log(
        "TVA Intracom:",
        columns.find(
          (c) =>
            c.toLowerCase().includes("tva") && c.toLowerCase().includes("intra")
        )
      );
      console.log(
        "Nom Banque:",
        columns.find(
          (c) =>
            c.toLowerCase().includes("nom") &&
            c.toLowerCase().includes("banque")
        )
      );
      console.log(
        "Code Banque:",
        columns.find(
          (c) =>
            c.toLowerCase().includes("code") &&
            c.toLowerCase().includes("banque")
        )
      );
      console.log(
        "Code Guichet:",
        columns.find((c) => c.toLowerCase().includes("guichet"))
      );
      console.log(
        "Numéro Compte:",
        columns.find(
          (c) =>
            c.toLowerCase().includes("compte") &&
            !c.toLowerCase().includes("comptable")
        )
      );
      console.log(
        "Clé RIB:",
        columns.find(
          (c) =>
            c.toLowerCase().includes("rib") || c.toLowerCase().includes("cle")
        )
      );
      console.log("===========================================");
    }

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
          codeClient: normalizeClientCode(rowData["Code"]),
          nomClient: rowData["Nom"] || "",
          societe:
            findColumnValue(rowData, columns, COLUMN_MAPPINGS.societe) || "",
          formeJuridique:
            findColumnValue(rowData, columns, COLUMN_MAPPINGS.formeJuridique) ||
            rowData["Forme juridique"],
          adresse1: rowData["Adresse 1"],
          adresse2: rowData["Adresse 2"],
          adresse3: rowData["Adresse 3"],
          codePostal: rowData["Code Postal"],
          ville: rowData["Ville"],
          pays: rowData["Pays"],
          telephone:
            findColumnValue(rowData, columns, COLUMN_MAPPINGS.telephone) ||
            rowData["Téléphone"],
          portable: rowData["Portable"],
          email: rowData["E-mail"],
          siret: findColumnValue(rowData, columns, COLUMN_MAPPINGS.siret),
          representant: findColumnValue(
            rowData,
            columns,
            COLUMN_MAPPINGS.representant
          ),
          nomRepresentant: findColumnValue(
            rowData,
            columns,
            COLUMN_MAPPINGS.nomRepresentant
          ),
          modePaiement: rowData["Mode de paiement"],
          modePaiementLibelle:
            findColumnValue(
              rowData,
              columns,
              COLUMN_MAPPINGS.modePaiementLibelle
            ) || rowData["Libellé mode de paiement"],
          typeClient:
            (typeClientIndex >= 0 ? values[typeClientIndex] || "" : "")
              .replace(/^["']|["']$/g, "")
              .trim() || "",
          tvaIntracom: findColumnValue(
            rowData,
            columns,
            COLUMN_MAPPINGS.tvaIntracom
          ),
          nomBanque: findColumnValue(
            rowData,
            columns,
            COLUMN_MAPPINGS.nomBanque
          ),
          codeBanque: findColumnValue(
            rowData,
            columns,
            COLUMN_MAPPINGS.codeBanque
          ),
          codeGuichet: findColumnValue(
            rowData,
            columns,
            COLUMN_MAPPINGS.codeGuichet
          ),
          numeroCompte: findColumnValue(
            rowData,
            columns,
            COLUMN_MAPPINGS.numeroCompte
          ),
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

  // Fonction helper pour déterminer le type de client
  const determineClientType = useCallback(
    (
      typeClient?: string
    ): "particulier" | "professionnel" | "micro-entreprise" => {
      if (!typeClient) return "professionnel";
      const typeLower = typeClient.toLowerCase().trim();
      if (typeLower.includes("particulier")) return "particulier";
      if (typeLower.includes("micro")) return "micro-entreprise";
      return "professionnel";
    },
    []
  );

  // Fonction helper pour construire l'adresse complète
  const buildAdresseComplete = useCallback(
    (adresse1?: string, adresse2?: string, adresse3?: string): string => {
      return [adresse1, adresse2, adresse3]
        .map((addr) => fixEncoding(addr))
        .filter(Boolean)
        .join(", ");
    },
    []
  );

  // Fonction helper pour créer un objet Client à partir d'un ParsedClient
  const createClientFromParsed = useCallback(
    (
      parsedClient: ParsedClient
    ): Omit<Client, "id" | "createdAt" | "updatedAt"> => {
      return {
        typeClient: determineClientType(parsedClient.typeClient),
        raisonSociale:
          fixEncoding(parsedClient.societe) ||
          fixEncoding(parsedClient.nomClient),
        prenom: fixEncoding(parsedClient.representant) || undefined,
        nom: fixEncoding(parsedClient.nomRepresentant) || undefined,
        siret: parsedClient.siret || undefined,
        adresse: buildAdresseComplete(
          parsedClient.adresse1,
          parsedClient.adresse2,
          parsedClient.adresse3
        ),
        codePostal: fixEncoding(parsedClient.codePostal) || "",
        ville: fixEncoding(parsedClient.ville) || "",
        email: fixEncoding(parsedClient.email) || undefined,
        telephone:
          fixEncoding(parsedClient.telephone) ||
          fixEncoding(parsedClient.portable) ||
          undefined,
        modePaiementPreferentiel: parsedClient.modePaiement,
        plaques: [],
        chantiers: [],
        codeClient: parsedClient.codeClient,
        tvaIntracom: parsedClient.tvaIntracom || undefined,
        nomBanque: fixEncoding(parsedClient.nomBanque) || undefined,
        codeBanque: parsedClient.codeBanque || undefined,
        codeGuichet: parsedClient.codeGuichet || undefined,
        numeroCompte: parsedClient.numeroCompte || undefined,
        codeNAF: undefined,
        activite: undefined,
        representantLegal: undefined,
      };
    },
    [determineClientType, buildAdresseComplete]
  );

  // Fonction helper pour créer un objet de mise à jour (TOUS les champs disponibles)
  // IMPORTANT : Met à jour TOUS les champs présents dans le fichier pour garantir une synchronisation complète
  const createUpdateFromParsed = useCallback(
    (parsedClient: ParsedClient): Partial<Client> => {
      const updates: Partial<Client> = { updatedAt: new Date() };

      // Helper pour ajouter un champ - met à jour même si vide (pour synchroniser avec le fichier)
      // Mais on évite de mettre undefined explicitement
      const setField = <K extends keyof Client>(
        key: K,
        value: Client[K] | undefined | null | ""
      ) => {
        // Si la valeur est undefined ou null, on ne met pas à jour (préserve les données existantes)
        // Si la valeur est une chaîne vide "", on met à jour avec "" (synchronise avec le fichier)
        if (value !== undefined && value !== null) {
          updates[key] = value as Client[K];
        }
      };

      // TOUS les champs doivent être mis à jour pour garantir la synchronisation complète

      // Champs obligatoires - toujours mis à jour
      updates.typeClient = determineClientType(parsedClient.typeClient);
      updates.raisonSociale =
        fixEncoding(parsedClient.societe) ||
        fixEncoding(parsedClient.nomClient) ||
        "";

      // Champs optionnels - mis à jour s'ils existent dans le fichier
      setField("codeClient", parsedClient.codeClient);
      setField("prenom", fixEncoding(parsedClient.representant));
      setField("nom", fixEncoding(parsedClient.nomRepresentant));
      setField("siret", parsedClient.siret);

      // Adresse - toujours construite même si vide
      const adresseComplete = buildAdresseComplete(
        parsedClient.adresse1,
        parsedClient.adresse2,
        parsedClient.adresse3
      );
      setField("adresse", adresseComplete);

      setField("codePostal", fixEncoding(parsedClient.codePostal));
      setField("ville", fixEncoding(parsedClient.ville));
      setField("email", fixEncoding(parsedClient.email));

      // Téléphone - priorité au téléphone fixe, sinon portable
      const telephone =
        fixEncoding(parsedClient.telephone) ||
        fixEncoding(parsedClient.portable);
      setField("telephone", telephone);

      setField("modePaiementPreferentiel", parsedClient.modePaiement);

      // Champs bancaires et TVA - TOUS doivent être mis à jour
      setField("tvaIntracom", parsedClient.tvaIntracom);
      setField("nomBanque", fixEncoding(parsedClient.nomBanque));
      setField("codeBanque", parsedClient.codeBanque);
      setField("codeGuichet", parsedClient.codeGuichet);
      setField("numeroCompte", parsedClient.numeroCompte);

      // Note : plaques, chantiers, codeNAF, activite, representantLegal ne sont PAS mis à jour
      // car ils sont gérés manuellement dans l'application

      return updates;
    },
    [determineClientType, buildAdresseComplete]
  );

  const processFile = useCallback(async () => {
    if (!file) return;

    setIsProcessing(true);
    try {
      // Lire le fichier avec encodage ISO-8859-1 (encodage Sage standard)
      const arrayBuffer = await file.arrayBuffer();
      let content: string;
      try {
        // Essayer ISO-8859-1 d'abord (encodage le plus courant pour Sage)
        const decoder = new TextDecoder("iso-8859-1");
        content = decoder.decode(arrayBuffer);
      } catch (error) {
        // Fallback sur Windows-1252 si ISO-8859-1 n'est pas supporté
        try {
          const decoder = new TextDecoder("windows-1252");
          content = decoder.decode(arrayBuffer);
        } catch (error2) {
          // Dernier fallback : UTF-8
          content = await file.text();
        }
      }

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
      await cleanupDuplicateClients();

      let imported = 0;
      let updated = 0;
      let newPaymentMethods = 0;

      for (const parsedClient of importResult.clients) {
        // Chercher le client existant de manière stricte pour éviter les doublons
        // Priorité 1 : codeClient (le plus fiable)
        // Priorité 2 : SIRET (si présent dans le fichier)
        // Priorité 3 : raisonSociale (seulement si codeClient n'est pas dans le fichier)
        let existingClient = null;

        // 1. Chercher par codeClient d'abord (le plus fiable)
        if (parsedClient.codeClient) {
          existingClient = await db.clients
            .filter((c) => c.codeClient === parsedClient.codeClient)
            .first();
        }

        // 2. Si pas trouvé et que SIRET existe, chercher par SIRET
        if (!existingClient && parsedClient.siret) {
          existingClient = await db.clients
            .filter((c) => c.siret === parsedClient.siret)
            .first();
        }

        // 3. Si pas trouvé et que codeClient n'existe pas dans le fichier, chercher par raisonSociale
        // (on évite de chercher par nom si codeClient existe pour éviter les faux positifs)
        if (!existingClient && !parsedClient.codeClient) {
          const raisonSociale =
            fixEncoding(parsedClient.societe) ||
            fixEncoding(parsedClient.nomClient);
          if (raisonSociale) {
            existingClient = await db.clients
              .filter((c) => c.raisonSociale === raisonSociale)
              .first();
          }
        }

        if (existingClient?.id) {
          // Récupérer le client complet depuis la DB pour préserver toutes les données
          const fullClient = await db.clients.get(existingClient.id);
          if (!fullClient) {
            updated++;
            continue;
          }

          // Créer les updates en préservant les données existantes
          // createUpdateFromParsed ne touche pas aux plaques, chantiers, etc.
          // qui ne sont pas dans le fichier Sage, donc ils seront préservés
          const updates = createUpdateFromParsed(parsedClient);

          // Utiliser put() avec merge explicite pour garantir la préservation de tous les champs
          // Pattern cohérent avec ClientsSpace.tsx et PeseeSpace.tsx
          const mergedClient = {
            ...fullClient, // Toutes les données existantes (plaques, chantiers, tarifs, etc.)
            ...updates, // Les nouvelles données du fichier Sage
            id: existingClient.id,
            updatedAt: new Date(),
          } as Client;
          await db.clients.put(mergedClient);
          updated++;
          continue;
        }

        // Créer le mode de paiement si nécessaire
        if (parsedClient.modePaiement && parsedClient.modePaiementLibelle) {
          // Vérification plus robuste : chercher tous les modes avec ce code
          const existingMethods = await db.paymentMethods
            .filter(
              (pm) =>
                pm.code.toUpperCase() ===
                parsedClient.modePaiement.toUpperCase()
            )
            .toArray();

          // Si aucun n'existe, créer le mode de paiement
          if (existingMethods.length === 0) {
            await db.paymentMethods.add({
              code: parsedClient.modePaiement.toUpperCase().trim(),
              libelle: parsedClient.modePaiementLibelle.trim(),
              active: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            newPaymentMethods++;
          }
          // Si des doublons existent déjà, on ne fait rien (ils seront nettoyés manuellement)
        }

        // Créer le nouveau client en utilisant la fonction helper
        const newClient: Client = {
          ...createClientFromParsed(parsedClient),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await db.clients.add(newClient);
        imported++;
      }

      toast({
        title: "Import terminé",
        description: `${imported} client(s) importé(s), ${updated} client(s) mis à jour${
          newPaymentMethods > 0
            ? `, ${newPaymentMethods} mode(s) de paiement créé(s)`
            : ""
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
  }, [importResult, toast, createClientFromParsed, createUpdateFromParsed]);

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
          <DialogDescription>
            Importez vos clients existants depuis un fichier d'export Sage 50
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto overflow-x-hidden flex-1 px-1">
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
                <>
                  {/* Vue mobile - Cards */}
                  <div className="md:hidden space-y-3 max-h-[500px] overflow-y-auto">
                    {importResult.clients.slice(0, 50).map((client, index) => (
                      <div
                        key={index}
                        className="border rounded-lg p-4 space-y-3 bg-card"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-base break-words">
                              {fixEncoding(client.societe) ||
                                fixEncoding(client.nomClient)}
                            </div>
                            {client.representant && (
                              <div className="text-sm text-muted-foreground">
                                {fixEncoding(client.representant)}
                              </div>
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
                              <span className="text-muted-foreground">
                                SIRET:
                              </span>
                              <div className="font-mono text-xs break-all">
                                {fixEncoding(client.siret)}
                              </div>
                            </div>
                          )}
                        </div>

                        {(client.codePostal || client.ville) && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">
                              Adresse:
                            </span>
                            <div>
                              {fixEncoding(client.adresse1)}
                              {client.adresse2 && (
                                <div>{fixEncoding(client.adresse2)}</div>
                              )}
                              <div className="font-medium">
                                {fixEncoding(client.codePostal)}{" "}
                                {fixEncoding(client.ville)}
                              </div>
                            </div>
                          </div>
                        )}

                        {(client.telephone ||
                          client.portable ||
                          client.email) && (
                          <div className="text-sm space-y-1">
                            {client.telephone && (
                              <div>📞 {fixEncoding(client.telephone)}</div>
                            )}
                            {client.portable && (
                              <div>📱 {fixEncoding(client.portable)}</div>
                            )}
                            {client.email && (
                              <div className="break-all">
                                ✉️ {fixEncoding(client.email)}
                              </div>
                            )}
                          </div>
                        )}

                        {client.modePaiement && (
                          <div>
                            <Badge variant="secondary" className="text-xs">
                              {fixEncoding(client.modePaiement)} -{" "}
                              {fixEncoding(client.modePaiementLibelle)}
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))}
                    {importResult.clients.length > 50 && (
                      <div className="p-2 text-center text-sm text-muted-foreground">
                        ... et {importResult.clients.length - 50} autre(s)
                        client(s)
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
                            <TableHead className="min-w-[200px]">
                              Nom/Société
                            </TableHead>
                            <TableHead className="w-32">Type</TableHead>
                            <TableHead className="w-36">SIRET</TableHead>
                            <TableHead className="w-32">TVA Intra</TableHead>
                            <TableHead className="min-w-[180px]">RIB</TableHead>
                            <TableHead className="min-w-[200px]">
                              Adresse
                            </TableHead>
                            <TableHead className="min-w-[160px]">
                              Contact
                            </TableHead>
                            <TableHead className="min-w-[140px]">
                              Mode Paiement
                            </TableHead>
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
                                  <div>
                                    <div>
                                      {fixEncoding(client.societe) ||
                                        fixEncoding(client.nomClient)}
                                    </div>
                                    {client.representant && (
                                      <div className="text-xs text-muted-foreground">
                                        {fixEncoding(client.representant)}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm">
                                  <Badge variant="outline">
                                    {fixEncoding(client.typeClient) ||
                                      "Non défini"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm font-mono">
                                  {fixEncoding(client.siret) || "N/A"}
                                </TableCell>
                                <TableCell className="text-sm font-mono">
                                  {fixEncoding(client.tvaIntracom) || "N/A"}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {fixEncoding(client.nomBanque) &&
                                  fixEncoding(client.codeBanque) ? (
                                    <div>
                                      <div className="font-medium">
                                        {fixEncoding(client.nomBanque)}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {fixEncoding(client.codeBanque)}{" "}
                                        {fixEncoding(client.codeGuichet)}{" "}
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
                                    {client.adresse2 && (
                                      <div>{fixEncoding(client.adresse2)}</div>
                                    )}
                                    <div className="font-medium">
                                      {fixEncoding(client.codePostal)}{" "}
                                      {fixEncoding(client.ville)}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm">
                                  <div>
                                    {client.telephone && (
                                      <div>
                                        📞 {fixEncoding(client.telephone)}
                                      </div>
                                    )}
                                    {client.portable && (
                                      <div>
                                        📱 {fixEncoding(client.portable)}
                                      </div>
                                    )}
                                    {client.email && (
                                      <div>✉️ {fixEncoding(client.email)}</div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm">
                                  {client.modePaiement && (
                                    <Badge variant="secondary">
                                      {fixEncoding(client.modePaiement)} -{" "}
                                      {fixEncoding(client.modePaiementLibelle)}
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
                        ... et {importResult.clients.length - 50} autre(s)
                        client(s)
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
    </Dialog>
  );
}
