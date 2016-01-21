'use strict';

var fs = require('fs');
var path = require('path');
var tryOpen = require('try-open');
var red = require('ansi-red');

/**
 * Expose `utils`
 */

var utils = require('lazy-cache')(require);
var fn = require;
require = utils;

require('matched', 'glob');
require('array-unique', 'unique');
require('parse-gitignore');

utils.exists = function(fp) {
  return typeof tryOpen(fp, 'r') === 'number';
};

/**
 * Cast val to an array
 */

utils.arrayify = function(val) {
  return val ? (Array.isArray(val) ? val : [val]) : [];
};

/**
 * Resolve files and directories for each pattern in
 * the given array.
 */

utils.lookupEach = function(patterns) {
  return utils.unique(patterns).reduce(function(acc, pattern) {
    return acc.concat(utils.lookup(pattern));
  }, []);
};

utils.lookup = function(dir, res) {
  var dirStat = utils.tryStat(dir);
  res = res || [];

  if (dirStat === null) return res;
  if (dirStat.isFile()) {
    res.push(dir);
    return res;
  }

  var files = utils.tryReaddir(dir);
  if (!files) return res;

  var len = files.length, i = 0;

  while (len--) {
    var name = files[len];
    var fp = path.join(dir, name);

    var stat = utils.tryStat(fp);
    if (stat.isDirectory()) {
      utils.lookup(fp, res);
    } else if (/\.js$/.test(fp)) {
      res.push(fp);
    }
  }
  return res;
};

utils.patternify = function(patterns) {
  patterns = utils.arrayify(patterns);
  var len = patterns.length;
  var res = [];
  while (len--) {
    var pattern = patterns[len];
    if (/\/$/.test(pattern)) {
      res.push(pattern + '**');
    } else {
      res.push(pattern);
    }
  }
  return res;
};

utils.tryStat = function(fp) {
  try {
    return fs.statSync(fp);
  } catch (err) {
    console.log(red('lint-deps can\'t find filepath "' + fp + '"'));
    return null;
  }
};

utils.tryReaddir = function(dir) {
  try {
    return fs.readdirSync(dir);
  } catch (err) {
    return null;
  }
};

/**
 * Expose utils
 */

module.exports = utils;
