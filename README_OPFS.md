# Origin Private File System (OPFS) - Documentation

## Introduction

L'Origin Private File System (OPFS) est une API web moderne qui fournit un système de fichiers persistant pour les applications web. Contrairement aux autres méthodes de stockage comme IndexedDB ou localStorage, OPFS offre une **persistance garantie** même après un rafraîchissement de page ou un vidage du cache.

Cette documentation explique comment Verde Weigh Flow utilise OPFS pour garantir la persistance des données.

## Avantages d'OPFS

- **Persistance garantie** : Les données survivent aux rafraîchissements et au vidage du cache
- **Grande capacité** : Plusieurs Go de stockage (limité uniquement par l'espace disque)
- **Performance** : Accès rapide aux fichiers
- **Sécurité** : Isolé par origine (domaine)
- **API simple** : Manipulation de fichiers et répertoires

## Architecture de stockage

Verde Weigh Flow utilise une architecture de stockage à 3 niveaux :

1. **OPFS (Principal)** : Stockage persistant des données complètes
2. **IndexedDB (Cache)** : Cache rapide pour les opérations courantes
3. **File System API (Fallback)** : Pour les navigateurs ne supportant pas OPFS

### Flux de données

```
┌─────────────────────────────────────────────┐
│                                             │
│  Application (UI)                           │
│                                             │
└───────────────────┬─────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│                                             │
│  BackupManager                              │
│                                             │
└───┬───────────────┬─────────────────────┬───┘
    │               │                     │
    ▼               ▼                     ▼
┌─────────┐   ┌─────────────┐   ┌──────────────┐
│         │   │             │   │              │
│  OPFS   │   │  IndexedDB  │   │ File System  │
│         │   │             │   │    API       │
└─────────┘   └─────────────┘   └──────────────┘
```

## Services implémentés

### OPFSBackupService

Service principal qui gère l'accès à OPFS :

- `initialize()` : Initialise le service et crée les répertoires nécessaires
- `saveToFile()` : Sauvegarde les données dans OPFS
- `loadFromFile()` : Charge les données depuis OPFS
- `hasBackupFile()` : Vérifie si un fichier de sauvegarde existe
- `startAutoBackup()` : Démarre la sauvegarde automatique
- `isSupported()` : Vérifie si OPFS est supporté

### BackupManager

Service centralisé qui coordonne les différentes méthodes de sauvegarde :

- `initialize()` : Initialise tous les services de sauvegarde
- `saveBackup()` : Sauvegarde avec la méthode la plus appropriée
- `restoreBackup()` : Restaure les données depuis la source disponible
- `getBackupStatus()` : Retourne l'état actuel de la sauvegarde

## Compatibilité des navigateurs

| Navigateur | OPFS | File System API | IndexedDB |
| ---------- | ---- | --------------- | --------- |
| Chrome     | ✅   | ✅              | ✅        |
| Edge       | ✅   | ✅              | ✅        |
| Firefox    | ❌   | ❌              | ✅        |
| Safari     | ✅\* | ❌              | ✅        |
| Mobile     | ❌   | ❌              | ✅        |

\* Support partiel dans Safari 16.4+

## Tests de persistance

Pour vérifier la persistance d'OPFS, utilisez les fonctions dans `src/utils/testOPFSPersistence.ts` :

```javascript
// Écrire un fichier de test
await writeTestFile();

// Rafraîchir la page, puis vérifier
await checkTestFile();

// Test complet avec instructions
await runPersistenceTest();
```

## Demander la persistance du stockage

Pour garantir une persistance maximale, l'application demande explicitement la persistance du stockage :

```javascript
const isPersisted = await navigator.storage.persisted();
if (!isPersisted) {
  const granted = await navigator.storage.persist();
  if (granted) {
    console.log("✅ Persistance accordée");
  }
}
```

## Fallbacks

En cas d'indisponibilité d'OPFS (navigateurs non compatibles) :

1. Tentative d'utilisation de File System API
2. Fallback sur IndexedDB
3. En dernier recours, téléchargement du fichier

## Conclusion

L'implémentation d'OPFS dans Verde Weigh Flow garantit une persistance maximale des données, même dans des conditions difficiles comme le vidage du cache ou les rafraîchissements fréquents. Cette solution est idéale pour une PWA qui doit fonctionner hors ligne et conserver ses données en toutes circonstances.
