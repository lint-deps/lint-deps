'use strict';

var util = require('util');
var log = require('log-utils');
var writeJson = require('write-json');
var series = require('async-each-series');
var utils = require('../lib/utils');
var fix = require('./fix');

module.exports = function(lintDeps, argv, choices, cb) {
  if (!choices) {
    cb();
    return;
  }

  var installer = lintDeps.installer;
  var depsInstaller = lintDeps[installer];

  if (typeof depsInstaller === 'undefined') {
    cb(new Error('cannot get installer: ' + util.inspect(installer)));
    return;
  }

  fix(lintDeps, argv, function(err) {
    if (err) {
      cb(err);
      return;
    }

    var keys = Object.keys(choices);

    series(keys, function(key, next) {
      var modules = mapAliases(lintDeps, choices[key]);

      depsInstaller[key](modules, function(err, code) {
        if (err) {
          cb(err);
          return;
        }

        // if installation failed, ensure that package.json is not modified
        if (code !== 0) {
          console.log(log.error, 'installation failed');
          writeJson.sync(lintDeps.pkg.path, lintDeps.originalPkg);
          process.exit(code);
        }

        next();
      });
    }, cb);
  });
};

/**
 * Map globally defined "aliases" to the modules.
 * Aliases allow you to override the version of a
 * module, or the module name.
 */

function mapAliases(lintDeps, names) {
  var aliases = lintDeps.option('alias') || {};

  return names.reduce(function(acc, name) {
    if (aliases[name]) {
      acc = acc.concat(aliases[name]);
    } else {
      acc.push(name);
    }
    return acc;
  }, []);
}
