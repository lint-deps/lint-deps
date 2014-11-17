'use strict';

var fs = require('fs');
var path = require('path');
var mm = require('multimatch');
var findRequires = require('match-requires');
var filters = require('files-filters');
var files = require('filter-files');
var _ = require('lodash');
var pkg = require(path.resolve(process.cwd(), 'package.json'));
var excluded = require('./lib/exclusions');

var types = ['dependencies', 'devDependencies', 'peerDependencies'];

function deps(pgk, type) {
  if (pkg.hasOwnProperty(type)) {
    return pkg[type];
  }
  return null;
}

function depsKeys(pgk, type) {
  var o = deps(pkg, type);
  return o ? Object.keys(o) : [];
}

function dependencies(pkg) {
  return function(pattern) {
    return types.reduce(function(acc, type) {
      var res = mm(depsKeys(pkg, type), pattern || '*');
      return acc.concat(res);
    }, []);
  };
}

function lookup(dir, omit) {
  var excl = excluded.invalid.concat(omit || []);
  var dirs = new RegExp(excl.join('|'), 'g');
  var exclude = filters.exclude(dirs);
  var include = filters.include(/(\.js$|bin.*)/);
  return files.sync(dir || '.', [exclude, include]);
}

function readFiles(dir, exclude) {
  return lookup(dir, exclude).map(function(fp) {
    return {
      path: fp.replace(/[\\\/]/g, '/'),
      content: fs.readFileSync(fp, 'utf8')
    };
  });
}

module.exports = function(dir, exclude) {
  var deps = dependencies(pkg)('*');

  // allow the user to define exclusions
  var excl = excluded.builtins;
  var report = {};

  var requires = _.reduce(readFiles(dir, exclude), function (acc, value) {
    var results = findRequires(value.content);

    var file = {};
    file.requires = [];

    var len = results.length;
    var res = [];
    var i = 0;

    while (i < len) {
      var ele = results[i++];
      var name = ele.module;

      if (name && excl.indexOf(name) === -1 && !/\./.test(name)) {
        ele.line = ele.line - 1;
        file.requires.push(ele);
        res.push(name);
      }
    }

    report[value.path] = file;
    return _.uniq(acc.concat(res));
  }, []).sort();

  var notused = _.difference(deps, requires);
  var missing = requires.filter(function(req) {
    return deps.indexOf(req) === -1;
  });

  var rpt = {};
  rpt.missing = missing;
  rpt.notused = notused;
  rpt.files = report;

  return {
    // modules that are actually required
    report: rpt,
    // modules that are actually required
    requires: requires,
    // modules that are listed in package.json, but not used
    notused: notused,
    // modules that are actaully required, but missing from package.json
    missing: missing
  };
};
