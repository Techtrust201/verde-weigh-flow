# Guide d'Export et d'Import Sage 50

Ce guide explique comment utiliser les fonctionnalités d'export et d'import avec Sage 50.

## 📤 Exporter des bons de livraison vers Sage 50

### Option 1 : Format "Sage 50 - Bons de livraison complets"

Ce format génère un fichier `.txt` compatible avec l'import paramétrable de Sage 50, basé sur le format validé par votre configuration Sage.

#### Étapes :

1. **Dans l'application web** :

   - Allez dans "Imports/Exports"
   - Onglet "Nouvel Export"
   - Sélectionnez le format : **"Sage 50 - Bons de livraison complets (.txt)"**
   - Choisissez la période ou "Toutes les données"
   - Sélectionnez les pesées à exporter
   - Cliquez sur "Exporter"

2. **Dans Sage 50** :
   - Menu **"Dossier"** > **"Options"** > **"Imports paramétrables"**
   - Sélectionnez votre format d'import créé (ex: "Import_BL_auto_number")
   - Cliquez sur **"Exécuter"**
   - Sélectionnez le fichier exporté depuis l'application web
   - Lancez l'importation

#### Structure du fichier :

- **87 colonnes** au format Sage 50
- **Séparateur** : Tabulations
- **Encodage** : UTF-8
- **Format dates** : DD/MM/YYYY
- **Format nombres** : Virgule comme séparateur décimal
- **Lignes E** : En-tête du bon de livraison
- **Lignes L** : Détails des articles

#### Données exportées :

**Ligne E (En-tête)** :

- Type de pièce : "Bon de livraison"
- Date de la pièce
- Code client (numéro du client dans la base)
- Nom du client
- Adresse complète
- Mode de paiement
- Montant total TTC

**Ligne L (Détail)** :

- Code article
- Description
- Quantité (en tonnes)
- Prix unitaire HT
- Prix unitaire TTC
- Taux de TVA
- Date de livraison

### Option 2 : Format "Sage 50 - Import Ventes"

Format simplifié pour un import rapide des ventes.

#### Colonnes exportées :

- Date_Facture
- Numero_Facture
- Code_Client
- Nom_Client
- Code_Article
- Designation
- Quantite
- Prix_Unitaire_HT
- Total_HT
- Taux_TVA
- Total_TVA
- Total_TTC
- Mode_Reglement
- Echeance
- Compte_Comptable
- Numero_Piece

### Option 3 : Template personnalisé

Créez votre propre template basé sur un export Sage existant.

---

## 📥 Importer des clients depuis Sage 50

### Étapes :

1. **Exporter les clients depuis Sage 50** :

   - Dans Sage 50, ouvrez la liste des clients
   - Menu **"Dossier"** > **"Exporter"** > **"Format paramétrable"**
   - Exportez vos clients au format `.txt`
   - Assurez-vous d'inclure les champs : Code client, Nom, Adresse, Ville, Code postal

2. **Importer dans l'application web** :
   - Allez dans "Imports/Exports"
   - Onglet "Import Sage"
   - Cliquez sur **"Importer des clients"**
   - Sélectionnez le fichier `.txt` exporté de Sage
   - Cliquez sur **"Analyser le fichier"**
   - Vérifiez l'aperçu des clients détectés
   - Cliquez sur **"Importer X client(s)"**

### Résultat :

- Les clients sont automatiquement créés dans la base de données
- Les doublons sont ignorés (basés sur le nom ou le SIRET)
- Type de client : "Professionnel" par défaut
- Vous pourrez ensuite ajouter les plaques et chantiers manuellement

---

## 🔄 Workflow quotidien recommandé

### Matin :

1. Saisir les pesées dans l'application web
2. Les clients sont pré-remplis (importés depuis Sage)

### Soir :

1. Aller dans "Imports/Exports"
2. Sélectionner le format "Sage 50 - Bons de livraison complets"
3. Exporter les "Nouveaux uniquement"
4. Le fichier se télécharge automatiquement

### Import dans Sage :

1. Ouvrir Sage 50
2. **"Dossier"** > **"Options"** > **"Imports paramétrables"**
3. Sélectionner votre format
4. Exécuter l'import
5. Vérifier les bons de livraison créés

---

## ⚠️ Points importants

### Format des données :

- **Dates** : DD/MM/YYYY (ex: 06/10/2025)
- **Nombres** : Virgule comme séparateur décimal (ex: 0,420)
- **Séparateur** : Tabulations
- **Encodage** : UTF-8

### Codes clients :

- Le code client dans le fichier correspond à l'ID du client dans la base de données
- Si le client n'existe pas dans Sage, il sera créé automatiquement lors de l'import

### Codes articles :

- Utilisez des codes articles existants dans Sage
- Ou configurez l'import pour créer automatiquement les articles

### Modes de paiement :

- "Direct" → Code "ESP" dans Sage
- "En compte" → Code "PRVT" dans Sage

---

## 🧪 Test initial

Avant d'utiliser en production :

1. Exportez 2-3 pesées test
2. Importez-les dans Sage 50
3. Vérifiez que toutes les données sont correctes
4. Ajustez les mappings si nécessaire

---

## 📋 Checklist avant l'import

- ✅ Format d'import paramétrable créé dans Sage 50
- ✅ Mapping des colonnes configuré
- ✅ Codes clients existants ou création automatique activée
- ✅ Codes articles existants ou création automatique activée
- ✅ Format des dates et nombres configuré (DD/MM/YYYY, virgule décimale)
- ✅ Test réalisé avec quelques pesées

---

## 🆘 En cas de problème

### Import échoue dans Sage :

1. Vérifiez le format des dates (DD/MM/YYYY)
2. Vérifiez le format des nombres (virgule décimale)
3. Vérifiez que les codes clients existent
4. Consultez le journal d'import de Sage

### Données manquantes :

1. Vérifiez que tous les champs obligatoires sont remplis
2. Complétez les informations clients dans l'application web
3. Vérifiez les mappings de colonnes dans Sage

### Doublons :

1. L'application marque les pesées comme "exportées"
2. Utilisez "Nouveaux uniquement" pour éviter les doublons
3. Vérifiez l'historique des exports

---

## 💡 Conseils

- Exportez quotidiennement pour éviter les gros volumes
- Utilisez "Nouveaux uniquement" pour un workflow optimal
- Gardez une sauvegarde de Sage avant les imports massifs
- Vérifiez régulièrement les bons créés dans Sage

---

Pour toute assistance : contact@tech-trust.fr

