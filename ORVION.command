#!/bin/bash
# ORVION — double-click launcher (macOS)
# Starts the local app and opens it in an app-style window.

# Find the project: prefer this script's own folder (so moving it just works),
# else fall back to the known location.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$SCRIPT_DIR/package.json" ]; then
  PROJECT="$SCRIPT_DIR"
else
  PROJECT="/Users/stefkeppens/Desktop/ORVION applications/Micro influencers"
fi
PORT=3000
URL="http://localhost:$PORT"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

cd "$PROJECT" || { echo "Project folder not found: $PROJECT"; read -r; exit 1; }

open_window() {
  if [ -x "$CHROME" ]; then
    "$CHROME" --app="$URL" --new-window >/dev/null 2>&1 &
  else
    open "$URL"
  fi
}

# Stop any server already running so we always serve the latest build.
echo "Stopping any previous ORVION server…"
pkill -f "next start" 2>/dev/null
pkill -f "next-server" 2>/dev/null
# wait for the port to free up
for _ in $(seq 1 10); do
  curl -s -o /dev/null "$URL" || break
  sleep 1
done

# Dependencies (first run only).
if [ ! -d node_modules ]; then
  echo "Installing dependencies (first run only)…"
  npm install || { echo "npm install failed."; read -r; exit 1; }
fi

# Always do a clean rebuild so the app can never serve a stale/corrupted build.
echo "Building ORVION (clean) — about 30–60 seconds…"
rm -rf .next
npm run build || { echo "Build failed. Press Enter to close."; read -r; exit 1; }

echo "Starting ORVION…"
npm run start -- -p "$PORT" >/tmp/orvion-server.log 2>&1 &
SERVER_PID=$!

# Wait for the server to come up.
for _ in $(seq 1 90); do
  curl -s -o /dev/null "$URL" && break
  sleep 1
done

open_window

echo ""
echo "=================================================="
echo "  ORVION is running:  $URL"
echo ""
echo "  • Keep this window open while you use the app."
echo "  • Close this window (or press Ctrl+C) to stop."
echo "=================================================="
echo ""

# Keep the server alive until this window is closed.
wait $SERVER_PID
