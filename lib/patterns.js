'use strict';

/**
 * Module dependencies
 */

var fs = require('fs');
var path = require('path');
var isGlob = require('is-glob');
var unique = require('array-unique');
var parse = require('parse-gitignore');
var chars = require('regexp-special-chars');
var pkg = require(require('./pkg'));
var get = require('get-value');
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

exports.ignore = function(patterns) {
  var arr = gitignore('.gitignore')
    .concat(get(pkg, 'lint-deps.ignore') || [])
    .concat(patterns || [])
    .concat(dirs);

  return unique(filter(arr)).sort();
};

/**
 * Directories to exclude in the search
 */

exports.toGlobs = function(patterns) {
  var arr = exports.ignore(patterns);
  return arr.map(function(pattern) {
    var len = pattern.length;

    if (pattern[len - 1] === '/') {
      pattern = pattern.slice(0, len - 1);
    }
    if (pattern.charAt(0) === '/') {
      pattern = pattern.slice(1);
    }

    return '**/' + pattern + '/**';
  });
};

/**
 * Directories to exclude in the search
 */

exports.regex = function(patterns) {
  patterns = exports.ignore(patterns).reduce(function(acc, pattern) {
    return acc.concat(pattern.split(','));
  }, []);

  patterns = unique(patterns);
  return new RegExp('\\/' + patterns.join('(\\/|$)|\\/'));
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
  return arr.filter(function(pattern) {
    if (isGlob(pattern) && !/\/$/.test(pattern)) {
      return false;
    }
    return true;
  });
}
