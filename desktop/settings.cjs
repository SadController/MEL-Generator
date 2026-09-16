'use strict';
const fs = require('node:fs');
const path = require('node:path');
const defaults = {aircraft:'A321', count:2, width:1180, height:860, maximized:false};
function sanitize(value) {
  const v = value && typeof value === 'object' ? value : {};
  return {
    aircraft:['A319','A320','A321'].includes(v.aircraft) ? v.aircraft : defaults.aircraft,
    count:[1,2,3].includes(v.count) ? v.count : defaults.count,
    width:Number.isInteger(v.width) ? Math.max(640, Math.min(3840,v.width)) : defaults.width,
    height:Number.isInteger(v.height) ? Math.max(600, Math.min(2160,v.height)) : defaults.height,
    maximized:v.maximized === true
  };
}
function readSettings(file) {
  try { return sanitize(JSON.parse(fs.readFileSync(file, 'utf8'))); }
  catch { return {...defaults}; }
}
function writeSettings(file, value) {
  fs.mkdirSync(path.dirname(file), {recursive:true});
  const temp = file + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(sanitize(value), null, 2));
  fs.renameSync(temp, file);
}
module.exports = {defaults, sanitize, readSettings, writeSettings};
