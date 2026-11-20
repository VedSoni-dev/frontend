import { test } from "node:test";
import assert from "node:assert/strict";
import { parseResults, rankVideos, secs, splitVideoTitle, videoIdFrom, type Video } from "../lib/ytsearch.ts";

const vr = (id: string, title: string, channel: string, len: string, verified = false) => ({ videoRenderer: { videoId: id, title: { runs: [{ text: title }] }, ownerText: { runs: [{ text: channel }] }, lengthText: { simpleText: len }, ownerBadges: verified ? [{ metadataBadgeRenderer: { style: "BADGE_STYLE_TYPE_VERIFIED_ARTIST" } }] : [] } });

test("reads the videos out of a results page, skipping live streams", () => {
  const data = { contents: { list: [vr("aaaaaaaaaaa", "Song", "Artist", "3:58", true), { videoRenderer: { videoId: "livelivelive", title: { runs: [{ text: "live" }] } } }, { deeper: [vr("bbbbbbbbbbb", "Song (Lyrics)", "Lyrics Place", "1:02:03")] }] } };
  const html = `<html><script>var ytInitialData = ${JSON.stringify(data)};</script></html>`;
  const v = parseResults(html);
  assert.deepEqual(v.map((x) => x.id), ["aaaaaaaaaaa", "bbbbbbbbbbb"]);
  assert.equal(v[0].duration, 238); assert.equal(v[0].official, true); assert.equal(v[1].duration, 3723);
  assert.deepEqual(parseResults("<html>nothing</html>"), []);
});

test("ranks the record itself first: same length, own channel, not live or slowed", () => {
  const v = (id: string, title: string, channel: string, duration: number, official = false): Video => ({ id, title, channel, duration, official });
  const list = [
    v("musicvideo1", "Kanye West - Flashing Lights ft. Dwele", "Kanye West", 174, true),
    v("slowed00001", "kanye west - flashing lights (slowed + reverb)", "Chovies", 271),
    v("lyrics00001", "Kanye West - Flashing Lights (Lyrics)", "Lyrixa", 238),
    v("record00001", "Flashing Lights", "Kanye West", 238, true),
    v("live0000001", "Kanye West - Flashing Lights (Live from Coachella 2011)", "Ye Live", 237),
  ];
  const r = rankVideos(list, { title: "Flashing Lights", artist: "Kanye West", duration: 237.4 }).map((x) => x.id);
  assert.equal(r[0], "record00001");
  assert.ok(r.indexOf("slowed00001") > r.indexOf("lyrics00001"));
  assert.ok(r.indexOf("live0000001") > r.indexOf("lyrics00001"));
  // asking for the live version keeps it
  assert.equal(rankVideos(list, { title: "Flashing Lights (Live)", artist: "Kanye West", duration: 237 })[0].id, "live0000001");
});

test("pasted links and video titles", () => {
  assert.equal(videoIdFrom("https://www.youtube.com/watch?v=ZAz3rnLGthg&list=x"), "ZAz3rnLGthg");
  assert.equal(videoIdFrom("https://youtu.be/ZAz3rnLGthg?si=abc"), "ZAz3rnLGthg");
  assert.equal(videoIdFrom("https://music.youtube.com/watch?v=ZAz3rnLGthg"), "ZAz3rnLGthg");
  assert.equal(videoIdFrom("https://www.youtube.com/shorts/ZAz3rnLGthg"), "ZAz3rnLGthg");
  assert.equal(videoIdFrom("flashing lights kanye"), null);
  assert.deepEqual(splitVideoTitle("Kanye West - Flashing Lights ft. Dwele (Official Video)", "KanyeWestVEVO"), { artist: "Kanye West", title: "Flashing Lights" });
  assert.deepEqual(splitVideoTitle("Flashing Lights", "Kanye West - Topic"), { title: "Flashing Lights", artist: "Kanye West" });
  assert.equal(secs("4:01"), 241);
});
