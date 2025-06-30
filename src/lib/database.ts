
import Dexie, { Table } from 'dexie';

export interface Client {
  id?: number;
  raisonSociale: string;
  dateCreation?: string;
  siret: string;
  codeNAF?: string;
  activite?: string;
  adresse?: string;
  codePostal?: string;
  ville?: string;
  representantLegal?: string;
  telephones: string[];
  email?: string;
  plaques: string[];
  chantiers: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id?: number;
  nom: string;
  prixHT: number;
  tauxTVA: number;
  prixTTC: number;
  codeProduct: string;
  isFavorite?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Pesee {
  id?: number;
  numeroBon: string;
  moyenPaiement: 'Direct' | 'En compte';
  plaque: string;
  nomEntreprise: string;
  chantier: string;
  produitId: number;
  dateHeure: Date;
  poidsEntree: number;
  poidsSortie: number;
  net: number;
  prixHT: number;
  prixTTC: number;
  clientId?: number;
  synchronized?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSettings {
  id?: number;
  nomEntreprise: string;
  adresse: string;
  email: string;
  telephone: string;
  siret: string;
  codeAPE: string;
  logo?: string;
  cleAPISage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class BarberisDB extends Dexie {
  clients!: Table<Client>;
  products!: Table<Product>;
  pesees!: Table<Pesee>;
  userSettings!: Table<UserSettings>;

  constructor() {
    super('BarberisDB');
    this.version(1).stores({
      clients: '++id, raisonSociale, siret, *plaques, *chantiers, createdAt',
      products: '++id, nom, codeProduct, isFavorite, createdAt',
      pesees: '++id, numeroBon, plaque, nomEntreprise, produitId, clientId, dateHeure, synchronized, createdAt',
      userSettings: '++id, nomEntreprise, createdAt'
    });
  }
}

export const db = new BarberisDB();

// Initialize with sample data
export async function initializeSampleData() {
  const clientsCount = await db.clients.count();
  const productsCount = await db.products.count();
  const userSettingsCount = await db.userSettings.count();

  if (clientsCount === 0) {
    await db.clients.bulkAdd([
      {
        raisonSociale: 'Entreprise Martin TP',
        siret: '12345678901234',
        codeNAF: '4312A',
        activite: 'Travaux de terrassement',
        adresse: '123 Rue des Chantiers',
        codePostal: '69000',
        ville: 'Lyon',
        representantLegal: 'Pierre Martin',
        telephones: ['04 78 12 34 56', '06 78 90 12 34'],
        email: 'contact@martin-tp.fr',
        plaques: ['AB-123-CD', 'EF-456-GH'],
        chantiers: ['Chantier A', 'Chantier B'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        raisonSociale: 'Particulier',
        siret: '00000000000000',
        telephones: [],
        plaques: [],
        chantiers: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  }

  if (productsCount === 0) {
    await db.products.bulkAdd([
      {
        nom: 'Déchets verts',
        prixHT: 25.00,
        tauxTVA: 20,
        prixTTC: 30.00,
        codeProduct: 'DV001',
        isFavorite: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nom: 'Terre végétale',
        prixHT: 15.00,
        tauxTVA: 20,
        prixTTC: 18.00,
        codeProduct: 'TV001',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  }

  if (userSettingsCount === 0) {
    await db.userSettings.add({
      nomEntreprise: 'Tech-Trust Agency',
      adresse: '123 Rue du Développement, 75000 Paris',
      email: 'contact@tech-trust.fr',
      telephone: '01 23 45 67 89',
      siret: '98765432109876',
      codeAPE: '6201Z',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
}
