#!/bin/bash
# Test setup — vérifier que l'environnement est prêt

set -e

PREP_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$PREP_DIR/../.."
VENV_DIR="$PREP_DIR/.venv"

echo "================================================================"
echo "T3.1 — Test setup du pipeline"
echo "================================================================"
echo ""

# 1. Venv
if [ ! -d "$VENV_DIR" ]; then
    echo "❌ Venv non trouvé: $VENV_DIR"
    echo "   Exécuter: python3 -m venv .venv"
    exit 1
fi
echo "✓ Venv: $VENV_DIR"

# 2. requirements.txt
if [ ! -f "$PREP_DIR/requirements.txt" ]; then
    echo "❌ requirements.txt manquant"
    exit 1
fi
echo "✓ requirements.txt"

# 3. Scripts Python
for script in download_mnt.py derive.py to_pmtiles.py georef_cadastre.py; do
    if [ ! -f "$PREP_DIR/$script" ]; then
        echo "❌ $script manquant"
        exit 1
    fi
    echo "✓ $script"
done

# 4. config/zone.json
if [ ! -f "$REPO_ROOT/config/zone.json" ]; then
    echo "❌ config/zone.json manquant"
    exit 1
fi
echo "✓ config/zone.json"

# 5. Répertoires de sortie
mkdir -p "$REPO_ROOT/data/derived" "$PREP_DIR/logs"
echo "✓ Répertoires de sortie créés"

# 6. Vérifier les commandes système
echo ""
echo "Vérification des commandes système..."

for cmd in python3 curl gdalinfo gdal2tiles.py; do
    if command -v $cmd &> /dev/null; then
        echo "  ✓ $cmd"
    else
        echo "  ⚠️  $cmd non trouvé (installé avec: brew install gdal; pip install gdal)"
    fi
done

# 7. Afficher config/zone.json
echo ""
echo "Zone cible:"
python3 -c "
import json
with open('$REPO_ROOT/config/zone.json') as f:
    z = json.load(f)
    print(f\"  Nom: {z.get('name')}\")
    print(f\"  INSEE: {z.get('insee')}\")
    print(f\"  Bbox: {z.get('bbox')}\")
"

echo ""
echo "✓ Setup validé. Prêt à exécuter le pipeline."
echo ""
echo "Commandes:"
echo "  1. source .venv/bin/activate"
echo "  2. python3 download_mnt.py"
echo "  3. python3 derive.py"
echo "  4. python3 to_pmtiles.py"
