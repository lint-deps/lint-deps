'use strict';

var spawn = require('child_process').spawn;
var win32 = process.platform === 'win32';
var _ = require('lodash');

module.exports = function spawnCommand(args) {
  args = Array.isArray(args) ? args : [args];

  var winCommand = win32 ? 'cmd' : '';
  var winArgs = win32 ? ['/c'].concat(args) : args;

  return spawn(winCommand, winArgs, {
    stdio: 'inherit'
  });
};
