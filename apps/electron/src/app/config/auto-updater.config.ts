import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { app } from 'electron';
import { execFile } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export function configureAutoUpdater() {
  // Configure auto-updater
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.allowPrerelease = true;
  autoUpdater.disableWebInstaller = false;
  // This is important - allows updates with different signature
  autoUpdater.allowDowngrade = true; 
  
  // Set update server URL if needed
  autoUpdater.setFeedURL({
    provider: 's3',
    bucket: 'dfusionai',
    path: '/updates',
    region: 'ap-southeast-1'
  });
} 