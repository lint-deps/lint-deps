'use strict';

const path = require('path');
const utils = require('lazy-cache')(require);
const yellow = require('ansi-yellow');
const ok = require('log-ok');
const fn = require;

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
require('global-modules', 'gm');
require('inflection');
require('is-valid-glob');
require('is-glob');
require('koalas');
require('log-utils', 'log');
require('match-requires', 'requires');
require('micromatch', 'mm');
require('merge-deep', 'merge');
require('omit-empty');
require('set-value', 'set');
require('strip-comments');
require('union-value');
require('validate-npm-package-name', 'validateName');
require('word-wrap', 'wrap');
require('text-table', 'text');
require = fn;

/**
 * Valid dependency types
 */

utils.validTypes = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies'
];

utils.modules = function(str, options) {
  return utils.requires(str, options).concat(utils.imports(str, options));
};

// placeholder for es2015 imports
utils.imports = () => [];

utils.normalizeOptions = function(options) {
  const keys = Object.keys(options || {});

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const opt = options[key];

    if (!/dependencies/i.test(key)) {
      continue;
    }

    opt.files = opt.files || {};
    if (Array.isArray(opt.files) || typeof opt.files === 'string') {
      opt.files = { patterns: utils.arrayify(opt.files) };
    }
  }
};

utils.inflect = function(word, n) {
  if (n === 0 || n > 1) return utils.pluralize(word);
  return utils.singularize(word);
};

utils.singularize = function(str) {
  return utils.inflection.singularize(str);
};

utils.pluralize = function(str) {
  return utils.inflection.pluralize(str);
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

/**
 * Returns true if the given name is a valid npm package name
 */

utils.isValidPackageName = function(name) {
  if (name.charAt(0) === '.') {
    return false;
  }

  if (/\//.test(name)) return true;

  const stats = utils.validateName(name);
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
 * Remove module names from the "missing" list in a given type of
 * dependencies when the exist in another type of dependencies.
 *
 * @param {object} `report`
 * @param {string} `removeType` The type of dependencies to remove names from
 * @param {string} `keepType` The type to reference
 * @return {undefined}
 */

utils.uniquify = function(report, removeType, keepType) {
  const keep = report[keepType];
  const rem = report[removeType];
  if (keep && rem) {
    utils.remove(rem.missing.modules, Object.keys(keep.modules));
  }
};

/**
 * Create a prompt list with `all`, `none` and separator
 */

utils.createChoices = function(app) {
  const types = app.report.missingTypes;
  const choices = {};
  for (const key of types) {
    const type = app.report[key];
    const modules = type.missing.modules;
    choices[key] = modules;
  }
  return choices;
};

utils.remove = function(arr, elements) {
  if (typeof elements === 'string') {
    elements = [elements];
  }

  for (const ele of elements) {
    const idx = arr.indexOf(ele);
    if (idx === -1) {
      continue;
    }
    const last = arr.pop();
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
