'use strict';

var base = require('base');
var Base = base.namespace('cache');
var utils = require('./lib/utils');

function Lint(options) {
  if (!(this instanceof Lint)) {
    return new Lint(options);
  }

  Base.call(this);
  this.is('lintDeps');

  this.options = options || {};
  this
    .use(utils.plugin())
    .use(utils.config())
    .use(utils.cli());

  this.errors = {};
  this.matchers = [];
  this.files = {};

  this.cache = {
    varmap: {},
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

  this.initMethods();
}

/**
 * Inherit `Base`
 */

Base.extend(Lint, {
  constructor: Lint,

  /**
   * Placeholder for real message handling
   */

  error: function(id, msg) {
    this.errors[id] = this.errors[id] || [];
    this.errors[id].push(msg);
    return this;
  },

  /**
   * Init methods
   */

  initMethods: function() {
    this.mixinMethod('ignore', 'ignores');
    this.mixinMethod('include', 'includes');
    this.mixinMethod('exclude', 'excludes');
    this.mixinMethod('unused', 'unused');
  },

  mixinMethod: function(singular, plural) {
    Lint.prototype[singular] = function(pattern) {
      this.union(plural, pattern);
      return this;
    };
  },

  /**
   * True if array `key` has the given `filepath`
   *
   * ```js
   * lint.has('deps', )
   * ```
   *
   * @param {String} key
   * @param {String} filepath
   * @return {Boolean}
   * @api public
   */

  has: function(key, fp) {
    var arr = this.get(key) || [];
    return ~arr.indexOf(fp);
  },

  /**
   * Remove `keys` from array `prop`
   */

  pull: function(prop, keys) {
    var arr = this.get(prop);
    var len = keys.length;
    while (len--) {
      arr.splice(arr.indexOf(keys[len]), 1);
    }
  },

  /**
   * Returns an array of substrings extracted from the specified `str`
   * that also match module names on `key`
   *
   * ```js
   * deps.unused(['browserify', 'foo']);
   * deps.extract('unused', '--browserify baz');
   * //=> ['browserify']
   * ```
   * @param {String} `key`
   * @param {String} `str`
   * @return {Array}
   * @api public
   */

  extract: function(key, str) {
    var arr = this.get(key) || [];
    var len = arr.length;
    var res = [];

    while (len--) {
      var ele = arr[len];
      if (~str.indexOf(ele)) {
        res.push(ele);
      }
    }
    return res;
  },

  /**
   * Returns a matcher function bound to the given `file` path.
   * The returned function takes `pattern` and `options`, which
   * are passed to [micromatch][] to perform the actual matching
   * against the filepath.
   *
   * ```js
   * var file = new File({path: 'foo.js'});
   * var isMatch = deps.matcher(file);
   * console.log(isMatch('*.js'));
   * //=> true
   * ```
   * @param {Object} `file` Vinyl file Object
   * @return {Function}
   * @api public
   */

  matcher: function(file) {
    return function isMatch(pattern, options) {
      return utils.mm.isMatch(file.path, pattern, options);
    };
  },

  /**
   * Add a vinyl file to the `deps.files` object.
   *
   * ```js
   * deps.addFile('a/b/c.js');
   * ```
   * @param {String} `filepath`
   * @param {String|Array} `pattern` Optionally specify the pattern(s) used to match the file. This is mostly used for debugging.
   * @param {Object} `options` Options to set on `file.options`
   * @api public
   */

  addFile: function(fp, pattern, options) {
    if (utils.hasGlob(fp)) {
      return this.addFiles.apply(this, arguments);
    }

    var file = utils.toFile(fp, pattern, options);
    if (!file.contents) return;
    if (!file.content && file.contents) {
      file.content = utils.strip(file.contents.toString());
    }

    var isJson = /\.(es|js)(on|lint)$/.test(file.path);
    if (isJson && typeof file.content === 'string') {
      file.originalContent = file.content;
      file.json = JSON.parse(file.content);
    }

    file.isMatch = this.matcher(file);
    file.isFile = true;
    this.run(file);

    this.emit('file', file);
    this.files[fp] = this.handle(file);
    return this;
  },

  /**
   * Add a glob of files to `deps.files`.
   *
   * ```js
   * deps.addFiles('*.js', {cwd: 'foo'});
   * ```
   * @param {String|Array} `glob` Glob pattern(s) to use
   * @param {Object} `options` Options to pass to [matched][]
   * @api public
   */

  addFiles: function(patterns, options) {
    var opts = utils.extend({}, options);
    utils.union(opts, 'ignore', this.get('ignores'));
    var files = utils.glob.sync(patterns, opts);
    var len = files.length;
    var idx = -1;

    while (++idx < len) {
      this.addFile(files[idx], patterns, opts);
    }
    return this;
  },

  getFile: function(name) {
    return utils.get(this.files, utils.arrayify(name));
  },

  handle: function(file) {
    var len = this.matchers.length;
    var idx = -1;

    while (++idx < len) {
      var matcher = this.matchers[idx];
      if (!matcher.re.test(file.path)) {
        continue;
      }
      matcher.fn.call(this, file);
    }

    return file;
  },

  addMatcher: function(re, fn) {
    this.matchers.push({re: re, fn: fn});
    return this;
  },

  deps: function(deps) {
    if (typeof deps === 'object') {
      var keys = Object.keys(deps);
      this.union('dependencies', keys);
      return this;
    }
    if (typeof deps === 'string') {
      this.union('dependencies', deps);
    }
    return this;
  },

  devDeps: function(deps) {
    if (typeof deps === 'object') {
      var keys = Object.keys(deps);
      this.union('devDependencies', keys);
      return this;
    }
    if (typeof deps === 'string') {
      this.union('devDependencies', deps);
    }
    return this;
  },

  require: function(pattern) {
    if (typeof pattern === 'string') {
      pattern = { module: pattern };
    }
    var mod = pattern.module;
    if (mod.charAt(0) === '.') {
      this.union('requires.local', mod);
    } else {
      this.union('requires.npm', mod);
    }
    return this;
  },

  requires: function(patterns) {
    patterns = utils.arrayify(patterns);
    patterns.forEach(function(pattern) {
      this.require(pattern);
    }.bind(this));
    return this;
  },

  filter: function(deps) {
  },

  union: function(name, val) {
    utils.union(this.cache, name, utils.arrayify(val));
    return this;
  },

  lint: function(dir) {

  }
});

/**
 * Expose `Lint`
 */

module.exports = Lint;
