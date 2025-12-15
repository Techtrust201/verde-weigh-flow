# Plan de Test - Corrections effets de bord et amélioration robustesse

## Prérequis

- Application démarrée et fonctionnelle
- Accès à la base de données IndexedDB
- Fichiers d'export Sage disponibles (clients et articles)

---

## Test 1 : Hypothèse C - db.put() avec merge explicite (Préservation des données)

### Objectif

Vérifier que les données existantes (plaques, chantiers, tarifs, etc.) sont préservées lors des imports Sage.

### Étapes

1. **Préparer un client avec des données manuelles** :

   - Créer un client "Test Client" avec :
     - Raison sociale : "Test Client SARL"
     - Code client Sage : "CLI001"
     - Plaques : ["AA-123-BB", "CC-456-DD"]
     - Chantiers : ["Chantier A", "Chantier B"]
     - Tarifs préférentiels : { 1: { prixHT: 100, prixTTC: 120 } }
     - Email : "test@example.com"
     - Téléphone : "0123456789"

2. **Créer un fichier d'export Sage** (ou utiliser un existant) avec :

   - Même code client "CLI001"
   - Raison sociale différente : "Test Client SARL Updated"
   - Nouvelles données : SIRET, TVA Intra, RIB
   - **MAIS PAS de plaques, chantiers, tarifs dans le fichier**

3. **Importer le fichier Sage** :

   - Aller dans "Imports/Exports" → "Import Clients Sage"
   - Sélectionner le fichier
   - Cliquer sur "Importer"

4. **Vérifier les résultats** :
   - ✅ Le client doit être mis à jour avec les nouvelles données (SIRET, TVA, RIB)
   - ✅ Les plaques doivent être préservées : ["AA-123-BB", "CC-456-DD"]
   - ✅ Les chantiers doivent être préservés : ["Chantier A", "Chantier B"]
   - ✅ Les tarifs préférentiels doivent être préservés
   - ✅ L'email et téléphone doivent être préservés

### Critère de succès

Toutes les données manuelles sont préservées, seules les données du fichier Sage sont mises à jour.

---

## Test 2 : Hypothèse A - Détection multi-critères des doublons

### Objectif

Vérifier que la détection des doublons utilise codeClient, siret, puis raisonSociale.

### Étapes

1. **Créer des clients de test** :

   - Client A : raisonSociale="SARL ABC", codeClient="CLI001", siret="123456789"
   - Client B : raisonSociale="ABC SARL", codeClient="CLI002", siret="987654321"
   - Client C : raisonSociale="SARL ABC", codeClient="CLI001", siret="123456789" (doublon de A)
   - Client D : raisonSociale="SARL ABC", codeClient="", siret="" (même nom mais pas de code/siret)

2. **Lancer le nettoyage automatique** :

   - Aller dans "Imports/Exports" → "Import Clients Sage"
   - Importer n'importe quel fichier (le nettoyage se lance automatiquement)

3. **Vérifier les résultats** :
   - ✅ Client A et Client C doivent être détectés comme doublons (même codeClient)
   - ✅ Client C doit être supprimé, ses données fusionnées vers Client A
   - ✅ Client B doit rester (codeClient différent)
   - ✅ Client D doit rester (pas de codeClient/siret pour comparaison)

### Critère de succès

Seuls les vrais doublons (même codeClient ou même SIRET) sont supprimés.

---

## Test 3 : Hypothèse B - Gestion des entités sans champs obligatoires

### Objectif

Vérifier que le dialog s'affiche pour corriger les entités sans champs obligatoires.

### Étapes

1. **Créer un client sans raisonSociale** :

   - Via l'interface, créer un client avec seulement nom/prenom mais sans raisonSociale
   - Ou modifier un client existant pour supprimer la raisonSociale

2. **Créer un produit sans codeProduct** :

   - Via l'interface, créer un produit sans codeProduct

3. **Tenter un import Sage** :

   - Aller dans "Imports/Exports" → "Import Clients Sage"
   - Sélectionner un fichier
   - Cliquer sur "Importer"

4. **Vérifier le dialog** :

   - ✅ Un dialog "Champs obligatoires manquants" doit s'afficher
   - ✅ Le client sans raisonSociale doit être listé avec une valeur suggérée
   - ✅ Le produit sans codeProduct doit être listé avec une valeur suggérée
   - ✅ Modifier les valeurs suggérées
   - ✅ Cliquer sur "Corriger tout"

5. **Vérifier après correction** :
   - ✅ Le client doit avoir une raisonSociale
   - ✅ Le produit doit avoir un codeProduct
   - ✅ L'import doit continuer automatiquement

### Critère de succès

Le dialog s'affiche, permet la correction, et l'import continue après correction.

---

## Test 4 : Hypothèse E - Fusion complète lors du nettoyage des doublons

### Objectif

Vérifier que tous les champs sont fusionnés lors du nettoyage des doublons.

### Étapes

1. **Créer des clients doublons avec des données différentes** :

   - Client A (à conserver) :
     - raisonSociale="Test Fusion"
     - codeClient="FUS001"
     - plaques=["PLAQUE-A"]
     - chantiers=["CHANTIER-A"]
     - email="clientA@test.com"
     - transporteurId=1
   - Client B (à supprimer) :
     - raisonSociale="Test Fusion"
     - codeClient="FUS001"
     - plaques=["PLAQUE-B", "PLAQUE-C"]
     - chantiers=["CHANTIER-B"]
     - email="clientB@test.com"
     - transporteurId=2
     - tvaIntracom="FR12345678901"

2. **Lancer le nettoyage** :

   - Importer un fichier Sage (le nettoyage se lance automatiquement)

3. **Vérifier la fusion** :
   - ✅ Client A doit avoir toutes les plaques : ["PLAQUE-A", "PLAQUE-B", "PLAQUE-C"]
   - ✅ Client A doit avoir tous les chantiers : ["CHANTIER-A", "CHANTIER-B"]
   - ✅ Client A doit avoir l'email le plus complet ou le plus récent
   - ✅ Client A doit avoir le transporteurId du plus récent
   - ✅ Client A doit avoir le tvaIntracom de Client B (si absent dans A)

### Critère de succès

Tous les champs sont fusionnés correctement dans le client conservé.

---

## Test 5 : Hypothèse D - Performance et gestion d'erreurs

### Objectif

Vérifier que le nettoyage est optimisé et que les erreurs sont gérées correctement.

### Étapes

1. **Test de performance** :

   - Avec moins de 2 clients dans la DB, vérifier que le nettoyage retourne immédiatement
   - Avec beaucoup de clients (>100), vérifier que le nettoyage ne bloque pas l'UI

2. **Test de gestion d'erreurs** :
   - Simuler une erreur (par exemple, fermer la DB pendant le nettoyage)
   - Vérifier qu'un message d'erreur clair s'affiche
   - Vérifier que l'import ne continue pas si le nettoyage échoue

### Critère de succès

Performance acceptable et erreurs gérées avec messages clairs.

---

## Test 6 : Test d'intégration complet

### Objectif

Tester le flux complet avec un scénario réaliste.

### Étapes

1. **Préparer un environnement de test** :

   - Créer plusieurs clients avec des données variées
   - Créer quelques doublons intentionnels
   - Créer un client sans raisonSociale

2. **Importer un fichier Sage complet** :

   - Utiliser un fichier d'export Sage réel
   - Observer le processus complet

3. **Vérifier** :
   - ✅ Le dialog de correction s'affiche si nécessaire
   - ✅ Le nettoyage des doublons fonctionne
   - ✅ Les données sont préservées
   - ✅ Les nouvelles données sont importées
   - ✅ Aucune erreur dans la console

### Critère de succès

Le flux complet fonctionne sans erreur et préserve toutes les données.

---

## Points de vérification généraux

- [ ] Aucune erreur dans la console du navigateur
- [ ] Les toasts de succès/erreur s'affichent correctement
- [ ] Les transactions sont atomiques (pas de données partiellement modifiées)
- [ ] Les pesées associées aux clients/produits supprimés sont transférées
- [ ] Les performances sont acceptables même avec beaucoup de données

---

## En cas de problème

1. Vérifier la console du navigateur pour les erreurs
2. Vérifier les logs de debug (si activés)
3. Vérifier que la base de données IndexedDB n'est pas corrompue
4. Tester avec un navigateur en mode privé pour éviter les caches
