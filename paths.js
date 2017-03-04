'use strict';

var path = require('path');
var exists = require('fs-exists-sync');
var merge = require('merge-deep');
var read = require('read-data');
var glob = require('matched');

function configs(arr, options) {
  var res = {configs: {}, js: {}, fns: []};

  for (var i = 0; i < arr.length; i++) {
    var opts = merge({}, options, arr[i]);
    var patterns = opts.patterns;
    var prop = opts.prop;
    var name = opts.name;
    var cwd = opts.cwd;
    var files = glob.sync(patterns, {cwd: cwd, nocase: true});
    var len = files.length;
    var idx = -1;
    var obj = {};
    var fns = [];

    while (++idx < len) {
      var fp = path.join(cwd, files[idx]);
      if (/\.(json|ya?ml)$/.test(fp)) {
        var data = read.data.sync(fp);
        if (prop) {
          obj = merge({}, obj, data[prop]);
        } else {
          obj = merge({}, obj, data);
        }
      } else if (/\.js$/.test(fp)) {
        var fn = require(fp);
        fns.push(fn);
        res.fns.push(fn);
      }
    }

    res.js[name] = fns;
    res.configs[name] = obj;
  }
  return res;
}

var home = require('homedir-polyfill');
var gm = require('global-modules');

function patterns(name, options) {
  options = options || {};
  var cwd = options.cwd || process.cwd();
  var repo = options.repo || '';
  var userHome = options.home || home();
  var patterns = [`.${name}rc.{json,yml}`, `${name}{file,}.js`];
  return [
    {
      name: 'cwd',
      patterns: patterns,
      cwd: cwd
    },
    {
      name: 'local',
      patterns: patterns,
      cwd: path.join(cwd, 'node_modules')
    },
    {
      name: 'pkg',
      patterns: ['package.json'],
      prop: name,
      cwd: cwd
    },
    {
      name: 'home',
      patterns: patterns.concat(`${name}/index.js`),
      cwd: userHome
    },
    {
      name: 'global',
      patterns: [
        path.join(repo, `.${name}rc.{json,yml}`),
        path.join(repo, `${name}{file,}.js`)
      ],
      cwd: gm
    }
  ];
}

function mergeConfigs(keys, obj) {
  var m = shouldMerge(keys, obj);
  var config = {};
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var val = obj[key];
    if (m === true) {
      config = merge({}, config, val);
    } else {
      config = val;
    }
  }
  return config;
}

function shouldMerge(keys, configs) {
  var len = keys.length;
  while (len--) {
    var key = keys[len];
    var val = configs[key];
    if (val.hasOwnProperty('merge')) {
      return val.merge;
    }
  }
  return true;
}

module.exports = function(name, options) {
  options = options || {};
  var keys = options.keys || ['global', 'home', 'local', 'cwd', 'pkg'];
  var obj = configs(patterns(name, options));
  var config = mergeConfigs(keys, obj.configs);
  config.fns = obj.fns;
  return config;
};

// var obj = configs(patterns('update', {repo: `update-config-*`}));
// var config = mergeConfigs(['global', 'home', 'local', 'cwd'], obj);
// console.log(config)


// console.log(config);
