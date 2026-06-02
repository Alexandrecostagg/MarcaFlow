#!/bin/zsh
set -euo pipefail

LABEL="br.com.marcaflow.monitor-rpi"
TARGET="$HOME/Library/LaunchAgents/$LABEL.plist"

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
rm -f "$TARGET"

echo "Agendamento removido."
