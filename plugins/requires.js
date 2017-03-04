'use strict';

var path = require('path');
var through = require('through2');
var merge = require('merge-deep');
var requires = require('match-requires');
var configs = require('../lib/configs');
var utils = require('../lib/utils');

module.exports = function(app) {
  var opts = app.options;
  var cache = app.cache;
  cache.deps = utils.addDeps(app.pkg, app.options);

  var deps = app.pkg.get('dependencies') || {};
  var devDeps = app.pkg.get('devDependencies') || {};
  var peerDeps = app.pkg.get('peerDependencies') || {};
  var optionalDeps = app.pkg.get('optionalDependencies') || {};
  var ignoredDirs = [];
  var noPackage = [];

  return through.obj(function(file, enc, next) {
    if (file.extname !== '.js') {
      next(null, file);
      return;
    }
    if (file.isNull()) {
      next(null, file);
      return;
    }

    if (isIgnoredDir(file.dirname, cache, app)) {
      next();
      return;
    }

    if (utils.mm.isMatch(file.relative, app.options.ignore)) {
      next();
      return;
    }
    console.log(file.path)

    var matches = requires(file.contents.toString()) || [];
    var type = utils.fileType(app, file);
    utils.union(cache.files, type, file);
    app.set(['cache.files', type, file.relative.split('.').join('\\.')], file);
    file.missing = {all: []};

    for (var i = 0; i < matches.length; i++) {
      var name = matches[i].module;
      if (/^\./.test(name)) continue;

      var segs = name.split(/[\\\/]/);
      if (segs.length > 1) {
        name = segs[0];
      }

      if (opts.ignoreDeps.indexOf(name) === -1) {
        siftRequires(cache, file, name);
      }
    }

    var reqs = utils.get(file.cache, 'requires.npm') || [];
    var deps = cache.deps.keys[type] || [];

    if (type !== 'dependencies') {
      var keys = utils.get(cache, 'deps.keys.dependencies') || [];
      deps = utils.arrUnion([], keys, deps);
    }

    var diff = utils.diff(reqs, deps) || [];

    utils.union(cache.missing, type, diff);
    utils.union(file.missing, type, diff);
    utils.union(cache.missing, 'all', diff);
    utils.union(file.missing, 'all', diff);
    next();
  }, function(cb) {
    var keys = utils.get(cache, 'deps.keys.all') || [];
    var npm = utils.get(cache, 'requires.npm') || [];
    var unused = utils.diff(keys, npm);
    cache.unused = {all: unused};

    var props = Object.keys(cache.files);
    for (var i = 0; i < props.length; i++) {
      var type = props[i];
      cache.unused[type] = (utils.get(cache, ['deps.keys', type]) || [])
        .filter(function(name) {
          return cache.unused.all.indexOf(name) !== -1;
        });
    }

    var opts = merge({}, app.options, configs());
    if (Array.isArray(opts.fns) && opts.fns.length) {
      for (var j = 0; j < opts.fns.length; j++) {
        var fn = opts.fns[j];
        fn.call(app, app);
      }
    }
    cb();
  });
};

function siftRequires(cache, file, name) {
  utils.union(cache, 'requires.' + utils.requireType(name), name);
  utils.union(file, 'cache.requires.' + utils.requireType(name), name);
}

function isIgnoredDir(dir, cache, app) {
  if (dir === app.cwd) {
    return false;
  }

  cache.ignoredDirs = cache.ignoredDirs || [];
  cache.noPackage = cache.noPackage || [];

  if (cache.ignoredDirs.indexOf(dir) !== -1) {
    return true;
  }

  for (var i = 0; i < cache.ignoredDirs.length; i++) {
    var ignored = cache.ignoredDirs[i];
    if (dir.indexOf(ignored) === 0) {
      cache.ignoredDirs.push(dir);
      return true;
    }
  }

  if (cache.noPackage.indexOf(dir) === -1) {
    var hasPackage = utils.exists(path.join(dir, 'package.json'));
    if (hasPackage) {
      cache.ignoredDirs.push(dir);
      return true;
    }
  }

  cache.noPackage.push(dir);
  return false;
}
