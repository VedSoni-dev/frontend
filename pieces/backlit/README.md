# backlit (/backlit)

after the Verci + Lumn setup in the reel — https://www.instagram.com/reel/Df6SNoWOBIp/ (both apps by ARK, @arkdevperson)

Pick a song and it plays right on the page. The edges of your screen glow in the cover's colours and breathe with
the music, and the lyrics land word by word, in ten styles. Full screen, lights off, and the room becomes the song.

Live at https://frontend.vedantsoni.com/backlit (free, Sign in with publik). A clean-room rebuild from public
information, in our own design: no code, copy, image or asset from Verci or Lumn is used, and none of their style names.

## The ten lyric styles
Press **S** to step through them, **1–0** to pick one, or open **Styles** in the dock. **Mix** changes style every
eight lines.

| | |
|---|---|
| **Thread** | the song as a conversation: a bubble a line, the newest bubble sized for the whole line and the words popping in |
| **Sing** | one huge line; each word fills with light from left to right as it's sung (`--wp`), the next line waiting under it |
| **Poster** | each line set as a gig poster in a condensed face, every row sized to fill the width; words ink in from outlines |
| **Flash** | one word at a time, as big as the screen allows, tilted, with the last word's outline blowing out behind it |
| **Neon** | glass tubes that flicker on as each word lands, buzzing now and then, in the cover's colours |
| **Vinyl** | a record spinning (the cover is its label, the title runs round it, the arm drops when it plays), the words beside it |
| **Scroll** | the whole song gliding up so your line sits in focus, the rest blurred by distance; tap any line to jump there |
| **Cutout** | every word a scrap cut from a magazine (six faces, five papers, some taped on), stuck on as it's sung |
| **Film** | letterbox, grain, the cover as a slow Ken Burns plate, a running timecode, and the line as a subtitle |
| **Drop** | words fall from the top of the screen and bounce into place, squashing as they land |

Behind the words: dark, or the cover blurred into a slow haze (**Auto** picks it for Scroll and Film). Size and line
up (left or centre) are in the same panel; everything is remembered in this browser.

## Ways in
1. **Play it here:** search a song and it plays in YouTube's own embedded player (always visible, nothing drawn over it),
   the lyrics locked to the player's clock. `/api/backlit/video` finds the upload that is the record itself (same length
   as the album version, the artist's own or "Topic" channel, not live, slowed or a cover), edge-cached a week; "Wrong
   version?" tries the next. Paste a YouTube link instead and the lyrics are found from the video's title.
2. **It's playing somewhere else:** search, then hit Start as it starts, or tap the line you're hearing; ← → nudges.
3. **A song file:** MP3, M4A, FLAC, WAV or OGG, read in the browser (tags, cover); the light follows the bass. Nothing is uploaded.
4. **Follow Spotify or Apple Music** with one command on a Mac or Windows PC (`/backlit/link/mac.sh`, `windows.ps1`):
   a helper that answers only this browser on localhost with the song and position.

Lyrics come from [LRCLIB](https://lrclib.net) (word timing when it has it, estimated from line timing when it doesn't),
covers from Apple's iTunes Search, straight from the browser.

## How it's built
`Backlit.tsx` is the player (the clock for each way in, the frame loop that sets `--lvl`, `--wp` and the line), `Lyrics.tsx`
the ten styles (each gets the lines, the current line, how many words have landed and the cover's colours; the words
carry `.past` / `.now` / `.next`), `lyrics.css` their looks, `Glow.tsx` the screen-edge light (three masked conic
gradients), `lib/` the timing, colour, YouTube and lookup code. Fonts load per style. Tests: `node pieces/backlit/test-engine.mjs`.

Not yet: when the song plays through YouTube the light can't hear it (YouTube keeps its sound to itself), so it pulses
with every sung word, or with the room through the mic; the Windows helper hasn't been run on a Windows PC.

MIT. Independent, not affiliated with or endorsed by Verci, Lumn or their maker. Trademarks belong to their owners.
