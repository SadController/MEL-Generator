'use strict';
const {contextBridge, ipcRenderer} = require('electron');
contextBridge.exposeInMainWorld('mel', Object.freeze({
  initialize: () => ipcRenderer.invoke('mel:initialize'),
  generate: selection => ipcRenderer.invoke('mel:generate', selection),
  saveSelection: selection => ipcRenderer.invoke('mel:selection', selection),
  openSource: (id, branchId) => ipcRenderer.invoke('mel:source', {id, branchId})
}));
