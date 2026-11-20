#!/bin/bash
# backlit link for macOS
# Tells the backlit tab in your browser what Spotify or Apple Music is playing, so the lyrics and the light keep up.
# It answers only on this computer (127.0.0.1:47817), only with the song name, artist, album, length and position.
# Nothing is installed and nothing leaves your Mac. Close this window (or press Ctrl+C) to stop it.
# Source: https://github.com/VedSoni-dev/backlit/blob/main/public/link/mac.sh  ·  MIT licence

PORT=47817
export LC_ALL=C

read -r -d '' JXA <<'JS'
function run() {
  var found = [];
  ["Spotify", "Music"].forEach(function (name) {
    try {
      var app = Application(name);
      if (!app.running()) return;                 // never launches a player
      var state = String(app.playerState());      // playing | paused | stopped
      if (state === "stopped") return;
      var t = app.currentTrack;
      var dur = Number(t.duration());
      if (name === "Spotify") dur = dur / 1000;   // Spotify reports milliseconds, Music seconds
      found.push({ ok: true, player: name, title: String(t.name()), artist: String(t.artist()), album: String(t.album()),
                   duration: dur, position: Number(app.playerPosition()), playing: state === "playing", at: Date.now() });
    } catch (e) {}
  });
  found.sort(function (a, b) { return (b.playing ? 1 : 0) - (a.playing ? 1 : 0); });
  return JSON.stringify(found[0] || { ok: true, player: null, at: Date.now() });
}
JS

if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  echo "backlit link is already running (port $PORT). Keep that window open and go back to your browser."
  exit 0
fi

echo ""
echo "  backlit link is on. Go back to your browser and press Connect."
echo "  The first time, your Mac asks to let Terminal see Spotify or Music: click OK."
echo "  Close this window to stop it."
echo ""

FIFO=$(mktemp -u "${TMPDIR:-/tmp}/backlit-link.XXXXXX")
mkfifo "$FIFO" || exit 1
trap 'rm -f "$FIFO"; exit 0' EXIT INT TERM

while true; do
  # nc answers one request, then the loop listens again. The player is read when the browser asks,
  # so the position is fresh; "at" lets the tab catch up the few milliseconds it took to arrive.
  nc -l 127.0.0.1 "$PORT" <>"$FIFO" | {
    IFS= read -r _request || exit 0
    BODY=$(osascript -l JavaScript -e "$JXA" 2>/dev/null)
    [ -z "$BODY" ] && BODY='{"ok":true,"player":null}'
    LEN=$(printf %s "$BODY" | wc -c | tr -d ' ')
    printf 'HTTP/1.1 200 OK\r\nContent-Type: application/json; charset=utf-8\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Private-Network: true\r\nAccess-Control-Allow-Headers: *\r\nCache-Control: no-store\r\nContent-Length: %s\r\nConnection: close\r\n\r\n%s' "$LEN" "$BODY" >"$FIFO"
  }
done
