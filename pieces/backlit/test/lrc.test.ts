import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLrc, lineAt, spreadPlain, guessFromFilename, pickHit, clock, fromLyricsfile, withWords, wordsAt, type Hit } from "../lib/lrc.ts";

test("parses stamps, sorts, keeps one gap marker", () => {
  const l = parseLrc("[ar:x]\n[00:05.50]second\n[00:01.00]first\n[00:09.00]\n[00:10.00]\n[01:02.25]later\n");
  assert.deepEqual(l.map((x) => x.text), ["first", "second", "", "later"]);
  assert.equal(l[3].t, 62.25);
});

test("repeated stamps and enhanced word tags", () => {
  const l = parseLrc("[00:10.00][00:30.00]chorus <00:10.50>word\n");
  assert.deepEqual(l, [{ t: 10, text: "chorus word" }, { t: 30, text: "chorus word" }]);
});

test("offset tag moves lyrics earlier", () => {
  const l = parseLrc("[offset:+500]\n[00:02.00]a\n");
  assert.equal(l[0].t, 1.5);
});

test("lineAt finds the playing line", () => {
  const l = parseLrc("[00:01.00]a\n[00:03.00]b\n[00:06.00]c\n");
  assert.equal(lineAt(l, 0.5), -1);
  assert.equal(lineAt(l, 1), 0);
  assert.equal(lineAt(l, 5.9), 1);
  assert.equal(lineAt(l, 100), 2);
});

test("plain lyrics spread across the song", () => {
  const l = spreadPlain("a\n\nb\nc", 200);
  assert.equal(l.length, 3);
  assert.ok(l[0].t > 0 && l[2].t < 200 && l[1].t > l[0].t);
});

test("file names", () => {
  assert.deepEqual(guessFromFilename("03 - Kanye West - Flashing Lights.mp3"), { artist: "Kanye West", title: "Flashing Lights" });
  assert.deepEqual(guessFromFilename("song_name.flac"), { artist: "", title: "song name" });
  assert.equal(clock(62.5), "1:02");
});

test("pickHit prefers synced and the right length", () => {
  const h = (id: number, d: number, synced: boolean, words = false): Hit => ({ id, trackName: "Song", artistName: "Band", duration: d, hasSyncedLyrics: synced, hasPlainLyrics: true, hasWordSync: words });
  assert.equal(pickHit([h(1, 200, false), h(2, 230, true), h(3, 201, true)], { title: "Song", artist: "Band", duration: 200 })?.id, 3);
  assert.equal(pickHit([h(1, 200, true), h(2, 201, true, true)], { title: "Song", artist: "Band", duration: 200 })?.id, 2, "word timing wins within a couple of seconds");
  assert.equal(pickHit([h(1, 200, true), h(2, 260, true, true)], { title: "Song", artist: "Band", duration: 200 })?.id, 1, "but not a different edit");
  assert.equal(pickHit([], {}), null);
});

test("lyricsfile lines and words", () => {
  const l = fromLyricsfile({ lines: [
    { text: "hello there", start_ms: 1000, end_ms: 2500, words: [{ text: "hello ", start_ms: 1000 }, { text: "there", start_ms: 1600 }] },
    { text: "after a break", start_ms: 15000, end_ms: 17000, words: [] },
  ] });
  assert.equal(l.length, 3, "a gap marker sits in the long break");
  assert.equal(l[0].words?.length, 2);
  assert.equal(l[1].text, "");
  assert.equal(wordsAt(l[0], 1.2), 1);
  assert.equal(wordsAt(l[0], 9), 2);
  assert.deepEqual(fromLyricsfile(null), []);
});

test("estimated words stay inside the line and in order", () => {
  const [a, b] = withWords(parseLrc("[00:10.00]one two three four\n[00:30.00]next"));
  assert.equal(a.words?.length, 4);
  assert.equal(a.words?.[0].t, 10);
  assert.ok(a.words!.every((w, i, all) => i === 0 || w.t > all[i - 1].t));
  assert.ok(a.words![3].t < 12, "a short line is sung quickly, not over the whole gap");
  assert.equal(b.words?.length, 1);
});
