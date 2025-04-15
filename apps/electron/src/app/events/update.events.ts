import { app, dialog, MessageBoxOptions } from 'electron';
import { platform, arch } from 'os';
import { updateServerUrl } from '../constants';
import App from '../app';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';

log.transports.file.level = 'debug';
autoUpdater.logger = log;

export default class UpdateEvents {
  // initialize auto update service - most be invoked only in production
  static initAutoUpdateService() {
    // const platform_arch =
    //   platform() === 'win32' ? platform() : platform() + '_' + arch();
    // const version = app.getVersion();
    // const feed: Electron.FeedURLOptions = {
    //   url: `${updateServerUrl}/update/${platform_arch}/${version}`,
    // };

    if (!app.isPackaged) {
      autoUpdater.forceDevUpdateConfig = true;
    }

    log.info('start checking new version');

    if (!App.isDevelopmentMode() || process.env.TEST_UPDATE === 'true') {
      log.info('Initializing auto update service...\n');

      autoUpdater.setFeedURL({
        provider: 'generic',
        url: 'https://dfusionai.s3.amazonaws.com/updates',
      });
      UpdateEvents.checkForUpdates();
    }
  }

  // check for updates - most be invoked after initAutoUpdateService() and only in production
  static checkForUpdates() {
    log.info('start checking new version');
    if ((!App.isDevelopmentMode() && autoUpdater.getFeedURL() !== '') || process.env.TEST_UPDATE === 'true') {
      autoUpdater.checkForUpdates();
    }
  }
}

autoUpdater.on('update-downloaded', (event) => {
  const dialogOpts: MessageBoxOptions = {
    type: 'info' as const,
    buttons: ['Restart', 'Later'],
    title: 'Application Update',
    message: process.platform === 'win32' ? (typeof event.releaseNotes === 'string' ? event.releaseNotes : '') : event.releaseName,
    detail: 'A new version has been downloaded. Restart the application to apply the updates.',
  };

  dialog.showMessageBox(dialogOpts).then((returnValue) => {
    if (returnValue.response === 0) {
      log.info('User clicked Restart - quitting and installing update...');
      // Force app to quit properly before installing
      try {
        setImmediate(() => {
          app.removeAllListeners('window-all-closed');
          if (app.dock) app.dock.hide();
          autoUpdater.quitAndInstall(true, true);
        });
      } catch (err) {
        console.error('Error during update installation:', err);
        app.exit(0);
      }
    }
  });
});

autoUpdater.on('checking-for-update', () => {
  log.info('Checking for updates...\n');
});

autoUpdater.on('update-available', () => {
  log.info('New update available!\n');
});

autoUpdater.on('update-not-available', () => {
  log.info('Up to date!\n');
});

autoUpdater.on('error', (message) => {
  console.error('There was a problem updating the application');
  console.error(message, '\n');
});

app.on('ready', () => {
  autoUpdater.checkForUpdates();
  log.info('The application is ready');
});
