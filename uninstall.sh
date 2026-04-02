#!/bin/bash

set -e

DOTFILES_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "==> Removing symlinks..."

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

remove_link "$DOTFILES_DIR/config/cmux" ~/.config/cmux
remove_link "$DOTFILES_DIR/config/yazi" ~/.config/yazi
remove_link "$DOTFILES_DIR/config/nvim" ~/.config/nvim
remove_link "$DOTFILES_DIR/config/zellij" ~/.config/zellij
remove_link "$DOTFILES_DIR/config/ghostty" ~/.config/ghostty
remove_link "$DOTFILES_DIR/config/starship.toml" ~/.config/starship.toml
remove_link "$DOTFILES_DIR/home/zshrc.dev-tools" ~/.zshrc.dev-tools

echo "==> Cleaning ~/.zshrc..."
if grep -q "source ~/.zshrc.dev-tools" ~/.zshrc; then
    cp ~/.zshrc ~/.zshrc.bak
    echo "  Backup: ~/.zshrc.bak"
    sed -i '' '/source ~\/.zshrc.dev-tools/d' ~/.zshrc
    echo "  Removed source line from ~/.zshrc"
else
    echo "  Nothing to remove"
fi

echo "==> Done. Run 'source ~/.zshrc' to apply changes."
