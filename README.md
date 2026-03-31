# dotfiles

Claude Code開発環境のdotfiles管理リポジトリ。

## セットアップ

cloneする場所は任意です。

```bash
# 1. Homebrewをインストール（未インストールの場合）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. リポジトリをclone（場所は任意）
git clone https://github.com/kazu24z/dotfiles <任意のパス>

# 3. インストールスクリプトを実行
cd <cloneしたパス> && ./install.sh

# 4. シェルに反映
source ~/.zshrc
```

> Neovim初回起動時（`nvim`）はプラグインが自動インストールされます。完了したら `:q` で終了してください。

## 端末固有の設定

起動ディレクトリ等、端末ごとに異なる設定は `~/.config/ghostty/config.local` に記述します（git管理外）。

```bash
# 例
echo "working-directory = ~/your/project" > ~/.config/ghostty/config.local
```

## 使い方

```bash
# cmux内のターミナルで開発環境を起動（Claude Code + yazi + terminal）
cdev [ディレクトリ]  # 省略時はカレントディレクトリ
```

## ツールの追加・削除

`Brewfile` を編集してから `install.sh` を再実行する。

```bash
# Brewfileを編集後
cd <cloneしたパス> && ./install.sh
```

## 管理している設定ファイル

| ファイル               | 内容                        |
| ---------------------- | --------------------------- |
| `config/nvim/`         | Neovim + LazyVim            |
| `config/cmux/`         | cmux カスタムコマンド       |
| `config/ghostty/`      | cmux ターミナル設定         |
| `config/zellij/`       | Zellij（現在未使用）        |
| `config/starship.toml` | プロンプト                  |
| `home/zshrc.dev-tools` | CLIツール・エイリアス・cdev |
