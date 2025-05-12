import { app, dialog, MessageBoxOptions } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import App from '../app';
import { configureAutoUpdater } from '../config/auto-updater.config';

log.transports.file.level = 'debug';
autoUpdater.logger = log;

export default class UpdateEvents {
  static initAutoUpdateService() {
    log.info('Initializing auto-update service...');
    log.info(`Current App version: ${app.getVersion()}`);

    // Configure auto-updater first
    configureAutoUpdater();
    log.info('Auto-updater configured');

    if (!app.isPackaged) {
      autoUpdater.forceDevUpdateConfig = true;
      log.info('Running in development mode with dev-app-update config');
    }

    if (!App.isDevelopmentMode()) {
      // Check for updates immediately on startup
      UpdateEvents.checkForUpdates();

      // Set up an interval to check for updates every hour
      setInterval(UpdateEvents.checkForUpdates, 1000 * 60 * 60);
      // setInterval(UpdateEvents.checkForUpdates, 1000 * 60 * 2);
    } else {
      log.info('Skipping update check in development mode');
    }
  }

  static checkForUpdates() {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      log.error('Failed to check for updates:', err);
      App.checkForUpdate = false;
      App.mainWindow.webContents.send('send-update-message', `Failed to check for updates. Try again later`);
    });
  }
}

autoUpdater.on('checking-for-update', () => {
  log.info('Checking for updates...');
  App.checkForUpdate = true;
  App.mainWindow.webContents.send('send-update-message', `Checking for updates`);
});

autoUpdater.on('update-available', (info) => {
  log.info('Update available:', info.version);
  App.mainWindow.webContents.send('send-update-message', `Update available. Downloading`);
});

autoUpdater.on('update-not-available', () => {
  log.info('No updates available');
  App.checkForUpdate = false;
  App.mainWindow.webContents.send('send-update-message', `NO_NEW_UPDATE`);

  // const dialogOpts: MessageBoxOptions = {
  //   type: 'info',
  //   buttons: ['OK'],
  //   title: `You're Up-to-Date`,
  //   message: `Your dFusion DLP Miner is running the newest version`,
  //   cancelId: 1, // match the index of the "Later" button
  // };

  // dialog.showMessageBox(dialogOpts).then();
});

autoUpdater.on('download-progress', (progressObj) => {
  log.info('Download progress:', progressObj);
  App.mainWindow.webContents.send('send-update-message', `Downloading update: ${Math.round(progressObj.percent)}%`);
});

autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded:', info.version);
  App.checkForUpdate = false;
  App.mainWindow.webContents.send('send-update-message', `Download complete`);

  const dialogOpts: MessageBoxOptions = {
    type: 'info',
    buttons: ['Restart', 'Later'],
    title: 'Update Ready',
    message: `A new version (${info.version}) is ready to be installed.`,
    detail: 'Restart the application to apply the updates.',
    cancelId: 1, // match the index of the "Later" button
  };

  dialog.showMessageBox(dialogOpts).then((returnValue) => {
    if (returnValue.response === 0) {
      log.info('User clicked Restart - preparing to install update...');

      // Make sure we don't have any pending dialogs or operations
      setTimeout(() => {
        log.info('Installing update...');
        autoUpdater.quitAndInstall(true, true);
      }, 500);
    } else {
      log.info('User clicked Later - deferring update');
    }
  });
});

autoUpdater.on('error', (err) => {
  log.error('Update error:', err);
  App.mainWindow.webContents.send('send-update-message', `Update failed. Try again later.`);
});
