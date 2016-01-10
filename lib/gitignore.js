'use strict';

var fs = require('fs');
var path = require('path');
var utils = require('./utils');

/**
 * Common directories to ignore
 */

var exclusions = [
  '.git',
  'actual',
  'coverage',
  'expected',
  'fixtures',
  'node_modules',
  'temp',
  'templates',
  'test/actual',
  'test/fixtures',
  'tmp',
  'vendor',
  'wip'
];

/**
 * Directories to exclude in the search
 */

module.exports = function(cwd) {
  var arr = ignores(cwd).map(function(pattern) {
    return module.exports.toGlob(pattern);
  });
  return utils.unique(arr);
};

module.exports.toGlob = function(pattern) {
  pattern = pattern.replace(/^[*]{2}|[*]{2}$/, '');
  pattern = pattern.replace(/^\/|\/$/, '');
  return '**/' + pattern + '/**';
};

/**
 * Directories to exclude in the search
 */

function ignores(cwd) {
  return gitignore('.gitignore', cwd)
    .concat(exclusions)
    .sort();
}

/**
 * Parse the local `.gitignore` file and add
 * the resulting ignore patterns.
 */

function gitignore(fp, cwd) {
  fp = path.resolve(cwd, fp);
  if (!utils.exists(fp)) {
    return [];
  }
  return utils.parseGitignore(fp);
}
