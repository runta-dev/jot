#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
exec npx tsx server/linux-chrome.ts "$@"
