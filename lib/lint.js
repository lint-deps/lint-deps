'use strict';

var fs = require('fs');
var path = require('path');
var cwd = require('cwd');
var file = require('fs-utils');
var mm = require('multimatch');
var strip = require('strip-comments');
var _ = require('lodash');
var filters = require('files-filters');
var files = require('filter-files');
var pkg = require(path.resolve(process.cwd(), 'package.json'));
var excluded = require('./exclusions');
var utils = require('./utils');
var find = require('./find')


var exclude = filters.exclude(/node_modules|\.git|fixtures|actual/g);
var include = filters.include(/(\.js$|bin.*)/);



var types = ['dependencies', 'devDependencies'];

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

function alldeps(pgk) {
  return function(pattern) {
    return types.reduce(function(acc, type) {
      var res = mm(depsKeys(pkg, type), pattern || '*');
      return acc.concat(res);
    }, []);
  }
}

function lookup(dir, fn) {
  var res = files.sync(dir || '.', [exclude, include]);
  if (typeof fn === 'function') {
    return res.filter(fn);
  }
  return res;
}

function listDeps(pkg, keys) {
  return depsKeys(pkg).filter(function(key) {
    return keys.indexOf(key) === -1;
  });
}

function read(dir, fn) {
  return lookup(dir).map(function(fp) {
    var str = fs.readFileSync(fp, 'utf8');
    if (typeof fn === 'function') {
      return fn(str);
    }
    return str;
  });
}

function requires(filter) {
  return function(dir) {
    var files = read(dir);
    return files.reduce(function(acc, fp) {
      var res = find.requires(fp);
      if (typeof filter === 'function') {
        res = filter(res);
      }
      return _.uniq(acc.concat(res));
    }, []).sort();
  }
}

function filter(arr, exclude) {
  exclude = exclude || excluded.builtins;
  var len = arr.length;
  var res = [];
  var i = 0;
  while (len--) {
    var ele = arr[i++];
    if (exclude.indexOf(ele) === -1 && !/\./.test(ele)) {
      res.push(ele);
    }
  }
  return res;
}


exports.deps = alldeps(pkg);
exports.requires = requires(filter);