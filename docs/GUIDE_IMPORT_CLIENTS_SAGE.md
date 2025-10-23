# Guide d'Import des Clients depuis Sage 50

Ce guide explique comment importer automatiquement tous vos clients depuis Sage 50 dans l'application web.

## 📋 Vue d'ensemble

L'application permet maintenant :

1. **Importer tous vos clients** depuis un fichier d'export Sage 50
2. **Importer automatiquement les modes de paiement** (ESP, VIR, PRVT, CB, CHQ)
3. **Auto-complétion du mode de paiement** lors de la sélection d'un client dans une pesée
4. **Gérer les modes de paiement** dans les paramètres utilisateur
5. **Exporter en format ANSI (Windows-1252)** pour éviter les problèmes d'accents

---

## 📥 ÉTAPE 1 : Exporter les clients depuis Sage 50

### 1.1 Dans Sage 50

1. Ouvrez Sage 50
2. Menu **"Dossier"** → **"Options"** → **"Exports paramétrables"**
3. Sélectionnez ou créez un format d'export de clients avec les colonnes :

   - **Code** (obligatoire)
   - **Nom** (obligatoire)
   - **Société** (obligatoire)
   - **Adresse 1, 2, 3**
   - **Code Postal**
   - **Ville**
   - **Pays**
   - **SIRET**
   - **E-mail**
   - **Téléphone / Portable**
   - **Mode de paiement** (ESP, VIR, PRVT, CB, CHQ)
   - **Libellé mode de paiement** (Espèce, Virement, etc.)
   - **Type de client** (Professionnel / Particulier)

4. Exportez le fichier → Vous obtenez un fichier `.txt` (ex: `Export des clients.Txt`)

---

## 📤 ÉTAPE 2 : Importer dans l'application web

### 2.1 Accéder à l'import

1. Ouvrez l'application web
2. Allez dans **"Imports/Exports"** (menu latéral)
3. Sélectionnez l'onglet **"Import Sage"**
4. Cliquez sur **"Import des clients Sage"**

### 2.2 Sélectionner le fichier

1. Cliquez sur **"Importer des clients"**
2. Sélectionnez le fichier `Export des clients.Txt` depuis Sage 50
3. Cliquez sur **"Analyser le fichier"**

### 2.3 Vérifier l'aperçu

L'application affiche :

- ✅ **Nombre de clients trouvés**
- 📋 **Aperçu des clients** (Code, Nom, Adresse, Ville)
- ⚠️ **Avertissements** (adresses incomplètes, etc.)

### 2.4 Importer les clients

1. Vérifiez que les données sont correctes dans l'aperçu
2. Cliquez sur **"Importer X client(s)"**
3. L'application :
   - ✅ Importe tous les clients
   - ✅ Crée automatiquement les modes de paiement manquants
   - ✅ Associe le mode de paiement préférentiel à chaque client
   - ⏭️ Ignore les clients déjà existants

### 2.5 Résultat

Vous verrez un message :

```
Import terminé
X client(s) importé(s), Y déjà existant(s), Z mode(s) de paiement créé(s)
```

---

## 💳 ÉTAPE 3 : Gérer les modes de paiement

### 3.1 Accéder au gestionnaire

1. Allez dans **"Utilisateur"** (menu latéral)
2. Sélectionnez l'onglet **"Paiements"**

### 3.2 Modes de paiement disponibles

Modes créés automatiquement lors de l'import :

- **ESP** → Espèce
- **VIR** → Virement
- **PRVT** → Prélèvement
- **CB** → Carte bancaire
- **CHQ** → Chèque

### 3.3 Ajouter un nouveau mode

1. Cliquez sur **"Nouveau mode"**
2. Remplissez :
   - **Code** : 2-10 lettres majuscules (ex: PAYPAL)
   - **Libellé** : Description (ex: PayPal)
3. Cliquez sur **"Créer"**

### 3.4 Actions disponibles

- **Activer/Désactiver** : Switch à côté de chaque mode
- **Modifier** : Bouton crayon (⚠️ le code ne peut pas être modifié)
- **Supprimer** : Bouton corbeille

---

## 🎯 ÉTAPE 4 : Auto-complétion lors des pesées

### 4.1 Fonctionnement automatique

Quand vous sélectionnez un client dans une pesée :

1. **Mode de paiement auto-complété** :

   - Si le client a un mode `ESP`, `CB`, `CHQ` → **"Direct"**
   - Si le client a un mode `VIR`, `PRVT` → **"En compte"**
   - Sinon → **"Direct"** (par défaut)

2. **Transporteur auto-complété** :

   - Si le client a un transporteur assigné → Sélectionné automatiquement

3. **Plaque et chantier** :
   - Première plaque du client → Auto-complétée
   - Premier chantier du client → Auto-complété

### 4.2 Exemple d'utilisation

```
1. Nouvelle pesée
2. Rechercher client "SARL BRUNO JARDIN"
3. Sélectionner le client
   → Nom: "SARL BRUNO JARDIN"
   → Plaque: "BF-218-GA" (première plaque)
   → Mode paiement: "En compte" (car PRVT dans Sage)
   → Transporteur: Sélectionné si assigné
```

---

## 📤 ÉTAPE 5 : Export vers Sage avec encodage ANSI

### 5.1 Problème résolu

**Avant** : Les caractères accentués (VÉGÉTEAUX → V�G�TAUX)
**Maintenant** : Encodage automatique en **Windows-1252 (ANSI)**

### 5.2 Formats d'export avec encodage ANSI

Tous les formats Sage utilisent maintenant l'encodage **Windows-1252** :

- ✅ `Sage 50 - Import Articles (.txt)`
- ✅ `Sage 50 - Import Ventes (.txt)`
- ✅ `Sage 50 - Bons de livraison complets (.txt)`
- ✅ `Sage 50 - Template personnalisé (.txt)`

### 5.3 Caractères supportés

L'application convertit automatiquement :

- **Lettres accentuées** : à, é, è, ê, ë, î, ï, ô, ù, û, ü, ç
- **Lettres majuscules** : À, É, È, Ê, Ë, Î, Ï, Ô, Ù, Û, Ü, Ç
- **Ligatures** : œ, Œ
- **Symboles** : € (euro)

### 5.4 Test de l'encodage

1. Créez un produit avec des accents : **"VÉGÉTEAUX"**
2. Exportez en format `Sage 50 - Bons de livraison complets`
3. Ouvrez le fichier `.txt` dans Sage 50
4. ✅ Les accents s'affichent correctement

---

## 🔧 Configuration recommandée dans Sage 50

### Format d'import des clients

Si vous voulez exporter des clients depuis Sage :

**Colonnes obligatoires** :

- Code
- Nom
- Société
- Mode de paiement
- Libellé mode de paiement

**Colonnes recommandées** :

- Adresse 1, 2, 3
- Code Postal
- Ville
- Pays
- SIRET
- E-mail
- Téléphone / Portable
- Type de client

**Séparateur** : Tabulation
**Encodage** : ANSI (Windows-1252)

---

## ⚠️ Points importants

### Gestion des doublons

L'import vérifie automatiquement :

- Si un client avec le **même nom** existe → ❌ Ignoré
- Si un client avec le **même SIRET** existe → ❌ Ignoré

### Modes de paiement

- Les nouveaux modes sont **créés automatiquement**
- Les modes existants sont **réutilisés**
- Vous pouvez les **gérer** dans `Utilisateur → Paiements`

### Auto-complétion

- Le mode de paiement est **suggéré**, pas forcé
- Vous pouvez le **modifier** manuellement dans chaque pesée
- Le mapping ESP/CB/CHQ → Direct et VIR/PRVT → En compte est **automatique**

---

## 🎯 Cas d'usage complet

### Scénario : Import de 450 clients depuis Sage

1. **Export Sage** → `Export des clients.Txt` (450 lignes)
2. **Import dans l'app** → Imports/Exports → Import Sage
3. **Résultat** :
   ```
   450 client(s) importé(s)
   0 déjà existant(s)
   5 mode(s) de paiement créé(s) (ESP, VIR, PRVT, CB, CHQ)
   ```
4. **Utilisation** :
   - Aller dans "Pesée"
   - Rechercher un client par nom/SIRET/téléphone
   - Sélectionner → Toutes les infos auto-complétées

### Avantages

✅ **Plus de saisie manuelle** de 450 clients
✅ **Mode de paiement automatique** pour chaque client
✅ **Transporteur pré-assigné** si configuré dans Sage
✅ **Export vers Sage** avec accents corrects

---

## 🆘 Dépannage

### Problème : Caractères bizarres dans Sage

**Solution** : Vérifiez que vous utilisez bien le format d'export **"Sage 50 - Bons de livraison complets"** ou **"Sage 50 - Import Ventes"**. Ces formats encodent automatiquement en Windows-1252.

### Problème : Modes de paiement non importés

**Solution** : Vérifiez que votre export Sage contient les colonnes **"Mode de paiement"** et **"Libellé mode de paiement"**.

### Problème : Clients en double

**Solution** : L'application ignore automatiquement les doublons. Supprimez manuellement les clients existants si vous voulez les réimporter.

---

## 📊 Statistiques d'import

Après l'import, vous pouvez voir dans **"Clients"** :

- **Nombre total de clients**
- **Filtrer par mode de paiement**
- **Filtrer par type de client**
- **Filtrer par transporteur**

---

## 🚀 Prochaines étapes

Maintenant que vos clients sont importés :

1. ✅ Faites vos pesées normalement
2. ✅ Les modes de paiement s'auto-complètent
3. ✅ Exportez vers Sage sans problème d'encodage
4. ✅ Gain de temps massif !

---

**Créé le** : 16 octobre 2025
**Version de l'app** : Verde Weigh Flow v2.0
