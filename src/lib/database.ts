
import Dexie, { Table } from 'dexie';

export interface Client {
  id?: number;
  typeClient: 'particulier' | 'professionnel' | 'micro-entreprise';
  raisonSociale: string;
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
  chantiers: string[];
  transporteurId?: number;
  tarifsPreferentiels?: {
    [productId: number]: {
      prixHT?: number;
      prixTTC?: number;
    };
  };
  // Champs spécifiques aux particuliers
  prenom?: string;
  nom?: string;
  dateNaissance?: string;
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
  plaque?: string;
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
  transporteurId?: number;
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
  transporteurs!: Table<Transporteur>;
  products!: Table<Product>;
  pesees!: Table<Pesee>;
  userSettings!: Table<UserSettings>;

  constructor() {
    super('BarberisDB');
    this.version(4).stores({
      clients: '++id, typeClient, raisonSociale, siret, plaque, *chantiers, transporteurId, createdAt',
      transporteurs: '++id, prenom, nom, siret, plaque, createdAt',
      products: '++id, nom, codeProduct, isFavorite, createdAt',
      pesees: '++id, numeroBon, plaque, nomEntreprise, produitId, clientId, transporteurId, dateHeure, synchronized, createdAt',
      userSettings: '++id, nomEntreprise, createdAt'
    }).upgrade(tx => {
      return tx.table('clients').toCollection().modify(client => {
        if (!client.typeClient) {
          client.typeClient = client.siret && client.siret !== '00000000000000' ? 'professionnel' : 'particulier';
        }
        if (!client.tarifsPreferentiels) {
          client.tarifsPreferentiels = {};
        }
        // Migration des anciens champs arrays vers champs simples
        if (client.telephones && Array.isArray(client.telephones)) {
          client.telephone = client.telephones[0] || '';
          delete client.telephones;
        }
        if (client.plaques && Array.isArray(client.plaques)) {
          client.plaque = client.plaques[0] || '';
          delete client.plaques;
        }
      });
    }).upgrade(tx => {
      return tx.table('transporteurs').toCollection().modify(transporteur => {
        // Migration des anciens champs arrays vers champs simples
        if (transporteur.telephones && Array.isArray(transporteur.telephones)) {
          transporteur.telephone = transporteur.telephones[0] || '';
          delete transporteur.telephones;
        }
        if (transporteur.plaques && Array.isArray(transporteur.plaques)) {
          transporteur.plaque = transporteur.plaques[0] || '';
          delete transporteur.plaques;
        }
      });
    });
  }
}

export const db = new BarberisDB();

// Initialize with sample data
export async function initializeSampleData() {
  const clientsCount = await db.clients.count();
  const productsCount = await db.products.count();
  const userSettingsCount = await db.userSettings.count();
  const transporteursCount = await db.transporteurs.count();

  if (transporteursCount === 0) {
    await db.transporteurs.bulkAdd([
      {
        prenom: 'Pierre',
        nom: 'Martin',
        siret: '12345678901234',
        adresse: '123 Rue des Transporteurs',
        codePostal: '69000',
        ville: 'Lyon',
        email: 'pierre.martin@transport.fr',
        telephone: '04 78 12 34 56',
        plaque: 'TR-123-AB',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  }

  if (clientsCount === 0) {
    await db.clients.bulkAdd([
      {
        typeClient: 'professionnel',
        raisonSociale: 'Entreprise Martin TP',
        siret: '12345678901234',
        codeNAF: '4312A',
        activite: 'Travaux de terrassement',
        adresse: '123 Rue des Chantiers',
        codePostal: '69000',
        ville: 'Lyon',
        representantLegal: 'Pierre Martin',
        telephone: '04 78 12 34 56',
        email: 'contact@martin-tp.fr',
        plaque: 'AB-123-CD',
        chantiers: ['Chantier A', 'Chantier B'],
        tarifsPreferentiels: {},
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        typeClient: 'particulier',
        raisonSociale: 'Particulier',
        prenom: 'Jean',
        nom: 'Dupont',
        siret: '00000000000000',
        telephone: '06 12 34 56 78',
        plaque: 'CD-789-EF',
        chantiers: [],
        tarifsPreferentiels: {},
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        typeClient: 'micro-entreprise',
        raisonSociale: 'Martin Jardinage',
        siret: '12345678901235',
        activite: 'Services de jardinage',
        adresse: '45 Avenue des Fleurs',
        codePostal: '69001',
        ville: 'Lyon',
        representantLegal: 'Marie Martin',
        telephone: '04 78 98 76 54',
        email: 'marie@martin-jardinage.fr',
        plaque: 'GH-012-IJ',
        chantiers: ['Particuliers'],
        tarifsPreferentiels: {},
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
