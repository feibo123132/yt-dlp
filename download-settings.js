import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";

function readSavedDownloadsDir(configPath) {
  try {
    const parsed = JSON.parse(readFileSync(configPath, "utf8"));
    if (typeof parsed.downloadsDir === "string" && isAbsolute(parsed.downloadsDir)) {
      return parsed.downloadsDir;
    }
  } catch {
    return null;
  }

  return null;
}

function ensureDirectory(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

export function createDownloadSettings({ appDir }) {
  const configPath = join(appDir, "settings.json");
  const defaultDownloadsDir = join(appDir, "downloads");
  let downloadsDir = readSavedDownloadsDir(configPath) || defaultDownloadsDir;

  ensureDirectory(downloadsDir);

  return {
    getDownloadsDir() {
      ensureDirectory(downloadsDir);
      return downloadsDir;
    },

    setDownloadsDir(nextDir) {
      const rawDir = String(nextDir || "").trim();

      if (!rawDir || !isAbsolute(rawDir)) {
        throw new Error("请选择一个有效的绝对文件夹路径");
      }

      const normalizedDir = resolve(rawDir);
      ensureDirectory(normalizedDir);
      writeFileSync(
        configPath,
        JSON.stringify({ downloadsDir: normalizedDir }, null, 2) + "\n",
        "utf8"
      );
      downloadsDir = normalizedDir;
      return downloadsDir;
    }
  };
}
