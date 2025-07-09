
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
  plaque?: string;
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
  poidsEntree: number;
  poidsSortie: number;
  net: number;
  prixHT: number;
  prixTTC: number;
  moyenPaiement: string;
  clientId?: number;
  transporteurId?: number;
  typeClient: 'particulier' | 'professionnel' | 'micro-entreprise';
  synchronized: boolean;
  createdAt: Date;
  updatedAt: Date;
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

class AppDatabase extends Dexie {
  clients!: Table<Client>;
  transporteurs!: Table<Transporteur>;
  products!: Table<Product>;
  pesees!: Table<Pesee>;
  users!: Table<User>;
  config!: Table<Config>;
  syncLogs!: Table<SyncLog>;

  constructor() {
    super('AppDatabase');
    this.version(1).stores({
      clients: '++id, typeClient, raisonSociale, siret, email, ville, plaque, createdAt, updatedAt',
      transporteurs: '++id, prenom, nom, siret, ville, createdAt, updatedAt',
      products: '++id, nom, prixHT, prixTTC, unite, createdAt, updatedAt',
      pesees: '++id, numeroBon, dateHeure, plaque, nomEntreprise, produitId, clientId, transporteurId, synchronized, createdAt, updatedAt',
      users: '++id, nom, prenom, email, role, createdAt, updatedAt',
      config: '++id, key, createdAt, updatedAt',
      syncLogs: '++id, type, status, synchronized, createdAt'
    });
  }
}

export const db = new AppDatabase();
