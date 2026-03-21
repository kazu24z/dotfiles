# dotfiles

Claude Code開発環境のdotfiles管理リポジトリ。

## セットアップ

```bash
# 1. リポジトリをclone
git clone https://github.com/kazu24z/dotfiles ~/dotfiles

# 2. インストールスクリプトを実行
cd ~/dotfiles && ./install.sh

# 3. シェルに反映
source ~/.zshrc
```

## ツールの追加・削除

`Brewfile` を編集してから `install.sh` を再実行する。

```bash
# Brewfileを編集後
~/dotfiles/install.sh
```

## 管理している設定ファイル

| ファイル | 内容 |
|---|---|
| `config/nvim/` | Neovim + LazyVim |
| `config/zellij/` | Zellij・レイアウト |
| `config/ghostty/` | Ghostty（ターミナル） |
| `config/starship.toml` | プロンプト |
| `home/zshrc.dev-tools` | CLIツール・エイリアス |
