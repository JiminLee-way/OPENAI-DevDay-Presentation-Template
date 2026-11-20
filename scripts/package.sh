#!/usr/bin/env bash
# Build release artifacts:
#   dist/stagedeck.zip  - upload to claude.ai (Settings > Capabilities > Skills); zip root = stagedeck/
#   docs/index.html     - single-file showcase for GitHub Pages
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
skill="$root/plugins/stagedeck/skills/stagedeck"
python3 "$skill/scripts/check_deck.py" "$skill/examples/showcase.html" >/dev/null
mkdir -p "$root/dist" "$root/docs"
rm -f "$root/dist/stagedeck.zip"
(cd "$skill/.." && zip -qr "$root/dist/stagedeck.zip" stagedeck -x '*.DS_Store' -x '*/__pycache__/*')
python3 "$skill/scripts/bundle.py" "$skill/examples/showcase.html" -o "$root/docs/index.html"
echo "built dist/stagedeck.zip and docs/index.html"
