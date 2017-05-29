'use strict';

var get = require('get-value');
var pick = require('object.pick');
var writeJson = require('write-json');
var utils = require('../lib/utils');

module.exports = function(cli, argv, cb) {
  if (!cli.report) {
    cb();
    return;
  }

  var pkg = Object.assign({}, cli.pkg.data);
  var deps = Object.keys(get(cli, 'report.dependencies.modules') || {});
  var missing = get(cli, 'report.dependencies.missing.modules') || [];

  deps = utils.union([], deps, missing);
  deps.sort();

  for (var i = 0; i < cli.report.types.length; i++) {
    var type = cli.report.types[i];
    if (type === 'dependencies') {
      continue;
    }

    var report = cli.report[type];
    var modules = Object.keys(report.modules);

    if (deps.length) {
      modules = modules.filter(function(name) {
        return deps.indexOf(name) === -1;
      });
    }

    if (pkg[type]) {
      pkg[type] = pick(pkg[type], modules);
    }
  }

  writeJson(cli.pkg.path, pkg, cb);
};
