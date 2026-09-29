# task-loop（Claude Code の Workflow）

tsumiki 形式のタスク一覧（`TASK-NNNN.md`）を、範囲を決めて自動で回す仕組み。1 タスクごとに、実装 → ビルドと静的チェックとテスト → 2 つのレビュー（Fable と cursor-agent）→ 直す → コミット、の順に進める。メインのセッションは起動して結果を受け取るだけで、途中の結果は会話に入らない。

## 中身

| ファイル | リンク先 | 役割 |
|---|---|---|
| `workflows/task-loop.js` | `~/.claude/workflows/task-loop.js` | 流れの本体 |
| `agents/loop-implementer.md` | `~/.claude/agents/` | 実装担当。コミットはしない（hook で止める） |
| `agents/loop-checker.md` | `~/.claude/agents/` | 準備・確認・全テストの担当。コードは直さない |
| `agents/loop-reviewer.md` | `~/.claude/agents/` | 設計とのズレとバグを見るレビュー担当（Fable、読むだけ） |
| `agents/loop-cursor-reviewer.md` | `~/.claude/agents/` | cursor-agent を読むだけのモードで呼ぶ係 |
| `agents/loop-committer.md` | `~/.claude/agents/` | レビューが見た状態と同じか確かめてコミットする担当。push はしない |
| `agents/loop-recorder.md` | `~/.claude/agents/` | 台帳の `state.json` を書く記録係（Write だけ使える） |
| `hooks/*.sh` | `~/.claude/task-loop/hooks/` | エージェントごとに、使ってよいコマンドを絞る hook |
| `notify.sh` | `~/.claude/task-loop/notify.sh` | 終わったときと止まったときに macOS の通知を出す |
| `guide.md` | `~/.claude/task-loop/guide.md` | メインのセッション向けの案内。`~/.claude/CLAUDE.md` から `@~/.claude/task-loop/guide.md` で読み込む |
| `config.example.json` | `~/.claude/task-loop/config.example.json` | プロジェクトごとの設定の見本 |
| `allow-rules.json` | `~/.claude/settings.json` に足す | 長く回すときに許可の確認で止まらないための許可のルール |

## セットアップ

task-loop だけを入れるときは、dotfiles を clone して次を実行する（Brewfile のツールや `~/.config` の設定は入らない）。dotfiles 全体の `install.sh` も、中でこれを呼ぶ。外すときは同じ場所の `uninstall.sh`。

```bash
git clone https://github.com/kazu24z/dotfiles <任意のパス>
<cloneしたパス>/claude/task-loop/install.sh
```

このスクリプトは次を行う。何回実行しても同じ結果になる。

- 上の表のリンクを張る
- `~/.claude/CLAUDE.md` に `@~/.claude/task-loop/guide.md` の行を足す（無ければ）
- `~/.claude/settings.json` の `permissions.allow` に `allow-rules.json` の中身を足す（無いものだけ）

ほかに、Mac ごとに次を用意する。

1. `jq`（`brew install jq`。無いとスクリプトが止まる）
2. cursor-agent を入れてログインする（`curl https://cursor.com/install -fsS | bash` のあと `cursor-agent login`）
3. Claude Code で Fable が使えること（レビュー担当が `model: fable` で動く）
4. 回したいリポジトリごとの設定ファイルを `~/.claude/task-loop/<org>-<repo>.json` に置く。`<org>-<repo>` は `git remote get-url origin` から作る（`https://github.com/acme/app` なら `acme-app.json`）。書き方は `config.example.json` を見る。プロジェクトの設定はこのリポジトリには入れない

`~/.claude/agents/` と `~/.claude/workflows/` を初めて作ったときは、Claude Code を起動し直す（起動したあとに作られたディレクトリは読み込まれない）。

## 使い方

メインのセッションで、次のように頼む。

```text
workflow の task-loop を、args {"worktree": "<コード用の worktree>", "docs": "<spec/design/tasks の親>", "requirement": "<要件名>", "from": "TASK-0004", "to": "TASK-0010"} で回して
```

止まったときの続け方は `guide.md` にある。

## 設定の項目

| 項目 | 意味 |
|---|---|
| `docsRoot` | args の `docs` を省いたときの、worktree の中の文書の置き場所 |
| `designDocs` | レビュー担当に読ませる上位の設計文書。`{docsRoot}` と `{requirement}` が置き換わる |
| `checks` | 毎周回すチェック（`dir` で `command` を回す） |
| `touchedTests` | 変更した部分のテストの回し方。文章で書き、確認担当が判断して回す |
| `fullTest` | 範囲を全部終えたあとに 1 回だけ回す全体のテスト |
| `maxRounds` | レビューの周の上限（既定 5）。届いたら止まって聞く |
| `stuckRounds` | 同じ指摘がこの周の数だけ続けて残ったら止まる（既定 2） |
| `checkFixTries` | チェックが落ちたときに直させる回数（既定 2） |
| `parallel` | 同時に回すタスクの数。今は 1 だけ |
| `cursorModel` | cursor-agent に使わせるモデル |
