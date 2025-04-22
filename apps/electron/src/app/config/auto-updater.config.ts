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

  // Configure for AppImage specifically on Linux
  if (process.platform === 'linux') {
    log.info('Configuring Linux AppImage update handler');
    autoUpdater.allowPrerelease = false;
    autoUpdater.allowDowngrade = false;
    autoUpdater.fullChangelog = true;
    
    // Keep reference to original quitAndInstall
    const originalQuitAndInstall = autoUpdater.quitAndInstall;
    
    // Override quitAndInstall for Linux AppImage
    autoUpdater.quitAndInstall = function(isSilent = true, isForceRunAfter = true) {
      log.info('Custom quitAndInstall called');
      
      try {
        // Get the path to the pending update file
        const pendingUpdatePath = path.join(
          app.getPath('home'),
          '.cache',
          '@dfusion-aisource-updater',
          'pending',
          `dFusion-DLP-miner-${app.getVersion()}.AppImage`
        );
        
        log.info(`Looking for update at: ${pendingUpdatePath}`);
        
        if (fs.existsSync(pendingUpdatePath)) {
          log.info(`Found update file: ${pendingUpdatePath}`);
          
          // Make it executable
          fs.chmodSync(pendingUpdatePath, '755');
          log.info('Made update file executable');
          
          // Launch the new version with --no-sandbox
          const child = execFile(pendingUpdatePath, ['--no-sandbox'], (error) => {
            if (error) {
              log.error('Failed to launch new version:', error);
            }
          });
          
          if (child && child.unref) {
            child.unref();
            log.info('Launched new version and detached process');
          }
          
          // Give the new process time to start
          setTimeout(() => {
            log.info('Quitting current version');
            app.exit(0);
          }, 2000);
          
          return;
        } else {
          log.warn(`Update file not found at: ${pendingUpdatePath}`);
          
          // Try to find the update in the update directory
          const updateDirPath = path.join(app.getPath('home'), '.cache', '@dfusion-aisource-updater');
          if (fs.existsSync(updateDirPath)) {
            log.info(`Searching update directory: ${updateDirPath}`);
            
            // Find AppImage files in the update directory recursively
            const searchDirectory = (dir: string): string[] => {
              const results: string[] = [];
              const entries = fs.readdirSync(dir, { withFileTypes: true });
              
              for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                  results.push(...searchDirectory(fullPath));
                } else if (entry.name.endsWith('.AppImage')) {
                  results.push(fullPath);
                }
              }
              
              return results;
            };
            
            const appImageFiles = searchDirectory(updateDirPath);
            log.info(`Found AppImage files: ${JSON.stringify(appImageFiles)}`);
            
            if (appImageFiles.length > 0) {
              // Use the first AppImage file
              const updatePath = appImageFiles[0];
              log.info(`Using update file: ${updatePath}`);
              
              // Make it executable
              fs.chmodSync(updatePath, '755');
              log.info('Made update file executable');
              
              // Launch the new version with --no-sandbox
              const child = execFile(updatePath, ['--no-sandbox'], (error) => {
                if (error) {
                  log.error('Failed to launch new version:', error);
                }
              });
              
              if (child && child.unref) {
                child.unref();
                log.info('Launched new version and detached process');
              }
              
              // Give the new process time to start
              setTimeout(() => {
                log.info('Quitting current version');
                app.exit(0);
              }, 2000);
              
              return;
            }
          }
        }
      } catch (err) {
        log.error('Error in custom quitAndInstall:', err);
      }
      
      // Fall back to original method if we failed
      log.info('Falling back to original quitAndInstall');
      originalQuitAndInstall.call(autoUpdater, isSilent, isForceRunAfter);
    };
    
    // Log when update is downloaded
    autoUpdater.on('update-downloaded', (info) => {
      log.info(`Update downloaded: ${info.version}`);
      // Access download path through the version info
      log.info(`Update version: ${info.version}, path will be searched in cache directory`);
    });
  }
} 