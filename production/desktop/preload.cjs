'use strict';
const {contextBridge, ipcRenderer} = require('electron');
contextBridge.exposeInMainWorld('mel', Object.freeze({
  initialize: () => ipcRenderer.invoke('mel:initialize'),
  generate: selection => ipcRenderer.invoke('mel:generate', selection),
  saveSelection: selection => ipcRenderer.invoke('mel:selection', selection),
  saveAppSettings: value => ipcRenderer.invoke('mel:app-settings', value),
  checkForUpdates: () => ipcRenderer.invoke('mel:check-updates'),
  runUpdate: () => ipcRenderer.invoke('mel:run-update'),
  activateCurrent: () => ipcRenderer.invoke('mel:activate-current'),
  openSource: (id, branchId) => ipcRenderer.invoke('mel:source', {id, branchId}),
  onIntegrationState: callback => {
    const listener = (_event,state) => callback(state);
    ipcRenderer.on('mel:integration-state',listener);
    return () => ipcRenderer.removeListener('mel:integration-state',listener);
  },
  onUpdateStatus: callback => {
    const listener = (_event,state) => callback(state);
    ipcRenderer.on('mel:update-status',listener);
    return () => ipcRenderer.removeListener('mel:update-status',listener);
  }
}));
