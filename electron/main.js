import { app, BrowserWindow, dialog, shell } from "electron";

let serverHandle = null;
let mainWindow = null;
let isStopping = false;

async function createMainWindow() {
  process.env.LINK_AUDIO_EXTRACTOR_DATA_DIR = app.getPath("userData");

  const { startServer } = await import("../server.js");
  serverHandle = await startServer({ log: false });

  mainWindow = new BrowserWindow({
    width: 1120,
    height: 820,
    minWidth: 900,
    minHeight: 660,
    title: "Link Audio Extractor",
    autoHideMenuBar: true,
    backgroundColor: "#f3f6fb",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(`http://127.0.0.1:${serverHandle.port}/`)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  await mainWindow.loadURL(`http://127.0.0.1:${serverHandle.port}/`);
}

async function stopServer() {
  if (!serverHandle?.server) {
    return;
  }

  await new Promise((resolveStop) => {
    serverHandle.server.close(() => resolveStop());
  });
  serverHandle = null;
}

app.whenReady().then(createMainWindow).catch((error) => {
  dialog.showErrorBox("Startup failed", error.stack || error.message);
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow().catch((error) => {
      dialog.showErrorBox("Startup failed", error.stack || error.message);
    });
  }
});

app.on("before-quit", (event) => {
  if (serverHandle?.server && !isStopping) {
    event.preventDefault();
    isStopping = true;
    stopServer().finally(() => app.exit(0));
  }
});

app.on("window-all-closed", () => {
  app.quit();
});
