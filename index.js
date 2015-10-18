'use strict';

var path = require('path');
var glob = require('matched');
var toFile = require('to-file');
// var union = require('arr-union');
var union = require('union-value');
var utils = require('./lib/utils');
var strip = require('./lib/strip');

function Lint(options) {
  this.matchers = [];
  this.files = {};
  this.cache = {
    dependencies: [],
    devDependencies: [],
    requires: {
      local: [],
      npm: []
    },
    includes: [],
    excludes: [],
    ignores: [],
    filters: [],
    unused: []
  };
}

Lint.prototype = {
  constructor: Lint,

  deps: function (deps) {
    if (typeof deps === 'object') {
      this.union('dependencies', Object.keys(deps));
    } else if (typeof deps === 'string') {
      this.union('dependencies', deps);
    }
    return this;
  },

  devDeps: function (deps) {
    if (typeof deps === 'object') {
      this.union('devDependencies', Object.keys(deps));
    } else if (typeof deps === 'string') {
      this.union('devDependencies', deps);
    }
    return this;
  },

  require: function(pattern) {
    if (typeof pattern === 'string') {
      pattern = {module: pattern};
    }
    var mod = pattern.module;
    if (/^\./.test(mod)) {
      this.union('requires.local', mod);
    } else {
      this.union('requires.npm', mod);
    }
    return this;
  },

  requires: function(patterns) {
    patterns = arrayify(patterns);
    patterns.forEach(function (pattern) {
      this.require(pattern);
    }.bind(this));
    return this;
  },

  include: function(pattern) {
    this.union('includes', pattern);
    return this;
  },

  exclude: function(pattern) {
    this.union('excludes', pattern);
    return this;
  },

  ignore: function(pattern) {
    this.union('ignores', pattern);
    return this;
  },

  unused: function(patterns) {
    this.union('unused', patterns);
    return this;
  },

  addFiles: function(patterns, options) {
    options = options || {};
    union(options, 'ignore', this.cache.ignores);
    var files = glob.sync(patterns, options);
    var len = files.length, i = -1;
    while (++i < len) {
      var fp = files[i];
      this.addFile(fp, patterns, options);
    }
    return this;
  },

  addFile: function(fp, pattern, options) {
    var file = toFile(fp, pattern, options);
    this.handle(file);
    this.files[fp] = file;
    return this;
  },

  handle: function(file) {
    if (!file.contents) return;

    if (!file.content) {
      file.content = strip(file.contents.toString());
    }
    var len = this.matchers.length, i = -1;
    if (!len) return this;

    while (++i < len) {
      var matcher = this.matchers[i];
      if (!matcher.re.test(file.path)) {
        continue;
      }
      matcher.fn.call(this, file);
    }
    return this;
  },

  matcher: function(re, fn) {
    this.matchers.push({re: re, fn: fn});
    return this;
  },

  filter: function(deps) {
  },

  union: function(name, val) {
    union(this.cache, name, arrayify(val));
    return this;
  },

  lint: function () {


  }
};

/**
 * Expose `Lint`
 */

module.exports = Lint;


function arrayify(val) {
  return Array.isArray(val) ? val : [val];
}
