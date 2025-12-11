/**
 * Parser pour les fichiers d'export Sage 50
 * Gère l'import des bons de livraison et factures
 */

export interface SageExportLine {
  type: "E" | "L"; // E = En-tête, L = Ligne
  typePiece?: string; // Bon de livraison, Facture, etc.
  numeroPiece?: string; // BL43091, FB2593, etc.
  datePiece?: string; // 24/09/2025
  facturationTTC?: number;
  referencePiece?: string;
  remarque?: string;
  codeRepresentant?: string;
  codeClient?: string;
  nomClient?: string;
  formeJuridique?: string;
  adresse1?: string;
  adresse2?: string;
  adresse3?: string;
  codePostal?: string;
  ville?: string;
  codePays?: string;
  pays?: string;
  modeGestionTVA?: string;
  tarifClient?: string;
  nii?: string;
  assujettiTPF?: string;
  observations?: string;
  nomContact?: string;
  codeModePaiement?: string;
  dateEcheance?: string;
  dateLivraisonPiece?: string;
  validee?: boolean;
  transmise?: boolean;
  soldee?: boolean;
  comptabilisee?: boolean;
  irrecoverable?: boolean;
  dateIrrecoverabilite?: string;
  libelleIrrecoverable?: string;
  comptaIrrecoverable?: string;
  codeAffairePiece?: string;
  typeRemisePiece?: string;
  tauxRemisePiece?: number;
  mtRemisePiece?: number;
  tauxEscompte?: number;
  statutDevis?: string;
  refCommande?: string;
  pasRetourStock?: boolean;
  portSansTVA?: number;
  portSoumisTVA?: number;
  tauxTVAPortSoumis?: number;
  tvaPortNonPercue?: number;
  mtTotalTTC?: number;
  codeArticle?: string;
  quantite?: number;
  puHT?: number;
  puTTC?: number;
  tauxTVA?: number;
  ligneCommentaire?: string;
  description?: string;
  niveauSousTotal?: number;
  tauxTPF?: number;
  codeDepot?: string;
  pdsUnitBrut?: number;
  pdsUnitNet?: number;
  qteParColis?: number;
  nbreColis?: number;
  dateLivraison?: string;
  typeRemiseLigne?: string;
  tauxRemiseLigne?: number;
  mtUnitRemiseHT?: number;
  mtUnitRemiseTTC?: number;
  paHT?: number;
  pamp?: number;
  unite?: string;
  referenceFournisseur?: string;
  codeRepresentantLigne?: string;
  typeCommissionRepr?: string;
  tauxCommission?: number;
  mtCommission?: number;
  codeAffaireLigne?: string;
  mtUnitEcoPartTTC?: number;
  qteLivree?: number;
  tvaNonPercue?: number;
  numeroLigne?: number;
  optionsSage?: string;
  categorieTVA?: string;
  motifExonerationTVA?: string;
  societeLivraison?: string;
  adresse1Livraison?: string;
  adresse2Livraison?: string;
  adresse3Livraison?: string;
  cpLivraison?: string;
  villeLivraison?: string;
  codePaysLivraison?: string;
  paysLivraison?: string;
  cadreFacturation?: string;
}

export interface SageDocument {
  type: "bon_livraison" | "facture";
  numero: string;
  date: string;
  client: {
    code: string;
    nom: string;
    adresse1?: string;
    adresse2?: string;
    adresse3?: string;
    codePostal?: string;
    ville?: string;
    pays?: string;
    formeJuridique?: string;
    nii?: string;
    contact?: string;
  };
  lignes: Array<{
    codeArticle: string;
    description: string;
    quantite: number;
    puHT: number;
    puTTC: number;
    tauxTVA: number;
    montantHT: number;
    montantTTC: number;
  }>;
  totalHT: number;
  totalTTC: number;
  modePaiement?: string;
  dateEcheance?: string;
  remarques?: string;
  portSansTVA?: number;
  portSoumisTVA?: number;
  tauxTVAPortSoumis?: number;
  tvaPortNonPercue?: number;
}

/**
 * Parse un fichier d'export Sage 50
 */
export function parseSageExport(content: string): SageDocument[] {
  const lines = content.split("\n").filter((line) => line.trim());

  if (lines.length === 0) {
    throw new Error("Le fichier est vide");
  }

  // Parse l'en-tête pour obtenir les noms de colonnes
  const headerLine = lines[0];
  const columns = headerLine.split("\t");

  const documents: SageDocument[] = [];
  let currentDocument: SageDocument | null = null;
  let currentEnTete: SageExportLine | null = null;

  // Traiter chaque ligne (en sautant l'en-tête)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = line.split("\t");

    if (values.length !== columns.length) {
      console.warn(
        `Ligne ${i + 1}: nombre de colonnes incorrect (${
          values.length
        } au lieu de ${columns.length})`
      );
      continue;
    }

    const parsedLine = parseSageLine(columns, values);

    if (parsedLine.type === "E") {
      // Nouvelle pièce - sauvegarder la précédente si elle existe
      if (currentDocument) {
        documents.push(currentDocument);
      }

      currentEnTete = parsedLine;
      currentDocument = createDocumentFromEnTete(parsedLine);
    } else if (parsedLine.type === "L" && currentDocument && currentEnTete) {
      // Ligne de détail
      const ligne = createLigneFromDetail(parsedLine);
      currentDocument.lignes.push(ligne);

      // Recalculer les totaux
      currentDocument.totalHT = currentDocument.lignes.reduce(
        (sum, l) => sum + l.montantHT,
        0
      );
      currentDocument.totalTTC = currentDocument.lignes.reduce(
        (sum, l) => sum + l.montantTTC,
        0
      );
    }
  }

  // Ajouter le dernier document
  if (currentDocument) {
    documents.push(currentDocument);
  }

  return documents;
}

/**
 * Parse une ligne du fichier Sage
 */
function parseSageLine(columns: string[], values: string[]): SageExportLine {
  const line: SageExportLine = {
    type: values[0] as "E" | "L",
  };

  // Mapper chaque colonne avec sa valeur
  for (let i = 0; i < columns.length; i++) {
    const columnName = columns[i].trim();
    const value = values[i]?.trim() || "";

    switch (columnName) {
      case "Type de pièce":
        line.typePiece = value;
        break;
      case "N° pièce":
        line.numeroPiece = value;
        break;
      case "Date pièce":
        line.datePiece = value;
        break;
      case "Facturation TTC":
        line.facturationTTC = parseFloat(value) || 0;
        break;
      case "Référence pièce":
        line.referencePiece = value;
        break;
      case "Remarque":
        line.remarque = value;
        break;
      case "Code représentant pièce":
        line.codeRepresentant = value;
        break;
      case "Code client":
        line.codeClient = value;
        break;
      case "Nom client":
        line.nomClient = value;
        break;
      case "Forme juridique":
        line.formeJuridique = value;
        break;
      case "Adresse 1":
        line.adresse1 = value;
        break;
      case "Adresse 2":
        line.adresse2 = value;
        break;
      case "Adresse 3":
        line.adresse3 = value;
        break;
      case "Code postal":
        line.codePostal = value;
        break;
      case "Ville":
        line.ville = value;
        break;
      case "Code pays":
        line.codePays = value;
        break;
      case "Pays":
        line.pays = value;
        break;
      case "Mode gestion TVA":
        line.modeGestionTVA = value;
        break;
      case "Tarif client":
        line.tarifClient = value;
        break;
      case "NII":
        line.nii = value;
        break;
      case "Assujetti TPF":
        line.assujettiTPF = value;
        break;
      case "Observations":
        line.observations = value;
        break;
      case "Nom contact":
        line.nomContact = value;
        break;
      case "Code mode de paiement":
        line.codeModePaiement = value;
        break;
      case "Date échéance":
        line.dateEcheance = value;
        break;
      case "Date livraison pièce":
        line.dateLivraisonPiece = value;
        break;
      case "Validée":
        line.validee = value === "Oui";
        break;
      case "Transmise":
        line.transmise = value === "Oui";
        break;
      case "Soldée":
        line.soldee = value === "Oui";
        break;
      case "Comptabilisée":
        line.comptabilisee = value === "Oui";
        break;
      case "Irrécoverable":
        line.irrecoverable = value === "Oui";
        break;
      case "Date irrécoverabilité":
        line.dateIrrecoverabilite = value;
        break;
      case "Libellé irrécoverable":
        line.libelleIrrecoverable = value;
        break;
      case "Compta. irrécoverable":
        line.comptaIrrecoverable = value;
        break;
      case "Code affaire pièce":
        line.codeAffairePiece = value;
        break;
      case "Type de remise pièce":
        line.typeRemisePiece = value;
        break;
      case "Taux remise pièce":
        line.tauxRemisePiece = parseFloat(value) || 0;
        break;
      case "Mt remise pièce":
        line.mtRemisePiece = parseFloat(value) || 0;
        break;
      case "Taux Escompte":
        line.tauxEscompte = parseFloat(value) || 0;
        break;
      case "Statut devis":
        line.statutDevis = value;
        break;
      case "Ref. commande":
        line.refCommande = value;
        break;
      case "Pas de retour stock":
        line.pasRetourStock = value === "Oui";
        break;
      case "Port Sans TVA":
        line.portSansTVA = parseFloat(value.replace(",", ".")) || 0;
        break;
      case "Port Soumis TVA":
        line.portSoumisTVA = parseFloat(value.replace(",", ".")) || 0;
        break;
      case "Taux TVA Port Soumis":
        line.tauxTVAPortSoumis = parseFloat(value.replace(",", ".")) || 0;
        break;
      case "TVA Port Non Perçue":
        line.tvaPortNonPercue = parseFloat(value.replace(",", ".")) || 0;
        break;
      case "Mt total TTC":
        line.mtTotalTTC = parseFloat(value) || 0;
        break;
      case "Code article":
        line.codeArticle = value;
        break;
      case "Quantité":
        line.quantite = parseFloat(value) || 0;
        break;
      case "PU HT":
        line.puHT = parseFloat(value) || 0;
        break;
      case "PU TTC":
        line.puTTC = parseFloat(value) || 0;
        break;
      case "Taux TVA":
        line.tauxTVA = parseFloat(value) || 0;
        break;
      case "Ligne commentaire":
        line.ligneCommentaire = value;
        break;
      case "Description":
        line.description = value;
        break;
      case "Niveau sous-total":
        line.niveauSousTotal = parseInt(value) || 0;
        break;
      case "Taux TPF":
        line.tauxTPF = parseFloat(value) || 0;
        break;
      case "Code dépôt":
        line.codeDepot = value;
        break;
      case "Pds Unit. Brut":
        line.pdsUnitBrut = parseFloat(value) || 0;
        break;
      case "Pds Unit. Net":
        line.pdsUnitNet = parseFloat(value) || 0;
        break;
      case "Qté par colis":
        line.qteParColis = parseFloat(value) || 0;
        break;
      case "Nbre colis":
        line.nbreColis = parseInt(value) || 0;
        break;
      case "Date livraison":
        line.dateLivraison = value;
        break;
      case "Type remise ligne":
        line.typeRemiseLigne = value;
        break;
      case "Taux remise ligne":
        line.tauxRemiseLigne = parseFloat(value) || 0;
        break;
      case "Mt unit. remise HT":
        line.mtUnitRemiseHT = parseFloat(value) || 0;
        break;
      case "Mt unit. remise TTC":
        line.mtUnitRemiseTTC = parseFloat(value) || 0;
        break;
      case "PA HT":
        line.paHT = parseFloat(value) || 0;
        break;
      case "PAMP":
        line.pamp = parseFloat(value) || 0;
        break;
      case "Unité":
        line.unite = value;
        break;
      case "Référence fournisseur":
        line.referenceFournisseur = value;
        break;
      case "Code représentant ligne":
        line.codeRepresentantLigne = value;
        break;
      case "Type Commission Repr.":
        line.typeCommissionRepr = value;
        break;
      case "Taux commission":
        line.tauxCommission = parseFloat(value) || 0;
        break;
      case "Mt commission":
        line.mtCommission = parseFloat(value) || 0;
        break;
      case "Code affaire ligne":
        line.codeAffaireLigne = value;
        break;
      case "Mt unit. Eco-part. TTC":
        line.mtUnitEcoPartTTC = parseFloat(value) || 0;
        break;
      case "Qté Livrée":
        line.qteLivree = parseFloat(value) || 0;
        break;
      case "TVA Non Perçue":
        line.tvaNonPercue = parseFloat(value) || 0;
        break;
      case "N° ligne":
        line.numeroLigne = parseInt(value) || 0;
        break;
      case "Options Sage":
        line.optionsSage = value;
        break;
      case "Catégorie de TVA":
        line.categorieTVA = value;
        break;
      case "Motif d'exonération de TVA":
        line.motifExonerationTVA = value;
        break;
      case "Société de livraison":
        line.societeLivraison = value;
        break;
      case "Adresse 1 de livraison":
        line.adresse1Livraison = value;
        break;
      case "Adresse 2 de livraison":
        line.adresse2Livraison = value;
        break;
      case "Adresse 3 de livraison":
        line.adresse3Livraison = value;
        break;
      case "CP de livraison":
        line.cpLivraison = value;
        break;
      case "Ville de livraison":
        line.villeLivraison = value;
        break;
      case "Code pays de livraison":
        line.codePaysLivraison = value;
        break;
      case "Pays de livraison":
        line.paysLivraison = value;
        break;
      case "Cadre de facturation":
        line.cadreFacturation = value;
        break;
    }
  }

  return line;
}

/**
 * Crée un document à partir d'un en-tête
 */
function createDocumentFromEnTete(enTete: SageExportLine): SageDocument {
  const type = enTete.typePiece?.includes("Bon de livraison")
    ? "bon_livraison"
    : enTete.typePiece?.includes("Facture")
    ? "facture"
    : "bon_livraison";

  return {
    type,
    numero: enTete.numeroPiece || "",
    date: enTete.datePiece || "",
    client: {
      code: enTete.codeClient || "",
      nom: enTete.nomClient || "",
      adresse1: enTete.adresse1,
      adresse2: enTete.adresse2,
      adresse3: enTete.adresse3,
      codePostal: enTete.codePostal,
      ville: enTete.ville,
      pays: enTete.pays,
      formeJuridique: enTete.formeJuridique,
      nii: enTete.nii,
      contact: enTete.nomContact,
    },
    lignes: [],
    totalHT: 0,
    totalTTC: enTete.mtTotalTTC || 0,
    modePaiement: enTete.codeModePaiement,
    dateEcheance: enTete.dateEcheance,
    remarques: enTete.remarque,
    portSansTVA: enTete.portSansTVA,
    portSoumisTVA: enTete.portSoumisTVA,
    tauxTVAPortSoumis: enTete.tauxTVAPortSoumis,
    tvaPortNonPercue: enTete.tvaPortNonPercue,
  };
}

/**
 * Crée une ligne de détail à partir d'une ligne L
 */
function createLigneFromDetail(detail: SageExportLine) {
  const montantHT = (detail.quantite || 0) * (detail.puHT || 0);
  const montantTTC = (detail.quantite || 0) * (detail.puTTC || 0);

  return {
    codeArticle: detail.codeArticle || "",
    description: detail.description || "",
    quantite: detail.quantite || 0,
    puHT: detail.puHT || 0,
    puTTC: detail.puTTC || 0,
    tauxTVA: detail.tauxTVA || 0,
    montantHT,
    montantTTC,
  };
}

/**
 * Valide un document Sage
 */
export function validateSageDocument(doc: SageDocument): string[] {
  const errors: string[] = [];

  if (!doc.numero) {
    errors.push("Numéro de pièce manquant");
  }

  if (!doc.date) {
    errors.push("Date de pièce manquante");
  }

  if (!doc.client.code) {
    errors.push("Code client manquant");
  }

  if (!doc.client.nom) {
    errors.push("Nom client manquant");
  }

  if (doc.lignes.length === 0) {
    errors.push("Aucune ligne de détail trouvée");
  }

  doc.lignes.forEach((ligne, index) => {
    if (!ligne.codeArticle) {
      errors.push(`Ligne ${index + 1}: Code article manquant`);
    }
    if (!ligne.description) {
      errors.push(`Ligne ${index + 1}: Description manquante`);
    }
    if (ligne.quantite <= 0) {
      errors.push(`Ligne ${index + 1}: Quantité invalide`);
    }
    if (ligne.puHT <= 0) {
      errors.push(`Ligne ${index + 1}: Prix unitaire HT invalide`);
    }
  });

  return errors;
}
