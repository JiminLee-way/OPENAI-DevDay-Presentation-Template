#!/usr/bin/env bash
# Scaffold a StageDeck presentation: new_deck.sh <out-dir> ["Deck title"]
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
out="${1:?usage: new_deck.sh <out-dir> [title]}"
title="${2:-Presentation}"
mkdir -p "$out/assets"
cp "$here/assets/stagedeck.css" "$here/assets/stagedeck.js" "$out/assets/"
python3 - "$here/templates/starter.html" "$out/index.html" "$title" <<'PY'
import sys, html
src, dst, title = sys.argv[1:4]
s = open(src, encoding='utf-8').read()
s = s.replace('{{TITLE}}', html.escape(title)).replace('../assets/', 'assets/')
open(dst, 'w', encoding='utf-8').write(s)
PY
echo "Created $out/index.html  (assets in $out/assets)"
echo "Preview:  cd \"$out\" && python3 -m http.server 8000   →  http://localhost:8000"
