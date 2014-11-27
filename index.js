'use strict';

var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var mm = require('minimatch');
var strip = require('strip-comments');
var debug = require('debug')('lint-deps:index');
var findRequires = require('match-requires');
var excluded = require('./lib/exclusions');
var comments = require('./lib/comments');
var glob = require('./lib/glob');

var types = ['dependencies', 'devDependencies', 'peerDependencies'];
var pkg = require(path.resolve(process.cwd(), 'package.json'));
var deps = dependencies(pkg)('*');

/**
 * Return an array of the files that match the given patterns.
 *
 * @param {String} dir
 * @param {Array} exclusions
 * @return {Array}
 * @api private
 */

function readdir(dir, exclusions) {
  debug('readdir: %s', dir);
  return glob({
    exclusions: exclusions,
    patterns: ['**/*.js'],
    cwd: '.',
  });
}


/**
 * Read files and return an object with path and content.
 *
 * @param {String} `dir` current working directory
 * @param {Array} exclusions
 * @return {Object}
 * @api private
 */

function readFiles(dir, exclusions) {
  debug('readFiles: %s', dir);
  return readdir(dir, exclusions).map(function(fp) {
    debug('readFiles fp: %s', fp);
    return {
      path: fp.replace(/[\\\/]/g, '/'),
      content: fs.readFileSync(fp, 'utf8')
    };
  });
}

/**
 * Parse code comments to get user defined values.
 *
 * @param {String} str
 * @return {Array}
 * @api private
 */

function parseComments(str) {
  debug('parseComments');
  var re = /\/\*\s*deps:([^*]+)\*\//gm;
  if (!str) {
    return [];
  }

  return comments(str).reduce(function(acc, res) {
    debug('parseComments reduce');
    var match = re.exec(res);
    if (!match) {
      return [];
    }

    return acc.concat(match[1].split(/\s*,/g)
      .filter(Boolean).map(function(str) {

        var o = {missing: [], omit: []};
        str = str.trim();

        if (str[0] === '!') {
          o.omit.push(str);
        } else {
          o.missing.push(str);
        }

        debug('parseComments str');
        return o;
      }));
  }, []);
}

module.exports = function(dir, exclude) {
  debug('lint-deps: %s', dir);

  // allow the user to define exclusions
  var files = readFiles(dir, exclude);
  var report = {};
  var userDefined = [];

  var requires = _.reduce(files, function (acc, value) {
    debug('lint-deps reduce: %j', value);

    var config = parseComments(value.content);
    var missing = config.missing;
    var omitted = config.omit;

    value.content= value.content.replace(/#!\/usr[\s\S]+?\n/, '');
    value.content = strip(value.content);

    var results = findRequires(value.content);
    userDefined = userDefined.concat(missing).filter(Boolean);

    var file = {};
    file.path = value.path;
    file.requires = [];

    var len = results.length;
    var res = [];
    var i = 0;

    while (i < len) {
      var ele = results[i++];
      var name = ele.module;
      var excl = excluded.builtins.concat(omitted || []);

      if (name && excl.indexOf(name) === -1 && !/\./.test(name)) {
        ele.line = ele.line - 1;
        file.requires.push(ele);
        res.push(name);
      }
    }

    report[value.path] = file;
    return _.uniq(acc.concat(res));
  }, []).sort();


  // Add user-defined values
  requires = _.union(requires, userDefined);

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


function pkgdeps(pkg, type) {
  debug('pkgdeps');
  if (pkg.hasOwnProperty(type)) {
    return pkg[type];
  }
  return null;
}

function depsKeys(pkg, type) {
  debug('depsKeys: %s, %s', pkg, type);
  var o = pkgdeps(pkg, type);
  return o ? Object.keys(o) : [];
}

function dependencies(pkg) {
  return function(pattern) {
    return types.reduce(function(acc, type) {
      debug('dependencies: %s', type);

      var res = mm.match(depsKeys(pkg, type), pattern || '*');
      return acc.concat(res);
    }, []);
  };
}
