/**
 * Exporteur pour le format "Registre suivi déchets"
 * Génère des fichiers CSV ou PDF avec exactement 44 colonnes (43 + DPT)
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
  poidsNet: string; // F (poids net en kg)
  codeTraitement: string; // G
  dechetPOP: string; // H ("x" si oui, sinon vide)

  // Bloc CLIENT
  client: string; // I
  siretClient: string; // J
  numeroVoieClient: string; // K
  voieClient: string; // L
  complementClient: string; // M
  cpClient: string; // N
  villeClient: string; // O

  // Colonnes vides P-V
  // (seront gérées dans le mapping)

  // Bloc TRANSPORTEUR
  transporteur: string; // W
  siretTransporteur: string; // X
  numeroVoieTransporteur: string; // Y
  voieTransporteur: string; // Z
  complementTransporteur: string; // AA
  cpTransporteur: string; // AB
  villeTransporteur: string; // AC
  recepisse: string; // AD

  // Colonnes vides AE-AJ
  // (seront gérées dans le mapping)

  // Bloc CHANTIER
  nomChantier: string; // AM
  numeroVoieChantier: string; // AN
  voieChantier: string; // AO
  complementChantier: string; // AP
  villeChantier: string; // AQ
  codeINSEE: string; // AR
  dpt: string; // AS
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
  return values.map((val) => escapeCSVValue(val, quoteEmpty)).join(";");
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

  // Parsing adresse client
  const adresseClientParsed = parseAddress(client?.adresse);

  // Parsing adresse transporteur (seulement si on a un transporteur avec données complètes)
  const adresseTransporteurParsed = parseAddress(transporteur?.adresse);

  // Déterminer le nom du transporteur selon la priorité (comme l'historique)
  let nomTransporteur = "";
  let transporteurData: Transporteur | undefined = undefined;

  // Priorité 1 : transporteurLibre (saisi manuellement)
  if (pesee.transporteurLibre?.trim()) {
    nomTransporteur = pesee.transporteurLibre.trim();
    // Pas de données complètes disponibles, seulement le nom
    transporteurData = undefined;
  }
  // Priorité 2 : transporteurId (transporteur existant sélectionné)
  else if (pesee.transporteurId && transporteur) {
    nomTransporteur = `${transporteur.prenom || ""} ${
      transporteur.nom || ""
    }`.trim();
    transporteurData = transporteur; // Utiliser toutes les données du transporteur
  }
  // Fallback : nomEntreprise (comme l'historique)
  // Dans ce cas, c'est le client lui-même qui transporte ses déchets
  else {
    nomTransporteur = pesee.nomEntreprise || "";
    transporteurData = undefined;
  }

  // Déterminer si c'est le client lui-même qui transporte
  // (pas de transporteurLibre, pas de transporteurId)
  const isClientAsTransporteur =
    !pesee.transporteurLibre?.trim() && !pesee.transporteurId && !!client;

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
    // Logique :
    // - Si on a transporteurData (transporteurId sélectionné), utiliser toutes ses données
    // - Sinon si c'est le client lui-même (isClientAsTransporteur), utiliser les données du client
    // - Sinon (transporteurLibre seulement), utiliser le nom mais mettre "#N/A" pour les autres champs
    transporteur: nomTransporteur || "#N/A",
    siretTransporteur: formatForExcel(
      transporteurData?.siret ||
        (isClientAsTransporteur
          ? client?.siret || ""
          : nomTransporteur
          ? "#N/A"
          : "#N/A")
    ),
    numeroVoieTransporteur: transporteurData
      ? adresseTransporteurParsed.numeroVoie || ""
      : isClientAsTransporteur
      ? adresseClientParsed.numeroVoie || ""
      : nomTransporteur
      ? "#N/A"
      : "#N/A",
    voieTransporteur: transporteurData
      ? adresseTransporteurParsed.voie || ""
      : isClientAsTransporteur
      ? adresseClientParsed.voie || ""
      : nomTransporteur
      ? "#N/A"
      : "#N/A",
    complementTransporteur: transporteurData
      ? adresseTransporteurParsed.complement || ""
      : isClientAsTransporteur
      ? adresseClientParsed.complement || ""
      : nomTransporteur
      ? "#N/A"
      : "#N/A",
    cpTransporteur: formatForExcel(
      transporteurData?.codePostal ||
        (isClientAsTransporteur
          ? client?.codePostal || ""
          : nomTransporteur
          ? "#N/A"
          : "#N/A")
    ),
    villeTransporteur:
      transporteurData?.ville ||
      (isClientAsTransporteur
        ? client?.ville || ""
        : nomTransporteur
        ? "#N/A"
        : "#N/A"),
    recepisse: recepisse || "",

    // Bloc CHANTIER
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
 * Convertit une ligne du registre en tableau de 44 valeurs (ordre A → AS)
 */
function registreRowToArray(row: RegistreRow): (string | number)[] {
  return [
    // A-H : PESEE / DECHET
    row.date,
    row.heure,
    row.plaque,
    row.libelleProduit,
    row.codeDechet,
    row.poidsNet,
    row.codeTraitement,
    row.dechetPOP,

    // I-O : CLIENT
    row.client,
    row.siretClient,
    row.numeroVoieClient,
    row.voieClient,
    row.complementClient,
    row.cpClient,
    row.villeClient,

    // P-V : Colonnes vides
    "",
    "",
    "",
    "",
    "",
    "",
    "",

    // W-AD : TRANSPORTEUR
    row.transporteur,
    row.siretTransporteur,
    row.numeroVoieTransporteur,
    row.voieTransporteur,
    row.complementTransporteur,
    row.cpTransporteur,
    row.villeTransporteur,
    row.recepisse,

    // AE-AJ : Colonnes vides
    "",
    "",
    "",
    "",
    "",
    "",

    // AK-AS : CHANTIER
    "", // AK vide (sous "CHANTIER" de la ligne 1)
    row.nomChantier, // AM
    row.numeroVoieChantier, // AN
    row.voieChantier, // AO
    row.complementChantier, // AP
    row.villeChantier, // AQ
    row.codeINSEE, // AR
    row.dpt, // AS
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
      "",
      "CHANTIER",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "", // AL-AT : CHANTIER (10 colonnes)
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
      "RECEPISSE",
      "",
      "",
      "",
      "",
      "",
      "", // AF-AK vides
      "", // AL vide (sous "CHANTIER" de la ligne 1)
      " Nom CHANTIER", // AN - Note: espace avant "Nom"
      "N° Voie", // AO
      "Voie", // AP
      "Complément adresse", // AQ
      "VILLE", // AR
      "CODE INSEE", // AS
      "DPT", // AT
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
   * Génère une section de tableau PDF
   */
  private generateTableSection(
    doc: jsPDF,
    section: {
      name: string;
      startCol: number;
      endCol: number;
      groupHeaders: string[];
      columnHeaders: string[];
      colorMap: (colIndex: number) => number[];
    },
    allData: string[][],
    startY: number,
    colors: {
      pesee: number[];
      dechet: number[];
      client: number[];
      transporteur: number[];
      chantier: number[];
      header: number[];
    }
  ): number {
    // Extraire les colonnes de la section
    const sectionData = allData.map((row) =>
      row.slice(section.startCol, section.endCol + 1)
    );

    // Créer les styles de colonnes pour cette section
    const columnStyles: {
      [key: string]: {
        fillColor?: [number, number, number];
        cellWidth?: number;
      };
    } = {};
    const numCols = section.endCol - section.startCol + 1;
    for (let i = 0; i < numCols; i++) {
      const globalColIndex = section.startCol + i;
      const color = section.colorMap(globalColIndex);
      // Pour les colonnes vides (header gris clair), utiliser blanc pour éviter le débordement
      const isVideColumn = globalColIndex >= 15 && globalColIndex <= 21; // P-V
      const isVideColumn2 = globalColIndex >= 30 && globalColIndex <= 35; // AE-AJ
      const isVideColumn3 = globalColIndex === 36; // AK vide

      columnStyles[i.toString()] = {
        fillColor:
          isVideColumn || isVideColumn2 || isVideColumn3
            ? ([255, 255, 255] as [number, number, number]) // Blanc pour les colonnes vides
            : ([color[0], color[1], color[2]] as [number, number, number]),
        cellWidth:
          (globalColIndex >= 15 && globalColIndex <= 21) ||
          (globalColIndex >= 30 && globalColIndex <= 35)
            ? 3
            : undefined,
      };
    }

    // Générer le tableau pour cette section
    autoTable(doc, {
      head: [section.groupHeaders, section.columnHeaders],
      body: sectionData,
      startY: startY,
      styles: {
        fontSize: 8, // Police plus grande pour meilleure lisibilité
        cellPadding: 2,
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
      tableWidth: "wrap", // Limiter la largeur pour éviter le débordement
      showHead: "everyPage", // Répéter les en-têtes sur chaque page
      didParseCell: (data) => {
        // Vérifier que la colonne appartient bien à cette section
        if (data.column.index >= numCols) {
          // Colonne hors limites de la section, ne pas appliquer de styles
          return;
        }

        // Appliquer les couleurs de groupes à la première ligne du head
        if (data.section === "head" && data.row.index === 0) {
          // Première ligne : en-têtes de groupes avec couleurs par bloc
          const globalColIndex = section.startCol + data.column.index;
          const color = section.colorMap(globalColIndex);

          // Pour les colonnes vides, utiliser blanc pour éviter le débordement
          const isVideColumn = globalColIndex >= 15 && globalColIndex <= 21; // P-V
          const isVideColumn2 = globalColIndex >= 30 && globalColIndex <= 35; // AE-AJ
          const isVideColumn3 = globalColIndex === 36; // AK vide

          // Vérification de sécurité
          if (isVideColumn || isVideColumn2 || isVideColumn3) {
            // Colonnes vides : blanc pour éviter le débordement
            data.cell.styles.fillColor = [255, 255, 255] as [
              number,
              number,
              number
            ];
          } else if (color && color.length >= 3) {
            data.cell.styles.fillColor = [color[0], color[1], color[2]] as [
              number,
              number,
              number
            ];
          } else {
            // Fallback : utiliser la couleur header par défaut
            data.cell.styles.fillColor = [
              colors.header[0],
              colors.header[1],
              colors.header[2],
            ] as [number, number, number];
          }
          data.cell.styles.textColor = [0, 0, 0];
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.halign = "center";
        } else if (data.section === "head" && data.row.index === 1) {
          // Deuxième ligne : titres de colonnes avec fond gris
          const globalColIndex = section.startCol + data.column.index;
          const isVideColumn = globalColIndex >= 15 && globalColIndex <= 21; // P-V
          const isVideColumn2 = globalColIndex >= 30 && globalColIndex <= 35; // AE-AJ
          const isVideColumn3 = globalColIndex === 36; // AK vide

          // Pour les colonnes vides, utiliser blanc
          if (isVideColumn || isVideColumn2 || isVideColumn3) {
            data.cell.styles.fillColor = [255, 255, 255] as [
              number,
              number,
              number
            ];
          } else {
            data.cell.styles.fillColor = [
              colors.header[0],
              colors.header[1],
              colors.header[2],
            ] as [number, number, number];
          }
          data.cell.styles.textColor = [0, 0, 0];
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.halign = "center";
        } else if (data.section === "body") {
          // Pour les lignes de données, s'assurer que seules les colonnes de la section ont des couleurs
          if (data.column.index < numCols) {
            const globalColIndex = section.startCol + data.column.index;
            const color = section.colorMap(globalColIndex);
            if (color && color.length >= 3) {
              // Appliquer la couleur de fond pour les lignes de données (alternance)
              if (data.row.index % 2 === 0) {
                data.cell.styles.fillColor = [color[0], color[1], color[2]] as [
                  number,
                  number,
                  number
                ];
              } else {
                // Lignes alternées avec couleur plus claire
                const lighterColor = [
                  Math.min(255, color[0] + 10),
                  Math.min(255, color[1] + 10),
                  Math.min(255, color[2] + 10),
                ];
                data.cell.styles.fillColor = lighterColor as [
                  number,
                  number,
                  number
                ];
              }
            }
          }
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

    // Retourner la position Y après le tableau pour la section suivante
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalY = (doc as any).lastAutoTable?.finalY ?? startY + 50;
    return finalY + 10;
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

    // Préparer toutes les données une fois
    const tableData: string[][] = [];

    // Ligne 1 : En-têtes de groupes (44 colonnes)
    const headerGroups = [
      "PESEE",
      "",
      "",
      "DECHET",
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
      "",
      "",
      "",
      "", // AK-AS : CHANTIER (10 colonnes)
    ];

    // En-têtes du tableau (44 colonnes) - Ligne 2
    const headers = [
      "DATE",
      "HEURE",
      "PLAQUE",
      "PRODUIT",
      "CODE DECHET",
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
      "RECEP.",
      "",
      "",
      "",
      "",
      "",
      "", // AF-AK
      "", // AL vide (sous "CHANTIER" de la ligne 1)
      "CHANTIER", // AN (en-tête de colonne pour "Nom CHANTIER")
      "N°", // AO
      "VOIE", // AP
      "COMPL.", // AQ
      "VILLE", // AR
      "INSEE", // AS
      "DPT", // AT
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

    // Fonction pour mapper les couleurs selon l'index global de colonne
    const getColorForColumn = (colIndex: number): number[] => {
      if (colIndex >= 0 && colIndex <= 2) {
        // A-C : PESEE
        return colors.pesee;
      } else if (colIndex >= 3 && colIndex <= 7) {
        // D-H : DECHET
        return colors.dechet;
      } else if (colIndex >= 8 && colIndex <= 14) {
        // I-O : CLIENT
        return colors.client;
      } else if (colIndex >= 15 && colIndex <= 21) {
        // P-V : Vides (gris clair)
        return colors.header;
      } else if (colIndex >= 22 && colIndex <= 29) {
        // W-AD : TRANSPORTEUR (incluant RECEPISSE)
        return colors.transporteur;
      } else if (colIndex >= 30 && colIndex <= 35) {
        // AE-AJ : Vides (gris clair)
        return colors.header;
      } else if (colIndex >= 36 && colIndex <= 45) {
        // AK-AS : CHANTIER (10 colonnes, AK vide)
        return colors.chantier;
      }
      return colors.header;
    };

    // Définir les 4 sections
    const sections = [
      {
        name: "PESEE / DECHET",
        startCol: 0, // A
        endCol: 7, // H
        groupHeaders: ["PESEE", "", "", "DECHET", "", "", "", ""],
        columnHeaders: [
          "DATE",
          "HEURE",
          "PLAQUE",
          "PRODUIT",
          "CODE DECHET",
          "POIDS NET",
          "CODE TRAIT.",
          "POP",
        ],
        colorMap: getColorForColumn,
      },
      {
        name: "CLIENT",
        startCol: 8, // I
        endCol: 21, // V
        groupHeaders: [
          "CLIENT",
          "",
          "",
          "",
          "",
          "",
          "",
          "", // I-O (7 colonnes)
          "",
          "",
          "",
          "",
          "",
          "", // P-V (7 colonnes vides)
        ],
        columnHeaders: [
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
          "", // P-V
        ],
        colorMap: getColorForColumn,
      },
      {
        name: "TRANSPORTEUR",
        startCol: 22, // W
        endCol: 35, // AJ
        groupHeaders: [
          "TRANSPORTEUR",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "", // W-AD (8 colonnes)
          "",
          "",
          "",
          "",
          "", // AE-AJ (6 colonnes vides)
        ],
        columnHeaders: [
          "TRANSP.",
          "SIRET",
          "N°",
          "VOIE",
          "COMPL.",
          "CP",
          "VILLE",
          "RECEP.",
          "",
          "",
          "",
          "",
          "",
          "", // AE-AJ
        ],
        colorMap: getColorForColumn,
      },
      {
        name: "CHANTIER",
        startCol: 36, // AK
        endCol: 45, // AS
        groupHeaders: [
          "",
          "CHANTIER",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "", // AK-AS (10 colonnes, AK vide)
        ],
        columnHeaders: [
          "", // AK vide
          "CHANTIER", // AM
          "N°", // AN
          "VOIE", // AO
          "COMPL.", // AP
          "VILLE", // AQ
          "INSEE", // AR
          "DPT", // AS
        ],
        colorMap: getColorForColumn,
      },
    ];

    // Générer chaque section sur une page séparée
    let currentY = 10;

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];

      // Ajouter une nouvelle page pour chaque section (sauf la première)
      if (i > 0) {
        doc.addPage();
        currentY = 10;
      }

      // Ajouter un titre de section
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(section.name, 10, currentY);
      currentY += 8;

      // Générer la section
      currentY = this.generateTableSection(
        doc,
        section,
        tableData,
        currentY,
        colors
      );
    }

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
