import { createServer } from "node:http";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createDownloadSettings } from "./download-settings.js";
import { buildYtDlpArgs } from "./ytdlp-args.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");
const publicDir = join(__dirname, "public");
const downloadSettings = createDownloadSettings({ appDir: __dirname });
const runtimeTmpDir = join(__dirname, ".runtime-tmp");
const requestedPort = Number(process.env.PORT);
const portCandidates = Array.from(
  new Set(
    [requestedPort, 3847, 3848, 3851].filter(
      (value) => Number.isInteger(value) && value > 0 && value < 65536
    )
  )
);

if (!existsSync(runtimeTmpDir)) {
  mkdirSync(runtimeTmpDir, { recursive: true });
}

const childEnv = {
  ...process.env,
  TMP: runtimeTmpDir,
  TEMP: runtimeTmpDir
};

function sendJson(res, statusCode, data) {
  const payload = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store"
  });
  res.end(payload);
}

function sendText(res, statusCode, text, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Content-Length": Buffer.byteLength(text),
    "Cache-Control": "no-store"
  });
  res.end(text);
}

function readBody(req) {
  return new Promise((resolveBody, rejectBody) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 64) {
        rejectBody(new Error("Request body too large"));
      }
    });
    req.on("end", () => resolveBody(raw));
    req.on("error", rejectBody);
  });
}

function commandStatus(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    windowsHide: true,
    timeout: 5000,
    env: childEnv
  });
  if (result.error || result.status !== 0) {
    return { ok: false };
  }
  return { ok: true, output: (result.stdout || "").trim() };
}

function splitLines(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
}

function extractSavedFilePath(lines, downloadsDir) {
  for (const line of lines) {
    if (line.startsWith(downloadsDir)) {
      return line;
    }
  }

  for (const line of lines) {
    const matched = line.match(/^\[download\] Destination: (.+)$/);
    if (matched) {
      return join(downloadsDir, matched[1]);
    }
  }

  return null;
}

function openDownloadsFolder() {
  const downloadsDir = downloadSettings.getDownloadsDir();
  return new Promise((resolveOpen, rejectOpen) => {
    const child = spawn("explorer.exe", [downloadsDir], {
      detached: true,
      stdio: "ignore",
      windowsHide: false,
      env: childEnv
    });

    child.on("error", rejectOpen);
    child.on("spawn", () => {
      child.unref();
      resolveOpen();
    });
  });
}

function selectDownloadsFolder(initialDir) {
  const escapedInitialDir = initialDir.replace(/'/g, "''");
  const script = [
    "$OutputEncoding = [Console]::OutputEncoding = [Text.UTF8Encoding]::new();",
    "Add-Type -AssemblyName System.Windows.Forms;",
    "$dialog = New-Object System.Windows.Forms.FolderBrowserDialog;",
    "$dialog.Description = 'Choose where extracted audio files are saved';",
    "$dialog.SelectedPath = '" + escapedInitialDir + "';",
    "$dialog.ShowNewFolderButton = $true;",
    "if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {",
    "  Write-Output $dialog.SelectedPath;",
    "  exit 0;",
    "}",
    "exit 2;"
  ].join(" ");

  const result = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-STA", "-ExecutionPolicy", "Bypass", "-Command", script],
    {
      encoding: "utf8",
      windowsHide: false,
      env: childEnv
    }
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status === 2) {
    const error = new Error("已取消选择文件夹");
    error.statusCode = 400;
    throw error;
  }

  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || "选择文件夹失败").trim());
  }

  const selectedDir = splitLines(result.stdout || "").at(-1);
  if (!selectedDir) {
    throw new Error("没有选择文件夹");
  }

  return selectedDir;
}

function runExtractTask(payload) {
  const url = String(payload.url || "").trim();
  const format = payload.format === "mp3" ? "mp3" : "source";
  const useCookies = Boolean(payload.useCookies);
  const cookieBrowser = String(payload.cookieBrowser || "chrome").trim().toLowerCase();
  const downloadsDir = downloadSettings.getDownloadsDir();

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("链接必须是 http 或 https");
    }
  } catch {
    return Promise.reject(new Error("链接格式不正确"));
  }

  const browserWhitelist = new Set(["chrome", "edge", "firefox", "brave"]);
  const browser = browserWhitelist.has(cookieBrowser) ? cookieBrowser : "chrome";

  return new Promise((resolveTask) => {
    const args = buildYtDlpArgs({
      url,
      downloadsDir,
      format,
      useCookies,
      browser
    });

    const child = spawn("yt-dlp", args, {
      windowsHide: true,
      env: childEnv
    });

    let stdout = "";
    let stderr = "";
    let spawnError = null;

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      spawnError = error;
    });

    child.on("close", (code) => {
      const allLogs = `${stdout}\n${stderr}`.trim();
      const lines = splitLines(allLogs);
      const filePath = extractSavedFilePath(lines, downloadsDir);

      if (spawnError) {
        resolveTask({
          ok: false,
          code: -1,
          message: spawnError.message,
          logs: allLogs,
          filePath,
          downloadsDir
        });
        return;
      }

      if (code !== 0) {
        resolveTask({
          ok: false,
          code: code ?? -1,
          message: "yt-dlp 执行失败，请查看日志",
          logs: allLogs,
          filePath,
          downloadsDir
        });
        return;
      }

      resolveTask({
        ok: true,
        code: 0,
        logs: allLogs,
        filePath,
        downloadsDir
      });
    });
  });
}

const server = createServer(async (req, res) => {
  if (!req.url) {
    sendText(res, 400, "Bad Request");
    return;
  }

  if (req.method === "GET" && req.url === "/") {
    try {
      const html = readFileSync(join(publicDir, "index.html"), "utf8");
      sendText(res, 200, html, "text/html; charset=utf-8");
      return;
    } catch (error) {
      sendText(res, 500, `加载页面失败: ${error.message}`);
      return;
    }
  }

  if (req.method === "GET" && req.url === "/api/status") {
    const ytDlp = commandStatus("yt-dlp", ["--version"]);
    const ffmpeg = commandStatus("ffmpeg", ["-version"]);
    const downloadsDir = downloadSettings.getDownloadsDir();
    sendJson(res, 200, {
      ytDlp: ytDlp.ok ? `ok (${ytDlp.output})` : "missing",
      ffmpeg: ffmpeg.ok ? "ok" : "missing",
      downloadsDir
    });
    return;
  }

  if (req.method === "POST" && req.url === "/api/open-downloads") {
    try {
      await openDownloadsFolder();
      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 500, { ok: false, message: error.message });
    }
    return;
  }

  if (req.method === "POST" && req.url === "/api/select-downloads-dir") {
    try {
      const selectedDir = selectDownloadsFolder(downloadSettings.getDownloadsDir());
      const downloadsDir = downloadSettings.setDownloadsDir(selectedDir);
      sendJson(res, 200, { ok: true, downloadsDir });
    } catch (error) {
      sendJson(res, error.statusCode || 500, {
        ok: false,
        message: error.message
      });
    }
    return;
  }

  if (req.method === "POST" && req.url === "/api/extract") {
    try {
      const body = await readBody(req);
      const payload = JSON.parse(body || "{}");
      const result = await runExtractTask(payload);

      if (!result.ok) {
        sendJson(res, 500, {
          ok: false,
          message: result.message,
          logs: result.logs,
          filePath: result.filePath,
          downloadsDir: result.downloadsDir
        });
        return;
      }

      sendJson(res, 200, {
        ok: true,
        logs: result.logs,
        filePath: result.filePath,
        downloadsDir: result.downloadsDir
      });
    } catch (error) {
      sendJson(res, 400, {
        ok: false,
        message: error.message
      });
    }
    return;
  }

  if (req.method === "GET" && extname(req.url) === ".html") {
    sendText(res, 404, "Not Found");
    return;
  }

  sendText(res, 404, "Not Found");
});

function startListening(index = 0) {
  if (index >= portCandidates.length) {
    console.error("No available port for audio extractor.");
    process.exit(1);
  }

  const nextPort = portCandidates[index];

  server.once("error", (error) => {
    if (error && error.code === "EADDRINUSE") {
      console.warn(`Port ${nextPort} is in use, trying next port...`);
      startListening(index + 1);
      return;
    }

    console.error(error);
    process.exit(1);
  });

  server.listen(nextPort, () => {
    console.log(`Audio extractor running at http://127.0.0.1:${nextPort}`);
    console.log(`Downloads folder: ${downloadSettings.getDownloadsDir()}`);
  });
}

startListening();
