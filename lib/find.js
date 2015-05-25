'use strict';

var fs = require('fs');
var path = require('path');
var cache = {};
var patterns = cache.patterns || (cache.patterns = require('./patterns'));

function find(dir, ignore, res) {
  var key = 'key__' + ignore;
  var re = cache[key] || (cache[key] = patterns.regex(ignore));
  var files = fs.readdirSync(dir);
  var len = files.length, i = 0;
  res = res || [];

  while (len--) {
    var name = files[len];
    var fp = path.join(dir, name);
    var stat = fs.statSync(fp);
    if (stat.isDirectory()) {
      if (re.test(fp)) continue;
      find(fp, ignore, res);
    } else if (/\.js$/.test(fp)) {
      res.push(fp);
    }
  }
  return res;
}

/**
 * Expose `find`
 */

module.exports = find;
