# 🎬 Guide Démo Rapide - À faire MAINTENANT

**URL de l'app** : http://localhost:8080/

---

## ✅ CHECKLIST DÉMO (15 minutes)

### 📥 PARTIE 1 : Import des clients (5 min)

#### Étape 1 : Accès

- [ ] Ouvre http://localhost:8080/ dans Chrome
- [ ] Clique sur **"Imports/Exports"** dans le menu de gauche
- [ ] Clique sur l'onglet **"Import Sage"** (en haut)

#### Étape 2 : Upload fichier

- [ ] Cherche le bouton **"Importer des clients"** (3ème section)
- [ ] Clique dessus → Un dialog s'ouvre
- [ ] Clique sur **"Choisir un fichier"**
- [ ] Navigue vers : `/home/hugo/Téléchargements/`
- [ ] Sélectionne : `Export des clients.Txt`

#### Étape 3 : Analyse

- [ ] Clique sur **"Analyser le fichier"**
- [ ] Attends 2-3 secondes
- [ ] ✅ Tu dois voir : "450 client(s) trouvé(s)"
- [ ] ✅ Un tableau d'aperçu avec Code, Nom, Adresse, Ville

#### Étape 4 : Import

- [ ] Clique sur **"Importer 450 client(s)"**
- [ ] Attends 2-3 secondes
- [ ] ✅ Message toast : "Import terminé - X importés, Y doublons, Z modes créés"
- [ ] Le dialog se ferme automatiquement

#### Étape 5 : Vérification

- [ ] Clique sur **"Clients"** dans le menu de gauche
- [ ] ✅ Tu dois voir tous tes clients Sage
- [ ] Ouvre un client au hasard
- [ ] Scroll en bas du formulaire
- [ ] ✅ Tu dois voir "Mode de paiement préférentiel" renseigné

**✅ PARTIE 1 TERMINÉE**

---

### 💳 PARTIE 2 : Modes de paiement (3 min)

#### Étape 1 : Accès

- [ ] Clique sur **"Utilisateur"** dans le menu de gauche
- [ ] Clique sur l'onglet **"Paiements"** (2ème onglet)

#### Étape 2 : Visualisation

- [ ] ✅ Tu dois voir un tableau avec 5 modes :
  - ESP - Espèce
  - VIR - Virement
  - PRVT - Prélèvement
  - CB - Carte bancaire
  - CHQ - Chèque
- [ ] Tous doivent être "Actif"

#### Étape 3 : Création d'un mode

- [ ] Clique sur **"Nouveau mode"**
- [ ] Remplis :
  - Code : `TEST`
  - Libellé : `Mode de test`
- [ ] Clique **"Créer"**
- [ ] ✅ "TEST" apparaît dans la liste

#### Étape 4 : Modification

- [ ] Clique sur le crayon ✏️ à côté de "TEST"
- [ ] Change le libellé en : `Test modifié`
- [ ] Clique "Mettre à jour"
- [ ] ✅ Le libellé est mis à jour

#### Étape 5 : Activation/Désactivation

- [ ] Clique sur le switch de "TEST"
- [ ] ✅ Le statut passe à "Inactif"
- [ ] Re-clique → Statut "Actif"

#### Étape 6 : Suppression

- [ ] Clique sur la corbeille 🗑️ de "TEST"
- [ ] Confirme
- [ ] ✅ "TEST" disparaît

**✅ PARTIE 2 TERMINÉE**

---

### 🎯 PARTIE 3 : Auto-complétion (4 min)

#### Étape 1 : Accès

- [ ] Clique sur **"Pesée"** dans le menu de gauche

#### Étape 2 : Recherche client

- [ ] Clique dans le champ **"Rechercher un client..."**
- [ ] Tape : `BRUNO` (ou un autre nom que tu as dans Sage)
- [ ] ✅ Des résultats s'affichent avec les clients importés

#### Étape 3 : Sélection

- [ ] Clique sur un client (ex: "SARL BRUNO JARDIN")
- [ ] ✅ Regarde attentivement ce qui se passe :
  - Nom : **"SARL BRUNO JARDIN"** (rempli)
  - Plaque : **"BF-218-GA"** (remplie)
  - **Moyen de paiement : "En compte"** ⭐ (AUTO-COMPLÉTÉ !)
  - Transporteur : **"BRUNO Francis"** (rempli si assigné)

#### Étape 4 : Vérification mapping

- [ ] Note le mode de paiement auto-complété
- [ ] Va dans "Clients" → Ouvre ce client
- [ ] Scroll en bas → Regarde "Mode de paiement préférentiel"
- [ ] ✅ Si c'est "PRVT" → Normal que ce soit "En compte"
- [ ] ✅ Si c'est "ESP" → Ce serait "Direct"

#### Étape 5 : Test avec autre client

- [ ] Retourne dans "Pesée"
- [ ] Nouvelle pesée
- [ ] Cherche un client avec mode ESP ou CB
- [ ] Sélectionne-le
- [ ] ✅ Mode de paiement : "Direct" (auto-complété)

**✅ PARTIE 3 TERMINÉE**

---

### 🔤 PARTIE 4 : Test encodage ANSI (3 min)

#### Étape 1 : Crée un produit avec accents (si pas déjà fait)

- [ ] Clique "Produits"
- [ ] Crée ou vérifie qu'il existe un produit : **"VÉGÉTEAUX"**

#### Étape 2 : Crée une pesée de test

- [ ] Clique "Pesée"
- [ ] Sélectionne un client
- [ ] Sélectionne le produit "VÉGÉTEAUX"
- [ ] Remplis poids entrée : 2.5
- [ ] Remplis poids sortie : 1.2
- [ ] Enregistre

#### Étape 3 : Export Sage

- [ ] Clique "Imports/Exports"
- [ ] Onglet "Nouvel Export"
- [ ] Format : **"Sage 50 - Bons de livraison complets"**
- [ ] Type : "Nouveaux uniquement"
- [ ] Clique "Afficher" dans l'aperçu
- [ ] Coche la pesée que tu viens de créer
- [ ] Clique **"Exporter"**
- [ ] ✅ Un fichier .txt se télécharge

#### Étape 4 : Vérification encodage

- [ ] Va dans `/home/hugo/Téléchargements/`
- [ ] Trouve le fichier (ex: `sage_bl_complet_new_2025-10-16_...txt`)
- [ ] **Ouvre-le avec un éditeur de texte**
- [ ] Cherche le mot "VÉGÉTEAUX"
- [ ] ✅ Il doit s'afficher correctement (pas V�G�TAUX)

#### Étape 5 : Test dans Sage 50 (si disponible)

- [ ] Ouvre Sage 50
- [ ] Menu "Dossier" → "Options" → "Imports paramétrables"
- [ ] Sélectionne ton format "Import_BL_auto_number"
- [ ] Importe le fichier .txt
- [ ] ✅ Dans Sage, "VÉGÉTEAUX" s'affiche parfaitement

**✅ PARTIE 4 TERMINÉE**

---

## 🧪 TEST BONUS : Page HTML d'encodage

### Ouvre dans ton navigateur :

```bash
# Méthode 1 : Double-clic sur le fichier
/home/hugo/work/verde-weigh-flow/test-encoding.html

# Méthode 2 : Depuis le terminal
xdg-open /home/hugo/work/verde-weigh-flow/test-encoding.html

# Méthode 3 : Via le serveur Vite (déjà running)
http://localhost:8080/test-encoding.html
```

### Ce que tu verras :

- Page de test interactive
- Caractères français (É, È, Ê, À, Ç, etc.)
- Bouton "Tester l'encodage Windows-1252"
- Résultats de conversion en temps réel

---

## 📊 RÉSUMÉ DES EMPLACEMENTS

| Fonctionnalité      | Menu            | Sous-menu     | Description                                 |
| ------------------- | --------------- | ------------- | ------------------------------------------- |
| **Import clients**  | Imports/Exports | Import Sage   | 3ème section, bouton "Importer des clients" |
| **Modes paiement**  | Utilisateur     | Paiements     | Tableau avec ESP, VIR, PRVT, CB, CHQ        |
| **Export ANSI**     | Imports/Exports | Nouvel Export | Format "Sage 50 - BL complets"              |
| **Auto-complétion** | Pesée           | (formulaire)  | Sélection client → Mode auto-complété       |
| **Mode client**     | Clients         | (formulaire)  | En bas : "Mode de paiement préférentiel"    |

---

## ✅ VALIDATION RAPIDE

### Après les 4 parties, tu devrais avoir :

- ✅ Importé tes clients Sage
- ✅ Vu les 5 modes de paiement
- ✅ Créé/supprimé un mode de test
- ✅ Testé l'auto-complétion du mode de paiement
- ✅ Exporté un fichier avec accents corrects

### Si tout fonctionne :

**🎉 C'EST BON ! Tout est prêt pour production !**

### Si un problème :

**📞 Dis-moi ce qui ne marche pas**

---

## 📸 CAPTURES D'ÉCRAN RECOMMANDÉES

Pour valider avec le client, prends des captures de :

1. **Import clients** :
   - Dialog d'import avec aperçu
   - Message "Import terminé"
2. **Gestionnaire modes** :
   - Tableau des modes de paiement
3. **Auto-complétion** :
   - Avant sélection client (vide)
   - Après sélection (tout rempli)
4. **Export ANSI** :
   - Fichier .txt ouvert montrant "VÉGÉTEAUX" correct

---

## 🎯 ACTION IMMÉDIATE

**MAINTENANT, FAIS CECI :**

1. Ouvre http://localhost:8080/
2. Suis les 4 parties ci-dessus (15 min)
3. Note tout problème rencontré
4. Dis-moi si tout fonctionne !

**GO ! 🚀**

---

**Contact si problème** : Dis-moi dans le chat !

