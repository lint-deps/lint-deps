'use strict';

var fs = require('fs');
var path = require('path');
var cache = {};
var patterns = cache.patterns || (cache.patterns = require('./patterns'));

function find(dir, options) {
  options = options || {};
  var ignoresArray = options.ignores || options.ignore || [];
  var key = 'key__' + ignoresArray;
  var re = cache[key] || (cache[key] = patterns.regex(ignoresArray));

  function lookup(dir, res) {
    var files = fs.readdirSync(dir);
    var len = files.length, i = 0;
    res = res || [];

    while (len--) {
      var name = files[len];
      var fp = path.join(dir, name);
      var stat = fs.statSync(fp);
      if (stat.isDirectory()) {
        if (re.test(fp)) continue;
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
