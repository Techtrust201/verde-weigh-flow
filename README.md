# Verde Weigh Flow

Application de gestion de pesées pour Verde Déchets Verts.

## Fonctionnalités principales

- Gestion des pesées de déchets verts
- Gestion des clients et transporteurs
- Gestion des produits et tarifs
- Export et import des données vers Sage 50
- Mode hors ligne avec synchronisation automatique
- Intégration avec Track Déchet

## Technologies utilisées

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Dexie.js (IndexedDB)
- PWA (Progressive Web App)

## Installation et démarrage

```sh
# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev

# Construire pour la production
npm run build
```

## Documentation

Toute la documentation du projet est disponible dans le dossier [docs](./docs/INDEX.md).

Pour consulter l'historique des modifications, voir le [CHANGELOG](./CHANGELOG.md).

## Intégration avec Sage 50

Cette application permet d'exporter les données de pesées dans un format compatible avec Sage 50, et d'importer des données clients depuis Sage 50.

Pour plus d'informations, consultez les guides suivants:

- [Guide d'export/import Sage](./docs/GUIDE_EXPORT_IMPORT_SAGE.md)
- [Guide d'import des clients Sage](./docs/GUIDE_IMPORT_CLIENTS_SAGE.md)
- [Guide de mapping Sage](./docs/GUIDE_MAPPING_SAGE.md)
- [Guide de démarrage rapide](./docs/DEMARRAGE_RAPIDE.md)
