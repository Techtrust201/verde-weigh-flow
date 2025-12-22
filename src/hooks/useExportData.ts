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
import { RegistreSuiviDechetsExporter } from "@/utils/registreSuiviDechetsExporter";
import { getGlobalSettings } from "@/lib/globalSettings";

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
  | "sage-bl-complet"
  | "sage-template"
  | "registre-suivi-dechets";

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
    template?: SageTemplate,
    documentTypeFilter:
      | "tous"
      | "bons_uniquement"
      | "factures_uniquement" = "tous",
    outputFormat?: "csv" | "pdf"
  ): Promise<string | Blob> => {
    // Si c'est un export avec template Sage, utiliser la logique spéciale
    if (format === "sage-template" && template) {
      return await exportWithSageTemplate(template, pesees);
    }

    // Charger toutes les données nécessaires
    const [products, clients, transporteurs, taxes] = await Promise.all([
      db.products.toArray(),
      db.clients.toArray(),
      db.transporteurs.toArray(),
      db.taxes
        ? db.taxes.toArray()
        : Promise.resolve(
            [] as Array<{
              nom: string;
              taux: number;
              tauxTVA?: number;
              active?: boolean;
            }>
          ),
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
    } else if (format === "sage-bl-complet") {
      const activeTaxes = (
        taxes as Array<{
          nom: string;
          taux: number;
          tauxTVA?: number;
          active?: boolean;
        }>
      )
        .filter((t) => t && t.active)
        .map((t) => ({ nom: t.nom, taux: t.taux, tauxTVA: t.tauxTVA }));
      return await generateSageBLCompletFormat(
        pesees,
        productMap,
        clientMap,
        transporteurMap,
        documentTypeFilter,
        activeTaxes
      );
    } else if (format === "csv-txt") {
      // Format CSV mais avec extension TXT
      return generateCSVFormat(pesees, productMap, clientMap, transporteurMap);
    } else if (format === "registre-suivi-dechets") {
      // Format Registre suivi déchets avec 3 lignes d'en-têtes
      const settings = await getGlobalSettings();
      const recepisse = settings?.recepisse;

      const exporter = new RegistreSuiviDechetsExporter(
        productMap,
        clientMap,
        transporteurMap,
        recepisse
      );

      const finalOutputFormat = outputFormat || "csv";
      return await exporter.generate(pesees, finalOutputFormat);
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
        new Date(pesee.dateHeure).toLocaleDateString("fr-FR"),
        new Date(pesee.dateHeure).toLocaleTimeString("fr-FR"),
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

  const generateSageBLCompletFormat = async (
    pesees: Pesee[],
    productMap: Map<number, Product>,
    clientMap: Map<number, Client>,
    transporteurMap: Map<number, Transporteur>,
    documentTypeFilter:
      | "tous"
      | "bons_uniquement"
      | "factures_uniquement" = "tous",
    activeTaxes: { nom: string; taux: number; tauxTVA?: number }[] = []
  ): Promise<string> => {
    // Format Sage 50 complet basé sur import_BL_auto_number.txt
    // Format Sage 50 (87 colonnes - les colonnes de frais de port sont présentes mais vides, gérées par Sage)
    const headers = [
      "Type de Ligne",
      "Type de pièce",
      "N° pièce",
      "Date pièce",
      "Facturation TTC",
      "Référence pièce",
      "Remarque",
      "Code représentant pièce",
      "Code client",
      "Nom client",
      "Forme juridique",
      "Adresse 1",
      "Adresse 2",
      "Adresse 3",
      "Code postal",
      "Ville",
      "Code pays",
      "Pays",
      "Mode gestion TVA",
      "Tarif client",
      "NII",
      "Assujetti TPF",
      "Observations",
      "Nom contact",
      "Code mode de paiement",
      "Date échéance",
      "Date livraison pièce",
      "Validée",
      "Transmise",
      "Soldée",
      "Comptabilisée",
      "Irrécouvrable",
      "Date irrécouvrabilité",
      "Libellé irrécouvrable",
      "Compta. irrécouvrable",
      "Code affaire pièce",
      "Type de remise pièce",
      "Taux remise pièce",
      "Mt remise pièce",
      "Taux Escompte",
      "Statut devis",
      "Ref. commande",
      "Pas de retour stock",
      "Port Sans TVA",
      "Port Soumis TVA",
      "Taux TVA Port Soumis",
      "TVA Port Non Perçue",
      "Mt total TTC",
      "Code article",
      "Quantité",
      "PU HT",
      "PU TTC",
      "Taux TVA",
      "Ligne commentaire",
      "Description",
      "Niveau sous-total",
      "Taux TPF",
      "Code dépôt",
      "Pds Unit. Brut",
      "Pds Unit. Net",
      "Qté par colis",
      "Nbre colis",
      "Date livraison",
      "Type remise ligne",
      "Taux remise ligne",
      "Mt unit. remise HT",
      "Mt unit. remise TTC",
      "PA HT",
      "PAMP",
      "Unité",
      "Référence fournisseur",
      "Code représentant ligne",
      "Type Commission Repr.",
      "Taux commission",
      "Mt commission",
      "Code affaire ligne",
      "Mt unit. Eco-part. TTC",
      "Qté Livrée",
      "TVA Non Perçue",
      "N° ligne",
      "Options Sage",
      "Catégorie de TVA",
      "Motif d'exonération de TVA",
      "Société de livraison",
      "Adresse 1 de livraison",
      "Adresse 2 de livraison",
      "Adresse 3 de livraison",
      "CP de livraison",
      "Ville de livraison",
      "Code pays de livraison",
      "Pays de livraison",
      "Cadre de facturation",
    ];

    const rows: string[] = [];

    const mapPaymentToSageCode = (p: string | undefined): string => {
      switch ((p || "").toUpperCase()) {
        case "ESP":
          return "ESP";
        case "CB":
          return "CB";
        case "CHQ":
          return "CHQ";
        case "VIR":
          return "VIR";
        case "PRVT":
          return "PRVT";
        // Compatibilité avec d'anciennes données en base (à supprimer après migration complète)
        case "DIRECT":
          return "ESP";
        case "EN COMPTE":
          return "PRVT";
        default:
          return "PRVT";
      }
    };

    // Helper function to generate E and L lines for a document type
    const generateLines = (
      typePiece: string,
      numeroPiece: string,
      pesee: Pesee,
      product: Product | undefined,
      client: Client | undefined,
      transporteur: Transporteur | undefined,
      dateFormatted: string,
      prixUnitaireHT: number,
      prixUnitaireTTC: number,
      tauxTVA: number
    ) => {
      // Ligne E (En-tête de la pièce)
      const ligneE = [
        "E", // Type de Ligne
        typePiece, // Type de pièce (Bon de livraison ou Facture)
        typePiece === "Bon de livraison" ? numeroPiece : "", // N° pièce (vide pour Facture)
        dateFormatted, // Date pièce
        "", // Facturation TTC
        "", // Référence pièce
        "", // Remarque
        "REP0017", // Code représentant pièce
        client?.codeClient || "256", // Code client
        pesee.nomEntreprise, // Nom client
        "", // Forme juridique
        client?.adresse || "", // Adresse 1
        "", // Adresse 2
        "", // Adresse 3
        client?.codePostal || "", // Code postal
        client?.ville || "", // Ville
        "FRA", // Code pays
        "France", // Pays
        "Local", // Mode gestion TVA
        "Aucun", // Tarif client
        "", // NII
        "", // Assujetti TPF
        "", // Observations
        "", // Nom contact
        mapPaymentToSageCode(pesee.moyenPaiement), // Code mode de paiement
        dateFormatted, // Date échéance
        dateFormatted, // Date livraison pièce
        "", // Validée
        "", // Transmise
        "", // Soldée
        "", // Comptabilisée
        "", // Irrécouvrable
        "", // Date irrécouvrabilité
        "", // Libellé irrécouvrable
        "", // Compta. irrécouvrable
        "", // Code affaire pièce
        "", // Type de remise pièce
        "", // Taux remise pièce
        "", // Mt remise pièce
        "", // Taux Escompte
        "", // Statut devis
        "", // Ref. commande
        "", // Pas de retour stock
        "", // Port Sans TVA
        "", // Port Soumis TVA
        "", // Taux TVA Port Soumis
        "", // TVA Port Non Perçue
        pesee.prixTTC.toFixed(2), // Mt total TTC
        "", // Code article (vide pour ligne E)
        "", // Quantité (vide pour ligne E)
        "", // PU HT (vide pour ligne E)
        "", // PU TTC (vide pour ligne E)
        "", // Taux TVA (vide pour ligne E)
        "", // Ligne commentaire
        "", // Description
        "", // Niveau sous-total
        "", // Taux TPF
        "", // Code dépôt
        "", // Pds Unit. Brut
        "", // Pds Unit. Net
        "", // Qté par colis
        "", // Nbre colis
        "", // Date livraison
        "", // Type remise ligne
        "", // Taux remise ligne
        "", // Mt unit. remise HT
        "", // Mt unit. remise TTC
        "", // PA HT
        "", // PAMP
        "", // Unité
        "", // Référence fournisseur
        "", // Code représentant ligne
        "", // Type Commission Repr.
        "", // Taux commission
        "", // Mt commission
        "", // Code affaire ligne
        "", // Mt unit. Eco-part. TTC
        "", // Qté Livrée
        "", // TVA Non Perçue
        "", // N° ligne
        "", // Options Sage
        "S = Taux de TVA standard", // Catégorie de TVA
        "", // Motif d'exonération de TVA
        "", // Société de livraison
        "", // Adresse 1 de livraison
        "", // Adresse 2 de livraison
        "", // Adresse 3 de livraison
        "", // CP de livraison
        "", // Ville de livraison
        "FRA", // Code pays de livraison
        "France", // Pays de livraison
        "B1 - Dépôt d'une facture de bien", // Cadre de facturation
      ];

      rows.push(ligneE.join("\t"));

      // Ligne L (Ligne de détail) – produit
      const ligneL = [
        "L", // Type de Ligne
        "", // Type de pièce (vide pour ligne L)
        "", // N° pièce (vide pour ligne L)
        "", // Date pièce (vide pour ligne L)
        "", // Facturation TTC
        "", // Référence pièce
        "", // Remarque
        "", // Code représentant pièce
        "", // Code client
        "", // Nom client
        "", // Forme juridique
        "", // Adresse 1
        "", // Adresse 2
        "", // Adresse 3
        "", // Code postal
        "", // Ville
        "", // Code pays
        "", // Pays
        "", // Mode gestion TVA
        "", // Tarif client
        "", // NII
        "", // Assujetti TPF
        "", // Observations
        "", // Nom contact
        "", // Code mode de paiement
        "", // Date échéance
        "", // Date livraison pièce
        "", // Validée
        "", // Transmise
        "", // Soldée
        "", // Comptabilisée
        "", // Irrécouvrable
        "", // Date irrécouvrabilité
        "", // Libellé irrécouvrable
        "", // Compta. irrécouvrable
        "", // Code affaire pièce
        "", // Type de remise pièce
        "", // Taux remise pièce
        "", // Mt remise pièce
        "", // Taux Escompte
        "", // Statut devis
        "", // Ref. commande
        "", // Pas de retour stock
        "", // Port Sans TVA
        "", // Port Soumis TVA
        "", // Taux TVA Port Soumis
        "", // TVA Port Non Perçue
        "", // Mt total TTC (vide pour ligne L)
        product?.codeProduct || "ART0010", // Code article
        pesee.net.toFixed(3), // Quantité
        prixUnitaireHT.toFixed(2), // PU HT
        prixUnitaireTTC.toFixed(2), // PU TTC
        tauxTVA.toFixed(2), // Taux TVA
        "", // Ligne commentaire
        product?.nom || "VEGETAUX", // Description
        "0", // Niveau sous-total
        "", // Taux TPF
        "", // Code dépôt
        "", // Pds Unit. Brut
        "", // Pds Unit. Net
        "", // Qté par colis
        "", // Nbre colis
        dateFormatted, // Date livraison
        "", // Type remise ligne
        "", // Taux remise ligne
        "", // Mt unit. remise HT
        "", // Mt unit. remise TTC
        "", // PA HT
        "", // PAMP
        "", // Unité
        "", // Référence fournisseur
        "REP0017", // Code représentant ligne
        "", // Type Commission Repr.
        "", // Taux commission
        "", // Mt commission
        "", // Code affaire ligne
        "", // Mt unit. Eco-part. TTC
        pesee.net.toFixed(3), // Qté Livrée
        "", // TVA Non Perçue
        "1", // N° ligne
        "", // Options Sage
        "", // Catégorie de TVA
        "", // Motif d'exonération de TVA
        "", // Société de livraison
        "", // Adresse 1 de livraison
        "", // Adresse 2 de livraison
        "", // Adresse 3 de livraison
        "", // CP de livraison
        "", // Ville de livraison
        "", // Code pays de livraison
        "", // Pays de livraison
        "", // Cadre de facturation
      ];

      rows.push(ligneL.join("\t"));

      // Lignes L supplémentaires pour chaque taxe active
      if (activeTaxes.length > 0) {
        let lineNumber = 2; // après la ligne produit = 1
        activeTaxes.forEach((tax) => {
          const baseHT = pesee.prixHT; // base hors taxe
          const montantTaxeHT = baseHT * (tax.taux / 100);
          const tvaTaxe = montantTaxeHT * ((tax.tauxTVA ?? 20) / 100);
          const montantTaxeTTC = montantTaxeHT + tvaTaxe;

          const ligneTax = [
            "L", // Type de Ligne
            "", // Type de pièce (vide)
            "", // N° pièce (vide)
            "", // Date pièce (vide)
            "", // Facturation TTC
            "", // Référence pièce
            "", // Remarque
            "", // Code représentant pièce
            "", // Code client
            "", // Nom client
            "", // Forme juridique
            "", // Adresse 1
            "", // Adresse 2
            "", // Adresse 3
            "", // Code postal
            "", // Ville
            "", // Code pays
            "", // Pays
            "", // Mode gestion TVA
            "", // Tarif client
            "", // NII
            "", // Assujetti TPF
            "", // Observations
            "", // Nom contact
            "", // Code mode de paiement
            "", // Date échéance
            "", // Date livraison pièce
            "", // Validée
            "", // Transmise
            "", // Soldée
            "", // Comptabilisée
            "", // Irrécouvrable
            "", // Date irrécouvrabilité
            "", // Libellé irrécouvrable
            "", // Compta. irrécouvrable
            "", // Code affaire pièce
            "", // Type de remise pièce
            "", // Taux remise pièce
            "", // Mt remise pièce
            "", // Taux Escompte
            "", // Statut devis
            "", // Ref. commande
            "", // Pas de retour stock
            "", // Port Sans TVA
            "", // Port Soumis TVA
            "", // Taux TVA Port Soumis
            "", // TVA Port Non Perçue
            "", // Mt total TTC (vide pour ligne L)
            "ARTDIVERS", // Code article pour ligne taxe
            "1.000", // Quantité
            montantTaxeHT.toFixed(2), // PU HT
            montantTaxeTTC.toFixed(2), // PU TTC
            (tax.tauxTVA ?? 20).toFixed(2), // Taux TVA
            "", // Ligne commentaire
            tax.nom, // Description
            "0", // Niveau sous-total
            "", // Taux TPF
            "", // Code dépôt
            "", // Pds Unit. Brut
            "", // Pds Unit. Net
            "", // Qté par colis
            "", // Nbre colis
            dateFormatted, // Date livraison
            "", // Type remise ligne
            "", // Taux remise ligne
            "", // Mt unit. remise HT
            "", // Mt unit. remise TTC
            "", // PA HT
            "", // PAMP
            "", // Unité
            "", // Référence fournisseur
            "REP0017", // Code représentant ligne
            "", // Type Commission Repr.
            "", // Taux commission
            "", // Mt commission
            "", // Code affaire ligne
            "", // Mt unit. Eco-part. TTC
            "1.000", // Qté Livrée
            "", // TVA Non Perçue
            String(lineNumber++), // N° ligne
            "", // Options Sage
            "", // Catégorie de TVA
            "", // Motif d'exonération de TVA
            "", // Société de livraison
            "", // Adresse 1 de livraison
            "", // Adresse 2 de livraison
            "", // Adresse 3 de livraison
            "", // CP de livraison
            "", // Ville de livraison
            "FRA", // Code pays de livraison
            "France", // Pays de livraison
            "", // Cadre de facturation
          ];

          rows.push(ligneTax.join("\t"));
        });
      }
    };

    // Générer les lignes pour chaque pesée selon son typeDocument
    pesees.forEach((pesee) => {
      const product = productMap.get(pesee.produitId);
      const client = pesee.clientId ? clientMap.get(pesee.clientId) : null;
      const transporteur = pesee.transporteurId
        ? transporteurMap.get(pesee.transporteurId)
        : null;

      const dateFormatted = pesee.dateHeure.toLocaleDateString("fr-FR"); // DD/MM/YYYY
      const prixUnitaireHT = pesee.net > 0 ? pesee.prixHT / pesee.net : 0;
      const prixUnitaireTTC = pesee.net > 0 ? pesee.prixTTC / pesee.net : 0;
      const tauxTVA =
        product?.tauxTVA ??
        (prixUnitaireHT > 0
          ? Math.max(0, (prixUnitaireTTC / prixUnitaireHT - 1) * 100)
          : 20);

      // Générer les lignes selon le typeDocument et le filtre
      if (
        documentTypeFilter === "tous" ||
        documentTypeFilter === "bons_uniquement"
      ) {
        // Exclure les pesées "les_deux" : elles n'exportent que la FA vers Sage
        if (pesee.typeDocument === "bon_livraison" && pesee.numeroBon) {
          generateLines(
            "Bon de livraison",
            pesee.numeroBon,
            pesee,
            product,
            client,
            transporteur,
            dateFormatted,
            prixUnitaireHT,
            prixUnitaireTTC,
            tauxTVA
          );
        }
      }

      if (
        documentTypeFilter === "tous" ||
        documentTypeFilter === "factures_uniquement"
      ) {
        if (
          (pesee.typeDocument === "facture" ||
            pesee.typeDocument === "les_deux") &&
          pesee.numeroFacture
        ) {
          generateLines(
            "Facture",
            pesee.numeroFacture,
            pesee,
            product,
            client,
            transporteur,
            dateFormatted,
            prixUnitaireHT,
            prixUnitaireTTC,
            tauxTVA
          );
        }
      }
    });

    const separator = "\t"; // Tabulation pour Sage 50
    return [headers.join(separator), ...rows].join("\n");
  };

  const exportToCSV = async (
    startDate: Date,
    endDate: Date,
    exportType: "new" | "selective" | "complete" = "new",
    selectedPesees?: Pesee[],
    format: ExportFormat = "csv",
    template?: SageTemplate,
    documentTypeFilter:
      | "tous"
      | "bons_uniquement"
      | "factures_uniquement" = "tous",
    productId?: number,
    outputFormat?: "csv" | "pdf"
  ): Promise<void> => {
    setIsLoading(true);
    try {
      let peseesToExport: Pesee[];

      // Si des pesées sont déjà sélectionnées, les utiliser
      if (selectedPesees) {
        peseesToExport = selectedPesees;
      } else {
        // Sinon, récupérer les pesées selon le type d'export
        const query = db.pesees.filter(
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

      // Filtrer par produit si spécifié
      if (productId) {
        peseesToExport = peseesToExport.filter(
          (p) => p.produitId === productId
        );
      }

      if (peseesToExport.length === 0) {
        toast({
          title: "Aucune donnée à exporter",
          description: productId
            ? "Aucune pesée trouvée pour la période et le produit sélectionnés."
            : "Aucune pesée trouvée pour la période sélectionnée.",
          variant: "destructive",
        });
        return;
      }

      // Générer le contenu selon le format
      const content = await generateEnrichedCSV(
        peseesToExport,
        exportType,
        format,
        template,
        documentTypeFilter,
        outputFormat
      );

      // Créer le nom de fichier selon le format
      const now = new Date();
      let formatPrefix: string;
      let extension: string;

      if (format === "registre-suivi-dechets") {
        formatPrefix = "registre_suivi_dechets";
        extension = outputFormat === "pdf" ? "pdf" : "csv";
      } else if (format === "sage-articles") {
        formatPrefix = "sage_articles";
        extension = "txt";
      } else if (format === "sage-ventes") {
        formatPrefix = "sage_ventes";
        extension = "txt";
      } else if (format === "sage-bl-complet") {
        formatPrefix = "sage_bl_complet";
        extension = "txt";
      } else if (format === "sage-template") {
        formatPrefix = `sage_template_${template?.name.replace(
          /[^a-zA-Z0-9]/g,
          "_"
        )}`;
        extension = "txt";
      } else if (format === "csv-txt") {
        formatPrefix = "export";
        extension = "txt";
      } else {
        formatPrefix = "export";
        extension = "csv";
      }

      // Ajouter le produit au nom de fichier si spécifié
      let productSuffix = "";
      if (productId && format === "registre-suivi-dechets") {
        const product = await db.products.get(productId);
        if (product) {
          productSuffix = `_${product.nom.replace(/[^a-zA-Z0-9]/g, "_")}`;
        }
      }

      const fileName = `${formatPrefix}_${exportType}_${
        startDate.toISOString().split("T")[0]
      }_${
        endDate.toISOString().split("T")[0]
      }${productSuffix}_${now.getTime()}.${extension}`;

      // Télécharger le fichier avec l'encodage approprié
      let blob: Blob;

      // Format binaire (PDF uniquement pour registre-suivi-dechets)
      if (
        format === "registre-suivi-dechets" &&
        outputFormat === "pdf" &&
        content instanceof Blob
      ) {
        blob = content;
      } else if (
        format === "registre-suivi-dechets" &&
        outputFormat === "csv" &&
        typeof content === "string"
      ) {
        // CSV avec BOM UTF-8 pour Excel
        blob = new Blob([content], {
          type: "text/csv;charset=utf-8;",
        });
      } else if (typeof content === "string" && format.startsWith("sage-")) {
        // Encodage Windows-1252 (ANSI) pour Sage 50
        // Convertir le contenu UTF-8 en Windows-1252
        const encoder = new TextEncoder();
        const utf8Array = encoder.encode(content);

        // Créer un tableau pour Windows-1252
        const win1252Array = new Uint8Array(utf8Array.length);
        let outputIndex = 0;
        const contentStr = content as string;

        for (let i = 0; i < contentStr.length; i++) {
          const charCode = contentStr.charCodeAt(i);

          // Caractères ASCII standards (0-127) - passage direct
          if (charCode < 128) {
            win1252Array[outputIndex++] = charCode;
          }
          // Caractères spéciaux français (128-255) - mapping Windows-1252
          else {
            // Mapping des caractères accentués français vers Windows-1252
            const win1252Map: { [key: number]: number } = {
              0x00c0: 0xc0, // À
              0x00c2: 0xc2, // Â
              0x00c7: 0xc7, // Ç
              0x00c8: 0xc8, // È
              0x00c9: 0xc9, // É
              0x00ca: 0xca, // Ê
              0x00cb: 0xcb, // Ë
              0x00ce: 0xce, // Î
              0x00cf: 0xcf, // Ï
              0x00d4: 0xd4, // Ô
              0x00d9: 0xd9, // Ù
              0x00db: 0xdb, // Û
              0x00dc: 0xdc, // Ü
              0x00e0: 0xe0, // à
              0x00e2: 0xe2, // â
              0x00e7: 0xe7, // ç
              0x00e8: 0xe8, // è
              0x00e9: 0xe9, // é
              0x00ea: 0xea, // ê
              0x00eb: 0xeb, // ë
              0x00ee: 0xee, // î
              0x00ef: 0xef, // ï
              0x00f4: 0xf4, // ô
              0x00f9: 0xf9, // ù
              0x00fb: 0xfb, // û
              0x00fc: 0xfc, // ü
              0x0153: 0x9c, // œ
              0x0152: 0x8c, // Œ
              0x20ac: 0x80, // €
            };

            win1252Array[outputIndex++] = win1252Map[charCode] || 0x3f; // ? si non trouvé
          }
        }

        // Créer le blob avec les octets Windows-1252
        const finalArray = win1252Array.slice(0, outputIndex);
        blob = new Blob([finalArray], {
          type: "text/plain;charset=windows-1252",
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

      // Générer le hash du fichier et enregistrer l'export log
      // Pour les formats binaires, on ne stocke pas le contenu complet
      if (format === "registre-suivi-dechets" && content instanceof Blob) {
        // Pour les formats binaires, on ne stocke pas le contenu dans la base
        // On peut stocker une référence ou un hash
        const arrayBuffer = await content.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const binaryString = Array.from(uint8Array)
          .map((b) => String.fromCharCode(b))
          .join("");
        const fileHash = await generateFileHash(binaryString);

        const exportLog: ExportLog = {
          fileName,
          startDate,
          endDate,
          totalRecords: peseesToExport.length,
          fileHash,
          fileContent: `[Fichier PDF binaire]`,
          exportType:
            `registre-suivi-dechets-${outputFormat}-${exportType}` as ExportLog["exportType"],
          peseeIds: peseesToExport.map((p) => p.id!),
          createdAt: now,
        };

        await db.exportLogs.add(exportLog);
      } else {
        // Pour les formats texte (CSV et autres), on stocke le contenu
        const contentStr = typeof content === "string" ? content : "";
        const fileHash = await generateFileHash(contentStr);

        const exportLog: ExportLog = {
          fileName,
          startDate,
          endDate,
          totalRecords:
            format === "sage-articles"
              ? await db.products.count()
              : peseesToExport.length,
          fileHash,
          fileContent: contentStr,
          exportType: `${format}-${exportType}` as ExportLog["exportType"],
          peseeIds:
            format === "sage-articles" ? [] : peseesToExport.map((p) => p.id!),
          createdAt: now,
        };

        await db.exportLogs.add(exportLog);
      }

      // Marquer les pesées comme exportées (pour tous les types sauf sage-articles et registre-suivi-dechets)
      // Le registre suivi déchets est un format de consultation, on ne marque pas comme exporté
      if (format !== "sage-articles" && format !== "registre-suivi-dechets") {
        await Promise.all(
          peseesToExport.map(async (pesee) => {
            const currentExports = pesee.exportedAt || [];
            const updatedPesee: Partial<Pesee> = {
              ...pesee,
              exportedAt: [...currentExports, now],
              updatedAt: now,
            };

            // Mettre à jour les flags d'export selon le format et le filtre
            if (format === "sage-bl-complet") {
              // Pour sage-bl-complet, marquer selon le documentTypeFilter
              if (
                documentTypeFilter === "tous" ||
                documentTypeFilter === "bons_uniquement"
              ) {
                if (
                  pesee.typeDocument === "bon_livraison" ||
                  pesee.typeDocument === "les_deux"
                ) {
                  updatedPesee.numeroBonExported = true;
                }
              }
              if (
                documentTypeFilter === "tous" ||
                documentTypeFilter === "factures_uniquement"
              ) {
                if (
                  pesee.typeDocument === "facture" ||
                  pesee.typeDocument === "les_deux"
                ) {
                  updatedPesee.numeroFactureExported = true;
                }
              }
            } else {
              // Pour les autres formats, marquer tout comme exporté
              if (pesee.numeroBon) {
                updatedPesee.numeroBonExported = true;
              }
              if (pesee.numeroFacture) {
                updatedPesee.numeroFactureExported = true;
              }
            }

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
