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

autoUpdater.on('download-progress', (progressObj) => {
  log.info('Download progress:', progressObj);
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
});
