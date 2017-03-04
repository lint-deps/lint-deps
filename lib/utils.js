'use strict';

var utils = require('lazy-cache')(require);
var fn = require;
require = utils;

/**
 * Lazily required module dependencies
 */

require('arr-diff', 'diff');
require('arr-union');
require('arrayify-compact', 'arrayify');
require('base-app');
require('clone-deep', 'clone');
require('extend-shallow', 'extend');
require('fs-exists-sync', 'exists');
require('get-value', 'get');
require('kind-of', 'typeOf');
require('log-utils', 'log');
require('micromatch', 'mm');
require('mixin-deep', 'merge');
require('object.omit', 'omit');
require('strip-comments');
require('union-value', 'union');
require('word-wrap', 'wrap');
require = fn;

/**
 * Remove names from the `unused` array
 */

utils.removeAllUnused = function(app, names) {
  var unused = app.get('cache.unused') || {};
  for (var key in unused) {
    if (unused.hasOwnProperty(key)) {
      var val = unused[key];
      utils.removeUnused(val, names);
    }
  }
};

/**
 * Remove names from the `unused` array
 */

utils.removeUnused = function(unused, names) {
  if (!names) return;
  if (typeof names === 'string') {
    names = [names];
  }

  if (utils.isObject(names)) {
    names = Object.keys(names);
  }

  if (Array.isArray(names)) {
    var len = names.length;
    var idx = -1;
    while (++idx < len) {
      var i = unused.indexOf(names[idx]);
      if (i !== -1) {
        unused.splice(i, 1);
      }
    }
  }
};

/**
 * Add missing names to the given `deps` array
 */

utils.addMissing = function(deps, names) {
  if (!names) return;
  if (typeof names === 'string') {
    names = [names];
  }

  if (utils.isObject(names)) {
    names = Object.keys(names);
  }

  if (Array.isArray(names)) {
    var len = names.length;
    var idx = -1;

    while (++idx < len) {
      var name = names[idx];

      if (name.charAt(0) !== '.' && deps.indexOf(name) === -1) {
        deps.push(name);
      }
    }
  }
};

/**
 * Create a prompt list with `all`, `none` and separator
 */

utils.createPromptList = function(app, type, enquirer) {
  var choices = [];
  var cache = app.get(['cache', type]);
  var keys = Object.keys(cache);
  var list = [];

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var arr = cache[key];

    if (key !== 'all' && arr.length) {
      list = list.concat(arr.map(function(ele) {
        return { name: ele, type: key };
      }));
    }
  }
  return choices.concat(list);
};

/**
 * Valid dependency types
 */

utils.validTypes = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

/**
 * Returns true if val is an object
 */

utils.isObject = function(val) {
  return utils.typeOf(val) === 'object';
};

/**
 * Get the dependency types to use
 */

utils.has = function(arr, val) {
  return arr.indexOf(val) !== -1;
};

/**
 * Get the dependency types to use
 */

utils.isValidType = function(type) {
  return utils.has(utils.validTypes, type);
};

/**
 * Get the dependency types to use
 */

utils.fileType = function(app, file) {
  for (var key in app.options.files) {
    if (!utils.isValidType(key)) continue;
    var patterns = app.options.files[key];
    if (utils.mm.isMatch(file.relative, patterns)) {
      return key;
    }
  }
  return 'devDependencies';
};

/**
 * Get the dependency types to use
 */

utils.addDeps = function(pkg, options) {
  var data = utils.clone(pkg.data);
  var types = options.types || ['dependencies', 'devDependencies'];
  var deps = {types: {all: {}}, keys: {}};
  for (var i = 0; i < types.length; i++) {
    var type = types[i];
    var obj = data[type];
    if (obj) {
      var keys = Object.keys(obj);
      deps.types[type] = obj;
      deps.types.all = utils.extend({}, deps.types.all, obj);
      deps.keys[type] = keys;
      utils.union(deps, 'keys.all', keys);
    }
  }
  return deps;
};

/**
 * Standard libraries to exclude
 */

utils.builtins = require('repl')._builtinLibs.concat([
  'console',
  'repl'
]);

/**
 * Returns the "type" of require
 */

utils.requireType = function(name) {
  if (utils.isLocalModule(name)) {
    return 'local';
  }
  if (utils.isBuiltin(name)) {
    return 'builtin';
  }
  if (/^\W/.test(name)) {
    return 'invalid';
  }
  return 'npm';
};

/**
 * Returns true if the given name matches a name of a node.js
 * standard library.
 */

utils.isBuiltin = function isBuiltin(name) {
  return utils.builtins.indexOf(name) !== -1;
};

/**
 * Return true if the given `name` appears to be a local dependency,
 * and not a standard library or module dependency.
 * @param {String} name
 * @return {Boolean}
 */

utils.isLocalModule = function isLocalModule(name) {
  return /^(\w:|\.|[\\\/])/.test(name);
};

/**
 * Returns true if the given name matches a name of a node.js
 * standard library.
 */

utils.isMissing = function(pkg, prop, name) {
  if (name.charAt(0) === '.' || name === utils.get(pkg, 'name')) {
    return false;
  }

  var obj = utils.get(pkg, prop);
  var deps = utils.get(pkg, 'dependencies');
  if (obj && deps && prop !== 'dependencies') {
    var keys = Object.keys(deps);
    if (keys.indexOf(name) !== -1) {
      return false;
    }
  }

  if (obj) {
    return !obj.hasOwnProperty(name);
  }
};

/**
 * Return only keys that aren't present in the specified objects.
 */

utils.filterKeys = function(pkg, types, keys) {
  for (var i = 0; i < types.length; i++) {
    var type = types[i];
    var obj = utils.get(pkg, type) || {};
    keys = keys.filter(function(key) {
      return !obj.hasOwnProperty(key);
    });
  }
  return keys;
};

/**
 * Expose `utils` modules
 */

module.exports = utils;
