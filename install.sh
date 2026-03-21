#!/bin/bash

set -e

DOTFILES_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "==> Installing tools..."
brew bundle --file="$DOTFILES_DIR/Brewfile"

echo "==> Creating symlinks..."
mkdir -p ~/.config

ln -sf "$DOTFILES_DIR/config/nvim" ~/.config/nvim
ln -sf "$DOTFILES_DIR/config/zellij" ~/.config/zellij
ln -sf "$DOTFILES_DIR/config/starship.toml" ~/.config/starship.toml
ln -sf "$DOTFILES_DIR/home/zshrc.dev-tools" ~/.zshrc.dev-tools

echo "==> Updating ~/.zshrc..."
if ! grep -q "source ~/.zshrc.dev-tools" ~/.zshrc; then
    echo "source ~/.zshrc.dev-tools" >> ~/.zshrc
    echo "    Added source line to ~/.zshrc"
else
    echo "    Already exists, skipping"
fi

echo "==> Done. Run 'source ~/.zshrc' to apply changes."
