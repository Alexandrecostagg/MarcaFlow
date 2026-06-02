#!/bin/zsh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

/usr/bin/python3 monitorar_rpi.py --baixar --notify
