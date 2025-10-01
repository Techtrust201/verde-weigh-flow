#!/bin/bash

# Script de test pour l'auto-restore
# Simule le scénario de migration d'ordinateur

echo "🔄 Test de l'Auto-Restore - Verde Weigh Flow"
echo "=============================================="

# Vérifier si le fichier de sauvegarde existe
BACKUP_FILE="verde-weigh-flow-backup.json"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Fichier de sauvegarde '$BACKUP_FILE' non trouvé"
    echo "💡 Créez d'abord une sauvegarde via l'application"
    exit 1
fi

echo "✅ Fichier de sauvegarde trouvé: $BACKUP_FILE"

# Copier le fichier dans le dossier Downloads (simulation)
DOWNLOADS_DIR="$HOME/Downloads"
if [ -d "$DOWNLOADS_DIR" ]; then
    cp "$BACKUP_FILE" "$DOWNLOADS_DIR/"
    echo "📁 Fichier copié dans: $DOWNLOADS_DIR"
else
    echo "⚠️ Dossier Downloads non trouvé: $DOWNLOADS_DIR"
fi

# Vérifier la compatibilité du navigateur
echo ""
echo "🔍 Vérification de compatibilité:"
echo "--------------------------------"

# Vérifier Chrome
if command -v google-chrome &> /dev/null; then
    echo "✅ Chrome détecté - Auto-restore complet"
elif command -v chromium-browser &> /dev/null; then
    echo "✅ Chromium détecté - Auto-restore complet"
else
    echo "❌ Chrome/Chromium non détecté"
fi

# Vérifier Edge
if command -v microsoft-edge &> /dev/null; then
    echo "✅ Edge détecté - Auto-restore complet"
else
    echo "❌ Edge non détecté"
fi

# Vérifier Firefox
if command -v firefox &> /dev/null; then
    echo "⚠️ Firefox détecté - Auto-restore limité"
else
    echo "❌ Firefox non détecté"
fi

echo ""
echo "📋 Instructions de test:"
echo "========================"
echo "1. Ouvrez l'application dans Chrome/Edge"
echo "2. Attendez 2-3 secondes"
echo "3. Une popup devrait apparaître proposant la restauration"
echo "4. Confirmez la restauration"
echo "5. Vérifiez que toutes vos données sont restaurées"

echo ""
echo "🔧 En cas de problème:"
echo "======================"
echo "• Allez dans Paramètres > Utilisateur > Restauration Automatique"
echo "• Cliquez sur 'Vérifier les sauvegardes'"
echo "• Ou utilisez 'Restauration manuelle'"

echo ""
echo "✅ Test préparé avec succès !"
echo "🌐 Ouvrez maintenant l'application dans votre navigateur"



