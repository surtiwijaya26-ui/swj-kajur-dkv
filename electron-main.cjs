const { app, BrowserWindow } = require("electron");
const path = require("path");
const { fork } = require("child_process");

let mainWindow = null;
let serverProcess = null;

// Hindari inisialisasi ganda
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function startExpressServer() {
  const serverPath = path.join(__dirname, "dist", "server.cjs");
  try {
    // Jalankan server Express sebagai sub-proses di latar belakang
    serverProcess = fork(serverPath, [], {
      env: { ...process.env, NODE_ENV: "production", PORT: "3000" }
    });

    serverProcess.on("message", (msg) => {
      console.log("Pesan dari Express Server:", msg);
    });

    console.log("Server Express berhasil di-fork pada port 3000.");
  } catch (err) {
    console.error("Gagal memulai server Express latar belakang:", err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "SI-HUBIN PKL DKV - SMK Negeri 1 Teluknaga",
    icon: path.join(__dirname, "public", "electronic-agreement.png"), // Bisa diganti icon file (.ico / .png)
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Hapus menu default kustom agar aplikasi terasa murni minimalis desktop
  mainWindow.removeMenu();

  // Tunggu 1.5 detik agar Express server melakukan inisialisasi peluncuran pertama
  setTimeout(() => {
    mainWindow.loadURL("http://localhost:3000").catch((err) => {
      console.log("Server Express belum siap atau luring. Memuat halaman static murni:", err);
      mainWindow.loadFile(path.join(__dirname, "dist", "index.html"));
    });
  }, 1500);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Jalankan server database / API Express terlebih dahulu
  startExpressServer();
  
  // Buat jendela antarmuka pengguna desktop
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  // Matikan server sub-proses Express jika aplikasi ditutup murni
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});
