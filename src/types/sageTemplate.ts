/**
 * Interfaces pour le système de templates Sage 50
 * Permet d'importer un fichier Sage, apprendre sa structure, et exporter dans le même format
 */

export interface SageTemplate {
  id?: number;
  name: string; // Nom personnalisé par l'utilisateur
  description?: string;
  sageColumns: SageColumn[]; // Colonnes détectées du fichier Sage
  mappings: ColumnMapping[]; // Mappings configurés
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SageColumn {
  name: string; // "Type de pièce", "N° pièce", etc.
  type: "text" | "number" | "date" | "boolean";
  required: boolean;
  example?: string; // Valeur d'exemple du fichier importé
  position: number; // Position dans le fichier original
}

export interface ColumnMapping {
  sageColumn: string; // Nom de la colonne Sage
  dataSource:
    | "vide"
    | "pesee"
    | "client"
    | "product"
    | "transporteur"
    | "userSettings"
    | "static";
  dataField: string; // Champ spécifique (ex: "numeroBon", "raisonSociale")
  transformation?: string; // Fonction de transformation (ex: "formatDate", "concat")
  defaultValue?: any; // Valeur par défaut si pas de données
  isConfigured: boolean; // Si le mapping est configuré
}

export type DataSourceId =
  | "vide"
  | "pesee"
  | "client"
  | "product"
  | "transporteur"
  | "userSettings"
  | "static";

export interface DataSource {
  id: DataSourceId;
  name: string;
  description: string;
  icon: string;
  fields: DataField[];
  examples?: string;
}

export interface DataField {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "boolean";
  description?: string;
  example?: string;
}

// Sources de données disponibles dans l'app
export const DATA_SOURCES: DataSource[] = [
  {
    id: "vide",
    name: "Colonne vide",
    description: "Laisser cette colonne vide dans l'export",
    examples: "Colonnes non utilisées, champs optionnels",
    icon: "Minus",
    fields: [
      {
        name: "vide",
        label: "Vide",
        type: "text",
        description: "Aucune donnée - colonne vide",
      },
    ],
  },
  {
    id: "pesee",
    name: "Données de pesée",
    description: "Informations des pesées (numéro, date, poids, prix, etc.)",
    examples: "Numéro de bon, Date de pesée, Poids brut, Prix HT",
    icon: "Scale",
    fields: [
      {
        name: "numeroBon",
        label: "Numéro de bon",
        type: "text",
        description: "Numéro unique du bon de pesée",
      },
      {
        name: "dateHeure",
        label: "Date et heure",
        type: "date",
        description: "Date et heure de la pesée",
      },
      {
        name: "plaque",
        label: "Plaque d'immatriculation",
        type: "text",
        description: "Plaque du véhicule",
      },
      {
        name: "nomEntreprise",
        label: "Nom entreprise",
        type: "text",
        description: "Nom de l'entreprise cliente",
      },
      {
        name: "chantier",
        label: "Chantier",
        type: "text",
        description: "Nom du chantier",
      },
      {
        name: "poidsEntree",
        label: "Poids entrée (t)",
        type: "number",
        description: "Poids à l'entrée en tonnes",
      },
      {
        name: "poidsSortie",
        label: "Poids sortie (t)",
        type: "number",
        description: "Poids à la sortie en tonnes",
      },
      {
        name: "net",
        label: "Poids net (t)",
        type: "number",
        description: "Poids net en tonnes",
      },
      {
        name: "prixHT",
        label: "Prix HT",
        type: "number",
        description: "Prix hors taxes",
      },
      {
        name: "prixTTC",
        label: "Prix TTC",
        type: "number",
        description: "Prix toutes taxes comprises",
      },
      {
        name: "moyenPaiement",
        label: "Moyen de paiement",
        type: "text",
        description: "Mode de paiement",
      },
      {
        name: "typeClient",
        label: "Type de client",
        type: "text",
        description: "Particulier, professionnel, etc.",
      },
    ],
  },
  {
    id: "client",
    name: "Informations client",
    description: "Données des clients (nom, adresse, SIRET, etc.)",
    icon: "Users",
    fields: [
      {
        name: "raisonSociale",
        label: "Raison sociale",
        type: "text",
        description: "Nom de l'entreprise",
      },
      {
        name: "prenom",
        label: "Prénom",
        type: "text",
        description: "Prénom du contact",
      },
      {
        name: "nom",
        label: "Nom",
        type: "text",
        description: "Nom du contact",
      },
      {
        name: "siret",
        label: "SIRET",
        type: "text",
        description: "Numéro SIRET",
      },
      {
        name: "codeNAF",
        label: "Code NAF",
        type: "text",
        description: "Code d'activité NAF",
      },
      {
        name: "activite",
        label: "Activité",
        type: "text",
        description: "Secteur d'activité",
      },
      {
        name: "adresse",
        label: "Adresse",
        type: "text",
        description: "Adresse complète",
      },
      {
        name: "codePostal",
        label: "Code postal",
        type: "text",
        description: "Code postal",
      },
      { name: "ville", label: "Ville", type: "text", description: "Ville" },
      {
        name: "representantLegal",
        label: "Représentant légal",
        type: "text",
        description: "Nom du représentant",
      },
      {
        name: "telephone",
        label: "Téléphone",
        type: "text",
        description: "Numéro de téléphone",
      },
      {
        name: "email",
        label: "Email",
        type: "text",
        description: "Adresse email",
      },
      {
        name: "typeClient",
        label: "Type de client",
        type: "text",
        description: "Particulier, professionnel, etc.",
      },
    ],
  },
  {
    id: "product",
    name: "Détails produit",
    description: "Informations des produits (nom, prix, codes, etc.)",
    examples: "Code article, Description, Prix HT, Prix TTC",
    icon: "Package",
    fields: [
      {
        name: "nom",
        label: "Nom du produit",
        type: "text",
        description: "Désignation du produit",
      },
      {
        name: "description",
        label: "Description",
        type: "text",
        description: "Description détaillée",
      },
      {
        name: "codeProduct",
        label: "Code produit",
        type: "text",
        description: "Code interne du produit",
      },
      {
        name: "prixHT",
        label: "Prix HT",
        type: "number",
        description: "Prix hors taxes",
      },
      {
        name: "prixTTC",
        label: "Prix TTC",
        type: "number",
        description: "Prix toutes taxes comprises",
      },
      {
        name: "unite",
        label: "Unité",
        type: "text",
        description: "Unité de mesure (t, m³, etc.)",
      },
      {
        name: "tva",
        label: "TVA",
        type: "number",
        description: "Montant de la TVA",
      },
      {
        name: "tauxTVA",
        label: "Taux TVA (%)",
        type: "number",
        description: "Taux de TVA en pourcentage",
      },
      {
        name: "categorieDechet",
        label: "Catégorie déchet",
        type: "text",
        description: "Type de déchet",
      },
      {
        name: "codeDechets",
        label: "Code déchets",
        type: "text",
        description: "Code déchet européen",
      },
    ],
  },
  {
    id: "transporteur",
    name: "Informations transporteur",
    description: "Données des transporteurs (nom, adresse, SIRET, etc.)",
    icon: "Truck",
    fields: [
      {
        name: "prenom",
        label: "Prénom",
        type: "text",
        description: "Prénom du transporteur",
      },
      {
        name: "nom",
        label: "Nom",
        type: "text",
        description: "Nom du transporteur",
      },
      {
        name: "siret",
        label: "SIRET",
        type: "text",
        description: "Numéro SIRET",
      },
      {
        name: "adresse",
        label: "Adresse",
        type: "text",
        description: "Adresse complète",
      },
      {
        name: "codePostal",
        label: "Code postal",
        type: "text",
        description: "Code postal",
      },
      { name: "ville", label: "Ville", type: "text", description: "Ville" },
      {
        name: "telephone",
        label: "Téléphone",
        type: "text",
        description: "Numéro de téléphone",
      },
      {
        name: "email",
        label: "Email",
        type: "text",
        description: "Adresse email",
      },
    ],
  },
  {
    id: "userSettings",
    name: "Paramètres entreprise",
    description: "Informations de votre entreprise (nom, SIRET, adresse, etc.)",
    icon: "Building",
    fields: [
      {
        name: "nomEntreprise",
        label: "Nom entreprise",
        type: "text",
        description: "Nom de votre entreprise",
      },
      {
        name: "adresse",
        label: "Adresse",
        type: "text",
        description: "Adresse de votre entreprise",
      },
      {
        name: "codePostal",
        label: "Code postal",
        type: "text",
        description: "Code postal",
      },
      { name: "ville", label: "Ville", type: "text", description: "Ville" },
      {
        name: "email",
        label: "Email",
        type: "text",
        description: "Email de contact",
      },
      {
        name: "telephone",
        label: "Téléphone",
        type: "text",
        description: "Téléphone de contact",
      },
      {
        name: "siret",
        label: "SIRET",
        type: "text",
        description: "Numéro SIRET",
      },
      {
        name: "codeAPE",
        label: "Code APE",
        type: "text",
        description: "Code d'activité",
      },
      {
        name: "codeNAF",
        label: "Code NAF",
        type: "text",
        description: "Code NAF",
      },
      {
        name: "representantLegal",
        label: "Représentant légal",
        type: "text",
        description: "Nom du représentant",
      },
    ],
  },
  {
    id: "static",
    name: "Valeurs fixes",
    description: "Valeurs constantes ou calculées",
    icon: "Settings",
    fields: [
      {
        name: "currentDate",
        label: "Date actuelle",
        type: "date",
        description: "Date du jour",
      },
      {
        name: "currentTime",
        label: "Heure actuelle",
        type: "text",
        description: "Heure actuelle",
      },
      {
        name: "companyName",
        label: "Nom société",
        type: "text",
        description: "Nom de votre société",
      },
      {
        name: "invoiceNumber",
        label: "Numéro facture",
        type: "text",
        description: "Numéro de facture auto-généré",
      },
      {
        name: "deliveryNote",
        label: "Bon de livraison",
        type: "text",
        description: "Numéro de bon de livraison",
      },
    ],
  },
];

// Fonctions de transformation disponibles
export const TRANSFORMATION_FUNCTIONS = [
  {
    id: "none",
    name: "Aucune",
    description: "Utiliser la valeur telle quelle",
  },
  {
    id: "formatDate",
    name: "Formater date",
    description: "Convertir en format DD/MM/YYYY",
  },
  {
    id: "formatDateTime",
    name: "Formater date+heure",
    description: "Convertir en format DD/MM/YYYY HH:MM",
  },
  {
    id: "uppercase",
    name: "Majuscules",
    description: "Convertir en majuscules",
  },
  {
    id: "lowercase",
    name: "Minuscules",
    description: "Convertir en minuscules",
  },
  {
    id: "trim",
    name: "Supprimer espaces",
    description: "Supprimer les espaces en début/fin",
  },
  {
    id: "concat",
    name: "Concaténer",
    description: "Joindre plusieurs valeurs",
  },
  { id: "round", name: "Arrondir", description: "Arrondir un nombre" },
  {
    id: "formatCurrency",
    name: "Formater devise",
    description: "Formater en devise (€)",
  },
];

// Mapping intelligent basé sur les noms de colonnes
export const INTELLIGENT_MAPPINGS: Record<
  string,
  { dataSource: string; dataField: string }
> = {
  // Colonnes communes
  "Type de pièce": { dataSource: "static", dataField: "deliveryNote" },
  "N° pièce": { dataSource: "pesee", dataField: "numeroBon" },
  "Date pièce": { dataSource: "pesee", dataField: "dateHeure" },
  "Code client": { dataSource: "client", dataField: "siret" },
  "Nom client": { dataSource: "client", dataField: "raisonSociale" },
  "Adresse 1": { dataSource: "client", dataField: "adresse" },
  "Code postal": { dataSource: "client", dataField: "codePostal" },
  Ville: { dataSource: "client", dataField: "ville" },
  "Code article": { dataSource: "product", dataField: "codeProduct" },
  Description: { dataSource: "product", dataField: "nom" },
  Quantité: { dataSource: "pesee", dataField: "net" },
  "PU HT": { dataSource: "pesee", dataField: "prixHT" },
  "PU TTC": { dataSource: "pesee", dataField: "prixTTC" },
  "Taux TVA": { dataSource: "product", dataField: "tauxTVA" },
  "Mt total TTC": { dataSource: "pesee", dataField: "prixTTC" },
  "Code mode de paiement": { dataSource: "pesee", dataField: "moyenPaiement" },
  "Nom contact": { dataSource: "client", dataField: "representantLegal" },
  Téléphone: { dataSource: "client", dataField: "telephone" },
  Email: { dataSource: "client", dataField: "email" },
  SIRET: { dataSource: "client", dataField: "siret" },
  "Code NAF": { dataSource: "client", dataField: "codeNAF" },
  Activité: { dataSource: "client", dataField: "activite" },
  "Forme juridique": { dataSource: "client", dataField: "typeClient" },
  Pays: { dataSource: "static", dataField: "companyName" },
  "Code pays": { dataSource: "static", dataField: "companyName" },
};
