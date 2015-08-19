'use strict';

var fs = require('fs');
var path = require('path');
var unique = require('array-unique');
var red = require('ansi-red');

/**
 * Expose `utils`
 */

var utils = module.exports;

/**
 * Cast val to an array
 */

utils.arrayify = function arrayify(val) {
  return Array.isArray(val) ? val : [val];
};

/**
 * Resolve files and directories for each pattern in
 * the given array.
 */

utils.lookupEach = function lookupEach(patterns) {
  return unique(patterns).reduce(function (acc, pattern) {
    return acc.concat(lookup(pattern));
  }, []);
};

utils.lookup = lookup;

function lookup(dir, res) {
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
      lookup(fp, res);
    } else if (/\.js$/.test(fp)) {
      res.push(fp);
    }
  }
  return res;
}

utils.patternify = function patternify(patterns) {
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

utils.tryStat = function tryStat(fp) {
  try {
    return fs.statSync(fp);
  } catch(err) {
    console.log(red('lint-deps can\'t find filepath "' + fp + '"'));
    return null;
  }
};

utils.tryReaddir = function tryReaddir(dir) {
  try {
    return fs.readdirSync(dir);
  } catch(err) {
    return null;
  }
};