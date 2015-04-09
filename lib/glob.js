'use strict';

/**
 * Module dependencies
 */

var fs = require('fs');
var path = require('path');
var glob = require('globby');
var uniq = require('array-unique');
var mm = require('micromatch');
var relative = require('relative');
var extend = require('extend-shallow');
var ignore = require('./ignore').ignore;
var cwd = require('./cwd');

module.exports = function(dir, patterns, options, fn) {
  patterns = patterns && patterns.length || ['**/*.js', '.verb.md'];
  var opts = extend({cwd: cwd, dot: true}, options);
  opts.ignore = union(ignore, opts.ignore || []);
  return lookup(opts.cwd, patterns, opts.ignore);
};

function lookup (dir, patterns, ignore) {
  var files = tryReaddir(dir);
  var len = files.length, i = 0;
  var res = [];

  while (len--) {
    var name = files[i++];
    var fp = path.resolve(dir, name);
    if (contains(relative(fp), ignore)) continue;

    if (fs.statSync(fp).isDirectory()) {
      res.push.apply(res, lookup(fp, patterns, ignore));

    } else if (!patterns || mm.any(name, patterns)) {
      res.push(fp);
    }
  }
  return res;
}

function contains(fp, patterns) {
  var len = patterns.length;
  while (len--) {
    if (mm.contains(fp, patterns[len])) {
      return true;
    }
  }
  return false;
}


function tryReaddir(dir) {
  try {
    return fs.readdirSync(dir);
  } catch(err) {}
  return [];
}

function union() {
  return uniq([].concat.apply([], arguments));
}
