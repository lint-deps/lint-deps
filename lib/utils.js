'use strict';

var isWindows = process.platform === 'win32';

/**
 * Module dependencies
 */

var utils = require('lazy-cache')(require);
var fn = require;
require = utils;

/**
 * Module dependencies
 */

require('base-cli', 'cli');
require('base-config', 'config');
require('base-options', 'option');
require('base-plugins', 'plugin');
require('base-questions', 'ask');
require('base-store', 'store');

require('array-unique', 'unique');
require('extend-shallow', 'extend');
require('mixin-deep', 'merge');
require('find-pkg', 'pkgPath');
require('get-value', 'get');
require('has-glob');
require('isobject', 'isObject');
require('match-requires');
require('matched', 'glob');
require('micromatch', 'mm');
require('minimist');
require('parse-gitignore');
require('strip-comments', 'strip');
require('to-file');
require('try-open');
require('union-value', 'union');
require = fn;

/**
 * Cast val to an array
 */

utils.arrayify = function arrayify(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
};

/**
 * Returns true if a filepath exists on the file system.
 */

utils.exists = function exists(fp) {
  return !!utils.tryOpen(fp, 'r');
};

/**
 * Return true if the given `name` appears to be a local dependency,
 * and not a standard library or module dependency.
 *
 * @param {String} name
 * @return {Boolean}
 */

utils.isLocalModule = function isLocalModule(name) {
  if (isWindows) {
    return /^(\w:|\.)/.test(name);
  }
  return /^[.\/]/.test(name);
};

/**
 * Standard libraries to exclude
 */

utils.builtins = require('repl')._builtinLibs.concat([
  'console',
  'repl'
]);

/**
 * Returns true if the given name matches a name of a node.js
 * standard library.
 */

utils.isBuiltin = function isBuiltin(name) {
  return utils.builtins.indexOf(name) !== -1;
};

/**
 * Expose `utils` modules
 */

module.exports = utils;
