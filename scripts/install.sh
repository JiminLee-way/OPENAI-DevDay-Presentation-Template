#!/usr/bin/env bash
# Install the StageDeck skill without the plugin system.
#   scripts/install.sh claude   -> ~/.claude/skills/stagedeck   (Claude Code personal skill)
#   scripts/install.sh codex    -> ~/.agents/skills/stagedeck   (Codex user skill)
#   scripts/install.sh all      -> both
#   add --link to symlink instead of copy (for editing the repo in place)
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
src="$root/plugins/stagedeck/skills/stagedeck"
target="${1:-all}"; mode="${2:-}"
put() {
  local dest="$1/stagedeck"
  mkdir -p "$1"
  rm -rf "$dest"
  if [ "$mode" = "--link" ]; then ln -s "$src" "$dest"; else cp -R "$src" "$dest"; fi
  echo "installed -> $dest"
}
case "$target" in
  claude) put "$HOME/.claude/skills" ;;
  codex)  put "$HOME/.agents/skills" ;;
  all)    put "$HOME/.claude/skills"; put "$HOME/.agents/skills" ;;
  *) echo "usage: install.sh [claude|codex|all] [--link]"; exit 1 ;;
esac
