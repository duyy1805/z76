const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 700,
    });

    win.loadFile(path.join(__dirname, "dist/index.html"));

    win.webContents.openDevTools(); // để debug
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
