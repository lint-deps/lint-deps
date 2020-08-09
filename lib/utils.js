'use strict';

const { defineProperty } = Reflect;
const path = require('path');
const colors = require('ansi-colors');
const stripComments = require('strip-comments');
const matchRequires = require('./match-requires');
const { HASH_BANG_REGEX, LINE_COMMENT_REGEX } = require('./constants');

const first = (...args) => args.find(v => v != null);
const define = (key, fn) => defineProperty(exports, key, { get: fn });

define('Base', () => require('base'));
define('clone', () => require('clone-deep'));
define('gm', () => require('global-modules'));
define('inflection', () => require('inflection'));
define('log', () => require('log-utils'));
define('merge', () => require('merge-deep'));
define('omitEmpty', () => require('omit-empty'));
define('text', () => require('text-table'));
define('typeOf', () => require('kind-of'));
define('validateName', () => require('validate-npm-package-name'));
define('wrap', () => require('word-wrap'));
define('set', () => require('set-value'));
define('get', () => require('get-value'));
define('unionValue', () => require('union-value'));

exports.ok = (str, ...rest) => {
  console.log(colors.green(colors.symbols.check) + ' ' + str, ...rest);
};

exports.isGlob = str => {
  return typeof str === 'string' && /(^!|[*?{}[\]()]|[!@*+?]\()/.test(str);
};

exports.isValidGlob = val => {
  if (Array.isArray(val)) {
    return val.every(pattern => exports.isValidGlob(pattern));
  }
  return typeof val === 'string' && val.length > 0;
};

/**
 * Valid dependency types
 */

exports.validTypes = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies'
];

exports.flatten = (...args) => {
  const result = [];
  const flat = arr => {
    for (const ele of arr) {
      if (Array.isArray(ele)) {
        flat(ele);
      } else {
        result.push(ele);
      }
    }
  };
  flat(args);
  return result;
};

exports.arrayify = val => {
  return [].concat(first(val, [])).flat(Infinity).filter(Boolean);
};

exports.unique = (...args) => [...new Set(exports.flatten(...args))];

exports.union = (arr, ...rest) => {
  for (const ele of exports.flatten(...rest)) {
    if (ele != null && !arr.includes(ele)) {
      arr.push(ele);
    }
  }
  return [...new Set(arr)];
};

exports.diff = (arr, ...args) => {
  const rest = exports.union(...args);
  const res = [];
  for (const ele of arr) {
    if (!rest.includes(ele)) {
      res.push(ele);
    }
  }
  return res;
};

exports.stripComments = (contents, options = {}) => {
  const input = contents && contents.toString();

  if (typeof options.stripComments === 'function') {
    return options.stripComments(input, options);
  }

  try {
    // strip block quotes, as well as hash-bang from inside quoted strings,
    // and from the beginning of strings since they choke esprima
    return stripComments(input, options).replace(LINE_COMMENT_REGEX, '').replace(HASH_BANG_REGEX, '');
  } catch (err) {
    err.message = `Parsing error. ${err.message}`;
    err.filepath = options.file.path;
    throw err;
  }
};

exports.matchModules = (input, options, file) => {
  return matchRequires(input, options, file).concat(exports.matchImports(input, options, file));
};

exports.omit = (obj = {}, keys = []) => {
  return exports.filterObj(obj, key => !keys.includes(key));
};

exports.pick = (obj = {}, keys = []) => {
  return exports.filterObj(obj, key => keys.includes(key));
};

exports.filterObj = (obj = {}, fn) => {
  const res = {};
  for (const key of Object.keys(obj)) {
    if (fn(key) === true) {
      res[key] = obj[key];
    }
  }
  return res;
};

// TODO: placeholder for es2015 imports
exports.matchImports = () => [];

exports.normalizeOptions = (options = {}) => {
  const keys = Object.keys(options);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (/dependencies/i.test(key)) {
      const opt = options[key];
      opt.files = opt.files || {};
      if (Array.isArray(opt.files) || typeof opt.files === 'string') {
        opt.files = { patterns: exports.arrayify(opt.files) };
      }
    }
  }
};

exports.singularize = str => exports.inflection.singularize(str);
exports.pluralize = str => exports.inflection.pluralize(str);
exports.inflect = (word, n) => {
  if (n === 0 || n > 1) return exports.pluralize(word);
  return exports.singularize(word);
};

/**
 * Roughly sort files in the given array
 */

exports.sortFiles = (files = []) => {
  return files.sort((a, b) => {
    const alen = a.relative.split(path.sep).length;
    const blen = b.relative.split(path.sep).length;
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

exports.isString = str => str && typeof str === 'string';

/**
 * Returns true if val is an object
 */

exports.isObject = val => exports.typeOf(val) === 'object';

/**
 * Return true if `val` has the given string.
 *
 * @param {Array|String} `val`
 * @param {String} `str`
 * @param {Number} `idx` (optional) Index to start the search from.
 * @return {Boolean}
 */

exports.has = (val, str, idx = 0) => {
  if (Array.isArray(val)) return val.slice(idx).includes(str);
  return val.startsWith(str, idx);
};

/**
 * Returns true if the given name is a valid npm package name
 */

exports.isValidPackageName = name => {
  if (typeof name === 'string' && name !== '' && name[0] !== '.') {
    if (/\//.test(name)) return true;
    const stats = exports.validateName(name);
    return stats.validForNewPackages === true && stats.validForOldPackages === true;
  }
  return false;
};

exports.remove = (arr, elements) => {
  if (typeof elements === 'string') {
    elements = [elements];
  }
  for (const ele of elements) {
    const idx = arr.indexOf(ele);
    if (idx === -1) {
      continue;
    }
    const last = arr.pop();
    if (last === ele) {
      continue;
    }
    arr[idx] = last;
  }
  return arr;
};

/**
 * Map globally defined "aliases" to the modules.
 * Aliases allow you to override the version of a
 * module, or the module name.
 */

exports.mapAliases = (app, names) => {
  const aliases = app.option('alias') || {};

  return names.reduce((acc, name) => {
    if (aliases[name]) {
      acc = acc.concat(aliases[name]);
    } else {
      acc.push(name);
    }
    return acc;
  }, []);
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

exports.uniquify = (report, removeType, keepType) => {
  const keep = report[keepType];
  const omit = report[removeType];
  if (keep && omit) {
    exports.remove(omit.missing.modules, Object.keys(keep.modules));
  }
};

/**
 * Create a prompt list with `all`, `none` and separator
 */

exports.createChoices = (app, prop = 'missing') => {
  const types = app.report[`${prop}Types`];
  const choices = {};
  const groups = [];

  if (!types) {
    const type = app.report[prop];

    for (const name of Object.keys(app.pkg.data)) {
      if (exports.validTypes.includes(name)) {
        const deps = Object.keys(app.pkg.data[name]);
        const choices = deps.filter(d => type.includes(d));
        groups.push({ name, choices });
      }
    }
  } else {
    for (const key of types) {
      const type = app.report[key];
      const modules = type[prop].modules;
      choices[key] = exports.unique(modules);
    }

    for (const name of Object.keys(choices)) {
      groups.push({ name, choices: exports.unique(choices[name].filter(Boolean)) });
    }
  }

  return groups;
};

class Stack extends Array {
  push(...args) {
    for (const arg of args) {
      if (!this.includes(arg)) {
        super.push(arg);
      }
    }
  }
}

exports.Stack = Stack;
