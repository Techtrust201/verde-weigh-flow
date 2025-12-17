/**
 * Exporteur pour le format "Registre suivi déchets"
 * Génère des fichiers Excel ou PDF avec exactement 44 colonnes
 */

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Pesee, Product, Client, Transporteur } from "@/lib/database";
import { parseAddress } from "./addressParser";
import { getGlobalSettings } from "@/lib/globalSettings";

export type OutputFormat = "excel" | "pdf";

export interface RegistreRow {
  // Bloc PESEE / DECHET
  date: string; // A
  heure: string; // B
  plaque: string; // C
  libelleProduit: string; // D
  codeDechet: string; // E
  poidsBrut: string; // F (vide ou poids brut en kg)
  poidsNet: string; // G (poids net en kg)
  codeTraitement: string; // H
  dechetPOP: string; // I ("x" si oui, sinon vide)

  // Bloc CLIENT
  client: string; // J
  siretClient: string; // K
  numeroVoieClient: string; // L
  voieClient: string; // M
  complementClient: string; // N
  cpClient: string; // O
  villeClient: string; // P

  // Colonnes vides Q-W
  // (seront gérées dans le mapping)

  // Bloc TRANSPORTEUR
  transporteur: string; // X
  siretTransporteur: string; // Y
  numeroVoieTransporteur: string; // Z
  voieTransporteur: string; // AA
  complementTransporteur: string; // AB
  cpTransporteur: string; // AC
  villeTransporteur: string; // AD

  // Colonnes vides AE-AK
  // (seront gérées dans le mapping)

  // Bloc CHANTIER
  recepisse: string; // AL
  nomChantier: string; // AM
  numeroVoieChantier: string; // AN
  voieChantier: string; // AO
  complementChantier: string; // AP
  villeChantier: string; // AQ
  codeINSEE: string; // AR
}

/**
 * Convertit une pesée en ligne du registre
 */
function mapPeseeToRegistreRow(
  pesee: Pesee,
  product: Product | undefined,
  client: Client | undefined,
  transporteur: Transporteur | undefined,
  recepisse: string | undefined
): RegistreRow {
  const dateHeure = new Date(pesee.dateHeure);

  // Format date dd/mm/yyyy
  const date = dateHeure.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // Format heure HH:mm
  const heure = dateHeure.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // Conversion poids : tonnes -> kg
  const poidsNetKg = pesee.net ? (pesee.net * 1000).toFixed(2) : "";
  const poidsBrutKg = pesee.poidsEntree
    ? (pesee.poidsEntree * 1000).toFixed(2)
    : "";

  // Parsing adresse client
  const adresseClientParsed = parseAddress(client?.adresse);

  // Parsing adresse transporteur
  const adresseTransporteurParsed = parseAddress(transporteur?.adresse);

  // Nom transporteur
  let nomTransporteur = "";
  if (pesee.transporteurLibre) {
    nomTransporteur = pesee.transporteurLibre;
  } else if (transporteur) {
    nomTransporteur = `${transporteur.prenom || ""} ${
      transporteur.nom || ""
    }`.trim();
  }

  // Chantier
  const chantier = pesee.chantierLibre || pesee.chantier || "";

  // Parsing adresse chantier (si le chantier contient une adresse)
  const adresseChantierParsed = parseAddress(chantier);

  // Code INSEE : utiliser code postal si code INSEE non disponible
  const codeINSEE = client?.codePostal || "";

  return {
    // Bloc PESEE / DECHET
    date,
    heure,
    plaque: pesee.plaque || "",
    libelleProduit: product?.nom || "",
    codeDechet: product?.codeDechets || "",
    poidsBrut: poidsBrutKg,
    poidsNet: poidsNetKg,
    codeTraitement: product?.codeTraitement || "",
    dechetPOP: product?.isPOP === true ? "x" : "",

    // Bloc CLIENT
    client: client?.raisonSociale || pesee.nomEntreprise || "",
    siretClient: client?.siret || "",
    numeroVoieClient: adresseClientParsed.numeroVoie || "",
    voieClient: adresseClientParsed.voie || "",
    complementClient: adresseClientParsed.complement || "",
    cpClient: client?.codePostal || "",
    villeClient: client?.ville || "",

    // Bloc TRANSPORTEUR
    transporteur: nomTransporteur,
    siretTransporteur: transporteur?.siret || "",
    numeroVoieTransporteur: adresseTransporteurParsed.numeroVoie || "",
    voieTransporteur: adresseTransporteurParsed.voie || "",
    complementTransporteur: adresseTransporteurParsed.complement || "",
    cpTransporteur: transporteur?.codePostal || "",
    villeTransporteur: transporteur?.ville || "",

    // Bloc CHANTIER
    recepisse: recepisse || "",
    nomChantier: chantier,
    numeroVoieChantier: adresseChantierParsed.numeroVoie || "",
    voieChantier: adresseChantierParsed.voie || "",
    complementChantier: adresseChantierParsed.complement || "",
    villeChantier: "", // À extraire si possible depuis le chantier
    codeINSEE,
  };
}

/**
 * Convertit une ligne du registre en tableau de 44 valeurs (ordre A → AR)
 */
function registreRowToArray(row: RegistreRow): (string | number)[] {
  return [
    // A-I : PESEE / DECHET
    row.date,
    row.heure,
    row.plaque,
    row.libelleProduit,
    row.codeDechet,
    row.poidsBrut || "", // F : peut être vide
    row.poidsNet,
    row.codeTraitement,
    row.dechetPOP,

    // J-P : CLIENT
    row.client,
    row.siretClient,
    row.numeroVoieClient,
    row.voieClient,
    row.complementClient,
    row.cpClient,
    row.villeClient,

    // Q-W : Colonnes vides
    "",
    "",
    "",
    "",
    "",
    "",
    "",

    // X-AD : TRANSPORTEUR
    row.transporteur,
    row.siretTransporteur,
    row.numeroVoieTransporteur,
    row.voieTransporteur,
    row.complementTransporteur,
    row.cpTransporteur,
    row.villeTransporteur,

    // AE-AK : Colonnes vides
    "",
    "",
    "",
    "",
    "",
    "",
    "",

    // AL-AR : CHANTIER
    row.recepisse,
    row.nomChantier,
    row.numeroVoieChantier,
    row.voieChantier,
    row.complementChantier,
    row.villeChantier,
    row.codeINSEE,
  ];
}

/**
 * Trie les pesées par date puis heure (croissant)
 */
function sortPesees(pesees: Pesee[]): Pesee[] {
  return [...pesees].sort((a, b) => {
    const dateA = new Date(a.dateHeure).getTime();
    const dateB = new Date(b.dateHeure).getTime();
    if (dateA !== dateB) {
      return dateA - dateB;
    }
    return 0;
  });
}

/**
 * Classe principale pour l'export du registre suivi déchets
 */
export class RegistreSuiviDechetsExporter {
  private productMap: Map<number, Product>;
  private clientMap: Map<number, Client>;
  private transporteurMap: Map<number, Transporteur>;
  private recepisse: string | undefined;

  constructor(
    productMap: Map<number, Product>,
    clientMap: Map<number, Client>,
    transporteurMap: Map<number, Transporteur>,
    recepisse?: string
  ) {
    this.productMap = productMap;
    this.clientMap = clientMap;
    this.transporteurMap = transporteurMap;
    this.recepisse = recepisse;
  }

  /**
   * Génère le fichier Excel
   */
  async generateExcel(pesees: Pesee[]): Promise<Blob> {
    // Trier les pesées
    const sortedPesees = sortPesees(pesees);

    // Créer le workbook
    const workbook = XLSX.utils.book_new();

    // Créer la feuille de données
    const worksheetData: (string | number)[][] = [];

    // Ligne 1 : En-têtes de groupes
    const headerGroups = [
      "PESEE",
      "",
      "",
      "DECHET",
      "",
      "",
      "",
      "",
      "",
      "CLIENT",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "TRANSPORTEUR",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "CHANTIER",
      "",
      "",
      "",
      "",
      "",
      "",
    ];
    worksheetData.push(headerGroups);

    // Ligne 2 : Titres de colonnes
    const columnHeaders = [
      "DATE",
      "HEURE DE PESEE",
      "PLAQUE D'IMMATRICULATION",
      "LIBELLE PRODUIT",
      "CODE DECHET",
      "POIDS (Kg)",
      "POIDS (Kg)",
      "CODE TRAITEMENT",
      'Déchet POP ("x" si oui)',
      "CLIENT",
      "SIRET",
      "N° Voie",
      "Voie",
      "Complément adresse",
      "CP",
      "VILLE",
      "",
      "",
      "",
      "",
      "",
      "",
      "", // Q-W vides
      "TRANSPORTEUR",
      "SIRET",
      "N° Voie",
      "Voie",
      "Complément adresse",
      "CP",
      "VILLE",
      "",
      "",
      "",
      "",
      "",
      "",
      "", // AE-AK vides
      "RECEPISSE",
      "Nom CHANTIER",
      "N° Voie",
      "Voie",
      "Complément adresse",
      "VILLE",
      "CODE INSEE",
    ];
    worksheetData.push(columnHeaders);

    // Lignes de données
    for (const pesee of sortedPesees) {
      const product = this.productMap.get(pesee.produitId);
      const client = pesee.clientId
        ? this.clientMap.get(pesee.clientId)
        : undefined;
      const transporteur = pesee.transporteurId
        ? this.transporteurMap.get(pesee.transporteurId)
        : undefined;

      const row = mapPeseeToRegistreRow(
        pesee,
        product,
        client,
        transporteur,
        this.recepisse
      );

      worksheetData.push(registreRowToArray(row));
    }

    // Créer la worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Définir les largeurs de colonnes
    const colWidths = [
      { wch: 12 }, // A: DATE
      { wch: 12 }, // B: HEURE
      { wch: 18 }, // C: PLAQUE
      { wch: 20 }, // D: LIBELLE PRODUIT
      { wch: 15 }, // E: CODE DECHET
      { wch: 12 }, // F: POIDS BRUT
      { wch: 12 }, // G: POIDS NET
      { wch: 15 }, // H: CODE TRAITEMENT
      { wch: 12 }, // I: POP
      { wch: 25 }, // J: CLIENT
      { wch: 15 }, // K: SIRET
      { wch: 10 }, // L: N° Voie
      { wch: 25 }, // M: Voie
      { wch: 20 }, // N: Complément
      { wch: 8 }, // O: CP
      { wch: 20 }, // P: VILLE
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 }, // Q-W
      { wch: 25 }, // X: TRANSPORTEUR
      { wch: 15 }, // Y: SIRET
      { wch: 10 }, // Z: N° Voie
      { wch: 25 }, // AA: Voie
      { wch: 20 }, // AB: Complément
      { wch: 8 }, // AC: CP
      { wch: 20 }, // AD: VILLE
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 }, // AE-AK
      { wch: 15 }, // AL: RECEPISSE
      { wch: 25 }, // AM: CHANTIER
      { wch: 10 }, // AN: N° Voie
      { wch: 25 }, // AO: Voie
      { wch: 20 }, // AP: Complément
      { wch: 20 }, // AQ: VILLE
      { wch: 12 }, // AR: CODE INSEE
    ];
    worksheet["!cols"] = colWidths;

    // Freeze panes à K3 (lignes 1-2 + colonnes A-J gelées)
    worksheet["!freeze"] = {
      xSplit: 10, // Colonne J (0-indexed, donc 10 = colonne K)
      ySplit: 2, // Ligne 2 (0-indexed, donc 2 = ligne 3)
      topLeftCell: "K3",
      activePane: "bottomRight",
      state: "frozen",
    };

    // Formatage des cellules (première ligne : couleurs par groupe)
    // Note: xlsx ne supporte pas directement les couleurs de fond dans la version browser
    // On peut utiliser des styles mais c'est limité. Pour un formatage complet,
    // il faudrait utiliser une bibliothèque comme ExcelJS côté serveur.
    // Ici, on se contente de la structure de base.

    // Ajouter la worksheet au workbook
    const sheetName = new Date().getFullYear().toString();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Générer le fichier
    const excelBuffer = XLSX.write(workbook, {
      type: "array",
      bookType: "xlsx",
    });

    return new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  }

  /**
   * Génère le fichier PDF
   */
  async generatePDF(pesees: Pesee[]): Promise<Blob> {
    // Trier les pesées
    const sortedPesees = sortPesees(pesees);

    // Créer le document PDF en paysage
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    // Préparer les données pour le tableau
    const tableData: string[][] = [];

    // En-têtes du tableau
    const headers = [
      "DATE",
      "HEURE",
      "PLAQUE",
      "PRODUIT",
      "CODE DECHET",
      "POIDS BRUT",
      "POIDS NET",
      "CODE TRAIT.",
      "POP",
      "CLIENT",
      "SIRET",
      "N°",
      "VOIE",
      "COMPL.",
      "CP",
      "VILLE",
      "",
      "",
      "",
      "",
      "",
      "",
      "", // Q-W
      "TRANSP.",
      "SIRET",
      "N°",
      "VOIE",
      "COMPL.",
      "CP",
      "VILLE",
      "",
      "",
      "",
      "",
      "",
      "",
      "", // AE-AK
      "RECEP.",
      "CHANTIER",
      "N°",
      "VOIE",
      "COMPL.",
      "VILLE",
      "INSEE",
    ];

    // Ajouter les données
    for (const pesee of sortedPesees) {
      const product = this.productMap.get(pesee.produitId);
      const client = pesee.clientId
        ? this.clientMap.get(pesee.clientId)
        : undefined;
      const transporteur = pesee.transporteurId
        ? this.transporteurMap.get(pesee.transporteurId)
        : undefined;

      const row = mapPeseeToRegistreRow(
        pesee,
        product,
        client,
        transporteur,
        this.recepisse
      );

      const rowData = registreRowToArray(row).map((val) =>
        val !== null && val !== undefined ? String(val) : ""
      );
      tableData.push(rowData);
    }

    // Générer le tableau avec autoTable
    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 10,
      styles: {
        fontSize: 6, // Petite police pour faire tenir 44 colonnes
        cellPadding: 1,
      },
      headStyles: {
        fillColor: [200, 200, 200],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { top: 10, right: 5, left: 5, bottom: 10 },
      tableWidth: "auto",
      columnStyles: {
        // Réduire la largeur des colonnes vides
        16: { cellWidth: 3 },
        17: { cellWidth: 3 },
        18: { cellWidth: 3 },
        19: { cellWidth: 3 },
        20: { cellWidth: 3 },
        21: { cellWidth: 3 },
        22: { cellWidth: 3 },
        29: { cellWidth: 3 },
        30: { cellWidth: 3 },
        31: { cellWidth: 3 },
        32: { cellWidth: 3 },
        33: { cellWidth: 3 },
        34: { cellWidth: 3 },
        35: { cellWidth: 3 },
      },
      didDrawPage: (data) => {
        // Ajouter la pagination
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.text(
          `Page ${data.pageNumber} / ${pageCount}`,
          doc.internal.pageSize.width - 30,
          doc.internal.pageSize.height - 10
        );
      },
    });

    // Générer le blob
    return doc.output("blob");
  }

  /**
   * Génère le fichier selon le format demandé
   */
  async generate(pesees: Pesee[], format: OutputFormat): Promise<Blob> {
    if (format === "excel") {
      return await this.generateExcel(pesees);
    } else {
      return await this.generatePDF(pesees);
    }
  }
}
