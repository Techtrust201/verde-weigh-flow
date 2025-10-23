# ✅ Checklist de Validation - À imprimer

**Client** : Barberis Déchets Verts  
**Date** : ******\_\_\_******  
**Validé par** : ******\_\_\_******

---

## 📋 PARTIE 1 : IMPORT DES CLIENTS

### Préparation

- [ ] Fichier `Export des clients.Txt` disponible
- [ ] Application web ouverte
- [ ] Connexion internet OK

### Import

- [ ] Aller dans "Imports/Exports"
- [ ] Cliquer sur "Import Sage"
- [ ] Cliquer sur "Importer des clients"
- [ ] Sélectionner le fichier
- [ ] Cliquer sur "Analyser le fichier"
- [ ] Vérifier le nombre de clients détectés : ******\_******
- [ ] Vérifier l'aperçu (quelques clients)
- [ ] Cliquer sur "Importer X client(s)"

### Résultat

- [ ] Message : "Import terminé"
- [ ] Nombre importé : ******\_******
- [ ] Nombre doublons : ******\_******
- [ ] Modes créés : ******\_******

### Validation visuelle

- [ ] Aller dans "Clients"
- [ ] Vérifier 5 clients au hasard :

**Client 1** : ******\_\_\_******

- [ ] Nom correct
- [ ] Adresse correcte
- [ ] Mode paiement renseigné

**Client 2** : ******\_\_\_******

- [ ] Nom correct
- [ ] Adresse correcte
- [ ] Mode paiement renseigné

**Client 3** : ******\_\_\_******

- [ ] Nom correct
- [ ] Adresse correcte
- [ ] Mode paiement renseigné

**Client 4** : ******\_\_\_******

- [ ] Nom correct
- [ ] Adresse correcte
- [ ] Mode paiement renseigné

**Client 5** : ******\_\_\_******

- [ ] Nom correct
- [ ] Adresse correcte
- [ ] Mode paiement renseigné

**✅ PARTIE 1 VALIDÉE** : ⬜ OUI / ⬜ NON

---

## 💳 PARTIE 2 : MODES DE PAIEMENT

### Vérification gestionnaire

- [ ] Aller dans "Utilisateur"
- [ ] Cliquer sur "Paiements"
- [ ] Vérifier modes présents :
  - [ ] ESP - Espèce
  - [ ] VIR - Virement
  - [ ] PRVT - Prélèvement
  - [ ] CB - Carte bancaire
  - [ ] CHQ - Chèque

### Test création mode

- [ ] Cliquer sur "Nouveau mode"
- [ ] Code : **TEST**
- [ ] Libellé : **Mode de test**
- [ ] Cliquer sur "Créer"
- [ ] Vérifier que "TEST" apparaît dans la liste
- [ ] Supprimer "TEST" (bouton corbeille)

**✅ PARTIE 2 VALIDÉE** : ⬜ OUI / ⬜ NON

---

## 🎯 PARTIE 3 : AUTO-COMPLÉTION

### Test client avec ESP (Direct)

- [ ] Aller dans "Pesée"
- [ ] Nouvelle pesée
- [ ] Rechercher client avec mode ESP : ******\_\_\_******
- [ ] Sélectionner le client
- [ ] Vérifier auto-complétion :
  - [ ] Nom : rempli automatiquement
  - [ ] Plaque : remplie automatiquement
  - [ ] **Mode paiement : "Direct"** ⭐
  - [ ] Transporteur : rempli si assigné

### Test client avec VIR ou PRVT (En compte)

- [ ] Nouvelle pesée
- [ ] Rechercher client avec VIR ou PRVT : ******\_\_\_******
- [ ] Sélectionner le client
- [ ] Vérifier auto-complétion :
  - [ ] Nom : rempli automatiquement
  - [ ] Plaque : remplie automatiquement
  - [ ] **Mode paiement : "En compte"** ⭐
  - [ ] Transporteur : rempli si assigné

### Test pesée complète

- [ ] Remplir produit : ******\_\_\_******
- [ ] Remplir poids entrée : ******\_\_\_******
- [ ] Remplir poids sortie : ******\_\_\_******
- [ ] Enregistrer
- [ ] Vérifier que la pesée est sauvegardée

**✅ PARTIE 3 VALIDÉE** : ⬜ OUI / ⬜ NON

---

## 🔤 PARTIE 4 : ENCODAGE ANSI

### Préparation

- [ ] Avoir Sage 50 ouvert
- [ ] Avoir un produit avec accents (ex: "VÉGÉTEAUX")
- [ ] Avoir fait une pesée avec ce produit

### Export depuis l'app

- [ ] Aller dans "Imports/Exports"
- [ ] Onglet "Nouvel Export"
- [ ] Format : "Sage 50 - Bons de livraison complets"
- [ ] Type : "Nouveaux uniquement"
- [ ] Sélectionner la pesée
- [ ] Cliquer sur "Exporter"
- [ ] Fichier téléchargé : ************\_\_\_************

### Vérification fichier

- [ ] Ouvrir avec Notepad (Windows)
- [ ] Vérifier que "VÉGÉTEAUX" s'affiche correctement (pas V�G�TAUX)
- [ ] Vérifier autres accents : Société, Prélèvement, etc.

### Import dans Sage 50

- [ ] Menu "Dossier" → "Options" → "Imports paramétrables"
- [ ] Sélectionner format : **Import_BL_auto_number**
- [ ] Importer le fichier .txt
- [ ] Vérifier dans Sage :
  - [ ] Bon de livraison créé
  - [ ] Produit : "VÉGÉTEAUX" s'affiche correctement ⭐
  - [ ] Client : nom avec accents correct
  - [ ] Adresse : accents corrects
  - [ ] Tous les champs : corrects

**✅ PARTIE 4 VALIDÉE** : ⬜ OUI / ⬜ NON

---

## 🎊 VALIDATION GLOBALE

### Résumé

| Partie             | Validée ? | Commentaires |
| ------------------ | --------- | ------------ |
| 1. Import clients  | ⬜        |              |
| 2. Modes paiement  | ⬜        |              |
| 3. Auto-complétion | ⬜        |              |
| 4. Encodage ANSI   | ⬜        |              |

### Appréciation générale

**Facilité d'utilisation** :
⬜ Très facile
⬜ Facile
⬜ Moyen
⬜ Difficile

**Gain de temps perçu** :
⬜ Très important
⬜ Important
⬜ Moyen
⬜ Faible

**Qualité des données** :
⬜ Excellente
⬜ Bonne
⬜ Moyenne
⬜ À améliorer

**Satisfaction globale** :
⬜ Très satisfait ⭐⭐⭐⭐⭐
⬜ Satisfait ⭐⭐⭐⭐
⬜ Moyennement satisfait ⭐⭐⭐
⬜ Peu satisfait ⭐⭐
⬜ Pas satisfait ⭐

---

## 💬 COMMENTAIRES ET SUGGESTIONS

### Ce qui fonctionne bien

```
_________________________________________________________________

_________________________________________________________________

_________________________________________________________________
```

### Ce qui pourrait être amélioré

```
_________________________________________________________________

_________________________________________________________________

_________________________________________________________________
```

### Fonctionnalités souhaitées

```
_________________________________________________________________

_________________________________________________________________

_________________________________________________________________
```

---

## ✅ DÉCISION FINALE

### Validation de la version 2.1

⬜ **APPROUVÉ** - Mise en production immédiate

⬜ **APPROUVÉ AVEC RÉSERVES** - Modifications mineures :

```
_________________________________________________________________

_________________________________________________________________
```

⬜ **NON APPROUVÉ** - Modifications requises :

```
_________________________________________________________________

_________________________________________________________________
```

---

## 📝 SIGNATURES

### Développeur

**Nom** : Hugo (Tech-Trust Agency)
**Date** : 16 octobre 2025
**Signature** : ******\_\_\_******

### Client

**Nom** : ******\_\_\_******
**Date** : ******\_\_\_******
**Signature** : ******\_\_\_******

---

## 📞 CONTACT POST-VALIDATION

**Tech-Trust Agency**

- 📧 contact@tech-trust.fr
- 📱 06 99 48 66 29
- 🌐 https://www.tech-trust.fr

**Support** : Inclus pendant 1 mois

---

**FIN DE LA CHECKLIST**

