#!/bin/bash
# task-loop のリンクだけを外す。dotfiles の uninstall.sh からも呼ばれる。

set -e

TL="$(cd "$(dirname "$0")" && pwd)"

remove_link() {
    local src="$1"
    local target="$2"
    if [ -L "$target" ]; then
        local current_dest
        current_dest=$(readlink "$target")
        if [ "$current_dest" = "$src" ]; then
            rm "$target"
            echo "  REMOVED: $target"
        else
            echo "  SKIP: $target points to $current_dest (not managed by this dotfiles)"
        fi
    else
        echo "  SKIP: $target is not a symlink"
    fi
}

echo "==> Removing Claude Code task-loop links..."
remove_link "$TL/workflows/task-loop.js" ~/.claude/workflows/task-loop.js
for f in "$TL"/agents/*.md; do
    remove_link "$f" ~/.claude/agents/"$(basename "$f")"
done
for f in "$TL"/hooks/*.sh; do
    remove_link "$f" ~/.claude/task-loop/hooks/"$(basename "$f")"
done
remove_link "$TL/guide.md" ~/.claude/task-loop/guide.md
remove_link "$TL/config.example.json" ~/.claude/task-loop/config.example.json
remove_link "$TL/notify.sh" ~/.claude/task-loop/notify.sh
echo "  NOTE: ~/.claude/CLAUDE.md の '@~/.claude/task-loop/guide.md' の行と、~/.claude/settings.json の task-loop の許可のルール（allow-rules.json）は残してある。要らなければ手で消す"
