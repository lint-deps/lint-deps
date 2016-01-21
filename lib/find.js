'use strict';

var fs = require('fs');
var path = require('path');
var mm = require('micromatch');
var patterns = require('./patterns');

function find(dir, options) {
  options = options || {};
  var ignoresArray = options.ignores || options.ignore || [];
  var ignores = patterns.toGlobs(ignoresArray);

  var isMatch = mm.any(dir, ignores);
  if (isMatch) return [];

  function lookup(dir, res) {
    var files = fs.readdirSync(dir);
    var len = files.length, i = 0;
    res = res || [];

    while (len--) {
      var name = files[len];
      var fp = path.join(dir, name);

      var isMatch = mm.any(fp, ignores);
      if (isMatch) continue;

      var stat = fs.statSync(fp);
      if (stat.isDirectory()) {
        lookup(fp, res);
      } else if (fp.slice(-3) === '.js') {
        res.push(fp);
      }
    }
    return res;
  }
  return lookup(dir);
}

/**
 * Expose `find`
 */

module.exports = find;
