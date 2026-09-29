#!/bin/bash
# task-loop だけを入れる。dotfiles の install.sh からも呼ばれる。

set -e

TL="$(cd "$(dirname "$0")" && pwd)"

if ! command -v jq >/dev/null; then
    echo "ERROR: jq が見つからない。先に 'brew install jq' を実行する。" >&2
    exit 1
fi

link_or_skip() {
    local src="$1"
    local target="$2"
    if [ -L "$target" ]; then
        local current_dest
        current_dest=$(readlink "$target")
        if [ "$current_dest" = "$src" ]; then
            echo "  LINK: $target (already linked)"
        else
            echo ""
            echo "  WARNING: $target is already a symlink pointing to $current_dest"
            echo "  To overwrite, run: rm \"$target\" && ln -sf \"$src\" \"$target\""
            echo "  Skipping."
        fi
    elif [ -e "$target" ]; then
        echo ""
        echo "  WARNING: $target already exists (not a symlink)."
        echo "  To overwrite, run: rm -rf \"$target\" && ln -sf \"$src\" \"$target\""
        echo "  Skipping."
    else
        ln -sf "$src" "$target"
        echo "  LINK: $target"
    fi
}

echo "==> Setting up Claude Code task-loop..."
mkdir -p ~/.claude/workflows ~/.claude/agents ~/.claude/task-loop/hooks
link_or_skip "$TL/workflows/task-loop.js" ~/.claude/workflows/task-loop.js
for f in "$TL"/agents/*.md; do
    link_or_skip "$f" ~/.claude/agents/"$(basename "$f")"
done
for f in "$TL"/hooks/*.sh; do
    link_or_skip "$f" ~/.claude/task-loop/hooks/"$(basename "$f")"
done
link_or_skip "$TL/guide.md" ~/.claude/task-loop/guide.md
link_or_skip "$TL/config.example.json" ~/.claude/task-loop/config.example.json

touch ~/.claude/CLAUDE.md
if ! grep -qF "@~/.claude/task-loop/guide.md" ~/.claude/CLAUDE.md; then
    printf '\n@~/.claude/task-loop/guide.md\n' >> ~/.claude/CLAUDE.md
    echo "    Added task-loop guide import to ~/.claude/CLAUDE.md"
else
    echo "    task-loop guide import already exists, skipping"
fi

SETTINGS=~/.claude/settings.json
[ -f "$SETTINGS" ] || echo '{}' > "$SETTINGS"
TMP_SETTINGS="$(mktemp)"
jq --slurpfile rules "$TL/allow-rules.json" '
  reduce $rules[0][] as $r (.;
    if ((.permissions.allow // []) | index($r)) then . else .permissions.allow = ((.permissions.allow // []) + [$r]) end)
' "$SETTINGS" > "$TMP_SETTINGS" && mv "$TMP_SETTINGS" "$SETTINGS"
echo "    Merged task-loop allow rules into $SETTINGS"

command -v cursor-agent >/dev/null || echo "  WARNING: cursor-agent が見つからない。task-loop の cursor-agent レビューに必要（claude/task-loop/README.md を参照）"
