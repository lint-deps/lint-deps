'use strict';

var omitEmpty = require('omit-empty');
var writeJson = require('write-json');
var omit = require('object.omit');

/**
 * Remove unused dependencies
 */

module.exports = function(cli, argv, cb) {
  var report = cli.report || cli.lint('*', argv);
  var obj = Object.assign({}, cli.pkg.data);
  var unused = [];
  var count = 0;

  report.types.forEach(function(type) {
    var keys = report[type].unused;
    count += keys.length;
    unused.push({name: type, modules: keys});
    obj[type] = omit(obj[type], keys);
  });

  if (count === 0) {
    cb(null, count);
    return;
  }

  var pkg = omitEmpty(obj);
  cli.pkg.data = pkg;

  writeJson(cli.pkg.path, pkg, function(err) {
    if (err) {
      cb(err);
      return;
    }
    cb(null, unused);
  });
};
