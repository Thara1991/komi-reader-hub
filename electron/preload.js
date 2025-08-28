const { contextBridge, ipcRenderer } = require('electron');

console.log('Electron preload.js loaded!');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File system operations
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
  fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),
  getAppDataPath: () => ipcRenderer.invoke('get-app-data-path'),
  openExternal: (path) => ipcRenderer.invoke('open-external', path),
  readDirectory: (directoryPath) => ipcRenderer.invoke('read-directory', directoryPath),
  ensureDirectory: (directoryPath) => ipcRenderer.invoke('ensure-directory', directoryPath),
  renameFolder: (oldPath, newPath) => ipcRenderer.invoke('rename-folder', oldPath, newPath),
  openParentDirectory: (parentPath) => ipcRenderer.invoke('open-parent-directory', parentPath),
  setFitScreen: (fitScreen) => ipcRenderer.invoke('set-fit-screen', fitScreen),
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  // Check if running in Electron
  isElectron: true
});

console.log('Preload: electronAPI exposed with methods:', [
  'selectDirectory', 'readFile', 'writeFile', 'fileExists', 
  'getAppDataPath', 'openExternal', 'readDirectory', 'ensureDirectory', 'renameFolder', 'openParentDirectory', 'isElectron'
]); 