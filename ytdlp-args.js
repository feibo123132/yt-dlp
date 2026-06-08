const BILIBILI_HOST_RE = /(^|\.)bilibili\.com$/i;
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function isBilibiliUrl(url) {
  try {
    return BILIBILI_HOST_RE.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

export function buildYtDlpArgs({ url, downloadsDir, format, useCookies, browser }) {
  const args = [
    "--no-playlist",
    "--newline",
    "-P",
    downloadsDir,
    "--output",
    "%(title).120B [%(id)s].%(ext)s",
    "--print",
    "after_move:filepath"
  ];

  if (isBilibiliUrl(url)) {
    args.push(
      "--referer",
      "https://www.bilibili.com/",
      "--user-agent",
      BROWSER_USER_AGENT,
      "--add-header",
      "Accept-Language:zh-CN,zh;q=0.9,en;q=0.8"
    );
  }

  if (format === "mp3") {
    args.push("-x", "--audio-format", "mp3", "--audio-quality", "0");
  } else {
    args.push("-f", "bestaudio/best");
  }

  if (useCookies) {
    args.push("--cookies-from-browser", browser);
  }

  args.push(url);
  return args;
}
