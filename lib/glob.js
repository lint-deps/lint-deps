'use strict';

/**
 * Module dependencies
 */

var fs = require('fs');
var path = require('path');
var glob = require('globby');
var uniq = require('array-unique');
var mm = require('micromatch');
var extend = require('extend-shallow');
var ignore = require('./ignore').ignore;


module.exports = function(dir, patterns, options, fn) {
  patterns = patterns && patterns.length || ['*.js', '.verb.md'];
  var opts = extend({cwd: '.', dot: true}, options);
  opts.ignore = union(ignore, opts.ignore || []);
  return lookup(opts.cwd, patterns, opts.ignore);
};

function lookup (dir, patterns, ignore) {
  var files = fs.readdirSync(dir);
  var len = files.length, i = 0;
  var res = [];

  while (len--) {
    var name = files[i++];
    if (mm.any(name, ignore)) continue;
    var fp = path.join(dir, name);

    if (fs.statSync(fp).isDirectory()) {
      res.push.apply(res, lookup(fp, patterns, ignore));

    } else if (!patterns || mm.any(name, patterns)) {
      res.push(fp);
    }
  }
  return res;
}

function union() {
  return uniq([].concat.apply([], arguments));
}
