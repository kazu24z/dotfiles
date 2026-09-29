#!/bin/sh
# 使い方: notify.sh <タイトル> <本文>
# macOS の通知を出す。出せなければ端末のベルを鳴らす。
osascript \
    -e 'on run argv' \
    -e 'display notification (item 2 of argv) with title (item 1 of argv) sound name "Glass"' \
    -e 'end run' \
    "$1" "$2" 2>/dev/null || printf '\a'
