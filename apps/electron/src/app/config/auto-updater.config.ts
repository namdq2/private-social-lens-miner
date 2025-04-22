import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { app } from 'electron';
import { execFile } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { environment } from '../../environments/environment';

export function configureAutoUpdater() {
  // Configure auto-updater
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  // Production settings
  autoUpdater.allowPrerelease = false;
  autoUpdater.disableWebInstaller = false;
  autoUpdater.allowDowngrade = false;
  
  // Set update server URL from environment configuration
  autoUpdater.setFeedURL(environment.updateFeed);
} 