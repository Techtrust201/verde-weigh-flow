
import Dexie, { Table } from 'dexie';

export interface Client {
  id?: number;
  typeClient: 'particulier' | 'professionnel' | 'micro-entreprise';
  raisonSociale: string;
  prenom?: string;
  nom?: string;
  siret?: string;
  codeNAF?: string;
  activite?: string;
  adresse?: string;
  codePostal?: string;
  ville?: string;
  representantLegal?: string;
  telephone?: string;
  email?: string;
  plaques?: string[]; // Support des plaques multiples
  chantiers: string[];
  transporteurId?: number;
  tarifsPreferentiels?: {
    [productId: number]: {
      prixHT?: number;
      prixTTC?: number;
    }
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Transporteur {
  id?: number;
  prenom: string;
  nom: string;
  siret?: string;
  adresse?: string;
  codePostal?: string;
  ville?: string;
  email?: string;
  telephone?: string;
  plaque?: string; // Une seule plaque pour les transporteurs
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id?: number;
  nom: string;
  description?: string;
  prixHT: number;
  prixTTC: number;
  unite: string;
  tva: number;
  tauxTVA: number;
  codeProduct: string;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Pesee {
  id?: number;
  numeroBon: string;
  dateHeure: Date;
  plaque: string;
  nomEntreprise: string;
  chantier?: string;
  produitId: number;
  poidsEntree: number; // en tonnes
  poidsSortie: number; // en tonnes
  net: number; // en tonnes
  prixHT: number;
  prixTTC: number;
  moyenPaiement: string;
  clientId?: number;
  transporteurId?: number;
  transporteurLibre?: string; // Nouveau champ pour le transporteur saisi manuellement
  typeClient: 'particulier' | 'professionnel' | 'micro-entreprise';
  synchronized: boolean;
  version: number; // Version pour détecter les conflits
  lastSyncHash?: string; // Hash de la dernière version synchronisée
  exportedAt?: Date[]; // Dates des exports (support des exports multiples)
  createdAt: Date;
  updatedAt: Date;
}

export interface ExportLog {
  id?: number;
  fileName: string;
  startDate: Date;
  endDate: Date;
  totalRecords: number;
  fileHash: string;
  fileContent: string; // Stockage du contenu CSV pour re-téléchargement
  exportType: 'new' | 'selective' | 'complete';
  peseeIds: number[]; // IDs des pesées incluses dans cet export
  createdAt: Date;
}

export interface User {
  id?: number;
  nom: string;
  prenom: string;
  email: string;
  role: 'admin' | 'user';
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
  logo: string;
  cleAPISage: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Config {
  id?: number;
  key: string;
  value: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncLog {
  id?: number;
  type: 'manual' | 'automatic';
  status: 'success' | 'error' | 'pending';
  message: string;
  data?: any;
  synchronized: number;
  createdAt: Date;
}

export interface ConflictLog {
  id?: number;
  peseeId: number;
  localVersion: number;
  serverVersion: number;
  localData: any;
  serverData: any;
  resolution: 'local-wins' | 'server-wins' | 'manual';
  createdAt: Date;
}

class AppDatabase extends Dexie {
  clients!: Table<Client>;
  transporteurs!: Table<Transporteur>;
  products!: Table<Product>;
  pesees!: Table<Pesee>;
  users!: Table<User>;
  userSettings!: Table<UserSettings>;
  config!: Table<Config>;
  syncLogs!: Table<SyncLog>;
  conflictLogs!: Table<ConflictLog>;
  exportLogs!: Table<ExportLog>;

  constructor() {
    super('AppDatabase');
    this.version(3).stores({
      clients: '++id, typeClient, raisonSociale, siret, email, ville, createdAt, updatedAt',
      transporteurs: '++id, prenom, nom, siret, ville, createdAt, updatedAt',
      products: '++id, nom, prixHT, prixTTC, unite, codeProduct, isFavorite, createdAt, updatedAt',
      pesees: '++id, numeroBon, dateHeure, plaque, nomEntreprise, produitId, clientId, transporteurId, transporteurLibre, synchronized, version, exportedAt, createdAt, updatedAt',
      users: '++id, nom, prenom, email, role, createdAt, updatedAt',
      userSettings: '++id, nomEntreprise, email, siret, createdAt, updatedAt',
      config: '++id, key, createdAt, updatedAt',
      syncLogs: '++id, type, status, synchronized, createdAt',
      conflictLogs: '++id, peseeId, localVersion, serverVersion, resolution, createdAt',
      exportLogs: '++id, fileName, startDate, endDate, exportType, createdAt'
    });
  }
}

export const db = new AppDatabase();

// Fonction d'initialisation des données d'exemple
export const initializeSampleData = async () => {
  try {
    // Vérifier si des données existent déjà
    const existingProducts = await db.products.count();
    if (existingProducts > 0) {
      console.log('Des données existent déjà, initialisation ignorée');
      return;
    }

    // Créer des produits d'exemple
    const sampleProducts: Product[] = [
      {
        nom: 'Sable',
        description: 'Sable de construction',
        prixHT: 25.0,
        prixTTC: 30.0,
        unite: 'tonne',
        tva: 20,
        tauxTVA: 20,
        codeProduct: 'SAB001',
        isFavorite: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nom: 'Gravier',
        description: 'Gravier pour béton',
        prixHT: 30.0,
        prixTTC: 36.0,
        unite: 'tonne',
        tva: 20,
        tauxTVA: 20,
        codeProduct: 'GRA001',
        isFavorite: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await db.products.bulkAdd(sampleProducts);
    console.log('Données d\'exemple initialisées avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des données:', error);
  }
};
