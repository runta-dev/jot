#!/bin/sh
set -eu
mkdir -p /data/profile
rm -f /tmp/.X99-lock
Xvfb :99 -screen 0 1280x800x24 -ac +extension RANDR >/tmp/xvfb.log 2>&1 &
sleep 0.4
fluxbox >/tmp/fluxbox.log 2>&1 &
x11vnc -display :99 -forever -shared -nopw -listen 0.0.0.0 -rfbport 5900 >/tmp/x11vnc.log 2>&1 &
websockify --web /usr/share/novnc 6080 127.0.0.1:5900 >/tmp/novnc.log 2>&1 &
# Headed Chromium on Xvfb. CDP stays on loopback; socat publishes it.
chromium \
  --user-data-dir=/data/profile \
  --no-first-run --no-default-browser-check \
  --disable-dev-shm-usage --no-sandbox --disable-gpu \
  --remote-debugging-port=9223 \
  --window-size=1280,800 --window-position=0,0 \
  about:blank >/tmp/chromium.log 2>&1 &
i=0
while [ "$i" -lt 50 ]; do
  if [ -f /data/profile/DevToolsActivePort ]; then break; fi
  i=$((i+1)); sleep 0.1
done
exec socat TCP-LISTEN:9222,fork,reuseaddr,bind=0.0.0.0 TCP:127.0.0.1:9223
