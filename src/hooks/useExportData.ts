import { useState, useEffect } from "react";
import {
  db,
  Pesee,
  Product,
  Client,
  Transporteur,
  ExportLog,
  SageTemplate,
} from "@/lib/database";
import { useToast } from "@/hooks/use-toast";
import { exportWithSageTemplate } from "@/utils/sageTemplateExporter";

export interface ExportStats {
  totalPesees: number;
  newPesees: number;
  alreadyExported: number;
}

export type ExportFormat =
  | "csv"
  | "csv-txt"
  | "sage-articles"
  | "sage-ventes"
  | "sage-template";

export const useExportData = () => {
  const [exportLogs, setExportLogs] = useState<ExportLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loadExportLogs = async () => {
    try {
      const logs = await db.exportLogs.orderBy("createdAt").reverse().toArray();
      setExportLogs(logs);
    } catch (error) {
      console.error("Error loading export logs:", error);
    }
  };

  useEffect(() => {
    loadExportLogs();
  }, []);

  const getExportStats = async (
    startDate: Date,
    endDate: Date
  ): Promise<ExportStats> => {
    try {
      const pesees = await db.pesees
        .filter(
          (pesee) => pesee.dateHeure >= startDate && pesee.dateHeure <= endDate
        )
        .toArray();

      const newPesees = pesees.filter(
        (pesee) => !pesee.exportedAt || pesee.exportedAt.length === 0
      );
      const alreadyExported = pesees.filter(
        (pesee) => pesee.exportedAt && pesee.exportedAt.length > 0
      );

      return {
        totalPesees: pesees.length,
        newPesees: newPesees.length,
        alreadyExported: alreadyExported.length,
      };
    } catch (error) {
      console.error("Error getting export stats:", error);
      return { totalPesees: 0, newPesees: 0, alreadyExported: 0 };
    }
  };

  const generateEnrichedCSV = async (
    pesees: Pesee[],
    exportType: "new" | "selective" | "complete",
    format: ExportFormat = "csv",
    template?: SageTemplate
  ): Promise<string> => {
    // Si c'est un export avec template Sage, utiliser la logique spéciale
    if (format === "sage-template" && template) {
      return await exportWithSageTemplate(template, pesees);
    }

    // Charger toutes les données nécessaires
    const [products, clients, transporteurs] = await Promise.all([
      db.products.toArray(),
      db.clients.toArray(),
      db.transporteurs.toArray(),
    ]);

    // Créer des maps pour un accès rapide
    const productMap = new Map(products.map((p) => [p.id!, p]));
    const clientMap = new Map(clients.map((c) => [c.id!, c]));
    const transporteurMap = new Map(transporteurs.map((t) => [t.id!, t]));

    if (format === "sage-articles") {
      return generateSageArticlesFormat(products);
    } else if (format === "sage-ventes") {
      return generateSageVentesFormat(
        pesees,
        productMap,
        clientMap,
        transporteurMap
      );
    } else if (format === "csv-txt") {
      // Format CSV mais avec extension TXT
      return generateCSVFormat(pesees, productMap, clientMap, transporteurMap);
    }

    // Format CSV standard (existant)
    return generateCSVFormat(pesees, productMap, clientMap, transporteurMap);
  };

  const generateCSVFormat = (
    pesees: Pesee[],
    productMap: Map<number, Product>,
    clientMap: Map<number, Client>,
    transporteurMap: Map<number, Transporteur>
  ): string => {
    const headers = [
      "Date",
      "Heure",
      "Numero_Bon",
      "Plaque",
      "Nom_Entreprise",
      "SIRET",
      "Adresse_Complete",
      "Email",
      "Telephone",
      "Chantier",
      "Code_Produit",
      "Nom_Produit",
      "Quantite_Tonnes",
      "Prix_Unitaire_HT",
      "Prix_Unitaire_TTC",
      "Total_HT",
      "Total_TTC",
      "Taux_TVA",
      "Moyen_Paiement",
      "Type_Client",
      "Transporteur",
      "SIRET_Transporteur",
      "Statut_Export",
    ];

    const csvRows = pesees.map((pesee) => {
      const product = productMap.get(pesee.produitId);
      const client = pesee.clientId ? clientMap.get(pesee.clientId) : null;
      const transporteur = pesee.transporteurId
        ? transporteurMap.get(pesee.transporteurId)
        : null;

      // Calculs
      const prixUnitaireHT = product
        ? product.prixHT
        : pesee.prixHT / pesee.net;
      const prixUnitaireTTC = product
        ? product.prixTTC
        : pesee.prixTTC / pesee.net;
      const totalHT = pesee.net * prixUnitaireHT;
      const totalTTC = pesee.net * prixUnitaireTTC;
      const tauxTVA = product ? product.tauxTVA : 20;

      // Formatage des données
      const adresseComplete = client
        ? `${client.adresse || ""} ${client.codePostal || ""} ${
            client.ville || ""
          }`.trim()
        : "";

      return [
        pesee.dateHeure.toLocaleDateString("fr-FR"),
        pesee.dateHeure.toLocaleTimeString("fr-FR"),
        pesee.numeroBon,
        pesee.plaque,
        pesee.nomEntreprise,
        client?.siret || "",
        adresseComplete,
        client?.email || "",
        client?.telephone || "",
        pesee.chantier || "",
        product?.codeProduct || "",
        product?.nom || "",
        pesee.net.toString().replace(".", ","), // Format français
        prixUnitaireHT.toFixed(2).replace(".", ","),
        prixUnitaireTTC.toFixed(2).replace(".", ","),
        totalHT.toFixed(2).replace(".", ","),
        totalTTC.toFixed(2).replace(".", ","),
        tauxTVA.toString(),
        pesee.moyenPaiement,
        pesee.typeClient,
        transporteur
          ? `${transporteur.prenom} ${transporteur.nom}`
          : pesee.transporteurLibre || "",
        transporteur?.siret || "",
        pesee.exportedAt && pesee.exportedAt.length > 0
          ? "Déjà exporté"
          : "Nouveau",
      ].map((field) => `"${field}"`); // Entourer chaque champ de guillemets
    });

    return [headers.join(";"), ...csvRows.map((row) => row.join(";"))].join(
      "\n"
    );
  };

  const generateSageArticlesFormat = (products: Product[]): string => {
    // Format Sage 50 pour import d'articles - basé sur Export_des_articles.Txt
    const headers = [
      "Code_Article",
      "Designation",
      "Famille",
      "Unite_Vente",
      "Prix_Achat_HT",
      "Prix_Vente_HT",
      "Taux_TVA",
      "Compte_Vente",
      "Compte_Achat",
      "Poids",
      "Type_Article",
      "Suivi_Stock",
    ];

    const rows = products.map((product) => [
      product.codeProduct || `ART${product.id}`,
      product.nom,
      "MATERIAUX", // Famille par défaut
      "T", // Unité en tonnes
      product.prixHT
        ? (product.prixHT * 0.8).toFixed(2).replace(".", ",")
        : "0,00", // Prix achat estimé
      product.prixHT ? product.prixHT.toFixed(2).replace(".", ",") : "0,00",
      product.tauxTVA ? product.tauxTVA.toString().replace(".", ",") : "20,00",
      "707000", // Compte de vente standard
      "607000", // Compte d'achat standard
      "0,00", // Poids unitaire
      "Marchandise", // Type d'article
      "Oui", // Suivi stock
    ]);

    const separator = "\t"; // Tabulation pour Sage 50
    return [
      headers.join(separator),
      ...rows.map((row) => row.join(separator)),
    ].join("\n");
  };

  const generateSageVentesFormat = (
    pesees: Pesee[],
    productMap: Map<number, Product>,
    clientMap: Map<number, Client>,
    transporteurMap: Map<number, Transporteur>
  ): string => {
    // Format Sage 50 pour import de ventes/factures
    const headers = [
      "Date_Facture",
      "Numero_Facture",
      "Code_Client",
      "Nom_Client",
      "Code_Article",
      "Designation",
      "Quantite",
      "Prix_Unitaire_HT",
      "Total_HT",
      "Taux_TVA",
      "Total_TVA",
      "Total_TTC",
      "Mode_Reglement",
      "Echeance",
      "Compte_Comptable",
      "Numero_Piece",
    ];

    const rows = pesees.map((pesee) => {
      const product = productMap.get(pesee.produitId);
      const client = pesee.clientId ? clientMap.get(pesee.clientId) : null;

      const prixUnitaireHT = product
        ? product.prixHT
        : pesee.prixHT / pesee.net;
      const totalHT = pesee.net * prixUnitaireHT;
      const tauxTVA = product ? product.tauxTVA : 20;
      const totalTVA = totalHT * (tauxTVA / 100);
      const totalTTC = totalHT + totalTVA;

      return [
        pesee.dateHeure
          .toLocaleDateString("fr-FR")
          .split("/")
          .reverse()
          .join("/"), // Format YYYY/MM/DD
        pesee.numeroBon,
        client?.id ? `CLI${client.id}` : "DIVERS",
        pesee.nomEntreprise,
        product?.codeProduct || `ART${pesee.produitId}`,
        product?.nom || "Produit",
        pesee.net.toString().replace(".", ","),
        prixUnitaireHT.toFixed(2).replace(".", ","),
        totalHT.toFixed(2).replace(".", ","),
        tauxTVA.toString().replace(".", ","),
        totalTVA.toFixed(2).replace(".", ","),
        totalTTC.toFixed(2).replace(".", ","),
        pesee.moyenPaiement || "Virement",
        "", // Échéance vide pour paiement immédiat
        "707000", // Compte de vente
        pesee.numeroBon,
      ];
    });

    const separator = "\t"; // Tabulation pour Sage 50
    return [
      headers.join(separator),
      ...rows.map((row) => row.join(separator)),
    ].join("\n");
  };

  const exportToCSV = async (
    startDate: Date,
    endDate: Date,
    exportType: "new" | "selective" | "complete" = "new",
    selectedPesees?: Pesee[],
    format: ExportFormat = "csv",
    template?: SageTemplate
  ): Promise<void> => {
    setIsLoading(true);
    try {
      let peseesToExport: Pesee[];

      // Si des pesées sont déjà sélectionnées, les utiliser
      if (selectedPesees) {
        peseesToExport = selectedPesees;
      } else {
        // Sinon, récupérer les pesées selon le type d'export
        let query = db.pesees.filter(
          (pesee) => pesee.dateHeure >= startDate && pesee.dateHeure <= endDate
        );

        const allPesees = await query.toArray();

        switch (exportType) {
          case "new":
            peseesToExport = allPesees.filter(
              (pesee) => !pesee.exportedAt || pesee.exportedAt.length === 0
            );
            break;
          case "complete":
            peseesToExport = allPesees;
            break;
          case "selective":
          default:
            peseesToExport = allPesees;
            break;
        }
      }

      if (peseesToExport.length === 0) {
        toast({
          title: "Aucune donnée à exporter",
          description: "Aucune pesée trouvée pour la période sélectionnée.",
          variant: "destructive",
        });
        return;
      }

      // Générer le contenu selon le format
      const content = await generateEnrichedCSV(
        peseesToExport,
        exportType,
        format,
        template
      );

      // Créer le nom de fichier selon le format
      const now = new Date();
      const formatPrefix =
        format === "sage-articles"
          ? "sage_articles"
          : format === "sage-ventes"
          ? "sage_ventes"
          : format === "sage-template"
          ? `sage_template_${template?.name.replace(/[^a-zA-Z0-9]/g, "_")}`
          : format === "csv-txt"
          ? "export"
          : "export";
      const extension =
        format.startsWith("sage-") || format === "csv-txt" ? "txt" : "csv";
      const fileName = `${formatPrefix}_${exportType}_${
        startDate.toISOString().split("T")[0]
      }_${endDate.toISOString().split("T")[0]}_${now.getTime()}.${extension}`;

      // Télécharger le fichier avec l'encodage approprié
      const encoding = format.startsWith("sage-") ? "windows-1252" : "utf-8";
      let blob: Blob;

      if (format.startsWith("sage-")) {
        // Encodage UTF-8 pour Sage 50 (plus compatible avec les caractères spéciaux)
        blob = new Blob([content], {
          type: "text/plain;charset=utf-8",
        });
      } else {
        // UTF-8 avec BOM pour Excel
        blob = new Blob(["\ufeff" + content], {
          type: "text/csv;charset=utf-8;",
        });
      }
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Générer le hash du fichier
      const fileHash = await generateFileHash(content);

      // Enregistrer l'export log
      const exportLog: ExportLog = {
        fileName,
        startDate,
        endDate,
        totalRecords:
          format === "sage-articles"
            ? await db.products.count()
            : peseesToExport.length,
        fileHash,
        fileContent: content,
        exportType: `${format}-${exportType}` as any,
        peseeIds:
          format === "sage-articles" ? [] : peseesToExport.map((p) => p.id!),
        createdAt: now,
      };

      await db.exportLogs.add(exportLog);

      // Marquer les pesées comme exportées (pour tous les types sauf sage-articles)
      if (format !== "sage-articles") {
        await Promise.all(
          peseesToExport.map(async (pesee) => {
            const currentExports = pesee.exportedAt || [];
            const updatedPesee = {
              ...pesee,
              exportedAt: [...currentExports, now],
              updatedAt: now,
            };
            await db.pesees.update(pesee.id!, updatedPesee);
          })
        );
      }

      // Recharger les logs
      await loadExportLogs();

      const recordCount =
        format === "sage-articles"
          ? await db.products.count()
          : peseesToExport.length;
      const recordType = format === "sage-articles" ? "article(s)" : "pesée(s)";

      toast({
        title: "Export réussi",
        description: `${recordCount} ${recordType} exportée(s) vers ${fileName}`,
      });
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter les données.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const redownloadExport = async (exportLog: ExportLog): Promise<void> => {
    try {
      const blob = new Blob(["\ufeff" + exportLog.fileContent], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", exportLog.fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Re-téléchargement réussi",
        description: `Fichier ${exportLog.fileName} téléchargé`,
      });
    } catch (error) {
      console.error("Error redownloading export:", error);
      toast({
        title: "Erreur de re-téléchargement",
        description: "Impossible de télécharger le fichier.",
        variant: "destructive",
      });
    }
  };

  const deleteExportLog = async (exportId: number): Promise<void> => {
    try {
      await db.exportLogs.delete(exportId);
      await loadExportLogs();

      toast({
        title: "Export supprimé",
        description: "L'historique d'export a été supprimé",
      });
    } catch (error) {
      console.error("Error deleting export log:", error);
      toast({
        title: "Erreur de suppression",
        description: "Impossible de supprimer l'export.",
        variant: "destructive",
      });
    }
  };

  return {
    exportLogs,
    isLoading,
    getExportStats,
    exportToCSV,
    redownloadExport,
    deleteExportLog,
    loadExportLogs,
  };
};

// Utilitaire pour générer un hash du fichier
const generateFileHash = async (content: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};
