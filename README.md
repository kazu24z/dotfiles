# dotfiles

Claude Codeを使った開発環境のdotfiles管理リポジトリ。

## これで何ができるか

`cdev` コマンド一発で以下のレイアウトをcmux上に展開できます。

```
┌─────────────────┬──────────────┐
│                 │    yazi      │
│   Claude Code   ├──────────────┤
│                 │   terminal   │
└─────────────────┴──────────────┘
```

- **左**: Claude Code（AI駆動の開発）
- **右上**: yazi（ファイラー）
- **右下**: ターミナル（コマンド実行）

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
echo "working-directory = ~/your/project" > ~/.config/ghostty/config.local
```

## 使い方

cmuxを起動してターミナルで実行します。

```bash
cdev              # カレントディレクトリで起動
cdev ~/your/project  # ディレクトリ指定で起動
```

## オプション: ペイン移動キーバインドをvimキーに変更

デフォルトは `⌥+⌘+←/→/↑/↓` ですが、`⌥+⌘+h/j/k/l` に変更するとvimライクに操作できます。
cmuxの `⌘,` > キーボードショートカットから変更してください（この設定はdotfilesで管理されません）。

## ツールの追加・削除

`Brewfile` を編集してから `install.sh` を再実行する。

```bash
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
