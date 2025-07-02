# Documentation Technique Complète - Barberis Déchets Verts

## 🏗️ Architecture Générale

### Stack Technique
```
┌─── Frontend ───────────────────┐
│ React 18 + TypeScript          │
│ Vite (Build Tool)              │
│ Tailwind CSS + Shadcn/UI       │
└─────────────────────────────────┘
         │
┌─── Progressive Web App ────────┐
│ Service Worker                 │
│ Web App Manifest               │
│ Cache Strategy                 │
└─────────────────────────────────┘
         │
┌─── Base de Données ────────────┐
│ IndexedDB                      │
│ Dexie.js (ORM)                 │
│ Stockage Local                 │
└─────────────────────────────────┘
         │
┌─── Intégrations ───────────────┐
│ API Sage (Optionnel)           │
│ Export Excel/CSV               │
│ Impression PDF                 │
└─────────────────────────────────┘
```

### Modèle de Données

#### Interface Client
```typescript
interface Client {
  id?: number;
  typeClient: 'particulier' | 'professionnel' | 'micro-entreprise';
  raisonSociale: string;
  dateCreation?: string;
  siret?: string;
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
  prenom?: string; // Particuliers
  nom?: string; // Particuliers
  dateNaissance?: string; // Particuliers
  createdAt: Date;
  updatedAt: Date;
}
```

#### Interface Produit
```typescript
interface Product {
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
```

#### Interface Pesée
```typescript
interface Pesee {
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
```

#### Interface Paramètres
```typescript
interface UserSettings {
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
```

## 🗄️ Base de Données (IndexedDB)

### Configuration Dexie.js
```typescript
export class BarberisDB extends Dexie {
  clients!: Table<Client>;
  products!: Table<Product>;
  pesees!: Table<Pesee>;
  userSettings!: Table<UserSettings>;

  constructor() {
    super('BarberisDB');
    this.version(2).stores({
      clients: '++id, typeClient, raisonSociale, siret, *plaques, *chantiers, createdAt',
      products: '++id, nom, codeProduct, isFavorite, createdAt',
      pesees: '++id, numeroBon, plaque, nomEntreprise, produitId, clientId, dateHeure, synchronized, createdAt',
      userSettings: '++id, nomEntreprise, createdAt'
    });
  }
}
```

### Avantages IndexedDB
- **Stockage local**: Données disponibles offline
- **Performance**: Accès rapide sans latence réseau
- **Capacité**: Plusieurs GB de stockage possible
- **Sécurité**: Isolation par domaine
- **Persistance**: Données conservées entre les sessions

### Stratégie de Synchronisation
1. **Mode Principal**: Offline-first
2. **Synchronisation**: Optionnelle vers Sage
3. **Conflits**: Priorité aux données locales
4. **Backup**: Export JSON régulier

## 🎨 Interface Utilisateur

### Design System (Tailwind + Shadcn)
- **Couleurs**: Système de tokens CSS personnalisé
- **Composants**: Bibliothèque Shadcn/UI réutilisable
- **Responsive**: Mobile-first design
- **Accessibilité**: Standards WCAG 2.1

### Structure des Composants
```
src/
├── components/
│   ├── ui/               # Composants de base (Button, Input, etc.)
│   ├── forms/            # Formulaires métier
│   ├── spaces/           # Pages principales
│   └── pesee/            # Composants spécifiques pesée
├── hooks/                # Hooks React personnalisés
├── lib/                  # Utilitaires et configuration
└── utils/                # Fonctions utilitaires
```

## 🔧 Fonctionnalités Détaillées

### 1. Autocomplétion Intelligente
- **Plaques**: Mémorisation automatique par client
- **Chantiers**: Suggestions basées sur l'historique
- **Clients**: Recherche fuzzy temps réel
- **Produits**: Favoris en priorité

### 2. Calculs Automatiques
```typescript
// Calcul du poids net
const net = poidsSortie - poidsEntree;

// Calcul du prix TTC
const prixTTC = prixHT * (1 + tauxTVA / 100);

// Calcul du montant total
const montantTotal = net * prixUnitaire;
```

### 3. Génération des Numéros
```typescript
// Format: YYYYMMDD-XXX
const numeroBon = `${dateStr}-${sequenceStr.padStart(3, '0')}`;
```

### 4. Validation des Données
- **SIRET**: Validation algorithmique
- **Email**: Pattern RFC 5322
- **Téléphone**: Format français
- **Poids**: Valeurs positives uniquement

## 📱 Progressive Web App

### Service Worker
```javascript
const CACHE_NAME = 'barberis-v2';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/assets/',
  '/src/'
];
```

### Manifest Configuration
```json
{
  "name": "Barberis Déchets Verts - Gestion Pesée",
  "short_name": "Barberis Pesée",
  "display": "standalone",
  "orientation": "landscape-primary",
  "theme_color": "#22c55e",
  "background_color": "#ffffff"
}
```

### Fonctionnalités PWA
- **Installation**: Prompt d'installation automatique
- **Offline**: Fonctionnement complet sans réseau
- **Cache**: Stratégie cache-first pour les assets
- **Mise à jour**: Auto-update en arrière-plan

## 🔐 Sécurité

### Mesures Implémentées
- **Stockage Local**: Données isolées par origine
- **Chiffrement**: IndexedDB chiffré par le navigateur
- **Validation**: Sanitisation des entrées utilisateur
- **CSP**: Content Security Policy configurée
- **HTTPS**: Obligatoire pour PWA

### Protection des Données
- **RGPD**: Conformité par design
- **Rétention**: Politique de suppression configurable
- **Export**: Portabilité des données utilisateur
- **Anonymisation**: Suppression des données personnelles

## 🔄 Intégration Sage

### API REST
```typescript
interface SageSync {
  endpoint: string;
  apiKey: string;
  entityMapping: {
    clients: string;
    products: string;
    invoices: string;
  };
}
```

### Processus de Synchronisation
1. **Authentification**: Clé API Sage
2. **Mapping**: Correspondance des champs
3. **Validation**: Contrôle des données
4. **Envoi**: Batch processing
5. **Confirmation**: Statut de synchronisation

## 📊 Performance

### Métriques Cibles
- **FCP**: < 1.5s (First Contentful Paint)
- **LCP**: < 2.5s (Largest Contentful Paint)
- **FID**: < 100ms (First Input Delay)
- **CLS**: < 0.1 (Cumulative Layout Shift)

### Optimisations
- **Code Splitting**: Chargement à la demande
- **Lazy Loading**: Images et composants
- **Tree Shaking**: Élimination du code mort
- **Compression**: Gzip/Brotli activé

## 🧪 Tests et Qualité

### Stratégie de Tests
- **Unit Tests**: Jest + React Testing Library
- **Integration Tests**: Cypress
- **Performance**: Lighthouse CI
- **Accessibility**: axe-core

### Outils de Qualité
- **TypeScript**: Typage statique
- **ESLint**: Analyse statique du code
- **Prettier**: Formatage automatique
- **Husky**: Pre-commit hooks

## 🚀 Déploiement

### Environnements
- **Développement**: Local avec Vite HMR
- **Staging**: Netlify Preview
- **Production**: Netlify avec CDN

### Pipeline CI/CD
1. **Build**: Vite build optimized
2. **Tests**: Jest + Cypress
3. **Quality**: ESLint + Lighthouse
4. **Deploy**: Netlify automatic

### Configuration Netlify
```toml
# netlify.toml
[build]
  publish = "dist"
  command = "npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## 📈 Monitoring et Analytics

### Métriques Business
- **Volume**: Nombre de pesées/jour
- **Revenus**: CA par période
- **Clients**: Nouveaux/récurrents
- **Produits**: Les plus vendus

### Métriques Techniques
- **Performance**: Core Web Vitals
- **Erreurs**: Crash reports
- **Utilisation**: Pages populaires
- **Offline**: Taux d'utilisation offline

## 🔧 Maintenance

### Mises à Jour
- **Automatiques**: Service Worker
- **Features**: Déploiement continu
- **Sécurité**: Patches automatiques
- **Base de données**: Migrations automatiques

### Support
- **Documentation**: Guides utilisateur
- **Formation**: Sessions client
- **Hotline**: Support technique
- **Évolutions**: Roadmap produit

---

*Documentation créée le {{ date }} - Version 1.0*
*Tech-Trust Agency - contact@tech-trust.fr*