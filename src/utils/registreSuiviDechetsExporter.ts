/**
 * Exporteur pour le format "Registre suivi déchets"
 * Génère des fichiers CSV ou PDF avec exactement 45 colonnes (44 + DPT)
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Pesee, Product, Client, Transporteur } from "@/lib/database";
import { parseAddress } from "./addressParser";
import { getGlobalSettings } from "@/lib/globalSettings";

export type OutputFormat = "csv" | "pdf";

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
  dpt: string; // AS (nouvelle colonne)
}

/**
 * Extrait le code département depuis le code postal
 */
function extractDPT(codePostal: string | undefined | null): string {
  if (!codePostal || typeof codePostal !== "string") {
    return "";
  }
  const trimmed = codePostal.trim();
  // Extraire les 2 premiers chiffres
  const match = trimmed.match(/^(\d{2})/);
  return match ? match[1] : "";
}

/**
 * Extrait la ville et le code postal depuis une adresse complète
 * Format attendu : "adresse, CODE_POSTAL VILLE" ou "VILLE CODE_POSTAL" ou juste "VILLE"
 */
function extractVilleEtCodePostal(adresse: string | undefined | null): {
  ville: string;
  codePostal: string;
} {
  if (!adresse || typeof adresse !== "string") {
    return { ville: "", codePostal: "" };
  }

  const trimmed = adresse.trim();
  if (!trimmed) {
    return { ville: "", codePostal: "" };
  }

  // Pattern pour détecter "CODE_POSTAL VILLE" à la fin
  // Exemples : "06550 La Roquette-sur-Siagne", "MANDELIEU 06210"
  const patternFin = /(\d{5})\s+([A-Za-zÀ-ÿ\s-]+)$/i;
  const matchFin = trimmed.match(patternFin);
  if (matchFin) {
    return {
      codePostal: matchFin[1],
      ville: matchFin[2].trim(),
    };
  }

  // Pattern pour détecter "VILLE CODE_POSTAL"
  const patternDebut = /^([A-Za-zÀ-ÿ\s-]+)\s+(\d{5})$/i;
  const matchDebut = trimmed.match(patternDebut);
  if (matchDebut) {
    return {
      ville: matchDebut[1].trim(),
      codePostal: matchDebut[2],
    };
  }

  // Si on trouve un code postal quelque part, extraire la ville après
  const codePostalMatch = trimmed.match(/\b(\d{5})\b/);
  if (codePostalMatch) {
    const codePostal = codePostalMatch[1];
    const index = trimmed.indexOf(codePostal);
    const partieApres = trimmed.substring(index + codePostal.length).trim();
    // Prendre les mots après le code postal comme ville
    const villeMatch = partieApres.match(/^([A-Za-zÀ-ÿ\s-]+)/i);
    if (villeMatch) {
      return {
        codePostal,
        ville: villeMatch[1].trim(),
      };
    }
    // Sinon, chercher avant le code postal
    const partieAvant = trimmed.substring(0, index).trim();
    const mots = partieAvant.split(/\s+/);
    if (mots.length > 0) {
      // Prendre le dernier mot comme ville potentielle
      const derniersMots = mots.slice(-2).join(" ");
      return {
        codePostal,
        ville: derniersMots,
      };
    }
    return { codePostal, ville: "" };
  }

  // Si pas de code postal trouvé, essayer de prendre le dernier mot comme ville
  const mots = trimmed.split(/\s*,\s*/);
  if (mots.length > 1) {
    // Si format "adresse, VILLE"
    const dernierePartie = mots[mots.length - 1].trim();
    return { ville: dernierePartie, codePostal: "" };
  }

  // Sinon, retourner tout comme ville potentielle
  return { ville: trimmed, codePostal: "" };
}

/**
 * Formate une valeur numérique pour Excel afin de préserver les zéros de tête
 * Utilise un caractère de tabulation (\t) au début pour forcer l'interprétation comme texte
 * Excel interprète automatiquement les valeurs commençant par une tabulation comme du texte,
 * ce qui préserve les zéros de tête sans afficher de caractères visibles
 */
function formatForExcel(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  const str = String(value).trim();
  // Si c'est une valeur numérique (code postal, SIRET, département), ajouter une tabulation
  if (/^\d+$/.test(str)) {
    return `\t${str}`;
  }
  return str;
}

/**
 * Échappe une valeur pour le CSV
 * - Entoure de guillemets doubles
 * - Échappe les guillemets doubles internes en ""
 * - Retourne "" pour les valeurs vides si quoteEmpty est true, sinon ""
 */
function escapeCSVValue(
  value: string | number | null | undefined,
  quoteEmpty: boolean = true
): string {
  if (value === null || value === undefined || value === "") {
    return quoteEmpty ? '""' : "";
  }
  const str = String(value);
  // Échapper les guillemets doubles : " devient ""
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Génère une ligne CSV à partir d'un tableau de valeurs
 * @param values Tableau de valeurs à convertir en ligne CSV
 * @param quoteEmpty Si true, les valeurs vides seront entourées de guillemets (""), sinon elles seront vides ()
 */
function generateCSVLine(
  values: (string | number | null | undefined)[],
  quoteEmpty: boolean = true
): string {
  return values.map((val) => escapeCSVValue(val, quoteEmpty)).join(",");
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

  // Format date M/D/YYYY (ex: "6/1/2025")
  const month = dateHeure.getMonth() + 1;
  const day = dateHeure.getDate();
  const year = dateHeure.getFullYear();
  const date = `${month}/${day}/${year}`;

  // Format heure H:MM (ex: "6:57")
  const hours = dateHeure.getHours();
  const minutes = dateHeure.getMinutes();
  const heure = `${hours}:${minutes.toString().padStart(2, "0")}`;

  // Conversion poids : tonnes -> kg
  const poidsNetKg = pesee.net ? Math.round(pesee.net * 1000).toString() : "";
  const poidsBrutKg = pesee.poidsEntree
    ? Math.round(pesee.poidsEntree * 1000).toString()
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

  // Extraire ville et code postal du chantier
  const { ville: villeChantier, codePostal: codePostalChantier } =
    extractVilleEtCodePostal(chantier);

  // Code INSEE : utiliser le code postal de la ville du chantier (selon instructions)
  const codeINSEE = codePostalChantier || "";

  // Code département : extraire depuis le code postal du chantier
  const dpt = extractDPT(codePostalChantier);

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
    siretClient: formatForExcel(client?.siret || ""),
    numeroVoieClient: adresseClientParsed.numeroVoie || "",
    voieClient: adresseClientParsed.voie || "",
    complementClient: adresseClientParsed.complement || "",
    cpClient: formatForExcel(client?.codePostal || ""),
    villeClient: client?.ville || "",

    // Bloc TRANSPORTEUR
    // Mettre "#N/A" si vraiment rien n'est disponible, sinon utiliser les vraies données
    transporteur: nomTransporteur || "#N/A",
    siretTransporteur: formatForExcel(
      transporteur?.siret || (nomTransporteur ? "" : "#N/A")
    ),
    numeroVoieTransporteur:
      adresseTransporteurParsed.numeroVoie || (nomTransporteur ? "" : "#N/A"),
    voieTransporteur:
      adresseTransporteurParsed.voie || (nomTransporteur ? "" : "#N/A"),
    complementTransporteur:
      adresseTransporteurParsed.complement || (nomTransporteur ? "" : "#N/A"),
    cpTransporteur: formatForExcel(
      transporteur?.codePostal || (nomTransporteur ? "" : "#N/A")
    ),
    villeTransporteur: transporteur?.ville || (nomTransporteur ? "" : "#N/A"),

    // Bloc CHANTIER
    recepisse: recepisse || "",
    nomChantier: chantier,
    numeroVoieChantier: adresseChantierParsed.numeroVoie || "",
    voieChantier: adresseChantierParsed.voie || "",
    complementChantier: adresseChantierParsed.complement || "",
    villeChantier: villeChantier, // Extraite depuis le chantier
    codeINSEE: formatForExcel(codeINSEE), // Code postal de la ville du chantier
    dpt: formatForExcel(dpt), // Code département extrait du code postal du chantier
  };
}

/**
 * Convertit une ligne du registre en tableau de 45 valeurs (ordre A → AS)
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

    // AS : DPT (nouvelle colonne)
    row.dpt,
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
   * Génère le fichier CSV
   */
  generateCSV(pesees: Pesee[]): string {
    // Trier les pesées
    const sortedPesees = sortPesees(pesees);

    const lines: string[] = [];

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
      "", // DPT (colonne 44)
    ];
    // Ligne 1 : valeurs vides sans guillemets pour correspondre au modèle
    lines.push(generateCSVLine(headerGroups, false));

    // Ligne 2-4 : Titres de colonnes (avec retours à la ligne dans certains en-têtes)
    // Note: Les retours à la ligne doivent être préservés dans les guillemets
    const columnHeaders = [
      "DATE",
      "HEURE DE\nPESEE", // Retour à la ligne préservé
      "PLAQUE D'IMMATRICULATION",
      "LIBELLE PRODUIT",
      "CODE DECHET",
      "POIDS (Kg)",
      "POIDS (Kg)",
      "CODE TRAITEMENT",
      'Déchet POP\n(""x"" si oui)', // Retour à la ligne et guillemets échappés
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
      " Nom CHANTIER", // Note: espace avant "Nom"
      "N° Voie",
      "Voie",
      "Complément adresse",
      "VILLE",
      "CODE INSEE",
      "DPT", // Nouvelle colonne
    ];
    lines.push(generateCSVLine(columnHeaders));

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

      lines.push(generateCSVLine(registreRowToArray(row)));
    }

    // Retourner le CSV avec BOM UTF-8 pour Excel
    return "\ufeff" + lines.join("\n");
  }

  /**
   * Génère le fichier PDF avec couleurs
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

    // Ligne 1 : En-têtes de groupes (45 colonnes)
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
      "", // DPT (colonne 44)
    ];

    // En-têtes du tableau (45 colonnes) - Ligne 2
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
      "DPT", // Nouvelle colonne
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

    // Couleurs pour les groupes (RGB)
    const colors = {
      pesee: [255, 249, 196], // Jaune clair (#FFF9C4)
      dechet: [255, 224, 178], // Orange clair (#FFE0B2)
      client: [187, 222, 251], // Bleu clair (#BBDEFB)
      transporteur: [248, 187, 208], // Rose clair (#F8BBD0)
      chantier: [200, 230, 201], // Vert clair (#C8E6C9)
      header: [224, 224, 224], // Gris clair (#E0E0E0)
    };

    // Mapping des colonnes vers leurs couleurs
    const columnColors: number[][] = [];
    for (let i = 0; i < 45; i++) {
      if (i >= 0 && i <= 2) {
        // A-C : PESEE
        columnColors[i] = colors.pesee;
      } else if (i >= 3 && i <= 8) {
        // D-I : DECHET
        columnColors[i] = colors.dechet;
      } else if (i >= 9 && i <= 15) {
        // J-P : CLIENT
        columnColors[i] = colors.client;
      } else if (i >= 16 && i <= 22) {
        // Q-W : Vides (gris clair)
        columnColors[i] = colors.header;
      } else if (i >= 23 && i <= 29) {
        // X-AD : TRANSPORTEUR
        columnColors[i] = colors.transporteur;
      } else if (i >= 30 && i <= 36) {
        // AE-AK : Vides (gris clair)
        columnColors[i] = colors.header;
      } else if (i >= 37 && i <= 43) {
        // AL-AR : CHANTIER
        columnColors[i] = colors.chantier;
      } else {
        // AS : DPT (gris clair)
        columnColors[i] = colors.header;
      }
    }

    // Créer les styles de colonnes avec couleurs
    const columnStyles: {
      [key: string]: {
        fillColor?: [number, number, number];
        cellWidth?: number;
      };
    } = {};
    for (let i = 0; i < 45; i++) {
      const color = columnColors[i];
      columnStyles[i.toString()] = {
        fillColor: [color[0], color[1], color[2]] as [number, number, number],
        cellWidth: (i >= 16 && i <= 22) || (i >= 30 && i <= 36) ? 3 : undefined,
      };
    }

    // Générer le tableau avec autoTable
    autoTable(doc, {
      head: [headerGroups, headers], // Deux lignes : groupes, titres (pas de texte d'aide dans le PDF non plus)
      body: tableData,
      startY: 10,
      styles: {
        fontSize: 6, // Petite police pour faire tenir 45 colonnes
        cellPadding: 1,
      },
      headStyles: {
        fillColor: [colors.header[0], colors.header[1], colors.header[2]] as [
          number,
          number,
          number
        ],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
      columnStyles,
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { top: 10, right: 5, left: 5, bottom: 10 },
      tableWidth: "auto",
      didParseCell: (data) => {
        // Appliquer les couleurs de groupes à la première ligne du head
        if (data.section === "head" && data.row.index === 0) {
          // Première ligne : en-têtes de groupes avec couleurs par bloc
          const color = columnColors[data.column.index];
          data.cell.styles.fillColor = [color[0], color[1], color[2]] as [
            number,
            number,
            number
          ];
          data.cell.styles.textColor = [0, 0, 0];
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.halign = "center";
        } else if (data.section === "head" && data.row.index === 1) {
          // Deuxième ligne : titres de colonnes avec fond gris
          data.cell.styles.fillColor = [
            colors.header[0],
            colors.header[1],
            colors.header[2],
          ] as [number, number, number];
          data.cell.styles.textColor = [0, 0, 0];
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.halign = "center";
        }
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
  async generate(
    pesees: Pesee[],
    format: OutputFormat
  ): Promise<string | Blob> {
    if (format === "csv") {
      return this.generateCSV(pesees);
    } else {
      return await this.generatePDF(pesees);
    }
  }
}
