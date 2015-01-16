'use strict';

/**
 * Module dependencies
 */

var fs = require('fs');
var path = require('path');
var glob = require('globby');
var debug = require('debug')('lint-deps:glob');
var uniq = require('array-unique');
var mm = require('micromatch');
var invalid = require('./exclusions').invalid;

/**
 * Expose `glob`
 */

module.exports = function(options, fn) {
  debug('glob: %j', options);

  var opts = options || {};
  opts.cwd = opts.cwd || '.';
  opts.patterns = opts.patterns || '*.js';
  opts.exclusions = union(invalid, opts.exclusions || []);

  var files = fs.readdirSync(opts.cwd).filter(function(fp) {
    debug('glob fp: %s', fp);

    if (fn && typeof fn === 'function') {
      return fn(fp, opts);
    }
    return opts.exclusions.indexOf(fp) === -1;
  });

  return files.reduce(function (acc, cwd) {
    if (fs.statSync(cwd).isFile()) {
      var dir = path.dirname(cwd);
      if (dir !== '.') {
        cwd = dir;
      }

      debug('glob cwd: %s', cwd);
      acc = union(acc, opts.patterns.reduce(function (res, pattern) {
        debug('glob pattern: %s', pattern);
        return union(res, mm.match(arrayify(cwd), pattern));
      }, []));
    }

    var res = glob.sync(opts.patterns, {cwd: cwd}).map(function(fp) {
      debug('glob filepath: %s', fp);
      return path.join(cwd, fp);
    });

    return union(acc, res.filter(function(fp) {
      debug('glob filter: %s', fp);
      if (fn && typeof fn === 'function') {
        opts.cwd = cwd;
        return fn(fp, opts);
      }

      return !(new RegExp(opts.exclusions.join('|')).test(fp));
    }));
  }, []);
};

function arrayify(arr) {
  return !Array.isArray(arr)
    ? [arr]
    : arr;
}

function union() {
  return uniq([].concat.apply([], arguments));
}
