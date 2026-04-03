#!/bin/bash
set -euo pipefail

APP_DIR="/Users/rezafarahani/Documents/ai-agent/mission-control"
URL="http://localhost:3000"
LOG_FILE="$APP_DIR/mission-control.log"
PID_FILE="$APP_DIR/mission-control.pid"

cd "$APP_DIR"

if [ -f "$PID_FILE" ]; then
  EXISTING_PID=$(cat "$PID_FILE" 2>/dev/null || true)
  if [ -n "${EXISTING_PID:-}" ] && kill -0 "$EXISTING_PID" 2>/dev/null; then
    open "$URL"
    exit 0
  else
    rm -f "$PID_FILE"
  fi
fi

nohup npm run dev > "$LOG_FILE" 2>&1 &
APP_PID=$!
echo "$APP_PID" > "$PID_FILE"

for _ in {1..30}; do
  if curl -sf "$URL" >/dev/null 2>&1; then
    open "$URL"
    exit 0
  fi
  sleep 1
done

echo "Mission Control did not become ready in time."
echo "Check log: $LOG_FILE"
exit 1
