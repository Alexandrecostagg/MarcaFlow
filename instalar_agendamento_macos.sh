#!/bin/zsh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
LABEL="br.com.marcaflow.monitor-rpi"
SOURCE="$ROOT/$LABEL.plist"
TARGET="$HOME/Library/LaunchAgents/$LABEL.plist"

mkdir -p "$HOME/Library/LaunchAgents"
cp "$SOURCE" "$TARGET"
chmod +x "$ROOT/rodar_monitoramento.sh"

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$TARGET"

echo "Agendamento instalado: toda terca-feira, 11:00."
echo "Arquivo: $TARGET"
