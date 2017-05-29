'use strict';

var path = require('path');
var utils = require('lazy-cache')(require);
var fn = require;
var builtinsCache;

/**
 * Valid dependency types
 */

utils.validTypes = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies'
];

/**
 * Lazily required module dependencies
 */

require = utils;
require('arr-diff', 'diff');
require('arr-union', 'union');
require('arrayify-compact', 'arrayify');
require('base', 'Base');
require('clone-deep', 'clone');
require('get-value', 'get');
require('kind-of', 'typeOf');
require('fs-exists-sync', 'exists');
require('global-modules', 'gm');
require('is-valid-glob');
require('is-glob');
require('koalas');
require('log-utils', 'log');
require('matched', 'glob');
require('match-requires', 'requires');
require('micromatch', 'mm');
require('merge-deep', 'merge');
require('mixin-deep', 'mixin');
require('omit-empty');
require('set-value', 'set');
require('strip-comments');
require('union-value');
require('validate-npm-package-name', 'validateName');
require('word-wrap', 'wrap');
require('text-table', 'text');
require = fn;

utils.isInstalled = function(name) {
  return utils.exists(path.resolve(utils.gm, name));
};

utils.modules = function(str) {
  return utils.requires(str).concat(utils.imports(str));
};

utils.imports = function(str) {
  return [];
};

utils.normalizeOptions = function(options) {
  var keys = Object.keys(options || {});

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var opt = options[key];

    if (!/dependencies/i.test(key)) {
      continue;
    }

    opt.files = opt.files || {};
    if (Array.isArray(opt.files) || typeof opt.files === 'string') {
      opt.files = { patterns: utils.arrayify(opt.files) };
    }
  }
};

/**
 * Roughly sort files in the given array
 */

utils.sortFiles = function(files) {
  return files.sort(function(a, b) {
    var alen = a.relative.split(path.sep).length;
    var blen = b.relative.split(path.sep).length;
    if (alen < blen) {
      return 1;
    }
    if (alen > blen) {
      return -1;
    }
    return a.relative.localeCompare(b.relative);
  });
};

/**
 * Returns true if `str` is a non-empty string
 * @param {String} str
 * @return {Boolean}
 * @api public
 */

utils.isString = function(str) {
  return str && typeof str === 'string';
};

/**
 * Returns true if val is an object
 */

utils.isObject = function(val) {
  return utils.typeOf(val) === 'object';
};

/**
 * Return true if `val` has the given string.
 *
 * @param {Array|String} `val`
 * @param {String} `str`
 * @param {Number} `idx` (optional) Index to start the search from.
 * @return {Boolean}
 */

utils.has = function(val, str, idx) {
  if (typeof val === 'string') {
    if (typeof idx !== 'number') {
      idx = 0;
    }

    if (idx + str.length > val.length) {
      return false;
    }
  }
  return val.indexOf(str, idx) !== -1;
};

utils.every = function(arr, vals) {
  vals = utils.arrayify(vals);
  for (var i = 0; i < vals.length; i++) {
    if (!utils.has(arr, vals[i])) {
      return false;
    }
  }
  return true;
};

/**
 * Returns true if the given name is a valid npm package name
 */

utils.isValidPackageName = function(name) {
  if (name.charAt(0) === '.') {
    return false;
  }

  if (/\//.test(name)) return true;

  var stats = utils.validateName(name);
  return stats.validForNewPackages === true
    && stats.validForOldPackages === true;
};

/**
 * Get the dependency types to use
 */

utils.isValidType = function(type, validTypes) {
  return utils.has(validTypes || utils.validTypes, type);
};

/**
 * Return true if the given `name` appears to be a local dependency,
 * and not a standard library or module dependency.
 * @param {String} name
 * @return {Boolean}
 */

utils.isLocalModule = function isLocalModule(name) {
  return /^(\w:|\.)/.test(name);
};

/**
 * Returns true if the given name matches a name of a node.js
 * standard library.
 */

utils.isBuiltin = function isBuiltin(name, options) {
  return utils.builtins(options).indexOf(name) !== -1;
};

/**
 * List all native builtins, excluding those on `options.whitelist`,
 * and adding any defined on `options.exclude`. (when building the
 * list of dependencies, module names that match a builtin will be
 * excluded from the matches, thus any modules that are "whitelisted"
 * will not be excluded).
 *
 * @param {Object} `options`
 * @return {Array} List of builtin module names
 * @api public
 */

utils.builtins = function(options) {
  if (builtinsCache) return builtinsCache;
  var opts = Object.assign({}, options);
  var keys = Object.keys(process.binding('natives'));
  var names = keys.concat(utils.arrayify(opts.exclude));
  var whitelist = utils.arrayify(opts.whitelist);
  var builtins = [];

  for (var i = 0; i < names.length; i++) {
    var name = names[i];
    if (!utils.has(whitelist, name) || isValidBuiltin(name)) {
      builtins.push(name);
    }
  }

  builtins.sort();
  builtinsCache = builtins;
  return builtins;
};

/**
 * Returns true if the given name is a valid builtin module name
 * (for the purposes of lint-deps).
 *
 * @param {String} `name`
 * @return {Boolean}
 * @api public
 */

function isValidBuiltin(name) {
  if (name.indexOf('internal') === 0) {
    return false;
  }

  if (utils.has(name, '/') || utils.has(name, '\\')) {
    return false;
  }

  var ch = name.charAt(0);
  if (ch === '_') {
    return false;
  }
  return true;
}

/**
 * Remove module names from the "missing" list in a given type of
 * dependencies when the exist in another type of dependencies.
 *
 * @param {object} `report`
 * @param {string} `removeType` The type of dependencies to remove names from
 * @param {string} `keepType` The type to reference
 * @return {undefined}
 */

utils.uniquify = function(report, removeType, keepType) {
  var keep = report[keepType];
  var rem = report[removeType];
  if (keep && rem) {
    utils.remove(rem.missing.modules, Object.keys(keep.modules));
  }
};

/**
 * Create a prompt list with `all`, `none` and separator
 */

utils.createChoices = function(cli) {
  var types = cli.report.missingTypes;
  var choices = {};

  for (var i = 0; i < types.length; i++) {
    var key = types[i];
    var type = cli.report[key];
    var modules = type.missing.modules;
    choices[key] = modules;
  }
  return choices;
};

utils.remove = function(arr, elements) {
  if (typeof elements === 'string') {
    elements = [elements];
  }

  for (var i = 0; i < elements.length; i++) {
    var ele = elements[i];
    var idx = arr.indexOf(ele);
    if (idx === -1) {
      continue;
    }
    var last = arr.pop();
    if (idx === arr.length) {
      continue;
    }
    arr[idx] = last;
  }
  return arr;
};

/**
 * Expose `utils` modules
 */

module.exports = utils;
