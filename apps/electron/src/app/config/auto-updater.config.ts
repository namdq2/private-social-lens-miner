import { autoUpdater } from 'electron-updater';

export function configureAutoUpdater() {
  // Configure auto-updater
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  // Production settings
  autoUpdater.allowPrerelease = false;
  autoUpdater.disableWebInstaller = false;
  autoUpdater.allowDowngrade = false;

  // https://www.electron.build/auto-update#quick-setup-guide
  // don't set feed url
  // autoUpdater.setFeedURL(environment.updateFeed);
}