# 链接音频提取工具

一个 Windows 本地小工具：双击启动器后在浏览器中粘贴 B 站、YouTube 或其他 `yt-dlp` 支持站点链接，提取音频到自选文件夹。

## 普通用户使用

1. 下载最新版压缩包。
2. 解压到任意文件夹。
3. 双击 `双击启动-粘链接提取音频.bat`。
4. 浏览器自动打开后，选择保存位置、粘贴链接、点击“开始提取”。

注意：

- 需要 Windows。
- 当前版本需要电脑已安装 Node.js。
- 原始音频提取内置 `yt-dlp.exe`；导出 MP3 需要电脑已安装 ffmpeg。
- 启动后的黑色窗口是本地服务窗口，关闭它会停止工具。

## GitHub Actions

仓库包含两个工作流：

- `CI`：检查 Node 语法并运行现有测试。
- `Publish Pages Download`：把当前仓库代码打包为 `link-audio-extractor-latest.zip`，并发布到 GitHub Pages 下载页。

GitHub Pages 只能托管下载页，不能直接在线运行这个工具；真正的音频提取仍然在用户自己的 Windows 电脑上运行。

## 开发验证

```powershell
node tests/download-settings.test.js
node tests/ytdlp-args.test.js
node --check server.js
node --check download-settings.js
node --check ytdlp-args.js
```

