## タスクの一覧があるときは、task-loop Workflow で回す

`docs/tasks/<要件名>/TASK-NNNN.md` のような、tsumiki 形式で区切られたタスクの一覧が用意されている作業は、メインのセッションで 1 本ずつ実装しない。保存してある Workflow の `task-loop`（`~/.claude/workflows/task-loop.js`）に任せる。実装・確認・2 つのレビュー・コミットの手順と、止まる条件は、Workflow と `~/.claude/agents/loop-*.md` に書いてある。

メインのセッションがやることは、次の 4 つだけ。

1. コード用の worktree を用意する（そのリポジトリの決まりに従う）
2. task-loop を次の args で起動する
   - `worktree`: コード用の worktree の絶対パス
   - `docs`: TASK の文書の置き場所（spec / design / tasks の親）の絶対パス。文書がローカル専用の worktree にあるときは、そこを指す。文書が worktree の中にあるなら省いてよい
   - `requirement`: 要件名
   - `from` / `to`: 範囲の最初と最後の TASK-ID
3. 終わったら、返ってきた結果をユーザーに伝える。コミットしたタスク、最後の全テストの結果、あとで見る指摘の一覧（deferred）
4. 止まって返ってきたら（stopped）、理由と、残った指摘の一覧（レビュー担当と実装担当の最後のコメントを並べたもの）をそのままユーザーに見せて、返事を待つ。自分で判断して起動し直さない。ユーザーの返事に合わせて、`resume: {task, action, rounds?, answer?, state}` を付けて起動し直す。`state` には、止まったときの結果の `stopped.state` をそのまま渡す
   - もう 1 周直してレビューする: `action: "more"`（周を足すなら `rounds`）
   - そのままコミットする: `action: "commit"`
   - 質問に答えて続ける: `action: "more"` と `answer`

プロジェクトごとの設定（チェックのコマンド、全テストのコマンド、文書の場所）は `~/.claude/task-loop/<org>-<repo>.json` に置く。`<org>-<repo>` は git の remote の URL から作る。無いと task-loop は最初に止まる。書き方は `~/.claude/task-loop/config.example.json` を見る。

やらないこと: push、PR の作成。
