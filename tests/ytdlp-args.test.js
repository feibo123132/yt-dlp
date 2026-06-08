import test from "node:test";
import assert from "node:assert/strict";

import { buildYtDlpArgs } from "../ytdlp-args.js";

test("adds browser-like headers for Bilibili URLs", () => {
  const args = buildYtDlpArgs({
    url: "https://www.bilibili.com/video/BV1MJVb6cETR/?spm_id_from=333.337.search-card.all.click",
    downloadsDir: "D:\\Downloads",
    format: "source",
    useCookies: false,
    browser: "chrome"
  });

  assert.deepEqual(args.slice(0, 2), ["--no-playlist", "--newline"]);
  assert.ok(args.includes("--referer"));
  assert.equal(args[args.indexOf("--referer") + 1], "https://www.bilibili.com/");
  assert.ok(args.includes("--user-agent"));
  assert.match(args[args.indexOf("--user-agent") + 1], /Mozilla\/5\.0/);
  assert.equal(args.at(-1), "https://www.bilibili.com/video/BV1MJVb6cETR/?spm_id_from=333.337.search-card.all.click");
});

test("does not add Bilibili headers for other sites", () => {
  const args = buildYtDlpArgs({
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    downloadsDir: "D:\\Downloads",
    format: "source",
    useCookies: false,
    browser: "chrome"
  });

  assert.equal(args.includes("--referer"), false);
  assert.equal(args.includes("--user-agent"), false);
});
