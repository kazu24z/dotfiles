export const meta = {
  name: 'task-loop',
  description: 'tsumiki 形式のタスク一覧を、実装・確認・2 つのレビュー・コミットの順に 1 本ずつ回す',
  whenToUse: 'TASK-NNNN.md の一覧を、範囲を決めて自動で実装するとき。args: {worktree, requirement, from, to, docs?, fullTest?, resume?}。docs は TASK の文書の置き場所（spec / design / tasks の親）の絶対パスで、コードの worktree の外にあってもよい',
  phases: [
    { title: '準備' },
    { title: '実装' },
    { title: '確認' },
    { title: 'レビュー' },
    { title: 'コミット' },
    { title: '全テスト' },
    { title: '記録' },
    { title: '通知' },
  ],
}

const A = typeof args === 'string' ? JSON.parse(args) : (args || {})
const missingArgs = ['worktree', 'requirement', 'from', 'to'].filter(k => !A[k])
if (missingArgs.length) {
  return { stopped: { reason: 'bad-args', detail: `args に ${missingArgs.join(', ')} がない。{worktree, requirement, from, to} を渡す。` } }
}
const W = A.worktree

const str = { type: 'string' }
const bool = { type: 'boolean' }
const int = { type: 'integer' }
const strs = { type: 'array', items: str }
const obj = (properties, required) => ({ type: 'object', properties, required: required || Object.keys(properties) })
const arr = items => ({ type: 'array', items })

const CONFIG = obj({
  docsRoot: str,
  designDocs: strs,
  checks: arr(obj({ name: str, dir: str, command: str })),
  touchedTests: str,
  fullTest: obj({ dir: str, command: str }),
  maxRounds: int,
  stuckRounds: int,
  checkFixTries: int,
  parallel: int,
  cursorModel: str,
}, ['docsRoot', 'checks', 'touchedTests', 'fullTest', 'cursorModel'])
const PREP_SCHEMA = obj({
  configPath: str,
  configMissing: bool,
  config: CONFIG,
  base: str,
  overview: str,
  status: arr(obj({ id: str, done: bool })),
  tasks: arr(obj({ id: str, file: str, title: str, deps: strs, done: bool })),
}, ['configPath', 'configMissing', 'base', 'overview', 'status', 'tasks'])
const IMPL_SCHEMA = obj({
  status: { type: 'string', enum: ['DONE', 'DONE_WITH_CONCERNS', 'BLOCKED', 'NEEDS_CONTEXT'] },
  summary: str,
  files: strs,
  concerns: str,
  question: str,
  responses: arr(obj({ id: str, action: { type: 'string', enum: ['fix', 'dispute', 'partial'] }, note: str })),
})
const CHECK_SCHEMA = obj({
  pass: bool,
  failures: arr(obj({ command: str, line: str })),
  tree: str,
  diffFile: str,
  deltaFile: str,
  changedFiles: strs,
})
const REVIEW_SCHEMA = obj({
  summary: str,
  findings: arr(obj({
    kind: { type: 'string', enum: ['broken', 'design', 'improvement'] },
    file: str,
    line: { type: ['integer', 'null'] },
    title: str,
    scenario: str,
    detail: str,
    suggestion: str,
    needsDesignChange: bool,
  })),
  prior: arr(obj({ id: str, status: { type: 'string', enum: ['resolved', 'still_open', 'withdrawn'] }, note: str })),
  outOfScope: strs,
})
const COMMIT_SCHEMA = obj({ committed: bool, sha: str, files: strs, message: str, reason: str })
const FULL_SCHEMA = obj({ pass: bool, failures: arr(obj({ test: str, line: str })) })

const CLASSIFY = `指摘の分け方（kind）:
- broken: 条件がそろうと、結果が間違う、落ちる、データが壊れる。めったに起きないケースも含む。scenario に、どんな入力や状態で何が起きるかを具体的に書く。書けないなら broken にしない。
- design: 設計文書や TASK と違う。TASK の範囲から外れた変更（頼まれていない変更、TASK の外の作り直し）もこれ。直すのに設計そのものを変える必要があるなら needsDesignChange を true にする。
- improvement: 壊れていないが、良くできる（名前、読みやすさ、書き方の統一、もっと簡単に書ける、テストが足りない、など）。
書式、好みの問題、リンタやフォーマッタが見つけるもの、具体的な行を示せない推測は指摘しない。`

phase('準備')
const prep = await agent(`task-loop Workflow の準備。次を調べて返す。読むことと、6 の書き足しだけをする。テストもビルドも静的チェックも回さない（設定にあるコマンドは、あとの担当が回す）。

worktree: ${W}
要件名: ${A.requirement}
範囲: ${A.from} から ${A.to} まで

1. \`git -C ${W} remote get-url origin\` から <org>-<repo> を作り（https://github.com/example-org/example-repo なら example-org-example-repo、git@github.com:org/repo.git なら org-repo）、~/.claude/task-loop/<org>-<repo>.json を読む。configPath にそのファイルの絶対パスを入れる。ファイルが無ければ configMissing を true にし、config は省く（ほかの項目は調べて返す）。あれば configMissing を false にし、中身をそのまま config に入れる。
2. base に \`git -C ${W} rev-parse HEAD\` の結果を入れる。
3. ${A.docs ? `タスク一覧のファイルは ${A.docs}/tasks/${A.requirement}/overview.md。` : `タスク一覧のファイルは ${W}/<config の docsRoot>/tasks/${A.requirement}/overview.md。config が無ければ ${W} の下で tasks/${A.requirement}/overview.md を探す。`}overview にその絶対パスを入れる。
4. overview の \`- [x] [TASK-\` と \`- [ ] [TASK-\` で始まる行を全部拾い、status に {id, done} で並べる（[x] なら done は true）。
5. 範囲内（TASK-ID の番号が ${A.from} 以上 ${A.to} 以下）のタスクそれぞれについて TASK ファイルを読み、tasks に並べる。file は TASK ファイルの絶対パス、title は最初の見出しのタイトル、deps は「依存タスク」の「前提タスク」に書かれた TASK-ID の一覧（無ければ空）、done は overview の印。並び順は overview に出てくる順。
6. \`git -C ${W} rev-parse --path-format=absolute --git-common-dir\` の下の info/exclude に \`.task-loop/\` の行が無ければ書き足す。`, { agentType: 'loop-checker', schema: PREP_SCHEMA, label: '準備' })

if (!prep) return { stopped: { reason: 'agent-failed', detail: '準備の担当が失敗した' } }
if (prep.configMissing || !prep.config) {
  return { stopped: { reason: 'config-missing', detail: `設定ファイル ${prep.configPath} が無い。docsRoot / designDocs / checks / touchedTests / fullTest / cursorModel を書いて置く。` } }
}

const C = prep.config
const DOCS = A.docs || `${W}/${C.docsRoot}`
const fill = s => s.replace(/\{docsRoot\}/g, DOCS).replace(/\{requirement\}/g, A.requirement)
const designDocs = (C.designDocs || []).map(fill).map(p => (p.startsWith('/') ? p : `${W}/${p}`))
const designDocLines = designDocs.length ? designDocs.map(p => `- ${p}`).join('\n') : '- （設定に無い。TASK ファイルの「関連文書」を使う）'
const LEDGER = `${W}/.task-loop/${A.requirement}`
const maxRounds = C.maxRounds || 5
const stuckRounds = C.stuckRounds || 2
const checkFixTries = C.checkFixTries ?? 2
const checkLines = C.checks.map(c => `- ${c.name}: \`cd ${W}/${c.dir} && ${c.command}\``).join('\n')

const isOpen = f => f.status === 'open' || f.status === 'still_open'
const isBlocking = f => isOpen(f) && (f.kind === 'broken' || f.kind === 'design')
const isStuck = r => r.status === 'BLOCKED' || r.status === 'NEEDS_CONTEXT'

const summarize = st => {
  const by = {}
  for (const f of st.findings || []) {
    const k = f.reviewer === 'F' ? 'Fable' : 'cursor-agent'
    by[k] = by[k] || { total: 0 }
    by[k].total += 1
    by[k][f.status] = (by[k][f.status] || 0) + 1
  }
  return by
}

const recordState = async (task, st, status, extra) => {
  const body = JSON.stringify({ task: task.id, title: task.title, status, round: st.round, ...(extra || {}), reviewers: summarize(st), state: st }, null, 2)
  const r = await agent(`task-loop Workflow の記録（${task.id}、${status}）。エージェント定義のとおり、次のファイルに、「---」の次の行から最後までをそのまま書く。

ファイル: ${LEDGER}/${task.id}/state.json
---
${body}`, { agentType: 'loop-recorder', effort: 'low', phase: '記録', label: `${task.id} 記録 (${status === 'in-progress' ? `r${st.round}` : status})` })
  if (!r) log(`${task.id} の state.json を書けなかった`)
}

async function runTask(task, base, resume) {
  const tag = task.id
  const dir = `${LEDGER}/${task.id}`
  const report = `${dir}/implementer-report.md`
  const st = resume && resume.state ? resume.state : { round: 0, base, tree: null, findings: [], counters: { F: 0, G: 0 }, deferred: [], concerns: '', lastCheckFailures: null, implFiles: [], changedFiles: [] }
  const rel = p => (p.startsWith(`${W}/`) ? p.slice(W.length + 1) : p)
  const addFiles = files => {
    st.implFiles = [...new Set([...(st.implFiles || []), ...(files || []).map(rel)])]
  }
  let maxR = maxRounds

  const sideBySide = () => st.findings.filter(isOpen).map(f => ({
    id: f.id,
    reviewer: f.reviewer === 'F' ? 'Fable' : 'cursor-agent',
    kind: f.kind,
    needsDesignChange: !!f.needsDesignChange,
    file: f.file,
    line: f.line,
    title: f.title,
    scenario: f.scenario,
    reviewerNote: f.lastReviewerNote || f.detail,
    implementerNote: f.lastResponse || '',
  }))
  const stop = (reason, detail, extra) => ({
    stopped: { task: task.id, reason, detail, round: st.round, findings: sideBySide(), deferred: st.deferred, state: st, ...(extra || {}) },
  })

  const header = `worktree: ${W}
TASK: ${task.file}
設計文書:
${designDocLines}
報告のファイル: ${report}`

  const priorFor = prefix => {
    const list = st.findings.filter(f => f.reviewer === prefix && isOpen(f)).map(f => ({
      id: f.id, kind: f.kind, file: f.file, line: f.line, title: f.title, scenario: f.scenario, detail: f.detail,
      yourLastNote: f.lastReviewerNote || '', implementerResponse: f.lastResponse || '（答えなし）',
    }))
    if (!list.length) return '前の周までの指摘: なし。prior は空で返す。'
    return `前の周までのあなたの指摘のうち、まだ残っているもの。1 件ずつ今のコードで確かめ、prior にこの id のまま status を付ける。findings には書き直さない:
${JSON.stringify(list, null, 2)}`
  }

  const merge = (prefix, rv) => {
    const newIds = []
    for (const p of rv.prior || []) {
      const f = st.findings.find(x => x.id === p.id && x.reviewer === prefix)
      if (!f || !isOpen(f)) continue
      f.status = p.status
      f.lastReviewerNote = p.note
      if (p.status === 'still_open') f.stillOpen = (f.stillOpen || 0) + 1
    }
    for (const n of rv.findings || []) {
      st.counters[prefix] += 1
      const suspect = n.kind === 'broken' && !(n.scenario || '').trim()
      const f = { ...n, id: `${prefix}${st.counters[prefix]}`, reviewer: prefix, round: st.round, status: 'open', stillOpen: 0 }
      if (suspect || n.kind === 'improvement') {
        f.status = suspect ? 'suspect' : 'deferred'
        st.deferred.push({ id: f.id, reviewer: prefix === 'F' ? 'Fable' : 'cursor-agent', kind: suspect ? 'suspect' : 'improvement', file: f.file, line: f.line, title: f.title, detail: f.detail })
      }
      st.findings.push(f)
      newIds.push(f.id)
    }
    st.history = st.history || []
    st.history.push({ round: st.round, reviewer: prefix === 'F' ? 'Fable' : 'cursor-agent', newIds, prior: (rv.prior || []).map(p => ({ id: p.id, status: p.status })) })
    for (const t of rv.outOfScope || []) {
      st.deferred.push({ reviewer: prefix === 'F' ? 'Fable' : 'cursor-agent', kind: 'out-of-scope', title: t })
    }
  }

  const implement = async answer => {
    const r = await agent(`task-loop Workflow の実装（${task.id}: ${task.title}）。エージェント定義の「1 周目（実装）」に従う。

${header}（ディレクトリが無ければ作る）
${answer ? `\nユーザーからの答え: ${answer}\n` : ''}
返事の responses は空にする。`, { agentType: 'loop-implementer', schema: IMPL_SCHEMA, phase: '実装', label: `${tag} 実装` })
    if (!r) return stop('agent-failed', '実装担当が失敗した')
    if (isStuck(r)) return stop(`implementer-${r.status}`, r.question || r.summary)
    st.concerns = r.concerns || ''
    addFiles(r.files)
    return null
  }

  const fix = async answer => {
    const targets = st.findings.filter(isBlocking).map(f => ({
      id: f.id, kind: f.kind, file: f.file, line: f.line, title: f.title, scenario: f.scenario, detail: f.detail,
      suggestion: f.suggestion, reviewerLastNote: f.lastReviewerNote || '',
    }))
    const r = await agent(`task-loop Workflow の直し（${task.id}、${st.round} 周目のあと）。エージェント定義の「2 周目以降（指摘に答える）」に従う。

${header}（末尾に書き足す）

指摘の一覧。id ごとに responses で fix / dispute / partial のどれかで答える:
${JSON.stringify(targets, null, 2)}
${st.lastCheckFailures ? `\n前回のチェックの失敗:\n${st.lastCheckFailures.map(x => `- ${x.command}: ${x.line}`).join('\n')}\n` : ''}${answer ? `\nユーザーからの指示: ${answer}\n` : ''}`, { agentType: 'loop-implementer', schema: IMPL_SCHEMA, phase: '実装', label: `${tag} r${st.round} 直し` })
    if (!r) return stop('agent-failed', '実装担当が失敗した')
    if (isStuck(r)) return stop(`implementer-${r.status}`, r.question || r.summary)
    for (const a of r.responses || []) {
      const f = st.findings.find(x => x.id === a.id)
      if (f) f.lastResponse = `${a.action}: ${a.note}`
    }
    st.concerns = r.concerns || ''
    addFiles(r.files)
    return null
  }

  const check = async () => {
    for (let tries = 0; ; tries++) {
      const ck = await agent(`task-loop Workflow の確認（${task.id}、${st.round} 周目）。

worktree: ${W}
BASE: ${st.base}
前の周の tree: ${st.tree || 'なし'}

1. エージェント定義の「作業ツリーの状態の記録」の手順で tree を記録し、tree に入れる。
2. \`mkdir -p ${dir}\` のあと、差分を書き出す。
   - 差分に入れるのは、次のファイルだけ（worktree からの相対パス）。差分のコマンドの最後に \`-- <パス> ...\` で必ず並べる。ほかのファイルの中身は、差分にも返事にも入れない:
${(st.implFiles || []).map(f => `     - ${f}`).join('\n') || '     - （無し）'}
   - BASE から tree までの、上のファイルの差分を ${dir}/r${st.round}.diff に書き、diffFile にそのパスを入れる。
   - 前の周の tree があれば、そこから tree までの、上のファイルの差分を ${dir}/r${st.round}.delta.diff に書き、deltaFile にそのパスを入れる。無ければ deltaFile は空文字にする。
   - BASE から tree までに変わったファイルの名前の一覧（\`git diff --name-only\`、上のファイルに限らない全部）を changedFiles に入れる。
3. 次のチェックを順に回す。1 つ落ちても残りも回す。
${checkLines}
4. 触った部分のテスト: ${C.touchedTests}
5. 全部通れば pass を true。落ちたものがあれば pass を false にし、failures に {command, line} を並べる。line は原因がわかる最短の行（1〜3 行）にする。`, { agentType: 'loop-checker', schema: CHECK_SCHEMA, phase: '確認', label: `${tag} r${st.round} 確認${tries ? ` (${tries + 1})` : ''}` })
      if (!ck) return stop('agent-failed', '確認担当が失敗した')
      if (ck.pass) {
        st.lastCheckFailures = null
        return ck
      }
      st.lastCheckFailures = ck.failures
      if (tries >= checkFixTries) return stop('checks-failing', 'ビルド・静的チェック・テストが通らない', { failures: ck.failures })
      const r = await agent(`task-loop Workflow の直し（${task.id}）。エージェント定義の「チェックの失敗を直すとき」に従う。

${header}（末尾に書き足す）

失敗:
${ck.failures.map(x => `- ${x.command}: ${x.line}`).join('\n')}

返事の responses は空にする。`, { agentType: 'loop-implementer', schema: IMPL_SCHEMA, phase: '実装', label: `${tag} r${st.round} チェックの直し` })
      if (!r) return stop('agent-failed', '実装担当が失敗した')
      if (isStuck(r)) return stop(`implementer-${r.status}`, r.question || r.summary, { failures: ck.failures })
      addFiles(r.files)
    }
  }

  const review = ck => {
    const concerns = st.concerns ? `\n実装担当が気にしている点: ${st.concerns}` : ''
    const delta = ck.deltaFile ? `\n前の周からの差分: ${ck.deltaFile}` : ''
    const fable = () => agent(`task-loop Workflow のレビュー（${task.id}、${st.round} 周目）。観点はエージェント定義のとおり、設計文書からのズレとバグ。

${header}
差分（BASE ${st.base} から今の状態まで）: ${ck.diffFile}${delta}${concerns}

${priorFor('F')}`, { agentType: 'loop-reviewer', schema: REVIEW_SCHEMA, phase: 'レビュー', label: `${tag} r${st.round} Fable` })
    const request = `あなたはコードレビューの担当です。ファイルは変更しないでください。読むだけです。

見るもの:
- このタスクの実装そのもののバグ。はっきり壊れているものと、条件がそろうと壊れるものの両方
- TASK ファイルに書かれた範囲から外れていないか

TASK: ${task.file}
差分（BASE から今の状態まで）: ${ck.diffFile}${delta}
実装担当の報告: ${report}${concerns}

${CLASSIFY}

${priorFor('G')}

返事は次の形の JSON だけにしてください。findings には id を付けないでください。
{"summary": "...", "findings": [{"kind": "broken|design|improvement", "file": "...", "line": 123, "title": "...", "scenario": "...", "detail": "...", "suggestion": "...", "needsDesignChange": false}], "prior": [{"id": "G1", "status": "resolved|still_open|withdrawn", "note": "..."}], "outOfScope": ["..."]}`
    const cursor = () => agent(`task-loop Workflow の cursor-agent レビュー（${task.id}、${st.round} 周目）。エージェント定義の手順に従う。

worktree: ${W}
モデル: ${C.cursorModel}
チャットの ID のファイル: ${dir}/cursor-chat-id
依頼文のファイル: ${dir}/cursor-request-r${st.round}.md

依頼文のファイルに書く内容（次の行から最後まで、そのまま）:
${request}`, { agentType: 'loop-cursor-reviewer', schema: REVIEW_SCHEMA, phase: 'レビュー', label: `${tag} r${st.round} cursor-agent` })
    return parallel([fable, cursor])
  }

  const commit = async force => {
    const unreported = force ? [] : (st.changedFiles || []).filter(f => !(st.implFiles || []).includes(f))
    const c = await agent(`task-loop Workflow のコミット（${task.id}: ${task.title}）。エージェント定義の手順に従う。

worktree: ${W}
タスク一覧のファイル: ${prep.overview}
TASK ファイル: ${task.file}
コミットに入れるファイル（worktree からの相対パス）:
${(st.changedFiles || []).map(f => `- ${f}`).join('\n') || '- （無し）'}
実装担当が報告していないファイル: ${unreported.length ? unreported.join(', ') : 'なし'}
${force || !st.tree ? 'レビューが見た tree: 確かめなくてよい（ユーザーの指示でコミットする）' : `レビューが見た tree: ${st.tree}`}`, { agentType: 'loop-committer', schema: COMMIT_SCHEMA, phase: 'コミット', label: `${tag} コミット` })
    if (!c) return stop('agent-failed', 'コミット担当が失敗した')
    if (!c.committed) return stop('commit-refused', c.reason)
    return { task: task.id, sha: c.sha, rounds: st.round, message: c.message, deferred: st.deferred, state: st }
  }

  if (resume && resume.action === 'commit') return commit(true)
  if (resume && st.round > 0) {
    maxR = st.round + (resume.rounds || 1)
    const s = await fix(resume.answer)
    if (s) return s
  } else {
    const s = await implement(resume && resume.answer)
    if (s) return s
  }

  for (;;) {
    st.round += 1
    const ck = await check()
    if (ck.stopped) return ck
    st.tree = ck.tree
    st.changedFiles = (ck.changedFiles || []).map(rel)
    const [fr, gr] = await review(ck)
    if (!fr || !gr) return stop('review-failed', `${!fr ? 'Fable' : 'cursor-agent'} のレビューが失敗した`)
    merge('F', fr)
    merge('G', gr)
    const blocking = st.findings.filter(isBlocking)
    const design = blocking.filter(f => f.kind === 'design' && f.needsDesignChange)
    if (design.length) return stop('design-change', `設計の変更が要る指摘がある: ${design.map(f => f.id).join(', ')}`)
    if (!blocking.length) break
    const stuck = blocking.filter(f => (f.stillOpen || 0) >= stuckRounds)
    if (stuck.length) return stop('stuck', `${stuck.map(f => f.id).join(', ')} が ${stuckRounds} 周続けて直っていない`)
    if (st.round >= maxR) return stop('cap', `${maxR} 周で承認にならなかった`)
    await recordState(task, st, 'in-progress')
    const s = await fix()
    if (s) return s
  }
  return commit(false)
}

const doneIds = new Set(prep.status.filter(s => s.done).map(s => s.id))
const pending = prep.tasks.filter(t => !t.done)
if (!pending.length) return { done: [], stopped: null, fullTest: null, note: '範囲内のタスクはすべて終わっている' }
if ((C.parallel || 1) > 1) log('parallel が 2 以上に設定されているが、今は 1 本ずつしか回せない。1 本ずつ回す。')

const results = []
let stopped = null
let base = prep.base
while (pending.length) {
  const ready = pending.filter(t => (t.deps || []).every(d => doneIds.has(d)))
  if (!ready.length) {
    stopped = {
      reason: 'dependency',
      detail: '前提タスクが終わっていないので、残りのタスクを始められない',
      waiting: pending.map(t => ({ task: t.id, missing: (t.deps || []).filter(d => !doneIds.has(d)) })),
    }
    break
  }
  const task = ready[0]
  pending.splice(pending.indexOf(task), 1)
  const resume = A.resume && A.resume.task === task.id ? A.resume : null
  log(`${task.id} を始める: ${task.title}`)
  const r = await runTask(task, base, resume)
  if (r.stopped) {
    stopped = r.stopped
    if (r.stopped.state) {
      await recordState(task, r.stopped.state, 'stopped', { reason: r.stopped.reason, detail: r.stopped.detail, openFindings: r.stopped.findings })
    }
    break
  }
  await recordState(task, r.state, 'committed', { sha: r.sha })
  results.push(r)
  doneIds.add(task.id)
  base = r.sha
  log(`${task.id} をコミットした（${r.rounds} 周）`)
}

let fullTest = null
if (!stopped && A.fullTest !== false && results.length) {
  phase('全テスト')
  fullTest = await agent(`task-loop Workflow の最後の全テスト。コードは直さない。

worktree: ${W}
コマンド: \`cd ${W}/${C.fullTest.dir} && ${C.fullTest.command}\`

1 回だけ回す。20 分以上かかることがあるので、次のように裏で回し、終わるまで待つ。
1. \`mkdir -p ${LEDGER} && rm -f ${LEDGER}/full-test.exit && (cd ${W}/${C.fullTest.dir} && nohup sh -c '${C.fullTest.command.replace(/'/g, `'\\''`)} > ${LEDGER}/full-test.log 2>&1; echo $? > ${LEDGER}/full-test.exit' >/dev/null 2>&1 &)\`
2. \`for i in $(seq 57); do [ -f ${LEDGER}/full-test.exit ] && break; sleep 10; done; cat ${LEDGER}/full-test.exit 2>/dev/null\` を、exit のファイルができるまで繰り返す（Bash の timeout は 600000）。10 秒ごとに見に行くので、テストが早く終われば、すぐ次へ進める。先にまとめて sleep しない。
3. exit が 0 なら pass を true。0 以外なら pass を false にし、${LEDGER}/full-test.log から、落ちたテストの名前と原因がわかる最短の行を failures に並べる。ログ全体は返さない。`, { agentType: 'loop-checker', schema: FULL_SCHEMA, phase: '全テスト', label: '全テスト' })
}

const notice = (stopped
  ? `${stopped.task ? `${stopped.task} で` : ''}止まった（${stopped.reason}）${stopped.detail ? `: ${stopped.detail}` : ''}`
  : `${results.length} 本コミットした。全テスト: ${fullTest ? (fullTest.pass ? '通過' : '失敗') : 'なし'}`
).replace(/['\n]/g, ' ').slice(0, 150)
phase('通知')
await agent(`task-loop Workflow の通知。次のコマンドをそのまま 1 回だけ実行して、「ok」とだけ返す。ほかには何もしない。

~/.claude/task-loop/notify.sh 'task-loop' '${notice}'`, { agentType: 'loop-checker', effort: 'low', phase: '通知', label: '通知' })

return {
  done: results.map(r => ({ task: r.task, sha: r.sha, rounds: r.rounds, message: r.message, deferred: r.deferred })),
  stopped,
  fullTest,
}
