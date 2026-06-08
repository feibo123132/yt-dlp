import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { createDownloadSettings } from "../download-settings.js";

test("uses the local downloads folder when no saved folder exists", () => {
  const appDir = mkdtempSync(join(tmpdir(), "audio-extractor-settings-"));

  try {
    const settings = createDownloadSettings({ appDir });

    assert.equal(settings.getDownloadsDir(), join(appDir, "downloads"));
  } finally {
    rmSync(appDir, { recursive: true, force: true });
  }
});

test("persists the selected downloads folder for the next launch", () => {
  const appDir = mkdtempSync(join(tmpdir(), "audio-extractor-settings-"));
  const selectedDir = join(appDir, "custom-audio");

  try {
    const firstLaunch = createDownloadSettings({ appDir });
    firstLaunch.setDownloadsDir(selectedDir);

    const secondLaunch = createDownloadSettings({ appDir });

    assert.equal(secondLaunch.getDownloadsDir(), selectedDir);
    assert.deepEqual(JSON.parse(readFileSync(join(appDir, "settings.json"), "utf8")), {
      downloadsDir: selectedDir
    });
  } finally {
    rmSync(appDir, { recursive: true, force: true });
  }
});

test("rejects an empty selected folder", () => {
  const appDir = mkdtempSync(join(tmpdir(), "audio-extractor-settings-"));

  try {
    const settings = createDownloadSettings({ appDir });

    assert.throws(() => settings.setDownloadsDir("  "), /有效的绝对文件夹路径/);
  } finally {
    rmSync(appDir, { recursive: true, force: true });
  }
});
