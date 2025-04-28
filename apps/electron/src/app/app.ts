import { BrowserWindow, ipcMain, Menu, nativeImage, screen, shell, Tray } from 'electron';
import * as Store from 'electron-store';
import { extname, join } from 'path';
import { format } from 'url';
import { environment } from '../environments/environment';
import { rendererAppName, rendererAppPort } from './constants';
import * as http from 'http';
import * as fs from 'fs';

const store = new Store() as any;

export default class App {
  // Keep a global reference of the window object, if you don't, the window will
  // be closed automatically when the JavaScript object is garbage collected.
  static mainWindow: Electron.BrowserWindow;
  static application: Electron.App;
  static BrowserWindow;
  static tray: Electron.Tray | null = null;

  static backgroundTaskInterval: NodeJS.Timer | null = null; // Store the interval ID

  static walletAddress = '';
  static encryptionKey = '';
  static walletType = '';
  static uploadAllChats = true;
  static selectedChatIdsList = [];
  static enableBackgroundTask = false; // Flag to control the background task
  static lastSubmissionTime = null;
  static nextSubmissionTime = null;
  static enableAutoLaunch = true;
  static minimizeToTray = true;
  static uploadFrequency = 4;
  static telegramSession = '';

  // Create server local
  static localServer: http.Server;

  private static createLocalServer() {
    return new Promise<number>((resolve) => {
      const server = http.createServer((req, res) => {
        let filePath = join(__dirname, '..', rendererAppName, req.url || 'index.html');

        fs.stat(filePath, (err, stats) => {
          if (err || !stats.isFile()) {
            filePath = join(__dirname, '..', rendererAppName, 'index.html');
          }

          fs.readFile(filePath, (err, data) => {
            if (err) {
              res.writeHead(404);
              res.end();
              return;
            }

            const ext = extname(filePath);
            const contentType =
              {
                '.html': 'text/html',
                '.js': 'text/javascript',
                '.css': 'text/css',
                '.json': 'application/json',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.gif': 'image/gif',
                '.svg': 'image/svg+xml',
                '.ico': 'image/x-icon',
              }[ext] || 'text/plain';

            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
          });
        });
      });

      server.listen(0, () => {
        const port = (server.address() as any).port;
        App.localServer = server;
        resolve(port);
      });
    });
  }

  public static isDevelopmentMode() {
    const isEnvironmentSet: boolean = 'ELECTRON_IS_DEV' in process.env;
    const getFromEnvironment: boolean = parseInt(process.env.ELECTRON_IS_DEV, 10) === 1;

    return isEnvironmentSet ? getFromEnvironment : !environment.production;
  }

  private static onWindowAllClosed() {
    if (App.localServer) {
      App.localServer.close();
    }
    if (process.platform !== 'darwin') {
      App.application.quit();
    }
  }

  private static onClose() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    App.mainWindow = null;
  }

  private static onRedirect(event: any, url: string) {
    if (url !== App.mainWindow.webContents.getURL()) {
      // this is a normal external redirect, open it in a new browser window
      event.preventDefault();
      shell.openExternal(url);
    }
  }

  private static onReady() {
    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.

    App.walletAddress = store.get('walletAddress');
    App.encryptionKey = store.get('encryptionKey');
    App.walletType = store.get('walletType');
    App.uploadAllChats = store.get('uploadAllChats');
    App.selectedChatIdsList = store.get('selectedChatIdsList') ?? [];
    App.enableBackgroundTask = store.get('enableBackgroundTask');
    App.lastSubmissionTime = store.get('lastSubmissionTime');
    App.nextSubmissionTime = store.get('nextSubmissionTime');
    App.enableAutoLaunch = store.get('enableAutoLaunch');
    App.minimizeToTray = store.get('minimizeToTray');
    App.uploadFrequency = store.get('uploadFrequency');
    App.telegramSession = store.get('telegramSession');

    if (rendererAppName) {
      App.initMainWindow();
      App.loadMainWindow();
    }
  }

  private static onActivate() {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (App.mainWindow === null) {
      App.onReady();
    }
  }

  private static initMainWindow() {
    const workAreaSize = screen.getPrimaryDisplay().workAreaSize;
    const width = Math.min(1280, workAreaSize.width || 1280);
    const height = Math.min(720, workAreaSize.height || 720);

    // Create the browser window.
    App.mainWindow = new BrowserWindow({
      width: width,
      height: height,
      show: false,
      webPreferences: {
        devTools: !App.application.isPackaged,
        contextIsolation: true,
        backgroundThrottling: false,
        preload: join(__dirname, 'main.preload.js'),
      },
    });
    App.mainWindow.setMenu(null);
    App.mainWindow.center();

    // if main window is ready to show, close the splash window and show the main window
    App.mainWindow.once('ready-to-show', () => {
      App.mainWindow.show();
    });

    // handle all external redirects in a new browser window
    // App.mainWindow.webContents.on('will-navigate', App.onRedirect);
    // App.mainWindow.webContents.on('new-window', (event, url, frameName, disposition, options) => {
    //     App.onRedirect(event, url);
    // });
    App.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    App.mainWindow.on('close', (event) => {
      if (App.minimizeToTray) {
        event.preventDefault();
        App.mainWindow.hide();
      }
    });

    // Emitted when the window is closed.
    App.mainWindow.on('closed', () => {
      // Dereference the window object, usually you would store windows
      // in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      App.mainWindow = null;
    });

    App.createTray();
  }

  private static async loadMainWindow() {
    // load the index.html of the app.
    if (!App.application.isPackaged) {
      App.mainWindow.loadURL(`http://localhost:${rendererAppPort}`);
      App.mainWindow.webContents.openDevTools();
    } else {
      const port = await App.createLocalServer();
      App.mainWindow.loadURL(`http://localhost:${port}`);
    }
  }

  private static createTray() {
    // __dirname ---> ... \dist\apps\electron
    let iconPath = join(__dirname, 'assets', 'icon.png');
    if (!App.application.isPackaged) {
      iconPath = `${__dirname}/../../../build/icon.png`;
    }
    const icon = nativeImage.createFromPath(iconPath);
    App.tray = new Tray(icon);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Restore',
        click: () => {
          App.mainWindow.show();
        },
      },
      {
        label: 'Quit',
        click: () => {
          App.tray?.destroy();
          App.application.quit();
        },
      },
    ]);

    App.tray.setToolTip('dFusion DLP Miner');
    App.tray.setContextMenu(contextMenu);

    App.tray.on('double-click', () => {
      if (App.mainWindow) {
        App.mainWindow.show();
      }
    });
  }

  private static startBackgroundTask() {
    const interval = 1000 * 60 * 10;

    // Clear any existing interval
    if (App.backgroundTaskInterval) {
      clearInterval(App.backgroundTaskInterval);
    }

    // Run the task immediately
    if (App.enableBackgroundTask && App.mainWindow) {
      console.log('Background task running immediately...');
      App.sendBackgroundTaskMessage('main process initiating background task immediate execution');
    }

    // Start a new interval
    App.backgroundTaskInterval = setInterval(() => {
      if (App.enableBackgroundTask && App.mainWindow) {
        console.log('Background task running...');
        App.sendBackgroundTaskMessage('main process initiating background task interval execution');
      }
    }, interval);
  }

  private static sendBackgroundTaskMessage(message: string) {
    const currentDate = new Date();
    const nextSubmissionDate = new Date(App.nextSubmissionTime);

    console.log('currentDate', currentDate);
    console.log('App.nextSubmissionTime', App.nextSubmissionTime);

    if (!App.nextSubmissionTime || currentDate > nextSubmissionDate) {
      // Send a message to the render/UI process to execute code
      App.mainWindow.webContents.send('execute-background-task-code', message);
    } else {
      console.log('main process: background task skipped, next submission time not reached');
    }
  }

  static main(app: Electron.App, browserWindow: typeof BrowserWindow) {
    // we pass the Electron.App object and the
    // Electron.BrowserWindow into this function
    // so this class has no dependencies. This
    // makes the code easier to write tests for

    App.BrowserWindow = browserWindow;
    App.application = app;

    App.application.on('window-all-closed', App.onWindowAllClosed); // Quit when all windows are closed.
    App.application.on('ready', App.onReady); // App is ready to load data
    App.application.on('activate', App.onActivate); // App is activated

    // Listen for changes from the render/UI

    ipcMain.on('set-wallet-address', (event, value) => {
      App.walletAddress = value;
      store.set('walletAddress', value);
      console.log('main process: set-wallet-address:', value);
    });

    ipcMain.handle('get-wallet-address', () => {
      return App.walletAddress;
    });

    ipcMain.on('set-encryption-key', (event, value) => {
      App.encryptionKey = value;
      store.set('encryptionKey', value);
      console.log('main process: set-encryption-key:', value);
    });

    ipcMain.handle('get-encryption-key', () => {
      return App.encryptionKey;
    });

    ipcMain.on('set-wallet-type', (event, value) => {
      App.walletType = value;
      store.set('walletType', value);
      console.log('main process: set-wallet-type:', value);
    });

    ipcMain.handle('get-wallet-type', () => {
      return App.walletType;
    });

    ipcMain.on('set-upload-all-chats', (event, value) => {
      App.uploadAllChats = value;
      store.set('uploadAllChats', value);
      console.log('main process: set-upload-all-chats:', value);
    });

    ipcMain.handle('get-upload-all-chats', () => {
      return App.uploadAllChats;
    });

    ipcMain.on('set-selected-chat-ids-list', (event, value) => {
      App.selectedChatIdsList = value;
      store.set('selectedChatIdsList', value);
      console.log('main process: set-selected-chat-ids-list:', value);
    });

    ipcMain.handle('get-selected-chat-ids-list', () => {
      return App.selectedChatIdsList;
    });

    ipcMain.on('set-enable-background-task', (event, value) => {
      App.enableBackgroundTask = value;
      store.set('enableBackgroundTask', value);
      console.log('main process: set-enable-background-task:', value);

      // Start or stop the background task based on the flag
      if (App.enableBackgroundTask) {
        App.startBackgroundTask();
      } else if (App.backgroundTaskInterval) {
        clearInterval(App.backgroundTaskInterval);
        App.backgroundTaskInterval = null;
        console.log('main process: background task disabled');
      }
    });

    ipcMain.handle('get-enable-background-task', () => {
      return App.enableBackgroundTask;
    });

    ipcMain.on('set-last-submission-time', (event, value) => {
      App.lastSubmissionTime = value;
      store.set('lastSubmissionTime', value);
      console.log('main process: set-last-submission-time:', value);
    });

    ipcMain.handle('get-last-submission-time', () => {
      return App.lastSubmissionTime;
    });

    ipcMain.on('set-next-submission-time', (event, value) => {
      App.nextSubmissionTime = value;
      store.set('nextSubmissionTime', value);
      console.log('main process: set-next-submission-time:', value);
    });

    ipcMain.handle('get-next-submission-time', () => {
      return App.nextSubmissionTime;
    });

    ipcMain.on('set-enable-auto-launch', (event, value) => {
      App.enableAutoLaunch = value;
      store.set('enableAutoLaunch', value);
      app.setLoginItemSettings({ openAtLogin: value });
      console.log('main process: set-enable-auto-launch:', value);
    });

    ipcMain.handle('get-enable-auto-launch', () => {
      // return App.enableAutoLaunch;
      return app.getLoginItemSettings().openAtLogin;
    });

    ipcMain.on('set-minimize-to-tray', (event, value) => {
      App.minimizeToTray = value;
      store.set('minimizeToTray', value);
      console.log('main process: set-minimize-to-tray:', value);
    });

    ipcMain.handle('get-minimize-to-tray', () => {
      return App.minimizeToTray;
    });

    ipcMain.handle('get-background-task-interval-exists', () => {
      return !!App.backgroundTaskInterval;
    });

    ipcMain.on('set-upload-frequency', (event, value) => {
      App.uploadFrequency = value;
      store.set('uploadFrequency', value);
      console.log('main process: set-upload-frequency:', value);
    });

    ipcMain.handle('get-upload-frequency', () => {
      return App.uploadFrequency;
    });

    // app.on('will-quit', () => {
    // clearInterval(App.backgroundTaskInterval);
    // App.backgroundTaskInterval = null;
    // });

    ipcMain.on('set-telegram-session', (event, value) => {
      App.telegramSession = value;
      store.set('telegramSession', value);
      console.log('main process: set-telegram-session:', value);
    });

    ipcMain.handle('get-telegram-session', () => {
      return App.telegramSession;
    });
  }
}
