#!/bin/bash

set -e

DOTFILES_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "==> Installing tools..."
brew bundle --file="$DOTFILES_DIR/Brewfile"

echo "==> Creating symlinks..."
mkdir -p ~/.config

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

link_or_skip "$DOTFILES_DIR/config/cmux" ~/.config/cmux
link_or_skip "$DOTFILES_DIR/config/yazi" ~/.config/yazi
link_or_skip "$DOTFILES_DIR/config/nvim" ~/.config/nvim
link_or_skip "$DOTFILES_DIR/config/zellij" ~/.config/zellij
link_or_skip "$DOTFILES_DIR/config/ghostty" ~/.config/ghostty
link_or_skip "$DOTFILES_DIR/config/starship.toml" ~/.config/starship.toml
link_or_skip "$DOTFILES_DIR/home/zshrc.dev-tools" ~/.zshrc.dev-tools

echo "==> Updating ~/.zshrc..."
if ! grep -q "source ~/.zshrc.dev-tools" ~/.zshrc; then
    echo "source ~/.zshrc.dev-tools" >> ~/.zshrc
    echo "    Added source line to ~/.zshrc"
else
    echo "    Already exists, skipping"
fi

echo "==> Done. Run 'source ~/.zshrc' to apply changes."
