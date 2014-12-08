'use strict';

var async = require('async');
var spawn = require('child_process').spawn;
var win32 = process.platform === 'win32';

module.exports = function spawnCommand(cmds) {
  cmds = Array.isArray(cmds) ? cmds : [cmds];
  async.eachSeries(cmds, function (cmd, next) {
    var winCommand = win32 ? 'cmd' : cmd.cmd;
    var winArgs = win32 ? ['/c'].concat([cmd.cmd + ' ' + cmd.args.join(' ')]) : cmd.args;
    spawn(winCommand, winArgs, {
      stdio: 'inherit'
    })
    .on('error', next)
    .on('close', next);
  });

};
