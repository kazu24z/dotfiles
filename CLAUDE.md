# dotfiles管理ルール

## リポジトリ概要

macOS（将来的にUbuntu対応予定）のClaude Code開発環境設定ファイルを管理するdotfilesリポジトリ。

## ディレクトリ構造

```
dotfiles/
├── config/        # ~/.config/ 以下の設定ファイル
├── home/          # ホームディレクトリ直下の設定ファイル
├── Brewfile       # インストールするツール一覧（macOS）
├── install.sh     # セットアップスクリプト
└── README.md
```

## 設定ファイルの追加ルール

### ~/.config/ 以下のファイル・ディレクトリ
`config/` 以下に配置し、`install.sh` にシンボリックリンクを追記する。

```bash
# 例：~/.config/foo/ を管理対象に追加する場合
mv ~/.config/foo ~/dotfiles/config/foo
ln -sf "$DOTFILES_DIR/config/foo" ~/.config/foo
```

### ホームディレクトリ直下のファイル
`home/` 以下に配置し、`install.sh` にシンボリックリンクを追記する。

```bash
# 例：~/.zshrc.foo を管理対象に追加する場合
mv ~/.zshrc.foo ~/dotfiles/home/zshrc.foo
ln -sf "$DOTFILES_DIR/home/zshrc.foo" ~/.zshrc.foo
```

## ツールの追加・削除

`Brewfile` を編集する。`install.sh` は触らなくてよい。

```
brew "tool-name"   # CLIツール
cask "app-name"    # GUIアプリ
```

## 未対応事項

- Ubuntu対応：install.shのOS分岐は未実装。必要になったタイミングで追加する。
