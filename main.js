const {app, BrowserWindow} = require('electron');
const path = require('path');
const {spawn} = require('child_process');
const http = require('http');
const fs = require("fs");
const util = require("util"); // 用于检测服务是否已启动
const dayjs = require('./dayjs.min')
const {homedir} = require("os");
let mainWindow;
let djangoProcess;
let originLog = console.log;
// Redirect console.log output to a file
const baseDirectoryPath = path.join(homedir(), 'Documents', 'djangoApp'); // For example, create a folder in the Documents directory
const logDir = path.join(baseDirectoryPath, 'logs'); // For example, create a logs folder
const dbPath = path.join(baseDirectoryPath, 'db.sqlite3');
console.log = function (...args) {
    let today = dayjs().format('YYYYMMDD') // '25/01/2019'
    const logFilePath = path.join(logDir, `${today}.log`);
    const logFileStream = fs.createWriteStream(logFilePath, {flags: 'a'}); // 'a' means append content
    fs.mkdirSync(logDir, {recursive: true});
    const message = util.format(...args);
    const timestamp = new Date().toLocaleString();
    const logMessage = `${timestamp} - ${message}`;
    originLog(logMessage);
    logFileStream.write(logMessage + '\n');
};

const DJANGO_PORT = 8004; // Django 服务的端口
const DJANGO_URL = `http://127.0.0.1:${DJANGO_PORT}`;

// 检测服务是否可用
function checkServerReady(url, callback) {
    const options = {
        method: 'HEAD',
        host: '127.0.0.1',
        port: DJANGO_PORT,
        path: '/',
    };

    const req = http.request(options, (res) => {
        callback(res.statusCode === 200);
    });

    req.on('error', () => callback(false));
    req.end();
}

function waitForServerAndCreateWindow() {
    checkServerReady(DJANGO_URL, (isReady) => {
        if (isReady) {
            console.log('Django server is ready. Creating window...');
            createWindow(); // 确保只调用一次
        } else {
            console.log('Waiting for Django server...');
            setTimeout(waitForServerAndCreateWindow, 1000); // 每秒检查一次
        }
    });
}

function createWindow() {
    if (mainWindow) {
        return; // 避免重复创建窗口
    }

    // 创建主窗口
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true,
        },
    });

    // 加载 Django 页面
    mainWindow.loadURL(DJANGO_URL);

    // 处理窗口关闭事件
    mainWindow.on('closed', () => {
        mainWindow = null;
        if (djangoProcess) djangoProcess.kill(); // 确保关闭 Django 服务
    });
}

app.whenReady().then(() => {
    runMigrateAndStartServer()
});

function runMigrateAndStartServer() {
    // 运行 migrate
    const migrateProcess = spawn(path.join(__dirname, 'manage'), ['migrate'], {
        shell: true,
        env: {
            ...process.env,
            DB_PATH: dbPath,
        },
    });

    migrateProcess.stdout.on('data', (data) => {
        console.log(`Migrate: ${data}`);
    });

    migrateProcess.stderr.on('data', (data) => {
        console.error(`Migrate Error: ${data}`);
    });

    migrateProcess.on('close', (code) => {
        console.log(`Migrate process exited with code ${code}`);
        if (code === 0) {
            console.log('Migration successful, starting Django server...');
            startDjangoServer();
        } else {
            console.error('Migration failed. Django server will not start.');
        }
    });
}

function startDjangoServer() {
    // 启动 Django 服务
    djangoProcess = spawn(
        path.join(__dirname, 'manage'),
        ['runserver', '--noreload', `127.0.0.1:${DJANGO_PORT}`],
        {
            shell: true,
            env: {
                ...process.env,
                DB_PATH: dbPath,
            },
        }
    );

    djangoProcess.stdout.on('data', (data) => {
        console.log(`Django: ${data}`);
    });

    djangoProcess.stderr.on('data', (data) => {
        console.log(`Django: ${data}`);
    });

    djangoProcess.on('close', (code) => {
        console.log(`Django process exited with code ${code}`);
        app.quit();
    });

    // 等待 Django 服务启动后创建窗口
    waitForServerAndCreateWindow();
}

app.on('window-all-closed', () => {
    if (djangoProcess) djangoProcess.kill();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && mainWindow == null) {
        waitForServerAndCreateWindow();
    }
});
