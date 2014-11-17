'use strict';

var path = require('path');
var filterFiles = require('filter-files');
var mm = require('minimatch');

function matches(pattern, options, recurse) {
  if (typeof options === 'boolean') {
    recurse = options;
    options = {};
  }
  return function _matches(fp, dir) {
    fp = path.join(dir, fp);
    return mm(fp, pattern, options);
  };
}

function exclude(re, options, recurse) {
  if (typeof options === 'boolean') {
    recurse = options;
    options = {};
  }
  return function _exclude(fp, dir) {
    fp = path.join(dir, fp);
    if (fp && re.test(fp) || (dir && re.test(dir))) {
      return false;
    }
    return true;
  };
}

var exclusions = ['node_modules', 'vendor', 'test/actual', 'test/fixtures'];

module.exports = function(dirs) {
  var excl = exclusions.concat(dirs).join('|');

  var re = new RegExp(excl);
  var filters = [exclude(re), matches('**')];
  var files = filterFiles.sync('./', true, filters);

  return files.filter(function(fp) {
    return /\.js$/.test(fp);
  });
};
