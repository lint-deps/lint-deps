'use strict';

var union = require('arr-union');
var utils = require('./utils');
var log = utils.log;

/**
 * Unused deps
 */

exports.unused = function(app) {
  var unused = app.get('cache.unused') || {};
  if (unused.all.length === 0) {
    return false;
  }

  var res = [];
  for (var key in unused) {
    if (unused.hasOwnProperty(key)) {
      if (key === 'all') continue;
      var names = unused[key];
      if (names.length) {
        var str = '';
        str += log.red(log.heading('Unused "' + key + '" in package.json:'));
        str += '\n';
        str += log.bold(' · ');
        str += names.join('\n · ');
        res.push(str);
      }
    }
  }

  return res.length !== 0;
};

/**
 * Missing deps
 */

exports.missing = function(app) {
  var pm = app.get('cache.pkg.missing') || [];
  var all = app.get('cache.missing.all');
  var arr = union([], all, pm);

  if (arr.length > 0) {
    var types = app.cache.files;
    var scanned = {};

    console.log();
    console.log(log.cyan(log.heading('Files scanned:')));
    console.log();

    for (var type in types) {
      if (types.hasOwnProperty(type)) {
        console.log(log.underline(type));

        var files = types[type];
        var keys = Object.keys(files);
        if (keys.length === 0) {
          console.log(log.bold('  · ') + 'none (no *.js files found)');
          return;
        }

        for (var key in files) {
          if (files.hasOwnProperty(key)) {
            var file = files[key];

            if (scanned[file.relative]) continue;
            scanned[file.relative] = true;

            var missing = file.missing[type];
            var msg = log.bold(' · ') + file.relative + ' ';

            if (missing.length > 0) {
              msg += log.error + log.gray(' (' + missing.join(', ') + ')');
            } else {
              msg += log.success;
            }
            console.log(msg);
          }
        }
        console.log();
      }
    }

    return true;
  }
  return false;
};
