import { app, dialog, MessageBoxOptions } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import App from '../app';

log.transports.file.level = 'debug';
autoUpdater.logger = log;

export default class UpdateEvents {
  static initAutoUpdateService() {
    log.info('Initializing auto-update service...');

    log.info(`Current App version: ${app.getVersion()}`);

    if (!app.isPackaged) {
      autoUpdater.forceDevUpdateConfig = true;
      log.info('Running in development mode with dev-app-update config');
    }

    if (!App.isDevelopmentMode() || process.env.TEST_UPDATE === 'true') {
      UpdateEvents.checkForUpdates();
    } else {
      log.info('Skipping update check in development mode');
    }
  }

  static checkForUpdates() {
    log.info('Checking for updates...');
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      log.error('Failed to check for updates:', err);
    });
  }
}

autoUpdater.on('checking-for-update', () => {
  log.info('Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  log.info('Update available:', info.version);
});

autoUpdater.on('update-not-available', () => {
  log.info('No updates available');
});

autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded:', info.version);

  const dialogOpts: MessageBoxOptions = {
    type: 'info',
    buttons: ['Restart', 'Later'],
    title: 'Update Ready',
    message: `A new version (${info.version}) is ready.`,
    detail: 'Restart the application to apply the updates.',
  };

  dialog.showMessageBox(dialogOpts).then((returnValue) => {
    if (returnValue.response === 0) {
      log.info('User clicked Restart - quitting and installing update...');
      setImmediate(() => {
        app.removeAllListeners('window-all-closed');
        autoUpdater.quitAndInstall(true, true);
      });
    } else {
      log.info('User clicked Later - deferring update');
    }
  });
});

autoUpdater.on('error', (err) => {
  log.error('Update error:', err);
});
