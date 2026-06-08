# 链接音频提取工具

一个 Windows 本地小工具：双击启动器后在浏览器中粘贴 B 站、YouTube 或其他 `yt-dlp` 支持站点链接，提取音频到自选文件夹。

## 普通用户使用（桌面版）

1. 从 GitHub Pages 下载 `link-audio-extractor-windows.zip`。
2. 解压到任意文件夹。
3. 双击里面的 `LinkAudioExtractor.exe`。
4. 在应用窗口里选择保存位置、粘贴链接、点击“开始提取”。

注意：

- 需要 Windows。
- 桌面版不需要用户单独安装 Node.js，也不会显示本地服务黑窗口。
- 原始音频提取内置 `yt-dlp.exe`；导出 MP3 仍需要电脑已安装 ffmpeg。

## 开发者使用（旧启动器）

也可以双击 `双击启动-粘链接提取音频.bat` 以本地 Node 服务方式运行。这个方式需要电脑已安装 Node.js，且黑色窗口不能关闭。

## GitHub Actions

仓库包含两个工作流：

- `CI`：检查 Node 语法并运行现有测试。
- `Publish Desktop Download`：构建 Windows 桌面版 `LinkAudioExtractor.exe`，打包为 `link-audio-extractor-windows.zip`，并发布到 GitHub Pages 下载页。

GitHub Pages 只能托管下载页，不能直接在线运行这个工具；真正的音频提取仍然在用户自己的 Windows 电脑上运行。

## 开发验证

```powershell
node tests/download-settings.test.js
node tests/ytdlp-args.test.js
node tests/server-module.test.js
node --check server.js
node --check download-settings.js
node --check ytdlp-args.js
node --check electron/main.js
```

构建桌面版：

```powershell
npm install
npm run dist:win
```
