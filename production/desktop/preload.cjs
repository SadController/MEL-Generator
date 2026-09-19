'use strict';
const {contextBridge, ipcRenderer} = require('electron');
contextBridge.exposeInMainWorld('mel', Object.freeze({
  initialize: () => ipcRenderer.invoke('mel:initialize'),
  generate: selection => ipcRenderer.invoke('mel:generate', selection),
  saveSelection: selection => ipcRenderer.invoke('mel:selection', selection),
  saveAppSettings: value => ipcRenderer.invoke('mel:app-settings', value),
  openSource: (id, branchId) => ipcRenderer.invoke('mel:source', {id, branchId}),
  onIntegrationState: callback => {
    const listener = (_event,state) => callback(state);
    ipcRenderer.on('mel:integration-state',listener);
    return () => ipcRenderer.removeListener('mel:integration-state',listener);
  }
}));
