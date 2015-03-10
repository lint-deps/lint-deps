'use strict';

/**
 * Module dependencies
 */

var fs = require('fs');
var mm = require('micromatch');
var debug = require('debug')('lint-deps:index');
var commandments = require('commandments');
var findRequires = require('match-requires');
var _ = require('lodash');

/**
 * Local dependencies
 */

var ignored = require('./lib/ignore');
var custom = require('./lib/custom');
var strip = require('./lib/strip');
var glob = require('./lib/glob');
var pkg = require('load-pkg');

/**
 * Config
 */

module.exports = function(dir, patterns, options) {
  if (typeof patterns !== 'string' && !Array.isArray(patterns)) {
    options = patterns; patterns = null;
  }

  // TODO: maybe expose the patterns for pkg
  var deps = dependencies(pkg)('*');
  options = options || {};

  // allow the user to define exclusions
  var files = readFiles(dir, patterns, options);
  var report = {};
  var userDefined = {};

  var requires = _.reduce(files, function (acc, value) {
    var commands = parseCommands(value.content);
    userDefined.requires = commands.required || [];
    userDefined.ignored = commands.ignored || [];

    value.content = value.content.replace(/#!\/usr[\s\S]+?\n/, '');
    value.content = strip(value.content);

    var results = [];
    if (value.path !== '.verb.md') {
      results = findRequires(value.content);
    }

    // placeholder for custom matchers
    var matchers = [];
    var matches = custom(value.content, matchers);
    if (matches) {
      results = results.concat(matches);
    }

    var file = {};
    file.path = value.path;
    file.requires = [];

    var len = results.length;
    var res = [];
    var i = 0;

    while (i < len) {
      var ele = results[i++];
      var name = ele.module;
      var excl = ignored.builtins;

      if (name && excl.indexOf(name) === -1 && !/^\./.test(name)) {
        ele.line = ele.line - 1;
        file.requires.push(ele);
        res.push(name);
      }
    }

    report[value.path] = file;
    return _.uniq(acc.concat(res));
  }, []).sort();


  // Add user-defined values
  requires = _.union(requires, userDefined.requires);
  deps = _.union(deps, userDefined.ignored);

  var notused = _.difference(deps, requires);
  var missing = requires.filter(function(req) {
    return deps.indexOf(req) === -1;
  });

  // Build `report`
  _.transform(report, function(acc, value, fp) {
    value.missing = [];
    _.forIn(value.requires, function(obj) {
      var i = missing.indexOf(obj.module);
      value.missing = value.missing.concat(i !== -1 ? missing[i] : []);
    });
    value.missing = _.uniq(value.missing);
    acc[fp] = value;
  });

  var rpt = {};
  rpt.missing = missing;
  rpt.notused = _.difference(notused, userDefined.ignored);
  rpt.files = report;

  var o = {report: rpt};
  // modules that are actually required
  o.requires = requires;
  // modules that are listed in package.json, but not used
  o.notused = rpt.notused;
  // modules that are actaully required, but missing from package.json
  o.missing = missing;
  return o;
};

/**
 * Read files and return an object with path and content.
 *
 * @param {String} `dir` current working directory
 * @param {Array} `ignore` Ignore patterns.
 * @return {Object}
 * @api private
 */

function readFiles(dir, patterns, options) {
  return glob(dir, patterns, options).map(function(fp) {
    var res = {};
    res.path = fp.replace(/[\\\/]+/g, '/');
    res.content = fs.readFileSync(fp, 'utf8');
    return res;
  });
}

/**
 * Parse commands/arguments from code comments.
 *
 * @param {String} str
 * @return {Array}
 * @api private
 */

function parseCommands(str) {
  if (!str) { return []; }

  var commands = commandments(['deps', 'require'], str || '');
  return _.reduce(commands, function(acc, res) {
    acc.required = acc.required || [];
    acc.ignored = acc.ignored || [];

    res._.forEach(function(arg) {
      if (arg[0] === '!') {
        acc.ignored.push(arg.slice(1));
      } else {
        acc.required.push(arg);
      }
    });
    return acc;
  }, {});
}

/**
 * Get the given `type` of dependencies
 * from package.json
 */

function pkgdeps(pkg, type) {
  if (pkg.hasOwnProperty(type)) {
    return pkg[type];
  }
  return null;
}

/**
 * Return an array of keys for the dependencies
 * in package.json
 */

function depsKeys(pkg, type) {
  var deps = pkgdeps(pkg, type);
  return deps
    ? Object.keys(deps)
    : [];
}

/**
 * Return a function to get an array of `dependencies` from
 * package.json that match the given `pattern`
 *
 * @param {Object} pkg
 * @return {Array}
 * @api private
 */

function dependencies(pkg, types) {
  return function(pattern) {

    return depTypes(types).reduce(function(acc, type) {

      var keys = depsKeys(pkg, type);
      var res = mm.match(keys, pattern || '*');
      return acc.concat(res);
    }, []);
  };
}

function depTypes(types) {
  return types || [
    'peerDependencies',
    'devDependencies',
    'dependencies'
  ];
}