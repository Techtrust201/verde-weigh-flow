# Guide de Vérification - Gestion des Factures et Bons de Livraison

## 🔍 Tests à effectuer

### 1. Vérification de la Base de Données

#### Test de la Migration

1. Ouvrir la console développeur (F12)
2. Aller dans l'onglet "Application" → "IndexedDB" → "VerdeWeighFlow"
3. Vérifier la table `pesees` :
   - Toutes les pesées existantes doivent avoir le champ `typeDocument` = "bon_livraison"
   - Aucune pesée ne doit avoir `typeDocument` = undefined ou null

#### Test de la Structure

```javascript
// Dans la console du navigateur :
// 1. Vérifier que le schéma est à jour
const db = await import("./src/lib/database").then((m) => m.db);
const version = db.verno;
console.log("Version DB:", version); // Doit être 10 ou supérieure

// 2. Vérifier les indexes
const store = db._allTables.find((t) => t.name === "pesees");
console.log("Indexes pesees:", store.schema.indexes);
// Doit contenir : numeroBon, numeroFacture, typeDocument
```

---

### 2. Vérification de la Génération des Numéros

#### Test BL (Bons de Livraison)

1. Ouvrir l'application
2. Créer une nouvelle pesée
3. Remplir les champs obligatoires :
   - Plaque
   - Nom entreprise
   - Produit
   - Poids entrée/sortie
   - Chantier
4. Cliquer sur "Enregistrer" → Choisir "Bon de livraison uniquement"
5. ✅ Vérifier que le numéro généré est au format "BL50000" (ou suivant)
6. ✅ Vérifier dans l'historique que le numéro apparaît

#### Test FA (Factures)

1. Créer une nouvelle pesée
2. Sélectionner un moyen de paiement direct (ESP, CB, CHQ, Direct)
3. Remplir tous les champs
4. Cliquer sur "Enregistrer" → Choisir "Facture uniquement"
5. ✅ Vérifier que le numéro généré est au format "FA50000"
6. ✅ Vérifier que `numeroBon` est vide et `numeroFacture` est rempli

#### Test "Les deux"

1. Créer une nouvelle pesée avec paiement direct
2. Remplir tous les champs
3. Cliquer sur "Enregistrer" → Choisir "Bon de livraison + Facture"
4. ✅ Vérifier que BL50000 et FA50000 ont le même numéro séquentiel
5. ✅ Vérifier dans la console que les deux numéros sont sauvegardés

#### Test Anti-Doublons

1. Ouvrir 3 onglets différents avec l'application
2. Dans chaque onglet, créer une pesée et la sauvegarder rapidement
3. ✅ Vérifier qu'aucun numéro n'est dupliqué
4. ✅ Vérifier dans l'historique que tous les numéros sont uniques

---

### 3. Vérification de l'Interface Utilisateur 云

#### Dialog de Confirmation

1. Ouvrir une pesée
2. Cliquer sur "Enregistrer"
3. ✅ Vérifier que le dialog s'affiche avec 3 options :
   - "Bon de livraison uniquement" (toujours actif)
   - "Facture uniquement" (actif si paiement direct)
   - "Bon de livraison + Facture" (actif si paiement direct)
4. Si le paiement n'est pas direct (VIR, PRVT, En compte) :
   - ✅ "Facture uniquement" doit être désactivé (grisé)
   - ✅ "Bon + Facture" doit être désactivé (grisé)
   - ✅ Message "(Paiement direct requis)" doit apparaître

#### Affichage des Numéros

1. Avant validation :
   - ✅ Le champ "Numéro bon" doit afficher "À générer"
2. Après validation :
   - ✅ Les numéros corrects doivent apparaître dans l'historique

---

### 4. Vérification de l'Export Sage

#### Export Complet (Tous les documents)

1. Aller dans "Imports/Exports"
2. Sélectionner une période
3. Format : "Sage 50 - Bons de livraison complets"
4. Type de document : "Tous les documents"
5. Cliquer sur "Exporter"
6. Ouvrir le fichier .txt généré
7. ✅ Vérifier que les lignes E (en-tête) contiennent :
   - "Bon de livraison" pour les BL
   - "Facture" pour les FA
8. ✅ Vérifier que la colonne "N° pièce" contient les bons numéros (BL50000, FA50000)
9. ✅ Si une pesée a `typeDocument = "les_deux"`, il doit y avoir 4 lignes :
   - E (Bon de livraison) + L (Bon de livraison)
   - E (Facture) + L (Facture)

#### Export Bons Uniquement

1. Même process mais sélectionner "Bons de livraison uniquement"
2. ✅ Vérifier que seules les lignes BL apparaissent
3. ✅ Les factures ne doivent pas apparaître

#### Export Factures Uniquement

1. Sélectionner "Factures uniquement"
2. ✅ Vérifier que seules les lignes FA apparaissent
3. ✅ Les bons ne doivent pas apparaître

#### Test avec pesée "les_deux"

1. Créer une pesée validée comme "les_deux"
2. Exporter avec filtre "Bons uniquement"
3. ✅ Seules les lignes BL doivent apparaître
4. Exporter avec filtre "Factures uniquement"
5. ✅ Seules les lignes FA doivent apparaître

---

### 5. Vérification de l'Historique

#### Affichage des Pesées

1. Aller dans "Historique"
2. ✅ Vérifier la colonne "Type" :
   - Badge 📄 pour "Bon"
   - Badge 🧾 pour "Facture"
   - Badge 📄🧾 pour "Bon + Facture"
3. ✅ Vérifier la colonne "Numéros" :
   - "BL50000" pour bon uniquement
   - "FA50000" pour facture uniquement
   - "BL50000 / FA50000" pour les deux

#### Recherche

1. Utiliser la barre de recherche
2. Tester avec :
   - Un numéro BL : "BL50000"
   - Un numéro FA : "FA50000"
   - Un nom de client
   - Une plaque
3. ✅ La recherche doit fonctionner pour tous ces critères

#### Export CSV

1. Dans l'historique, cliquer sur "Export CSV"
2. Ouvrir le fichier CSV
3. ✅ Vérifier les colonnes :
   - "Type" : Bon/Facture/Bon + Facture
   - "Numéro Bon" : BL50000 ou vide
   - "Numéro Facture" : FA50000 ou vide

---

### 6. Vérification des Impressions

#### Impression Bon de Livraison

1. Créer et valider une pesée comme "bon_livraison"
2. Cliquer sur "Imprimer"
3. ✅ Le bon doit afficher le numéro BL correct
4. ✅ Aucun numéro FA ne doit apparaître

#### Impression Facture

1. Créer et valider une pesée comme "facture"
2. Dans l'historique, ouvrir les détails
3. Cliquer sur "Imprimer" → "Facture"
4. ✅ La facture doit afficher le numéro FA correct

#### Impression Les Deux

1. Créer une pesée validée comme "les_deux"
2. Dans les dét 了一些, cliquer sur "Imprimer" → "Bon + Facture"
3. ✅ Les deux documents doivent s'imprimer avec leurs numéros respectifs

---

### 7. Tests de Performance

#### Test avec Grande Base de Données

```javascript
// Dans la console :
// 1. Vérifier le temps d'exécution de getMaxSequenceNumber
const { getMaxSequenceNumber } = await import("./src/hooks/usePeseeTabs").then(
  (m) => m.usePeseeTabs
);
console.time("getMaxSequenceNumber");
const max = await getMaxSequenceNumber();
console.timeEnd("getMaxSequenceNumber"); // Doit être < 100ms

// 2. Vérifier qu'on ne charge pas toutes les pesées
// Le nombre de requêtes DB doit être limité (2 max : lastBL + lastFA)
```

#### Test Multi-Onglets

1. Ouvrir 3 onglets de l'application
2. Dans chaque onglet, créer une pesée
3. Sauvegarder presque simultanément
4. ✅ Vérifier qu'aucun doublon n'est créé
5. ✅ Vérifier que tous les numéros sont séquentiels

---

### 8. Vér Search dans l'Historique

#### Test de la Recherche Globale

1. Aller dans "Historique"
2. Tester la recherche avec différents critères :
   ```javascript
   // Dans la console, vérifier que la fonction de recherche fonctionne
   // Elle doit chercher dans :
   // - numeroBon
   // - numeroFacture
   // - nomEntreprise
   // - plaque
   ```
3. ✅ Tous les résultats pertinents doivent s'afficher

---

### 9. Checklist Finale

- [ ] Migration exécutée sans erreur
- [ ] Tous les anciens documents ont `typeDocument = "bon_livraison"`
- [ ] Génération BL séquentielle fonctionne (BL50000, BL50001...)
- [ ] Génération FA séquentielle fonctionne (FA50000, FA50001...)
- [ ] Pas de doublons même avec multi-onglets
- [ ] Le dialog de confirmation affiche correctement les options
- [ ] Les factures sont désactivées si paiement non-direct
- [ ] Export Sage avec tous les filtres fonctionne
- [ ] L'historique affiche correctement les types et numéros
- [ ] La recherche fonctionne pour BL, FA, clients, plaques
- [ ] Les impressions affichent les bons numéros
- [ ] Performance acceptable (< 100ms pour getMaxSequenceNumber)

---

## 🐛 Tests de Régression

### À ne PAS casser

- ✅ La génération de numéros BL existante doit continuer à fonctionner
- ✅ L'export Sage existant doit rester compatible
- ✅ L'impression des bons de livraison doit fonctionner comme avant
- ✅ Les anciennes pesées doivent toujours être accessibles

---

## 📝 Commandes Utiles pour le Debug

### Vérifier les pesées dans la console

```javascript
const db = await import("./src/lib/database").then((m) => m.db);
const pesees = await db.pesees.toArray();

// Afficher les dernières pesées
pesees.slice(-10).forEach((p) => {
  console.log(
    `${p.numeroBon || "N/A"} / ${p.numeroFacture || "N/A"} - ${p.typeDocument}`
  );
});

// Vérifier les doublons
const blNumbers = pesees.filter((p) => p.numeroBon).map((p) => p.numeroBon);
const duplicatesBL = blNumbers.filter((n, i) => blNumbers.indexOf(n) !== i);
console.log("Doublons BL:", duplicatesBL);

const faNumbers = pesees
  .filter((p) => p.numeroFacture)
  .map((p) => p.numeroFacture);
const duplicatesFA = faNumbers.filter((n, i) => faNumbers.indexOf(n) !== i);
console.log("Doublons FA:", duplicatesFA);
```

### Vérifier la version de la base

```javascript
const db = await import("./src/lib/database").then((m) => m.db);
console.log("Version DB:", db.verno);
console.log("Tables:", Object.keys(db));
```

---

## ✅ Résultat Attendu

Si tous les tests passent, vous devriez avoir :

- ✅ Un système de numérotation fiable et sans doublons
- ✅ La possibilité de créer des bons, factures, ou les deux
- ✅ Des exports Sage corrects avec les bons types de documents
- ✅ Une interface utilisateur intuitive et claire
- ✅ Aucune régression sur les fonctionnalités existantes
