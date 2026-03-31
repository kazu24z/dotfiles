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

## 前提条件

- macOS
- [Homebrew](https://brew.sh)
- [Claude Code CLI](https://claude.ai/code)（`claude` コマンド）

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

### install.sh の挙動

| 状態 | 挙動 |
| ---- | ---- |
| 何もない | シンボリックリンクを作成 |
| このdotfilesへのリンクが既にある | そのままスキップ（再実行しても安全） |
| 別の場所へのリンクがある | WARNING + 上書きコマンドを表示してスキップ |
| 実ファイル/ディレクトリがある | WARNING + 上書きコマンドを表示してスキップ |

WARNINGが出た場合は表示されたコマンドで手動対処後、`./install.sh` を再実行すれば該当箇所だけリンクが作成されます。

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

## CLIツール

`install.sh` で以下が自動インストールされ、エイリアスが設定されます。

| コマンド | 実体 | 説明 |
| -------- | ---- | ---- |
| `cat` | [bat](https://github.com/sharkdp/bat) | シンタックスハイライト付きcat |
| `ls` | [eza](https://github.com/eza-community/eza) | モダンなls |
| `cd` | [zoxide](https://github.com/ajeetdsouza/zoxide) | 学習型ディレクトリ移動 |
| `lg` | [lazygit](https://github.com/jesseduffield/lazygit) | TUIのgitクライアント |
| `yazi` | [yazi](https://github.com/sxyazi/yazi) | TUIのファイラー |

その他インストールされるツール: `fzf` / `ripgrep` / `fd` / `delta` / `starship` / `neovim`

## オプション: ペイン移動キーバインドをvimキーに変更

デフォルトは `⌥+⌘+←/→/↑/↓` ですが、`⌥+⌘+h/j/k/l` に変更するとvimライクに操作できます。
cmuxの `⌘,` > キーボードショートカットから変更してください（この設定はdotfilesで管理されません）。

## アンインストール

このdotfilesが管理するシンボリックリンクのみ外し、`~/.zshrc` への追記も削除します。他のdotfilesのリンクや既存ファイルには触れません。

```bash
cd <cloneしたパス> && ./uninstall.sh
source ~/.zshrc
```

> このdotfilesが管理するシンボリックリンクのみ解除します。他のリンクや既存ファイルには触れません。
> `~/.zshrc` を編集する前に `~/.zshrc.bak` としてバックアップを作成します。

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
