import { app, BrowserWindow } from 'electron';
import log from 'electron-log';
import App from './app/app';
import ElectronEvents from './app/events/electron.events';
import UpdateEvents from './app/events/update.events';

// Initialize logging
log.transports.file.level = 'debug';

export default class Main {
  static initialize() {
    // No Squirrel events needed for nsis
    // log.info('Initializing application...');
    // log.info('Is packaged:', app.isPackaged);
    app.setName('dFusion-dlp-miner');
  }

  static bootstrapApp() {
    App.main(app, BrowserWindow);
  }

  static bootstrapAppEvents() {
    ElectronEvents.bootstrapElectronEvents();

    // log.info('Application version:', app.getVersion());
    // log.info('App path:', app.getAppPath());
    // log.info('Develop Mode:', App.isDevelopmentMode());
  }

  static initAutoUpdater() {
    if (!App.isDevelopmentMode()) {
      log.info('Starting auto-update service...');
      UpdateEvents.initAutoUpdateService(); // Now called after App's onReady
    } else {
      log.info('Skipping auto-update in development mode');
    }
  }
}

// Initialize and bootstrap app
Main.initialize();
Main.bootstrapApp();
Main.bootstrapAppEvents();

app.on('ready', () => {
  Main.initAutoUpdater();
});