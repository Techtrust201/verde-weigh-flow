# 🎯 Guide d'utilisation du mapping Sage

## 📋 Exemple concret : Mapping de la colonne "N° pièce"

### 1. **Source de données** : "Données de pesée"

- **Pourquoi ?** Parce que le numéro de pièce correspond au numéro de ton Bon de pesée
- **Exemples disponibles** : Numéro de bon, Date de pesée, Poids brut, Prix HT

### 2. **Champ spécifique** : "Numéro de bon"

- **Pourquoi ?** C'est le champ exact qui contient le numéro unique de ta pesée
- **Type** : Texte (ex: "BL43091")

### 3. **Transformation** : "Ajouter préfixe"

- **Pourquoi ?** Pour ajouter "BL" devant le numéro si ce n'est pas déjà fait
- **Valeur** : "BL"
- **Résultat** : "BL43091" au lieu de "43091"

## 🔄 Autres exemples de mapping :

### Colonne "Date pièce" :

- **Source** : Données de pesée
- **Champ** : Date et heure
- **Transformation** : Formater date (DD/MM/YYYY)

### Colonne "Nom client" :

- **Source** : Informations client
- **Champ** : Nom
- **Transformation** : Majuscules

### Colonne "Code article" :

- **Source** : Détails produit
- **Champ** : Code produit
- **Transformation** : Aucune

### Colonne "Quantité" :

- **Source** : Données de pesée
- **Champ** : Poids net
- **Transformation** : Calculer (diviser par 1000 pour convertir en tonnes)

## 💡 Conseils :

1. **Commence par les colonnes obligatoires** (marquées en rouge)
2. **Utilise les exemples** affichés pour chaque colonne
3. **Teste avec "Mapping intelligent"** pour des suggestions automatiques
4. **Les colonnes vides** peuvent être ignorées ou mappées à des valeurs fixes

## ⚠️ Résolution des problèmes d'encodage :

Le système détecte automatiquement les fichiers Sage avec des caractères `�` et les convertit en ISO-8859-1 pour un affichage correct des accents français.
