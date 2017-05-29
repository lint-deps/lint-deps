'use strict';

var fs = require('fs');
var path = require('path');
var File = require('vinyl');
var Base = require('base');
var cwd = require('base-cwd');
var task = require('base-task');
var option = require('base-option');
var get = require('get-value');
var yarn = require('base-yarn');
var pkg = require('base-pkg');
var npm = require('base-npm');
var configs = require('merge-configs');
var defaults = require('./lib/defaults');
var utils = require('./lib/utils');

/**
 * Create the core application
 */

function LintDeps(options) {
  if (!(this instanceof LintDeps)) {
    return new LintDeps(options);
  }

  Base.call(this, {}, options);
  this.is('app');
  this.defaults = {};
  this.config = {};
  this.use(cwd());
  this.use(option());
  // this.use(plugin());
  this.use(task());
  this.use(yarn());
  this.use(npm());
  this.use(pkg());
  this.define('originalPkg', utils.clone(this.pkg.data));
  this.validTypes = utils.validTypes;
  this.cache.files = {};
}

/**
 * Inherit base-app
 */

Base.extend(LintDeps);

/**
 * Initialize config and load plugins with the given `options`.
 */

LintDeps.prototype.lazyInit = function() {
  if (!this.isInitialized && this.options.init !== false) {
    this.isInitialized = true;
    var pwd = process.cwd();
    var app = this;

    this.on('cwd', function(cwd) {
      console.log('changing cwd to:', cwd);
      process.chdir(cwd);
    });

    this.once('end', function() {
      if (pwd !== app.cwd) {
        process.chdir(pwd);
      }
    });

    defaults.call(this, this);
    this.config = this.loadConfig();

    utils.normalizeOptions(this.config.merged);
    this.default(this.config.merged);
    this.default('js', this.config.js);

    this.loadPlugins(this.option('js'));
    utils.normalizeOptions(this.options);

    if (!this.options.verbose) {
      this.enable('silent');
    }
  }
};

LintDeps.prototype.lint = function(types, files, options) {
  if (types === '*') {
    types = utils.validTypes;
  }

  if (typeof types === 'string') {
    types = [types];
  }

  if (utils.isObject(files)) {
    options = files;
  }

  if (typeof this.report === 'undefined') {
    this.report = {};
  }

  this.report.types = [];

  for (let i = 0; i < types.length; i++) {
    let report = this.lintType(types[i], options);
    if (report) {
      this.report.types.push(report.type);
      this.report.missingCount += report.missingCount;
    }
  }

  Object.defineProperty(this.report, 'missingCount', {
    configurable: true,
    set: function(val) {
      this._missingCount = val;
    },
    get: function() {
      var count = this._missingCount || 0;
      for (let i = 0; i < this.types.length; i++) {
        count += this[this.types[i]].missingCount;
      }
      return count;
    }
  });

  Object.defineProperty(this.report, 'missingTypes', {
    configurable: true,
    get: function() {
      var types = [];
      for (let i = 0; i < this.types.length; i++) {
        let type = this.types[i];
        if (this[type].missingCount > 0) {
          types.push(type);
        }
      }
      return types;
    }
  });

  Object.defineProperty(this.report, 'unused', {
    configurable: true,
    get: function() {
      var unused = [];
      for (let i = 0; i < this.types.length; i++) {
        unused = unused.concat(this[this.types[i]].unused);
      }
      return unused;
    }
  });

  Object.defineProperty(this.report, 'unusedCount', {
    configurable: true,
    get: function() {
      var count = 0;
      for (let i = 0; i < this.types.length; i++) {
        count += this[this.types[i]].unused.length;
      }
      return count;
    }
  });

  this.uniquify(this.report);
  return this.report;
};

LintDeps.prototype.lintType = function(type, files, options) {
  this.lazyInit();

  if (!Array.isArray(files)) {
    options = files;
    files = undefined;
  }

  this.report = this.report || {};
  var opts = this.mergeOpts(options);
  var typeOpts = get(opts, type);
  var app = this;

  if (!files) files = this.loadFiles(typeOpts);
  if (Array.isArray(this.cache[type])) {
    utils.union(files, this.cache[type]);
  }

  if (files.length === 0) return;

  files = files.reduce(function(acc, file) {
    if (utils.isGlob(file)) {
      return acc.concat(app.loadFiles(file, typeOpts));
    }

    if (app.filter(file) === false) {
      return acc;
    }

    if (typeof file === 'string') {
      file = app.toFile(file, options);
    }

    if (!utils.isObject(file) || !file._isVinyl) {
      throw new Error('cannot load file: ' + file);
    }

    if (file.isDirectory()) {
      return acc;
    }

    file.modules = file.modules || [];
    file.type = type;

    if (!app.cache.files[file.path]) {
      app.cache.files[file.path] = file;
      acc.push(file);
    }

    return acc;
  }, []);

  files = utils.sortFiles(files);

  var report = this.report[type] || (this.report[type] = {});
  var pkg = utils.clone(typeOpts.pkg || this.pkg.data);
  var deps = Object.keys(pkg[type] || {});
  var missing = { modules: [], files: {} };
  var modules = {};
  var used = [];
  var all = [];

  report.type = type;

  Object.defineProperty(report, 'missingCount', {
    get: function() {
      return this.missing.modules.length;
    }
  });

  for (let i = 0; i < files.length; i++) {
    let file = files[i];
    file.missing = [];

    this.emit('file', file);

    utils.union(used, file.modules);
    utils.unionValue(report, 'files', file);

    for (let j = 0; j < file.modules.length; j++) {
      let name = file.modules[j];

      utils.unionValue(modules, name, file.relative);
      utils.union(all, name);

      if (!utils.has(deps, name)) {
        var mkey = 'files.' + file.relative.split('.').join('\\.');
        utils.unionValue(missing, mkey, name);
        utils.unionValue(missing, 'modules', name);
        utils.unionValue(file, 'missing', name);
      }
    }
  }

  missing.modules.sort();

  utils.set(report, 'unused', utils.diff(deps.slice(), used.slice()));
  utils.set(report, 'missing', missing);
  utils.set(report, 'modules', modules);

  this.updateLocked(type, report, typeOpts);
  return report;
};

/**
 * Returns an object with information about why a package is used.
 *
 * @param {String} `name`
 * @param {Object} `options`
 * @returns {Object}
 * @api public
 */

LintDeps.prototype.why = function(name, options) {
  if (typeof name !== 'string') {
    throw new TypeError('expected name to be a string');
  }

  let report = this.lint('*', options);
  let res = {name: name, files: {}, types: [], count: 0};
  let keys = report.types;
  let len = keys.length;
  let idx = -1;

  while (++idx < len) {
    let type = keys[idx];
    let obj = report[type];

    if (obj.modules.hasOwnProperty(name)) {
      var files = obj.modules[name];
      res.files[type] = files;
      res.count += files.length;
    }
  }

  var types = utils.validTypes;
  var pkg = this.pkg.data;

  for (var i = 0; i < types.length; i++) {
    var type = types[i];
    if (pkg[type] && pkg[type][name]) {
      res.types.push(type);
    }
  }

  return res;
};

/**
 * Remove module names from the "missing" list in a given type of
 * dependencies when the exist in another type of dependencies.
 *
 * @param {object} `report`
 * @param {string} `removeType` (optional) The type of dependencies to remove names from. Defaults to `devDependencies`
 * @param {string} `keepType` (optional) The type to reference. Defaults to `dependencies`
 * @returns {undefined}
 */

LintDeps.prototype.uniquify = function(report, removeType, keepType) {
  var exclude = this.pkg.get('lintDeps.modules.exclude') || [];

  if (removeType && keepType) {
    utils.uniquify(report, removeType, keepType);
    return;
  }

  if (utils.has(report.types, 'dependencies')) {
    for (let i = 0; i < report.types.length; i++) {
      let type = report.types[i];

      if (exclude.length) {
        utils.remove(report[type].missing.modules, exclude);

        let files = report[type].files;
        for (let j = 0; j < files.length; j++) {
          utils.remove(files[j].missing, exclude);
        }
      }

      if (type !== 'dependencies') {
        utils.uniquify(report, type, 'dependencies');

        let deps = Object.keys(report.dependencies.modules);
        let files = report[type].files;

        for (let j = 0; j < files.length; j++) {
          utils.remove(files[j].missing, deps);
        }
      }
    }
  }
};

/**
 * Update the array of "missing" modules on `report.missing.modules` with
 * matching modules that have locked versions defined on `options.lock`.
 */

LintDeps.prototype.updateLocked = function(type, report, options) {
  var locked = options.lock || {};
  var keys = Object.keys(locked);
  var mods = report.missing.modules;

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var val = locked[key];
    var idx = mods.indexOf(key);
    if (idx !== -1) {
      mods[idx] = key + '@' + val;
    }
  }
};

/**
 * Merge lint-deps defaults with user-provided config and `options`.
 *
 * @param {Object=} `options`
 * @returns {Object}
 * @api public
 */

LintDeps.prototype.mergeOpts = function(options) {
  return utils.merge({}, this.defaults, this.options, options);
};

/**
 * Get a file from the cache.
 *
 * @param {String} `type`
 * @param {String} `basename`
 * @param {Function} `fn`
 * @return {Object|undefined}
 * @api public
 */

LintDeps.prototype.getFile = function(type, basename, fn) {
  if (Array.isArray(this.cache[type])) {
    var files = this.cache[type];
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      if (file.basename === basename) {
        return file;
      }
      if (typeof fn === 'function' && fn(file)) {
        return file;
      }
    }
  }
};

/**
 * Add a file to the `cache` array for the given dependency `type`.
 *
 * @param {String} type The dependency type to associate with the file.
 * @param {Object} file
 * @returns {Object} Returns the instance for chaining
 * @api public
 */

LintDeps.prototype.addFile = function(type, file) {
  this.union(`cache.${type}`, file);
  return this;
};

/**
 * Load a glob of vinyl files.
 *
 * ```js
 * var files = lintDeps.glob('*.js');
 * ```
 * @param {Array|String} `patterns` One or more glob patterns.
 * @param {Object} `options`
 * @returns {Array} Returns an array of [vinyl][] file objects.
 * @api public
 */

LintDeps.prototype.loadFiles = function(patterns, options) {
  var moduleOpts = {};
  var app = this;

  if (utils.isObject(patterns) && patterns.files) {
    moduleOpts = Object.assign(patterns.modules);
    options = patterns.files.options;
    patterns = patterns.files.patterns;
  }

  if (!utils.isValidGlob(patterns)) return [];
  var opts = Object.assign({cwd: this.cwd}, options);

  return utils.glob.sync(patterns, opts).reduce(function(acc, basename) {
    var fp = path.join(opts.cwd, basename);
    var file = app.toFile(fp, moduleOpts);
    if (file.isDirectory()) {
      return acc;
    }

    if (app.filter(file) === false) {
      return acc;
    }
    return acc.concat(file);
  }, []);
};

/**
 * Strip code comments and match requires/imports in the `file.contents`
 * of a vinyl `file`, then push it onto the given `files` array.
 *
 * ```js
 * lintDeps.toFile(files, file, options);
 *
 * // example gulp plugin usage
 * function plugin(options) {
 *   var files = [];
 *   return through.obj(function(file, enc, next) {
 *     files.push(toFile(file, options));
 *     next();
 *   }, function() {
 *
 *   });
 * }
 * ```
 * @param {Array|String} `patterns` One or more glob patterns.
 * @param {Object} `options`
 * @api public
 */

LintDeps.prototype.toFile = function(file, options) {
  if (typeof file === 'string') {
    file = new File({path: path.resolve(this.cwd, file)});
  }

  if (!file.stat) {
    file.stat = fs.statSync(file.path);
  }

  if (file.isDirectory()) return file;

  if (!file.contents) {
    file.contents = fs.readFileSync(file.path);
  }

  file.folder = path.basename(file.dirname);
  this.stripComments(file, options);
  this.matchModules(file, options);
  return file;
};

/**
 * Match module names defined using node's `require` system and
 * es imports. Adds a `file.modules` property with an array of matches.
 *
 * @param {Object} `file` Vinyl file
 * @param {Object} `options`
 * @returns {undefine}
 * @api public
 */

LintDeps.prototype.matchModules = function(file, options) {
  var opts = Object.assign({}, options);
  var matches = utils.modules(file.contents.toString(), opts);
  var isIgnored = this.isIgnored(opts.exclude);
  file.modules = [];

  for (var i = 0; i < matches.length; i++) {
    var name = matches[i].module;

    if (!utils.isValidPackageName(name)) {
      continue;
    }

    // get the module name from `foo/bar`
    if (!/^@[^/]+?\/[^/]+?$/.test(name)) {
      name = name.split(/[\\\/]/)[0];
    }

    if (!isIgnored(name)) {
      file.modules.push(name);
    }
  }
};

/**
 * Strip all comments from `file.contents`, to avoid false positives
 * when require statements or imports are commented out.
 *
 * @param {Object} `file` Vinyl file
 * @param {Object} `options`
 * @returns {undefine}
 * @api public
 */

LintDeps.prototype.stripComments = function(file, options) {
  var opts = Object.assign({}, this.options, options);
  var str = file.contents.toString();
  if (!utils.isString(str)) return;

  if (typeof opts.stripComments === 'function') {
    opts.stripComments.call(this, file);
    return;
  }

  // strip hash-bang from bos and quoted strings in
  // unit tests etc, since they choke esprima
  str = str.replace(/#!\/usr[^\n'",]+/gm, '');
  str = str.replace(/^\s*\/\/[^\n]+/gm, '');

  try {
    file.contents = new Buffer(utils.stripComments(str));
  } catch (err) {
    if (opts.verbose) {
      console.log('esprima parsing error in: ' + file.path);
      console.log(err);
    }
  }
};

/**
 * Returns a matcher function that returns true when the given
 * string matches one of the provided ignore `patterns`.
 *
 * @param {String|Array} patterns One or more glob patterns
 * @param {Object} options
 * @returns {Function} Returns a matcher function that takes a string.
 * @api public
 */

LintDeps.prototype.isIgnored = function(patterns, options) {
  if (typeof patterns === 'undefined') {
    return function() {
      return false;
    };
  }

  var isMatch = utils.mm.matcher(patterns, options);
  return function(name) {
    return isMatch(name);
  };
};

LintDeps.prototype.filter = function(file) {
  if (file.isFiltered || file.isValid) {
    return file;
  }

  file.isFiltered = true;
  if (typeof this.options.filter === 'function') {
    return this.options.filter.call(this, file);
  }

  var stat = fs.statSync(file.path);
  if (!stat.isFile()) {
    return false;
  }
  if (file.extname !== '.js' && file.folder !== 'bin') {
    return false;
  }
  return true;
};

/**
 * Initialize plugins and defaults with the given `options`
 */

LintDeps.prototype.loadConfig = function(options) {
  var opts = utils.merge({}, this.defaults, this.options, options);
  opts.types = utils.get(opts, 'config.types');
  opts.files = utils.get(opts, 'config.files');
  return configs('lint-deps', opts);
};

/**
 * Load an array of plugins. A plugin is a function that takes an
 * instance of `LintDeps` (or `app`).
 *
 * ```js
 * lintDeps([
 *   function(app) {},
 *   function(app) {},
 *   function(app) {},
 * ]);
 * ```
 * @param {Array|Function} `fns` One or more plugin functions.
 * @api public
 */

LintDeps.prototype.loadPlugins = function(fns) {
  var plugins = utils.arrayify(fns);
  for (var i = 0; i < plugins.length; i++) {
    this.use(require(plugins[i]));
  }
};

/**
 * Expose `LintDeps`
 * @type {constructor}
 */

module.exports = LintDeps;
