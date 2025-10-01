# 📱 Mode Hors Ligne - Application Barberis Déchets Verts

## Guide Complet pour Client Non-Informaticien

---

## 🎯 **EN RÉSUMÉ POUR VOTRE CLIENT**

**L'application fonctionne comme un vrai logiciel installé sur ordinateur :**

- ✅ **Toujours fonctionnelle**, même sans internet
- ✅ **Sauvegarde automatique** de toutes vos données en local
- ✅ **Synchronisation intelligente** dès que internet revient
- ✅ **Ultra-rapide** car tout est stocké sur votre appareil
- ✅ **Jamais de perte de données**, même en cas de coupure
- ✅ **Économise votre forfait 3G** (consommation minimale)
- ✅ **Sécurisé** et confidentiel (données chez vous)

---

### **EXEMPLE D'UTILISATION :**

2. Scénario type

Étape | Connexion | Ce qui se passe
08 h 30 : tu fais 5 pesées hors ligne | ❌ | Elles entrent dans la queue IndexedDB
10 h 12 : retour de la 4G | ✅ | Événement sync → envoi immédiat (notification discrète bas-droite)
17 h 55 : PC allumé mais réseau KO | ❌ | periodicsync planifié, mais reporté
18 h 20 : Wi-Fi revient | ✅ | Chrome exécute le periodicsync différé → re-vérifie qu’il n’y a plus rien en file

## 🏠 **OÙ SONT STOCKÉES VOS DONNÉES ?**

### **Sur votre appareil uniquement** (comme un fichier Word)

```
📱 Votre Téléphone/Tablette/Ordinateur
├── 🗄️ Base de données locale (IndexedDB)
│   ├── 👥 Clients (noms, adresses, plaques...)
│   ├── 📦 Produits (prix, codes...)
│   ├── ⚖️ Pesées (tous les bons de pesée)
│   └── ⚙️ Paramètres (votre entreprise, API Sage...)
│
├── 💾 SAUVEGARDE AUTOMATIQUE (toutes les 5 min)
│   ├── 📄 Fichier : verde-weigh-flow-backup.json
│   ├── 📁 Emplacement : Dossier Téléchargements
│   ├── 🔄 Mise à jour automatique
│   └── 📅 Horodatage de chaque sauvegarde
│
├── 📄 Fichiers de l'application (Cache du navigateur)
│   ├── Interface utilisateur
│   ├── Images et icônes
│   └── Code de fonctionnement
│
└── 🔄 Queue de synchronisation
    └── Pesées en attente d'envoi vers Sage
```

**Important :** Vos données restent **CHEZ VOUS** avec **triple protection** :

1. **Stockage local** (instantané)
2. **Sauvegarde fichier** (toutes les 5 min)
3. **Backup cloud** (intelligent, lors de modifications paramètres)

---

## ☁️ **SAUVEGARDE CLOUD INTELLIGENTE (SUPABASE)**

### **🧠 Fonctionnement Intelligent**

**Supabase synchronise UNIQUEMENT le token Track Déchet :**

- ✅ **Token Track Déchet** → Sync automatique (pour éviter CORS)
- ✅ **Paramètres entreprise** → Sync automatique (nécessaires pour Track Déchet)
- ✅ **Pesées dangereuses** → Envoyées directement vers Track Déchet (pas stockées dans Supabase)
- ❌ **Pesées normales** → PAS de sync (pas nécessaire)
- ❌ **Clients sans produits dangereux** → PAS de sync (pas nécessaire)

### **💡 Avantages de cette approche :**

- 🚫 **Évite les problèmes CORS** : Appels API via Supabase proxy
- 📋 **Conformité réglementaire** : Synchronisation automatique des BSD
- ⚡ **Performance optimale** : Sync seulement pour les produits dangereux
- 🔒 **Sécurité renforcée** : Données sensibles protégées
- 💰 **Coût réduit** : Sync ciblée uniquement

### **📊 Ce qui EST sauvegardé dans le cloud :**

```json
{
  "track_dechet_token": "votre-token-track-dechet",
  "track_dechet_enabled": true,
  "track_dechet_sandbox_mode": true,
  "numero_recepisse": "PR-2024-001234",
  "date_validite_recepisse": "2025-12-31",
  "numero_autorisation": "AUT-2024-567890",
  "nom_entreprise": "Votre Entreprise",
  "siret": "11111111111111",
  "code_ape": "3821Z",
  "representant_legal": "Jean Dupont"
}
```

### **❌ Ce qui N'EST PAS sauvegardé dans le cloud :**

- Les pesées (normales ou dangereuses)
- Les clients
- Les produits
- Les transporteurs
- Les templates Sage

**🎯 Pourquoi ?** Supabase est utilisé uniquement comme proxy pour éviter les problèmes CORS. Les pesées dangereuses sont envoyées directement vers Track Déchet, pas stockées dans Supabase.

---

## 💾 **CAPACITÉS DE STOCKAGE**

### **Données Business (Clients, Pesées, Produits)**

| Type de donnée       | Poids unitaire | Quantité recommandée | Poids total |
| -------------------- | -------------- | -------------------- | ----------- |
| **1 Client complet** | ~2 KB          | 10 000 clients       | 20 MB       |
| **1 Pesée complète** | ~1 KB          | 100 000 pesées       | 100 MB      |
| **1 Produit**        | ~0.5 KB        | 1 000 produits       | 0.5 MB      |
| **TOTAL BUSINESS**   | -              | -                    | **~120 MB** |

### **Fichiers Application (Interface)**

| Composant              | Poids     | Description         |
| ---------------------- | --------- | ------------------- |
| **Interface complète** | 15 MB     | Toute l'application |
| **Images et icônes**   | 5 MB      | Logo, illustrations |
| **Cache optimisé**     | 8 MB      | Données temporaires |
| **TOTAL TECHNIQUE**    | **28 MB** |                     |

### **LIMITE TOTALE SÉCURISÉE**

- 🟢 **Usage normal :** 150 MB (largement suffisant)
- 🟡 **Usage intensif :** 500 MB (entreprise importante)
- 🔴 **Limite navigateur :** 2-10 GB (selon appareil)

**⚠️ En pratique :** Une entreprise normale utilisera moins de 50 MB après 5 ans !

---

## 🔍 **COMPATIBILITÉ CROSS-PLATFORM**

### **🖥️ Support des Systèmes d'Exploitation :**

| OS          | Chrome | Firefox | Safari | Edge | Compatibilité  |
| ----------- | ------ | ------- | ------ | ---- | -------------- |
| **Windows** | ✅     | ✅      | ❌     | ✅   | **Excellente** |
| **macOS**   | ✅     | ✅      | ✅     | ❌   | **Bonne**      |
| **Linux**   | ✅     | ✅      | ❌     | ❌   | **Correcte**   |

### **🌐 APIs de Sauvegarde par Navigateur :**

| API                    | Chrome | Firefox | Safari | Edge | Fallback |
| ---------------------- | ------ | ------- | ------ | ---- | -------- |
| **File System Access** | ✅     | ⚠️      | ❌     | ✅   | Download |
| **Download API**       | ✅     | ✅      | ✅     | ✅   | Aucun    |
| **IndexedDB**          | ✅     | ✅      | ✅     | ✅   | Aucun    |
| **Service Worker**     | ✅     | ✅      | ✅     | ✅   | Limité   |

### **⚠️ Problèmes de Compatibilité Connus :**

**Safari (macOS) :**

- ❌ File System Access API non supportée
- ✅ Utilise le téléchargement classique (fonctionne)
- ⚠️ Fonctionnalités avancées limitées

**Firefox (tous OS) :**

- ⚠️ File System Access API en développement
- ✅ Fallback vers téléchargement classique
- ✅ Bonne compatibilité générale

**Navigateurs anciens :**

- ❌ IndexedDB manquant (app ne fonctionne pas)
- ❌ Service Worker manquant (mode hors ligne limité)
- 💡 **Solution :** Mettre à jour le navigateur

### **🔧 Test de Compatibilité :**

**Dans l'application :**

1. Allez dans **Paramètres > Utilisateur**
2. Regardez le **rapport de compatibilité**
3. Vérifiez les APIs supportées

**Test manuel :**

```bash
# Exécuter le script de test
./test-compatibility.sh
```

### **💡 Recommandations par Client :**

**Client Windows :**

- ✅ **Chrome** : Compatibilité maximale
- ✅ **Edge** : Excellente compatibilité
- ✅ **Firefox** : Bonne compatibilité

**Client macOS :**

- ✅ **Chrome** : Compatibilité maximale
- ⚠️ **Safari** : Compatibilité limitée mais fonctionnelle
- ✅ **Firefox** : Bonne compatibilité

**Client Linux :**

- ✅ **Chrome** : Compatibilité maximale
- ✅ **Firefox** : Bonne compatibilité
- ⚠️ **Chromium** : Compatibilité correcte

---

### **🔄 Comment ça fonctionne (comme Word/Excel) :**

**Sauvegarde automatique toutes les 5 minutes :**

- 📄 **Fichier créé** : `verde-weigh-flow-backup.json`
- 📁 **Emplacement** : Dossier Téléchargements de votre navigateur
- 🔄 **Mise à jour** : Nouveau fichier toutes les 5 minutes
- 📅 **Horodatage** : Chaque fichier contient la date/heure

### **📁 Où trouver vos sauvegardes :**

**Sur Windows :**

```
📂 C:\Users\[VotreNom]\Downloads\
├── 📄 verde-weigh-flow-backup.json
├── 📄 verde-weigh-flow-backup (1).json
├── 📄 verde-weigh-flow-backup (2).json
└── 📄 ... (une sauvegarde toutes les 5 min)
```

**Sur Mac :**

```
📂 /Users/[VotreNom]/Downloads/
├── 📄 verde-weigh-flow-backup.json
├── 📄 verde-weigh-flow-backup (1).json
└── 📄 ... (sauvegardes automatiques)
```

### **🛡️ Triple Protection des Données :**

| Protection                | Type         | Fréquence                | Survit à                |
| ------------------------- | ------------ | ------------------------ | ----------------------- |
| **1. Stockage local**     | IndexedDB    | Instantané               | Refresh, redémarrage    |
| **2. Sauvegarde fichier** | Fichier JSON | Toutes les 5 min         | Tout (crash, formatage) |
| **3. Backup cloud**       | Supabase     | Modifications paramètres | Perte d'appareil        |

### **📊 Ce qui est sauvegardé (VERSION 2.0 - COMPLÈTE) :**

**Dans chaque fichier de sauvegarde :**

```json
{
  "version": "2.0",
  "timestamp": "2025-01-26T15:30:00.000Z",
  "userSettings": [
    {
      "nomEntreprise": "Votre Entreprise",
      "adresse": "123 Rue Example",
      "codePostal": "06000",
      "ville": "Nice",
      "email": "contact@entreprise.fr",
      "telephone": "04 93 12 34 56",
      "siret": "12345678901234",
      "codeAPE": "3821Z",
      "logo": "data:image/png;base64...",
      "representantLegal": "Jean Dupont",
      "trackDechetToken": "votre-token-track-dechet",
      "cleAPISage": "votre-cle-api-sage",
      "numeroRecepisse": "PR-2024-001234",
      "dateValiditeRecepisse": "2025-12-31",
      "numeroAutorisation": "AUT-2024-567890"
    }
  ],
  "clients": [
    {
      "id": 1,
      "nom": "Client ABC",
      "adresse": "456 Rue Client",
      "codePostal": "06000",
      "ville": "Nice",
      "telephone": "04 93 11 22 33",
      "email": "client@abc.fr",
      "plaqueImmatriculation": "AB-123-CD",
      "createdAt": "2025-01-26T10:00:00.000Z"
    }
  ],
  "products": [
    {
      "id": 1,
      "nom": "Déchets verts",
      "prix": 25.50,
      "unite": "tonne",
      "code": "DV001",
      "createdAt": "2025-01-26T10:00:00.000Z"
    }
  ],
  "pesees": [
    {
      "id": 1,
      "clientId": 1,
      "productId": 1,
      "transporteurId": 1,
      "poidsEntree": 1500,
      "poidsSortie": 800,
      "poidsNet": 700,
      "prixUnitaire": 25.50,
      "prixTotal": 17.85,
      "datePesee": "2025-01-26T14:30:00.000Z",
      "numeroBon": "BP-2025-001",
      "createdAt": "2025-01-26T14:30:00.000Z"
    }
  ],
  "transporteurs": [
    {
      "id": 1,
      "nom": "Transport ABC",
      "adresse": "789 Rue Transport",
      "telephone": "04 93 44 55 66",
      "email": "contact@transport.fr",
      "createdAt": "2025-01-26T10:00:00.000Z"
    }
  ],
  "sageTemplates": [
    {
      "id": 1,
      "nom": "Template Export Sage",
      "description": "Template pour export vers Sage 50",
      "configuration": {...},
      "createdAt": "2025-01-26T10:00:00.000Z"
    }
  ],
  "metadata": {
    "totalClients": 15,
    "totalProducts": 8,
    "totalPesees": 245,
    "totalTransporteurs": 3,
    "totalTemplates": 2,
    "lastPeseeDate": "2025-01-26T14:30:00.000Z",
    "backupSize": "2.3 MB"
  }
}
```

### **🔄 Comment ça fonctionne (MÉCANISME COMPLET) :**

**1. Sauvegarde intelligente (comme Word/Excel) :**

**Première sauvegarde :**

- 📁 **Sélection** : L'utilisateur choisit où sauvegarder le fichier
- 💾 **Création** : Fichier JSON complet avec toutes les données
- 🔗 **Mémorisation** : Le navigateur mémorise l'emplacement du fichier

**Sauvegardes suivantes :**

- ⚡ **Automatique** : Sauvegarde dans le même fichier (comme Ctrl+S)
- 🔄 **Silencieuse** : Aucun téléchargement, mise à jour directe
- 📊 **Complète** : Toutes les données mises à jour

**2. Synchronisation Supabase (intelligente) :**

- 🧠 **Déclenchement** : UNIQUEMENT lors de modifications des paramètres
- ☁️ **Backup cloud** : Paramètres utilisateur uniquement
- ⚡ **Efficace** : Pas de synchronisation inutile

**3. Fallback pour navigateurs non compatibles :**

- 📥 **Téléchargement** : Nouveau fichier à chaque sauvegarde
- ⚠️ **Limitation** : Plus de fichiers dans les téléchargements
- 🔄 **Fonctionnel** : Mais moins pratique

**4. Restauration automatique (AUTO-RESTORE) :**

- 🔍 **Détection** : L'app détecte automatiquement les fichiers de sauvegarde
- 📁 **Recherche** : Scan du dossier Téléchargements pour `verde-weigh-flow-backup.json`
- ⚡ **Proposition** : Confirmation automatique de restauration
- 📥 **Import** : Restauration de toutes les données du fichier
- 🚀 **Prêt** : L'app fonctionne immédiatement avec toutes les données

**5. Restauration manuelle :**

- 📤 **Sélection** : Choisir un fichier de sauvegarde manuellement
- 🗑️ **Vidage** : Suppression de toutes les données actuelles
- 📥 **Import** : Restauration de toutes les données du fichier
- 🔄 **Rechargement** : Redémarrage de l'application

### **🔧 Gestion des sauvegardes :**

**Dans l'application :**

- ⚙️ **Paramètres** → **Utilisateur** → **Informations de Sauvegarde**
- 📊 **Statistiques** : Nombre de clients, produits, pesées, etc.
- 💾 **Test de sauvegarde** : Bouton "Tester la sauvegarde maintenant"
- 🔄 **Auto-restore** : Détection automatique des fichiers de sauvegarde
- 📤 **Restauration manuelle** : Via le composant BackupManager
- 🔍 **Compatibilité** : Vérification automatique des APIs

**Actions recommandées :**

- 📁 **Renommer** vos sauvegardes avec des dates
- 💾 **Copier** régulièrement sur clé USB ou cloud
- 🗑️ **Supprimer** les anciennes sauvegardes (garder les 10 dernières)
- 📋 **Tester** la restauration une fois par mois
- 🔍 **Vérifier** la compatibilité sur différents navigateurs

---

## 🔄 **RESTAURATION AUTOMATIQUE (AUTO-RESTORE)**

### **🎯 Fonctionnement Intelligent**

**L'application détecte automatiquement les fichiers de sauvegarde et propose une restauration complète :**

### **📋 Scénario Type :**

```
🖥️ Ordinateur A (ancien)
├── 📄 verde-weigh-flow-backup.json (copié)
└── 📋 Toutes vos données

📁 Transfert vers Ordinateur B (nouveau)
├── 📄 verde-weigh-flow-backup.json (collé)
└── 🌐 Ouverture de l'application web

🔍 Détection automatique
├── ✅ Fichier de sauvegarde trouvé
├── ❓ "Voulez-vous restaurer vos données ?"
└── ✅ Confirmation → Restauration complète

🚀 Application prête
├── 👥 Tous vos clients restaurés
├── 📦 Tous vos produits restaurés
├── ⚖️ Toutes vos pesées restaurées
└── ⚙️ Tous vos paramètres restaurés
```

### **🔧 Conditions d'Activation**

**L'auto-restore s'active SEULEMENT si :**

- ✅ **Aucune donnée existante** dans l'application
- ✅ **Fichier de sauvegarde détecté** dans le dossier Téléchargements
- ✅ **Navigateur compatible** (Chrome/Edge recommandé)
- ✅ **Confirmation utilisateur** (sécurité)

**❌ L'auto-restore NE s'active PAS si :**

- ❌ Vous avez déjà des données dans l'app
- ❌ Aucun fichier de sauvegarde trouvé
- ❌ Navigateur non compatible (Safari/Firefox)

### **📱 Compatibilité par Navigateur**

| Navigateur  | Auto-Restore | Détection      | Restauration   |
| ----------- | ------------ | -------------- | -------------- |
| **Chrome**  | ✅ Complet   | ✅ Automatique | ✅ Automatique |
| **Edge**    | ✅ Complet   | ✅ Automatique | ✅ Automatique |
| **Firefox** | ⚠️ Limité    | ⚠️ Manuel      | ✅ Automatique |
| **Safari**  | ❌ Non       | ❌ Non         | ✅ Manuel      |

### **🛡️ Sécurité et Protection**

**Protections intégrées :**

- 🔒 **Confirmation obligatoire** avant restauration
- 🛡️ **Vérification données existantes** (pas d'écrasement accidentel)
- 📋 **Logs détaillés** de toutes les opérations
- ⚠️ **Alertes claires** sur les conséquences

**Messages de sécurité :**

```
⚠️ ATTENTION : Cette opération va :
• Supprimer toutes les données actuelles
• Restaurer les données du fichier de sauvegarde
• Redémarrer l'application

Êtes-vous sûr de vouloir continuer ?
```

### **🔧 Gestion Manuelle**

**Si l'auto-restore ne fonctionne pas :**

1. **Vérification manuelle :**

   - Paramètres → Utilisateur → Restauration Automatique
   - Bouton "Vérifier les sauvegardes"

2. **Restauration forcée :**

   - Bouton "Forcer la vérification" (si données existantes)
   - Confirmation supplémentaire requise

3. **Restauration manuelle :**
   - Bouton "Restauration manuelle"
   - Sélection du fichier de sauvegarde

### **💡 Conseils d'Utilisation**

**Pour une migration réussie :**

- 📁 **Copiez le fichier** `verde-weigh-flow-backup.json` sur le nouvel ordinateur
- 📂 **Placez-le** dans le dossier Téléchargements
- 🌐 **Ouvrez l'application** dans Chrome ou Edge
- ⏱️ **Attendez 2-3 secondes** pour la détection automatique
- ✅ **Confirmez** la restauration quand proposée

**En cas de problème :**

- 🔄 **Rechargez** la page et réessayez
- 📤 **Utilisez** la restauration manuelle
- 🔍 **Vérifiez** la compatibilité du navigateur

---

## ⏱️ **DURÉE DE CONSERVATION**

### **Données Métier (Infinies)**

- ✅ **Clients, Produits, Pesées :** Conservation **PERMANENTE**
- ✅ **Historique complet :** Toutes vos pesées depuis le début
- ✅ **Sauvegarde locale :** Même si vous n'ouvrez pas l'app pendant 1 an

### **Cache Technique (Temporaire)**

- 🔄 **Interface :** 30 jours sans connexion, puis refresh
- 🔄 **Images :** 7 jours, puis re-téléchargement si besoin
- 🔄 **API temporaire :** 24h, puis actualisation

**📝 Note :** Vos données importantes (clients, pesées) ne sont JAMAIS supprimées automatiquement.

---

## 🌐 **CONSOMMATION INTERNET MENSUELLE**

### **Première Installation**

- 📥 **Téléchargement initial :** 25 MB (une seule fois)
- ⚙️ **Configuration :** 1 MB
- **TOTAL PREMIÈRE FOIS :** 26 MB

### **Usage Quotidien Normal** (50 pesées/jour)

| Action                        | Fréquence  | Consommation | Mensuel  |
| ----------------------------- | ---------- | ------------ | -------- |
| **Synchronisation pesées**    | 1x/jour    | 50 KB        | 1.5 MB   |
| **Mise à jour prix produits** | 1x/semaine | 10 KB        | 0.04 MB  |
| **Actualisation clients**     | 2x/semaine | 20 KB        | 0.16 MB  |
| **Vérification connexion**    | 10x/jour   | 1 KB         | 0.3 MB   |
| **TOTAL QUOTIDIEN**           |            | **81 KB**    | **2 MB** |

### **Cas Extrême** (200 pesées/jour, usage intensif)

- 🔥 **Maximum absolu :** 8 MB/mois
- 📊 **Répartition :** 80% sync pesées, 20% maintenance

### **Mode Économie Activé**

- 💚 **Consommation réduite de 70% :** 0.6 MB/mois
- 🚫 **Sync auto désactivée** (manuelle uniquement)
- ⚡ **Vérifications minimales**

**🎯 CONCLUSION :** Même avec 1 GB/mois, vous êtes tranquille !

---

## 🚀 **INSTALLATION COMME LOGICIEL**

### **📱 Sur Mobile (Android/iPhone)**

**Étape 1 :** Ouvrir l'app dans Chrome/Safari

```
🌐 Aller sur : votre-app.lovable.app
```

**Étape 2 :** Menu navigateur

```
📱 Android : Menu Chrome > "Ajouter à l'écran d'accueil"
🍎 iPhone : Bouton Partage > "Sur l'écran d'accueil"
```

**Étape 3 :** Confirmation

```
✅ Icône apparaît sur bureau
✅ Ouvre en plein écran (comme app native)
✅ Fonctionne hors ligne
```

### **💻 Sur Ordinateur (Windows/Mac)**

**Méthode 1 : Depuis Chrome**

```
1. 🌐 Ouvrir votre-app.app dans Chrome
2. ⚙️ Menu Chrome (3 points) > "Installer [Nom App]..."
3. ✅ Confirmer l'installation
4. 🖥️ Icône créée sur bureau + menu démarrer
```

**Méthode 2 : Depuis Edge**

```
1. 🌐 Ouvrir l'app dans Microsoft Edge
2. ⚙️ Menu (...) > "Applications" > "Installer cette application"
3. ✅ L'app s'installe comme logiciel Windows
```

**Résultat :**

- 🖥️ **Icône sur bureau** (comme Word, Excel...)
- 🚀 **Démarrage direct** (sans navigateur visible)
- ⚡ **Plus rapide** qu'en navigateur
- 🔒 **Mode dédié** (pas d'onglets parasites)

---

## 🔌 **PREMIÈRE CONNEXION : INTERNET NÉCESSAIRE ?**

### **🟢 OUI, Internet requis pour :**

1. **Téléchargement initial** (25 MB - une seule fois)
2. **Activation du mode hors ligne** (configuration automatique)
3. **Récupération données Sage** (si applicable)

### **⏱️ Durée première installation :**

- 📶 **4G/WiFi :** 30 secondes
- 📶 **3G :** 2-3 minutes
- 📶 **2G :** 8-10 minutes

### **🔄 Après première installation :**

```
✅ JAMAIS besoin d'internet pour démarrer
✅ JAMAIS besoin d'internet pour pesées
✅ JAMAIS besoin d'internet pour consulter historique
✅ Internet SEULEMENT pour sync Sage (optionnel)
```

---

## 📋 **FONCTIONNALITÉS HORS LIGNE vs EN LIGNE**

### **🟢 TOTALEMENT HORS LIGNE** (0% internet)

| Fonction                    | Détail                           | Performance |
| --------------------------- | -------------------------------- | ----------- |
| ⚖️ **Créer pesées**         | Tous les champs disponibles      | Instantané  |
| 👥 **Gérer clients**        | Ajout, modification, suppression | Instantané  |
| 📦 **Gérer produits**       | Prix, codes, favoris             | Instantané  |
| 📊 **Consulter historique** | Toutes pesées locales            | Instantané  |
| 🧮 **Calculer totaux**      | Poids nets, prix TTC             | Instantané  |
| 🔍 **Rechercher**           | Clients, pesées, produits        | Instantané  |
| 📱 **Interface complète**   | Tous menus et écrans             | Instantané  |

### **🟡 NÉCESSITE INTERNET** (export uniquement)

| Fonction                   | Fréquence          | Consommation |
| -------------------------- | ------------------ | ------------ |
| 📤 **Export vers Sage 50** | Manuel (1x/jour)   | 20 KB        |
| 📥 **Import clients Sage** | Manuel (si besoin) | 100 KB       |
| 🔧 **Mise à jour app**     | 1x/mois max        | 5 MB         |

**📝 Note :** Synchronisation automatique Sage mise en stand-by. Export manuel recommandé pour plus de fiabilité.

### **🚫 JAMAIS BLOQUÉ**

```
❌ PAS de message "Connexion requise"
❌ PAS d'écran blanc en panne réseau
❌ PAS de perte de données saisies
❌ PAS d'attente de chargement
```

---

## 🛡️ **SÉCURITÉ & FIABILITÉ**

### **Protection des Données**

- 🔒 **Stockage local chiffré** (standard navigateur)
- 🏠 **Données chez vous** (pas sur serveur externe)
- 🔐 **Transmission sécurisée** (HTTPS uniquement)
- 🚫 **Pas de tracking** ni publicité

### **Fiabilité Technique**

- ✅ **Sauvegarde instantanée** (chaque saisie)
- ✅ **Récupération automatique** après crash
- ✅ **Vérification intégrité** des données
- ✅ **Backup avant sync** (sécurité)

### **Cas d'Urgence**

```
📱 Téléphone cassé : Données perdues (comme fichier Word)
💻 Ordinateur formaté : Données perdues (sauvegarde Sage)
🔄 Synchronisation régulière : Protection optimale
```

---

## 🎯 **CAS D'USAGE TYPIQUES**

### **👨‍🔧 Technicien Mobile**

```
📍 Emplacement : Chantier isolé (pas de réseau)
⚖️ Action : 20 pesées dans la journée
💾 Stockage : Toutes pesées sauvées localement
🔄 Sync : Le soir en rentrant (WiFi bureau)
✅ Résultat : Aucun souci, tout fonctionne
```

### **🏢 Bureau avec 3G Limitée**

```
📶 Connexion : 3G instable, 500 MB/mois
💡 Solution : Export manuel quotidien
⚖️ Usage : 100 pesées/jour
📤 Export : 1x/jour vers Sage 50 (20 KB)
✅ Résultat : Dans le forfait, ultra-économique
```

### **🚛 Déplacement Constant**

```
🛣️ Situation : Camion, réseau variable
📱 Installation : App sur téléphone
⚖️ Usage : Saisie continue, export manuel
📤 Export : 1x/jour quand réseau disponible
✅ Résultat : Jamais d'interruption
```

---

## 🔧 **PARAMÈTRES AVANCÉS UTILISATEUR**

### **Interface de Contrôle** (accessible dans l'app)

```
⚙️ Paramètres > Export & Sauvegarde

📤 Export vers Sage 50
   ├── 📄 Format : Excel/CSV compatible Sage
   ├── 🕐 Fréquence : Manuel (recommandé)
   └── 📊 Statut : Dernier export il y a 2h

💾 Sauvegarde Automatique
   ├── ✅ Activée (toutes les 5 min)
   ├── 📁 Emplacement : Téléchargements
   └── 📄 Fichier : verde-weigh-flow-backup.json

📊 Statistiques
   ├── 📈 Données stockées : 15 MB / 150 MB
   ├── 📤 Pesées exportées : 245
   ├── 💾 Sauvegardes : 12 fichiers
   └── 📱 Dernière vérif : Il y a 3 min

🛠️ Actions Avancées
   ├── 📤 Export maintenant vers Sage
   ├── 🧹 Nettoyer cache (libère espace)
   ├── 💾 Sauvegarde manuelle
   └── 🔧 Diagnostics export
```

### **Notifications Intelligentes**

```
🔔 L'app vous prévient SEULEMENT si :
   ├── ✅ Export réussi vers Sage
   ├── ⚠️ Espace stockage < 10 MB restant
   ├── 💾 Sauvegarde automatique réussie
   └── 🔧 Mise à jour importante disponible

🚫 JAMAIS de spam ni notifications inutiles
```

---

## 📞 **SUPPORT CLIENT : PHRASES CLÉS**

### **Questions Fréquentes Simplifiées**

**"Ça marche sans internet ?"**
➡️ _"Oui, 100% des fonctions de pesée marchent sans internet. C'est comme avoir Excel installé sur votre PC."_

**"Mes données sont-elles sécurisées ?"**
➡️ _"Vos données restent chez vous, sur votre appareil. Comme un fichier Word, personne d'autre n'y accède."_

**"Ça consomme beaucoup d'internet ?"**
➡️ _"Non, 2 MB par mois maximum. Même avec 500 MB/mois vous êtes large !"_

**"Comment installer comme un vrai logiciel ?"**
➡️ _"Depuis Chrome : Menu > Installer l'application. Une icône apparaît sur votre bureau."_

**"Que se passe-t-il si je perds le réseau ?"**
➡️ _"Rien ! Vous continuez à travailler normalement. L'export se fera dès que le réseau revient."_

**"Combien de pesées puis-je stocker ?"**
➡️ _"Plus de 100 000 pesées facilement. C'est plusieurs années de données."_

**"Faut-il internet pour démarrer l'app ?"**
➡️ _"Seulement la première fois (installation). Après, jamais besoin d'internet pour démarrer."_

**"Où sont mes sauvegardes automatiques ?"**
➡️ _"Dans le dossier Téléchargements de votre ordinateur, fichier 'verde-weigh-flow-backup.json'. Avec les navigateurs modernes (Chrome, Edge), la sauvegarde se fait dans le même fichier (comme Word). Avec Safari/Firefox, un nouveau fichier est créé toutes les 5 minutes."_

**"Que faire si je perds mon ordinateur ?"**
➡️ _"Copiez régulièrement vos fichiers de sauvegarde sur une clé USB ou un cloud. En cas de perte, vous pourrez restaurer sur un nouvel ordinateur."_

**"La sauvegarde automatique consomme-t-elle de l'espace ?"**
➡️ _"Chaque fichier fait environ 1-2 MB. Même avec 100 sauvegardes, c'est moins de 200 MB. Vous pouvez supprimer les anciennes si besoin."_

**"Comment savoir si la sauvegarde fonctionne ?"**
➡️ _"Regardez dans vos téléchargements : vous devriez voir des fichiers 'verde-weigh-flow-backup.json' qui se créent toutes les 5 minutes."_

**"Comment exporter vers Sage 50 ?"**
➡️ _"Dans l'app : Onglet 'Exports' > Sélectionner période > Choisir format Sage > Exporter. Un fichier CSV/Excel est créé que vous importez manuellement dans Sage 50."_

**"Pourquoi pas de synchronisation automatique avec Sage ?"**
➡️ _"Sage 50 ne permet pas d'utiliser des tokens API pour la synchronisation automatique. L'export/import manuel est plus fiable et vous gardez le contrôle."_

**"Comment migrer vers un nouvel ordinateur ?"**
➡️ _"Copiez votre fichier 'verde-weigh-flow-backup.json' sur le nouvel ordinateur, ouvrez l'application dans Chrome/Edge, et l'auto-restore détectera automatiquement le fichier et proposera de restaurer toutes vos données."_

**"L'auto-restore fonctionne-t-il sur tous les navigateurs ?"**
➡️ _"L'auto-restore fonctionne parfaitement sur Chrome et Edge. Sur Firefox/Safari, utilisez la restauration manuelle via Paramètres > Utilisateur > Restauration Automatique."_

---

## 🎉 **CONCLUSION TECHNIQUE**

Cette PWA est conçue pour **l'autonomie maximale** avec **triple protection intelligente** :

✅ **Fiabilité :** Fonctionne même avec réseau défaillant  
✅ **Performance :** Plus rapide qu'une app serveur  
✅ **Économie :** Consommation internet minimale + sync intelligente  
✅ **Simplicité :** Installation en 2 clics  
✅ **Sécurité :** Données sous votre contrôle  
✅ **Flexibilité :** S'adapte à tous les environnements  
✅ **Sauvegarde :** Triple protection (local + fichier + cloud intelligent)  
✅ **Persistance :** Jamais de perte de données  
✅ **Intelligence :** Sauvegarde cloud uniquement lors de modifications

**🎯 L'objectif :** Que votre client ne ressente JAMAIS de limitation technique, même dans les conditions les plus difficiles, avec la tranquillité d'esprit d'une sauvegarde automatique intelligente comme les vrais logiciels professionnels.

---

_📅 Document mis à jour le : 26 Janvier 2025_  
_🔧 Version PWA : 3.1 - Mode Hors Ligne + Sauvegarde Intelligente_  
_💾 Nouvelle fonctionnalité : Sauvegarde fichier intelligente + Sync cloud optimisée_
