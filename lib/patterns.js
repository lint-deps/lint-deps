'use strict';

/**
 * Module dependencies
 */

var fs = require('fs');
var path = require('path');
var unique = require('array-unique');
var parse = require('parse-gitignore');
var chars = require('regexp-special-chars');
var get = require('get-value');
var pkg = require('load-pkg').sync(process.cwd());
var cwd = require('./cwd');
var cache = {};

/**
 * Directories at the root of the current working
 * directory. These are used for glob patterns.
 */

var dirs = [
  '.git',
  'node_modules',
  'temp',
  'test/actual',
  'test/fixtures',
  'fixtures',
  'actual',
  'templates',
  'tmp',
  'vendor',
  'wip'
];

/**
 * Directories to exclude in the search
 */

exports.ignore = function (patterns) {
  var arr = gitignore('.gitignore')
    .concat(get(pkg, 'verb.deps.ignore') || [])
    .concat(patterns || [])
    .concat(dirs);
  return unique(filter(arr)).sort();
};

/**
 * Directories to exclude in the search
 */

exports.regex = function (patterns) {
  patterns = exports.ignore(patterns).reduce(function (acc, pattern) {
    return acc.concat(pattern.split(','));
  }, []);
  return new RegExp('\\/' + patterns.join('$|\\/') + '$');
};

/**
 * Required modules to exclude
 */

exports.builtins = require('repl')._builtinLibs.concat([
  'console',
  'repl'
]);

// Final omissions. These can give false-negatives,
// since tools like load-grunt-tasks hide the modules
// being required.
exports.packageNames = [
  'handlebars-'
];

/**
 * Parse the local `.gitignore` file and add
 * the resulting ignore patterns.
 */

function gitignore(fp) {
  fp = path.resolve(cwd, fp);
  if (!fs.existsSync(fp)) return [];
  var str = fs.readFileSync(fp, 'utf8');
  return parse(str);
}

/**
 * Filter ignore patterns to return only those that look
 * like directory patterns
 */

function filter(arr) {
  return arr.filter(function (pattern) {
    if (/\*|\w\.\w/.test(pattern)) return false;
    return true;
  });
}
