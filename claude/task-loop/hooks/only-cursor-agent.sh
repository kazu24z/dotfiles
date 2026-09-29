#!/bin/sh
# PreToolUse(Bash) の hook。cursor-agent を読むだけのモードで呼ぶコマンドだけを通す。
cmd=$(jq -r '.tool_input.command // ""')
deny() {
  echo "このエージェントが実行できるのは cursor-agent だけ（-f / --force / --yolo は使えない）。$1" >&2
  exit 2
}
rest=$(printf '%s' "$cmd" | sed -E 's/^[[:space:]]*\(?[[:space:]]*//; s/^cd[[:space:]]+("[^"]*"|'"'"'[^'"'"']*'"'"'|[^[:space:];&]+)[[:space:]]*&&[[:space:]]*//; s/[[:space:]]*\)?[[:space:]]*$//')
case "$rest" in
  cursor-agent\ *|cursor-agent) ;;
  *) deny "受け取ったコマンド: $cmd" ;;
esac
printf '%s' "$rest" | grep -Eq '(^|[[:space:]])(-f|--force|--yolo)([[:space:]]|=|$)' && deny "強制実行のオプションが付いている。"
printf '%s' "$rest" | grep -q '\$(' && deny "コマンド置換は使えない。"
printf '%s' "$rest" | grep -q '`' && deny "コマンド置換は使えない。"
printf '%s' "$rest" | grep -Eq '(;|&&|\|\||\||>|<)' && deny "コマンドをつなげたり、リダイレクトしたりはできない。"
case "$rest" in
  cursor-agent\ create-chat*) exit 0 ;;
esac
printf '%s' "$rest" | grep -Eq -- '--mode[= ](ask|plan)|--plan' || deny "レビューは --mode ask を付けて呼ぶ。"
exit 0
