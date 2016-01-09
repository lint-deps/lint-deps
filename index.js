'use strict';

/**
 * Module dependencies
 */

var fs = require('fs');
var path = require('path');
var mm = require('micromatch');
var extend = require('extend-shallow');
var commandments = require('commandments');
var findRequires = require('match-requires');
var strip = require('strip-comments');
var _ = require('lodash');

/**
 * Local dependencies
 */

var pkg = require(require('./lib/pkg'));
var patterns = require('./lib/patterns');
var custom = require('./lib/custom');
var utils = require('./lib/utils');
var find = require('./lib/find');
var cwd = require('./lib/cwd');

/**
 * Config
 */

module.exports = function(dir, options) {
  options = options || {};

  if (pkg['lint-deps'] && pkg['lint-deps'].ignore) {
    options.ignore = options.ignore.concat(pkg['lint-deps'].ignore);
  }

  // TODO: maybe expose the exclusions for pkg
  var deps = dependencies(pkg)('*');

  // allow the user to define exclusions
  var userDefined = extend({requires: [], ignored: [], only: []}, options);
  var files = readFiles(dir, options);
  var report = {};
  var requires = _.reduce(files, function(acc, value) {
    var commands = parseCommands(value.content);

    userDefined.requires = _.union(userDefined.requires, commands.required || []);
    userDefined.ignored = _.union(userDefined.ignored, commands.ignored || []);

    value.content = value.content.replace(/#!\/usr[^\n]+/, '');
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
    var i = -1;

    while (++i < len) {
      var ele = results[i];
      // account for lazily-required module dependencies with asliases
      ele.module = ele.module.split(/['"],\s*['"]/)[0].trim();
      var name = ele.module;
      var regex = /^\.|\{/; // see https://github.com/jonschlinkert/lint-deps/issues/8
      var excl = patterns.builtins;

      if (name && excl.indexOf(name) !== -1) {
        continue;
      }

      if (name && mm.any(name, excl.concat(regex))) {
        continue;
      }

      // see: https://github.com/jonschlinkert/lint-deps/issues/8
      name = name.split(/[\\\/]/)[0];

      ele.line = ele.line - 1;
      file.requires.push(ele);
      res.push(name);
    }

    report[file.path] = file;
    return _.uniq(acc.concat(res));
  }, []);

  requires.sort();
  deps.sort();

  var hasVerb = fs.existsSync(path.resolve('.verb.md'));

  // Add user-defined values
  requires = _.union(requires, userDefined.requires);
  deps = _.union(deps, userDefined.ignored);

  var plugins = verbProp(pkg, 'plugins');
  var helpers = verbProp(pkg, 'helpers');
  var middleware = verbProp(pkg, 'use');

  addMissing(requires, plugins);
  addMissing(requires, helpers);
  addMissing(requires, middleware);

  var notused = _.difference(deps, requires);
  if (hasVerb && notused.indexOf('verb') !== -1) {
    notused = _.difference(notused, ['verb']);
  }

  removeUnused(notused, plugins);
  removeUnused(notused, helpers);
  removeUnused(notused, middleware);

  /**
   * Look through `scripts` for references to "unused" deps
   * this is really just a placeholder for lint-deps v2.0
   * which has better logic for this.
   */

  if (pkg.hasOwnProperty('scripts')) {
    for (var key in pkg.scripts) {
      var val = pkg.scripts[key];
      var idx = notused.indexOf(val);
      if (idx !== -1) {
        notused.splice(idx, 1);
      }
    }
  }

  var missing = requires.filter(function(req) {
    if (req === pkg.name) {
      return false;
    }
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

  var o = { report: rpt };
  // modules that are actually required
  o.requires = requires;
  // modules that are listed in package.json, but not used
  o.notused = rpt.notused;
  // modules that are actually required, but missing from package.json
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

function readFiles(dir, options) {
  options = options || [];
  var files = [];

  if (options.only && options.only.length) {
    files = mm(files, utils.arrayify(options.only), options);
  } else if (pkg.hasOwnProperty('files') && options.files) {
    files = pkg.files;
    if (pkg.main) files.push(pkg.main);
    if (options.include) {
      files = files.concat(options.include.split(/[,\s]+/));
    }
    files = utils.lookupEach(files);
  } else {
    files = find(dir, options);
  }

  files = find(dir, options);
  var len = files.length;
  var res = [];

  while (len--) {
    var fp = files[len];
    var file = {};
    file.path = path.relative(cwd, fp.split('\\').join('/'));
    file.content = fs.readFileSync(fp, 'utf8');
    res.push(file);
  }
  return res;
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
 * Remove elements from the `notused` array
 */

function removeUnused(notused, val) {
  if (!val) return;

  if (typeof val === 'object' && !Array.isArray(val)) {
    val = Object.keys(val);
  }

  if (!Array.isArray(val)) {
    return;
  }

  var len = val.length;
  while (len--) {
    var idx = notused.indexOf(val[len]);
    if (idx !== -1) {
      notused.splice(idx, 1);
    }
  }
}

/**
 * Add missing deps to the `deps` array
 */

function addMissing(deps, val) {
  if (!val) return;

  if (typeof val === 'object' && !Array.isArray(val)) {
    val = Object.keys(val);
  }

  if (!Array.isArray(val)) {
    return;
  }

  var len = val.length;
  while (len--) {
    var str = val[len];
    if (/^\./.test(str)) {
      continue;
    }

    if (deps.indexOf(str) === -1) {
      deps.push(str);
    }
  }
}

/**
 * Return an array of keys for the dependencies
 * in package.json
 */

function verbProp(pkg, prop) {
  var verb = pkg.verb || {};
  if (!verb[prop]) {
    return [];
  }
  if (Array.isArray(verb[prop])) {
    return verb[prop];
  }
  if (typeof verb[prop] === 'object') {
    return Object.keys(verb[prop]);
  }
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
