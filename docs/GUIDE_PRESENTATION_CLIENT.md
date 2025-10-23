# Guide de Présentation Client - Barberis Déchets Verts

## 🎯 Vue d'ensemble de l'application

**Barberis Déchets Verts** est une Progressive Web App (PWA) moderne développée pour la gestion complète des pesées et de la facturation des déchets verts.

### 🔧 Technologies utilisées
- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + Shadcn/UI
- **Base de données**: IndexedDB via Dexie.js (100% offline)
- **PWA**: Service Worker + Manifest (fonctionne sans internet)
- **Architecture**: Single Page Application (SPA)

## 📱 Fonctionnalités principales

### 1. 🏗️ Espace Pesée (Écran principal)
**Objectif**: Saisie rapide des pesées en temps réel

**Fonctionnalités**:
- Sélection client avec autocomplétion
- Autocomplétion des plaques d'immatriculation
- Autocomplétion des chantiers
- Sélection des produits avec calcul automatique TTC/HT
- Saisie des poids (entrée/sortie) avec calcul automatique du net
- Génération automatique des numéros de bon
- Choix du moyen de paiement (Direct/En compte)
- Sauvegarde instantanée en local

**Points clés**:
- Interface optimisée pour une saisie rapide
- Validation en temps réel
- Historique des pesées récentes
- Export et impression des bons

### 2. 👥 Espace Clients
**Objectif**: Gestion complète de la base client

**Types de clients supportés**:
- **Particuliers**: Nom, prénom, téléphone, plaques
- **Professionnels**: Raison sociale, SIRET, NAF, adresse complète
- **Micro-entreprises**: Statut intermédiaire avec informations simplifiées

**Fonctionnalités**:
- Création/modification/suppression des fiches client
- Gestion des plaques d'immatriculation multiples
- Gestion des chantiers par client
- Historique des pesées par client
- Recherche et filtrage avancés

### 3. 📦 Espace Produits
**Objectif**: Catalogue des déchets et tarification

**Fonctionnalités**:
- Création de fiches produits (nom, code, prix HT/TTC)
- Gestion des taux de TVA
- Calculs automatiques TTC/HT
- Système de favoris
- Import/export des tarifs

### 4. 📊 Espace Historique
**Objectif**: Consultation et gestion des pesées passées

**Fonctionnalités**:
- Liste complète des pesées
- Filtrage par date, client, produit
- Recherche avancée
- Export Excel/CSV
- Modification/suppression des pesées
- Impression des bons en lot

### 5. 💰 Espace Comptabilité
**Objectif**: Suivi financier et synchronisation

**Fonctionnalités**:
- Tableaux de bord avec KPIs
- Chiffre d'affaires par période
- Répartition par client/produit
- Synchronisation Sage (via API)
- Export comptable
- Facturation automatisée

### 6. ⚙️ Espace Utilisateur
**Objectif**: Configuration et paramétrage

**Fonctionnalités**:
- Informations entreprise (nom, adresse, SIRET, APE)
- Upload du logo
- Configuration API Sage
- Paramètres d'impression
- Sauvegarde/restauration des données

## 🏗️ Architecture technique

### Structure des données
```
┌─── IndexedDB (Local) ───┐
├── Clients              │
├── Produits             │
├── Pesées              │
└── Paramètres          │
```

### Avantages de l'architecture
- **100% Offline**: Fonctionne sans internet
- **Synchronisation**: Optionnelle avec Sage
- **Performance**: Données en local = vitesse maximale
- **Fiabilité**: Pas de dépendance réseau
- **Sécurité**: Données stockées localement

## 🔄 Workflow type d'utilisation

1. **Arrivée d'un véhicule**
   - Ouverture de l'espace Pesée
   - Sélection/création du client
   - Saisie de la plaque (autocomplétion)
   - Sélection du produit
   - Pesée d'entrée

2. **Sortie du véhicule**
   - Pesée de sortie
   - Validation automatique
   - Impression du bon
   - Sauvegarde automatique

3. **Fin de journée**
   - Consultation de l'historique
   - Export pour la comptabilité
   - Synchronisation Sage (optionnelle)

## 💡 Points de vente clés

### ✅ Avantages business
- **Gain de temps**: Interface optimisée pour la rapidité
- **Fiabilité**: Fonctionne même sans internet
- **Traçabilité**: Historique complet des opérations
- **Intégration**: Compatible avec votre Sage existant
- **Mobilité**: Accessible sur tablette/smartphone
- **Évolutivité**: Facilement adaptable aux besoins

### ✅ Avantages techniques
- **PWA**: Installation possible comme une app native
- **Responsive**: S'adapte à tous les écrans
- **Performance**: Vitesse optimale grâce au stockage local
- **Maintenance**: Mises à jour automatiques
- **Sécurité**: Données chiffrées localement

## 🚀 Démonstration suggérée

### Ordre de présentation
1. **Vue d'ensemble** (5 min)
   - Présentation de l'interface principale
   - Navigation entre les espaces

2. **Cas d'usage concret** (15 min)
   - Simulation d'une pesée complète
   - De l'arrivée du client à l'impression du bon

3. **Gestion des données** (10 min)
   - Création d'un nouveau client
   - Ajout d'un produit
   - Consultation de l'historique

4. **Fonctionnalités avancées** (10 min)
   - Export comptable
   - Configuration Sage
   - Rapports et statistiques

5. **Questions/Réponses** (10 min)

## ❓ FAQ Technique

**Q: L'application fonctionne-t-elle sans internet ?**
R: Oui, 100% offline. Une fois installée, elle fonctionne complètement sans connexion.

**Q: Où sont stockées les données ?**
R: Localement sur l'appareil dans IndexedDB, chiffrées et sécurisées.

**Q: Peut-on synchroniser avec Sage ?**
R: Oui, via API REST avec votre installation Sage existante.

**Q: L'application est-elle sécurisée ?**
R: Oui, données chiffrées, accès local uniquement, pas de transit réseau.

**Q: Peut-on faire des sauvegardes ?**
R: Oui, export complet des données en JSON pour archivage/restauration.

**Q: Compatible avec quels navigateurs ?**
R: Tous les navigateurs modernes (Chrome, Firefox, Safari, Edge).

## 📞 Support et maintenance

- **Développeur**: Tech-Trust Agency
- **Contact**: contact@tech-trust.fr
- **Téléphone**: 06 99 48 66 29
- **Adresse**: 62 Imp. Font-Roubert, 06250 Mougins
- **Site web**: https://www.tech-trust.fr

---

*Guide créé le {{ date }} - Version 1.0*