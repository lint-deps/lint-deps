'use strict';

var path = require('path');
var base = require('base');
var Base = base.namespace('cache');
var cli = require('./lib/cli');
var gitignore = require('./lib/gitignore');
var lint = require('./lint');
var utils = require('./lib/utils');

/**
 * Create an instance of `LintDeps` with the given `options`
 *
 * ```js
 * var LintDeps = require('lint-deps');
 * var deps = new LintDeps();
 * deps.lint('...');
 * ```
 *
 * @param {Object} `options`
 * @api public
 */

function LintDeps(options) {
  if (!(this instanceof LintDeps)) {
    return new LintDeps(options);
  }

  Base.call(this);
  this.is('lintDeps');
  this.options = options || {};
  this.init(this);
}

/**
 * Inherit `Base`
 */

Base.extend(LintDeps, {
  constructor: LintDeps,

  init: function(app) {
    this
      .use(utils.option())
      .use(utils.plugin())
      .use(utils.config())
      .use(utils.store())
      .use(utils.ask())
      .use(cli());

    this.initConfig();
    this.initMethods();

    this.on('option', function(key, val) {
      if (key === 'lint') {
        app.lint(key, val);
      }
    });
  },

  /**
   * Initialize lint-deps configuration objects.
   */

  initConfig: function() {
    this.errors = {};
    this.matchers = [];
    this.files = {};

    this.cache = {
      varmap: {},
      dependencies: [],
      devDependencies: [],
      requires: {
        builtin: [],
        local: [],
        npm: []
      },
      includes: [],
      excludes: [],
      ignores: [],
      filters: [],
      unused: []
    };
  },

  /**
   * Initialize methods
   */

  initMethods: function() {
    this.mixinMethod('include', 'includes');
    this.mixinMethod('exclude', 'excludes');
    this.mixinMethod('unused', 'unused');
    this.mixinMethod('ignore', 'ignores', function(items) {
      return items.map(gitignore.toGlob);
    });
  },

  /**
   * Mix a method onto the `LintDepsDeps` prototype. Used for
   * initializing methods that are paired with storage arrays.
   *
   * @param {String} `singular`
   * @param {String} `plural`
   * @return {undefined}
   */

  mixinMethod: function(singular, plural, fn) {
    LintDeps.prototype[singular] = function(items) {
      if (typeof fn === 'function') {
        items = fn(items);
      }
      this.union(plural, items);
      return this;
    };
  },

  /**
   * Placeholder for real message handling
   */

  error: function(id, msg) {
    this.errors[id] = this.errors[id] || [];
    this.errors[id].push(msg);
    return this;
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
    return arr;
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
    var opts = utils.extend({}, this.options, options);
    utils.union(opts, 'ignore', this.get('ignores'));

    var files = utils.glob.sync(patterns, opts);
    var len = files.length;
    var idx = -1;

    while (++idx < len) {
      var file = files[idx];
      this.addFile(file, patterns, opts);
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

  register: function(re, fn) {
    this.matchers.push({re: re, fn: fn});
    return this;
  },

  deps: function(deps) {
    if (typeof deps === 'object') {
      var keys = Object.keys(deps);
      this.union('dependencies', keys);
      return this;
    }
    if (Array.isArray(deps) || typeof deps === 'string') {
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
    if (Array.isArray(deps) || typeof deps === 'string') {
      this.union('devDependencies', deps);
    }
    return this;
  },

  require: function(pattern) {
    if (typeof pattern === 'string') {
      pattern = { module: pattern };
    }
    var name = pattern.module;
    if (utils.isLocalModule(name)) {
      this.union('requires.local', name);

    } else if (utils.isBuiltin(name)) {
      this.union('requires.builtin', name);

    } else {
      this.union('requires.npm', name);
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

  union: function(name, val) {
    utils.union(this.cache, name, utils.arrayify(val));
    return this;
  },

  lint: function(dir) {
    var ignore = this.settings.ignore || [];
    this.ignore(gitignore(this.cwd));
    lint.call(this, this);
    return this;
  }
});

Object.defineProperty(LintDeps.prototype, 'settings', {
  set: function(val) {
    this.define('_settings', val);
  },
  get: function() {
    var settings = this._settings || this.pkg['lint-deps'] || {};
    return utils.merge({}, this.options, settings);
  }
});

/**
 * Ensure `name` is set on the instance for lookups.
 */

Object.defineProperty(LintDeps.prototype, 'cwd', {
  configurable: true,
  set: function(cwd) {
    this.options.cwd = path.resolve(cwd);
  },
  get: function() {
    return path.resolve(this.options.cwd || process.cwd());
  }
});

Object.defineProperty(LintDeps.prototype, 'pkgPath', {
  set: function(fp) {
    this.define('_pkgPath', fp);
  },
  get: function() {
    if (!this._pkgPath) this.define('_pkgPath', null);
    return this._pkgPath || (this._pkgPath = utils.pkgPath.sync(this.cwd));
  }
});

Object.defineProperty(LintDeps.prototype, 'pkg', {
  set: function(val) {
    this.define('_pkg', val);
  },
  get: function() {
    if (!this._pkg) this.define('_pkg', null);
    return this._pkg || (this._pkg = require(utils.pkgPath.sync(this.cwd)));
  }
});

/**
 * Expose `LintDeps`
 */

module.exports = LintDeps;
