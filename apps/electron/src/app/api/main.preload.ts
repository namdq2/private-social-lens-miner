import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  platform: process.platform,

  setWalletAddress: (value) => ipcRenderer.send('set-wallet-address', value),
  getWalletAddress: () => ipcRenderer.invoke('get-wallet-address'),

  setEncryptionKey: (value) => ipcRenderer.send('set-encryption-key', value),
  getEncryptionKey: () => ipcRenderer.invoke('get-encryption-key'),

  setWalletType: (value) => ipcRenderer.send('set-wallet-type', value),
  getWalletType: () => ipcRenderer.invoke('get-wallet-type'),

  setUploadAllChats: (value) => ipcRenderer.send('set-upload-all-chats', value),
  getUploadAllChats: () => ipcRenderer.invoke('get-upload-all-chats'),

  setSelectedChatIdsList: (value) => ipcRenderer.send('set-selected-chat-ids-list', value),
  getSelectedChatIdsList: () => ipcRenderer.invoke('get-selected-chat-ids-list'),

  setEnableBackgroundTask: (value) => ipcRenderer.send('set-enable-background-task', value),
  getEnableBackgroundTask: () => ipcRenderer.invoke('get-enable-background-task'),

  setLastSubmissionTime: (value) => ipcRenderer.send('set-last-submission-time', value),
  getLastSubmissionTime: () => ipcRenderer.invoke('get-last-submission-time'),

  setNextSubmissionTime: (value) => ipcRenderer.send('set-next-submission-time', value),
  getNextSubmissionTime: () => ipcRenderer.invoke('get-next-submission-time'),

  setEnableAutoLaunch: (value) => ipcRenderer.send('set-enable-auto-launch', value),
  getEnableAutoLaunch: () => ipcRenderer.invoke('get-enable-auto-launch'),

  setMinimizeToTray: (value) => ipcRenderer.send('set-minimize-to-tray', value),
  getMinimizeToTray: () => ipcRenderer.invoke('get-minimize-to-tray'),

  onExecuteBackgroundTaskCode: (callback) => ipcRenderer.on('execute-background-task-code', callback),

  getBackgroundTaskIntervalExists: () => ipcRenderer.invoke('get-background-task-interval-exists'),

  setUploadFrequency: (value) => ipcRenderer.send('set-upload-frequency', value),
  getUploadFrequency: () => ipcRenderer.invoke('get-upload-frequency'),

  setTelegramSession: (value) => ipcRenderer.send('set-telegram-session', value),
  getTelegramSession: () => ipcRenderer.invoke('get-telegram-session'),

  setCheckForUpdate: (value) => ipcRenderer.send('set-check-for-update', value),
  getCheckForUpdate: () => ipcRenderer.invoke('get-check-for-update'),
  onSendUpdateMessage: (callback) => ipcRenderer.on('send-update-message', callback),
});
