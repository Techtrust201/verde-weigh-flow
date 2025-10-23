# Système de Taxes - Implémentation Complète

## 🎯 Objectif

Permettre l'ajout dynamique de taxes avec nom et pourcentage, et leur application automatique sur toutes les factures générées.

## ✅ Fonctionnalités Implémentées

### 1. **Base de Données**

- ✅ Table `taxes` créée avec les champs :
  - `id` : Identifiant unique
  - `nom` : Nom de la taxe (ex: "Taxe de transport")
  - `taux` : Pourcentage (ex: 2.5 pour 2.5%)
  - `active` : Statut actif/inactif
  - `createdAt` / `updatedAt` : Timestamps

### 2. **Interface de Gestion**

- ✅ Composant `TaxesManager` dans l'onglet "Comptabilité > Taxes"
- ✅ Création, modification, suppression des taxes
- ✅ Activation/désactivation des taxes
- ✅ Interface intuitive avec validation

### 3. **Calcul Automatique**

- ✅ **Factures** : Les taxes actives sont automatiquement appliquées
- ✅ **Interface de pesée** : Calcul en temps réel avec détails des taxes
- ✅ **Exports CSV** : Les taxes sont incluses dans les exports

### 4. **Données d'Exemple**

- ✅ Taxes préconfigurées :
  - "Taxe de transport" : 2.5% (active)
  - "Frais de gestion" : 1.0% (active)
  - "Taxe environnementale" : 0.5% (inactive)

### 5. **Outils de Test**

- ✅ Bouton "Tester le calcul des taxes" dans Comptabilité > Taxes
- ✅ Bouton "Réinitialiser la base de données" pour créer les données d'exemple
- ✅ Fonctions de test et validation

## 🔧 Comment Utiliser

### 1. **Accéder à la Gestion des Taxes**

1. Aller dans "Comptabilité" (icône Calculator)
2. Cliquer sur l'onglet "Taxes"
3. Utiliser le gestionnaire de taxes pour ajouter/modifier

### 2. **Tester le Système**

1. Dans Comptabilité > Taxes, cliquer sur "Réinitialiser la base de données"
2. Cliquer sur "Tester le calcul des taxes"
3. Vérifier la console pour les détails du calcul

### 3. **Voir les Taxes sur les Factures**

1. Créer une nouvelle pesée
2. Remplir les informations (produit, poids, client)
3. Cliquer sur "Sauvegarder et Imprimer Facture"
4. Les taxes apparaîtront automatiquement dans la facture

## 📊 Calcul des Taxes

### Formule Appliquée

```
Total HT = Quantité × Prix Unitaire HT
TVA = Total HT × (Taux TVA / 100)
Taxes Additionnelles = Total HT × (Taux Taxe / 100)
Total TTC = Total HT + TVA + Somme des Taxes Additionnelles
```

### Exemple de Calcul

- Produit : Sable (25€ HT/tonne)
- Quantité : 2 tonnes
- Total HT : 50€
- TVA (20%) : 10€
- Taxe de transport (2.5%) : 1.25€
- Frais de gestion (1.0%) : 0.50€
- **Total TTC : 61.75€**

## 🎨 Interface Utilisateur

### Dans l'Interface de Pesée

- ✅ Affichage du détail des taxes dans le calcul du coût
- ✅ Montant HT, TVA, taxes additionnelles, et Total TTC
- ✅ Calcul en temps réel lors de la saisie

### Dans les Factures

- ✅ Section dédiée aux taxes dans le tableau des totaux
- ✅ Affichage du nom et du taux de chaque taxe
- ✅ Total TTC incluant toutes les taxes

## 🔍 Fichiers Modifiés

1. **`src/lib/database.ts`**

   - Ajout de la table `taxes`
   - Données d'exemple avec taxes

2. **`src/utils/invoiceUtils.ts`**

   - Calcul automatique des taxes dans les factures
   - Affichage des taxes dans le HTML

3. **`src/components/pesee/ProductWeightSection.tsx`**

   - Calcul en temps réel avec taxes
   - Affichage du détail des taxes

4. **`src/components/spaces/ComptabiliteSpace.tsx`**

   - Boutons de test et réinitialisation
   - Interface pour tester le système

5. **`src/utils/resetDatabaseWithTaxes.ts`**
   - Fonctions de test et réinitialisation
   - Validation du système de taxes

## 🚀 Prochaines Étapes

1. **Tester le système** avec les boutons de test
2. **Créer des taxes personnalisées** selon vos besoins
3. **Vérifier les factures générées** pour confirmer l'affichage des taxes
4. **Personnaliser les taxes** selon votre activité

## ⚠️ Notes Importantes

- Les taxes sont appliquées sur le montant HT (hors TVA)
- Seules les taxes marquées comme "actives" sont appliquées
- Le système est entièrement dynamique : ajoutez/modifiez les taxes à tout moment
- Les factures existantes ne seront pas modifiées, seules les nouvelles factures incluront les taxes

## 🎉 Résultat

Le système de taxes est maintenant **entièrement fonctionnel** et **dynamique**. Vous pouvez :

- ✅ Ajouter/modifier/supprimer des taxes
- ✅ Voir le calcul en temps réel dans l'interface de pesée
- ✅ Générer des factures avec les taxes automatiquement appliquées
- ✅ Exporter les données avec les taxes incluses

**Les taxes apparaissent maintenant automatiquement sur toutes les nouvelles factures générées !** 🎯
