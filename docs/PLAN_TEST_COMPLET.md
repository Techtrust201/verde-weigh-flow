# Plan de Test Complet - Import Clients & Modes de Paiement

**Date** : 16 octobre 2025
**Testeur** : Hugo
**Environnement** : Sage 50 réel du client

---

## 🎯 Objectifs des tests

1. ✅ Vérifier l'import massif des clients depuis Sage
2. ✅ Valider la création automatique des modes de paiement
3. ✅ Tester l'auto-complétion du mode de paiement
4. ✅ Vérifier l'encodage ANSI (Windows-1252) des exports
5. ✅ S'assurer que tout fonctionne de bout en bout

---

## TEST 1 : Import des clients depuis Sage

### Préparation

- [ ] Ouvrir Sage 50
- [ ] Avoir le fichier `Export des clients.Txt` disponible

### Étapes

1. [ ] Ouvrir l'app web
2. [ ] Aller dans **"Imports/Exports"**
3. [ ] Cliquer sur l'onglet **"Import Sage"**
4. [ ] Cliquer sur **"Importer des clients"**
5. [ ] Sélectionner `Export des clients.Txt`
6. [ ] Cliquer sur **"Analyser le fichier"**

### Vérifications

- [ ] **Nombre de clients détecté** : doit afficher le nombre correct (ex: 450)
- [ ] **Aperçu visible** : doit montrer Code, Nom, Adresse, Ville
- [ ] **Pas d'erreur** : section erreurs vide ou warnings uniquement
- [ ] **Message de succès** : "X client(s) prêt(s) à être importé(s)"

### Import

7. [ ] Cliquer sur **"Importer X client(s)"**

### Vérifications finales

- [ ] **Message final** : "Import terminé - X client(s) importé(s), Y déjà existant(s), Z mode(s) de paiement créé(s)"
- [ ] **Fermeture automatique** du dialog
- [ ] **Pas d'erreur console**

### Validation des données

8. [ ] Aller dans **"Clients"**
9. [ ] Vérifier que tous les clients sont présents
10. [ ] Ouvrir un client au hasard
11. [ ] Vérifier :
    - [ ] Raison sociale correcte
    - [ ] SIRET correct
    - [ ] Adresse complète
    - [ ] Email et téléphone présents
    - [ ] Mode de paiement préférentiel renseigné

**✅ TEST 1 RÉUSSI** : ****\_\_\_****

---

## TEST 2 : Modes de paiement créés

### Étapes

1. [ ] Aller dans **"Utilisateur"**
2. [ ] Cliquer sur l'onglet **"Paiements"**

### Vérifications

- [ ] **Table visible** : modes de paiement affichés
- [ ] **ESP** présent : Espèce
- [ ] **VIR** présent : Virement
- [ ] **PRVT** présent : Prélèvement
- [ ] **CB** présent : Carte bancaire
- [ ] **CHQ** présent : Chèque
- [ ] **Statut** : tous "Actif"

### Tests d'actions

3. [ ] Cliquer sur **"Nouveau mode"**
4. [ ] Entrer :
   - Code : `TEST`
   - Libellé : `Mode de test`
5. [ ] Cliquer sur **"Créer"**

### Vérifications

- [ ] **Mode créé** : apparaît dans la table
- [ ] **Message toast** : "Mode de paiement créé"
- [ ] **Statut** : Actif par défaut

### Modification

6. [ ] Cliquer sur le crayon à côté de "TEST"
7. [ ] Modifier le libellé en "Test modifié"
8. [ ] Sauvegarder

### Vérifications

- [ ] **Libellé mis à jour** dans la table
- [ ] **Code non modifiable** (grisé)

### Activation/Désactivation

9. [ ] Cliquer sur le switch de "TEST"
10. [ ] Vérifier que le statut passe à "Inactif"
11. [ ] Re-cliquer pour réactiver

### Suppression

12. [ ] Cliquer sur la corbeille de "TEST"
13. [ ] Confirmer la suppression
14. [ ] Vérifier que "TEST" disparaît de la table

**✅ TEST 2 RÉUSSI** : ****\_\_\_****

---

## TEST 3 : Auto-complétion mode de paiement

### Préparation

- [ ] Identifier 3 clients avec modes de paiement différents dans Sage :
  - Client A : ESP (Espèce)
  - Client B : VIR (Virement)
  - Client C : PRVT (Prélèvement)

### Test Client A (ESP → Direct)

1. [ ] Aller dans **"Pesée"**
2. [ ] Nouvelle pesée
3. [ ] Rechercher Client A
4. [ ] Sélectionner Client A

### Vérifications

- [ ] **Nom** : auto-complété ✅
- [ ] **Plaque** : auto-complétée ✅
- [ ] **Mode de paiement** : **"Direct"** ✅
- [ ] **Chantier** : auto-complété si disponible

### Test Client B (VIR → En compte)

5. [ ] Nouvelle pesée
6. [ ] Rechercher Client B
7. [ ] Sélectionner Client B

### Vérifications

- [ ] **Nom** : auto-complété ✅
- [ ] **Mode de paiement** : **"En compte"** ✅

### Test Client C (PRVT → En compte)

8. [ ] Nouvelle pesée
9. [ ] Rechercher Client C
10. [ ] Sélectionner Client C

### Vérifications

- [ ] **Nom** : auto-complété ✅
- [ ] **Mode de paiement** : **"En compte"** ✅

### Test modification manuelle

11. [ ] Modifier le mode de paiement de "En compte" → "Direct"
12. [ ] Vérifier que la modification est prise en compte
13. [ ] Enregistrer la pesée
14. [ ] Vérifier que la pesée garde le mode modifié

**✅ TEST 3 RÉUSSI** : ****\_\_\_****

---

## TEST 4 : Encodage ANSI exports Sage

### Préparation

- [ ] Créer ou utiliser un produit avec accents : **"VÉGÉTEAUX"**
- [ ] Créer une pesée avec ce produit
- [ ] Client : "Société TEST" (avec accents)

### Export

1. [ ] Aller dans **"Imports/Exports"**
2. [ ] Onglet **"Nouvel Export"**
3. [ ] Format : **"Sage 50 - Bons de livraison complets"**
4. [ ] Type : **"Nouveaux uniquement"**
5. [ ] Sélectionner la pesée créée
6. [ ] Cliquer sur **"Exporter"**

### Vérifications fichier téléchargé

7. [ ] Ouvrir le fichier `.txt` avec **Notepad (Windows)**
8. [ ] Vérifier l'encodage : Menu → Fichier → Enregistrer sous → Encodage = **ANSI**

### Vérifications contenu

- [ ] **"VÉGÉTEAUX"** : s'affiche correctement (pas V�G�TAUX)
- [ ] **"Société"** : s'affiche correctement (pas Soci�t�)
- [ ] **Autres accents** : tous corrects (é, è, ê, à, etc.)

### Import dans Sage 50

9. [ ] Ouvrir Sage 50
10. [ ] Menu **"Dossier"** → **"Options"** → **"Imports paramétrables"**
11. [ ] Sélectionner votre format d'import `Import_BL_auto_number`
12. [ ] Importer le fichier `.txt` exporté depuis l'app

### Vérifications dans Sage

- [ ] **Bon de livraison créé** : visible dans Sage
- [ ] **"VÉGÉTEAUX"** : s'affiche correctement ✅
- [ ] **"Société"** : s'affiche correctement ✅
- [ ] **Toutes les données** : correctes (client, adresse, quantité, prix)
- [ ] **Aucune erreur** d'import

**✅ TEST 4 RÉUSSI** : ****\_\_\_****

---

## TEST 5 : Workflow complet de bout en bout

### Scénario réel

**Contexte** : Journée type avec 10 pesées (simulation de 105)

### Setup

1. [ ] Import des clients Sage (si pas déjà fait)

### Pesée 1 : Client ESP (paiement Direct)

2. [ ] Nouvelle pesée
3. [ ] Rechercher client avec mode ESP
4. [ ] Vérifier auto-complétion mode → "Direct"
5. [ ] Remplir produit : "VÉGÉTEAUX"
6. [ ] Remplir poids : Entrée 2.5, Sortie 1.2
7. [ ] Enregistrer

### Pesée 2 : Client VIR (paiement En compte)

8. [ ] Nouvelle pesée
9. [ ] Rechercher client avec mode VIR
10. [ ] Vérifier auto-complétion mode → "En compte"
11. [ ] Remplir et enregistrer

### Pesées 3-10 : Mix de clients

12. [ ] Répéter avec différents clients
13. [ ] Vérifier à chaque fois l'auto-complétion

### Export vers Sage

14. [ ] Aller dans **"Imports/Exports"**
15. [ ] Format : **"Sage 50 - Bons de livraison complets"**
16. [ ] Exporter les 10 pesées
17. [ ] Télécharger le fichier

### Import dans Sage 50

18. [ ] Importer dans Sage avec le format `Import_BL_auto_number`
19. [ ] Vérifier dans Sage :
    - [ ] 10 bons de livraison créés
    - [ ] Tous les accents corrects ("VÉGÉTEAUX" ✅)
    - [ ] Toutes les données correctes
    - [ ] Clients bien identifiés
    - [ ] Prix justes

**✅ TEST 5 RÉUSSI** : ****\_\_\_****

---

## TEST 6 : Gestion des modes de paiement personnalisés

### Cas d'usage : Ajouter un nouveau mode

#### Création

1. [ ] Utilisateur → Paiements
2. [ ] Nouveau mode : Code = `PAYPAL`, Libellé = `PayPal`
3. [ ] Créer

#### Utilisation avec client

4. [ ] Aller dans **"Clients"**
5. [ ] Modifier un client existant
6. [ ] Changer le mode de paiement → **"PAYPAL - PayPal"**
7. [ ] Sauvegarder

#### Vérification pesée

8. [ ] Nouvelle pesée
9. [ ] Sélectionner ce client
10. [ ] **Vérifier que le mode paiement n'est PAS auto-complété** (PAYPAL n'est pas dans le mapping)
11. [ ] Mode devrait rester "Direct" (par défaut)

**✅ TEST 6 RÉUSSI** : ****\_\_\_****

---

## TEST 7 : Robustesse et cas limites

### Test : Fichier Sage vide

1. [ ] Créer un fichier .txt vide
2. [ ] Essayer de l'importer
3. [ ] **Attendu** : Message d'erreur "Le fichier est vide"

### Test : Fichier Sage corrompu

4. [ ] Créer un fichier .txt avec du texte aléatoire
5. [ ] Essayer de l'importer
6. [ ] **Attendu** : Message d'erreur ou 0 client trouvé

### Test : Import deux fois le même fichier

7. [ ] Importer `Export des clients.Txt`
8. [ ] Réimporter le même fichier
9. [ ] **Attendu** : "0 client(s) importé(s), 450 déjà existant(s)"

### Test : Client sans mode de paiement dans Sage

10. [ ] Identifier un client Sage sans mode de paiement
11. [ ] Importer
12. [ ] **Attendu** : Client importé, champ `modePaiementPreferentiel` vide
13. [ ] Sélectionner ce client dans une pesée
14. [ ] **Attendu** : Mode "Direct" par défaut

### Test : Caractères spéciaux extrêmes

15. [ ] Créer un produit : "DÉCHETS VÉGÉTAUX & BOIS (Œuvre)"
16. [ ] Exporter en format Sage
17. [ ] Ouvrir le fichier .txt
18. [ ] **Attendu** : Tous les caractères corrects (É, À, Œ, &)

**✅ TEST 7 RÉUSSI** : ****\_\_\_****

---

## 📊 Grille de résultats

| Test | Description         | Statut | Notes |
| ---- | ------------------- | ------ | ----- |
| 1    | Import clients Sage | ⬜     |       |
| 2    | Modes de paiement   | ⬜     |       |
| 3    | Auto-complétion     | ⬜     |       |
| 4    | Encodage ANSI       | ⬜     |       |
| 5    | Workflow complet    | ⬜     |       |
| 6    | Modes personnalisés | ⬜     |       |
| 7    | Cas limites         | ⬜     |       |

**Légende** :

- ⬜ À tester
- ✅ Réussi
- ❌ Échec
- ⚠️ À vérifier

---

## 🐛 Bugs détectés

### Bug #1

- **Description** :
- **Reproduction** :
- **Gravité** :
- **Fix** :

### Bug #2

- **Description** :
- **Reproduction** :
- **Gravité** :
- **Fix** :

---

## 💡 Améliorations suggérées

### Priorité Haute

1. [ ]

### Priorité Moyenne

1. [ ]

### Priorité Basse

1. [ ]

---

## ✅ Validation finale

### Checklist de livraison

- [ ] Tous les tests passent
- [ ] Aucun bug bloquant
- [ ] Documentation complète
- [ ] Formation utilisateur donnée
- [ ] Backup de la base de données fait

### Approbation

- [ ] Client satisfait
- [ ] Import Sage validé
- [ ] Encodage vérifié
- [ ] Performance acceptable

**Date de validation** : ****\_\_\_****
**Validé par** : ****\_\_\_****

---

## 📝 Notes du testeur

### Observations

```
[Espace pour notes libres]




```

### Points positifs

```
[Espace pour notes]




```

### Points à améliorer

```
[Espace pour notes]




```

---

**Fin du plan de test**

