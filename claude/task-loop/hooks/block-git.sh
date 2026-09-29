#!/bin/sh
# 使い方: block-git.sh <止める git のサブコマンド> ...
# PreToolUse(Bash) の hook。標準入力の tool_input.command に、引数で渡した git のサブコマンドが含まれていたら止める。
cmd=$(jq -r '.tool_input.command // ""')
[ -z "$cmd" ] && exit 0
words=$(printf '%s' "$*" | tr ' ' '|')
if printf '%s' "$cmd" | grep -Eq "(^|[^[:alnum:]_./-])git([[:space:]]+[^;&|]*)?[[:space:]]($words)([[:space:]]|;|&|\\||\\)|$)"; then
  echo "このエージェントには、次の git 操作が許されていない: $*。ファイルの編集や確認だけを行い、履歴やブランチを変える操作は Workflow の別の担当に任せる。" >&2
  exit 2
fi
exit 0
