# Guide de Persistance des Données - Verde Weigh Flow

## Architecture de Persistance

L'application Verde Weigh Flow utilise une architecture de persistance robuste à plusieurs niveaux pour garantir que vos données sont toujours sauvegardées et disponibles, même en cas de problème.

### 1. Origin Private File System (OPFS)

**Rôle principal**: Stockage local persistant principal
**Description**: OPFS est une API moderne qui fournit un système de fichiers privé et persistant pour chaque origine (site web). C'est la méthode de stockage la plus fiable disponible dans les navigateurs modernes.

**Avantages**:

- Persistance garantie même après refresh du navigateur
- Survit au vidage du cache (sauf "Clear site data" explicite)
- Capacité de stockage importante (plusieurs Go)
- Accès rapide et performant
- Pas besoin de permissions utilisateur après la première utilisation

### 2. IndexedDB

**Rôle principal**: Cache intelligent et backup secondaire
**Description**: Base de données NoSQL intégrée au navigateur, utilisée comme cache rapide pour les opérations quotidiennes et comme backup secondaire.

**Avantages**:

- Performances optimales pour les opérations fréquentes
- Stockage structuré pour les requêtes complexes
- Historique des sauvegardes (10 versions)
- Persistance des handles de fichiers

### 3. File System Access API (Fallback)

**Rôle principal**: Méthode alternative pour les navigateurs sans OPFS
**Description**: Permet l'accès aux fichiers du système de l'utilisateur, mais nécessite des interactions utilisateur et des permissions.

**Avantages**:

- Compatible avec plus de navigateurs
- Permet à l'utilisateur de choisir l'emplacement du fichier
- Intégration avec le système de fichiers de l'utilisateur

### 4. LocalStorage (Emergency Backup)

**Rôle principal**: Sauvegarde d'urgence pour les données critiques
**Description**: Stockage simple clé-valeur limité à 5MB, utilisé pour sauvegarder les données essentielles en cas d'urgence.

**Avantages**:

- Très simple et fiable
- Persistant dans la plupart des scénarios
- Sauvegarde des données critiques (pas les pesées complètes)

## Gestionnaire de Sauvegarde Centralisé

Le `BackupManager` coordonne toutes les méthodes de sauvegarde et choisit automatiquement la meilleure méthode disponible selon cet ordre de priorité:

1. OPFS (si disponible)
2. File System Access API (si disponible)
3. IndexedDB (toujours disponible)
4. Téléchargement (dernier recours)

## Stratégies de Sauvegarde

### Sauvegarde Périodique

- Intervalle par défaut: 5 minutes
- Configurable dans les paramètres

### Sauvegarde sur Modification

- Déclenchée automatiquement lors de la création/modification/suppression de données
- Utilise un système de debounce (5 secondes) pour éviter les sauvegardes trop fréquentes

### Sauvegarde Incrémentale

- Ne sauvegarde que les tables modifiées, pas toutes les données
- Optimise les performances pour les grandes bases de données

## Restauration des Données

### Restauration Automatique

- Au démarrage de l'application, les données sont automatiquement restaurées depuis la source la plus fiable disponible

### Importation Manuelle

- Possibilité d'importer un fichier de sauvegarde existant
- Utile pour migrer les données vers un nouvel appareil

## Compatibilité des Navigateurs

| Navigateur    | OPFS | File System API | IndexedDB | LocalStorage |
| ------------- | ---- | --------------- | --------- | ------------ |
| Chrome        | ✅   | ✅              | ✅        | ✅           |
| Edge          | ✅   | ✅              | ✅        | ✅           |
| Safari 16+    | ✅   | ❌              | ✅        | ✅           |
| Firefox       | ❌   | ❌              | ✅        | ✅           |
| Mobile Chrome | ✅   | ❌              | ✅        | ✅           |
| Mobile Safari | ✅   | ❌              | ✅        | ✅           |

## Test de Persistance

Pour vérifier que la persistance fonctionne correctement:

1. Ouvrez la console développeur (F12)
2. Exécutez: `import { runPersistenceTest } from './utils/testOPFSPersistence'`
3. Puis: `runPersistenceTest()`
4. Rafraîchissez la page
5. Exécutez: `import { checkTestFile } from './utils/testOPFSPersistence'`
6. Puis: `checkTestFile()`

Si le test réussit, cela confirme que vos données persisteront même après un rafraîchissement du navigateur.

## Résolution des Problèmes

### Si les données disparaissent après un refresh:

1. Vérifiez que vous utilisez un navigateur compatible avec OPFS (Chrome, Edge, Safari 16+)
2. Assurez-vous que le stockage persistant est activé (bouton "Demander persistance" dans les détails du stockage)
3. Vérifiez que vous n'avez pas activé la navigation privée

### Si vous ne pouvez pas sélectionner un fichier:

1. Assurez-vous d'utiliser un navigateur compatible avec File System Access API (Chrome, Edge)
2. Essayez d'utiliser le bouton "Importer un fichier" à la place

## Recommandations

Pour une persistance optimale des données:

1. Utilisez Chrome ou Edge comme navigateur principal
2. Activez la persistance du stockage (bouton "Demander persistance")
3. Exportez régulièrement vos données (bouton "Exporter")
4. Conservez plusieurs copies de sauvegarde sur différents supports

---

Pour toute question ou problème, contactez le support technique.
