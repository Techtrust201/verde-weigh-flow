# Changelog

Toutes les modifications notables apportées à ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2025-10-16

### Ajouté

- Import massif des clients depuis Sage 50
- Gestion des modes de paiement
- Auto-complétion du mode de paiement lors des pesées
- Encodage ANSI (Windows-1252) pour les exports Sage
- Interface de gestion des modes de paiement
- Documentation complète

### Modifié

- Amélioration de l'interface utilisateur
- Optimisation des performances
- Correction des problèmes d'encodage

### Corrigé

- Problèmes d'accents dans les exports Sage
- Boucle infinie dans le système de synchronisation
- Problèmes de parsing des types de clients

## [2.0.0] - 2025-09-01

### Ajouté

- Système de taxes
- Mode hors ligne avec synchronisation automatique
- Intégration avec Track Déchet
- Export vers Sage 50

### Modifié

- Refonte complète de l'interface utilisateur
- Migration vers IndexedDB avec Dexie.js
- Amélioration des performances

### Corrigé

- Problèmes de synchronisation
- Bugs d'affichage sur mobile

## [1.0.0] - 2025-07-15

### Ajouté

- Première version de l'application
- Gestion des pesées
- Gestion des clients et transporteurs
- Gestion des produits et tarifs
