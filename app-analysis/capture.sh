#!/bin/bash
# capture.sh <name> — take screenshot + UI dump with given name into the app-analysis folders
set -e
NAME="$1"
if [ -z "$NAME" ]; then echo "usage: capture.sh <name>"; exit 1; fi
DIR="$(cd "$(dirname "$0")" && pwd)"
adb exec-out screencap -p > "$DIR/screenshots/$NAME.png"
adb shell uiautomator dump /sdcard/window_dump.xml > /dev/null
adb pull /sdcard/window_dump.xml "$DIR/ui-dumps/$NAME.xml" > /dev/null 2>&1
echo "captured: $NAME"
