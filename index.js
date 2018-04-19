'use strict';

/**
 * Module dependencies
 */

// require('time-require');
const origCwd = process.cwd();
const fs = require('fs');
const path = require('path');
const Base = require('base');
const cwd = require('base-cwd');
const dir = require('global-modules');
const File = require('vinyl');
const get = require('get-value');
const glob = require('matched');
const npm = require('base-npm');
const pkg = require('base-pkg');
const task = require('base-task');
const option = require('base-option');
const startsWith = require('path-starts-with');
const writeJson = require('write-json');
const yarn = require('base-yarn');
const mm = require('micromatch');

/**
 * Local dependencies
 */

const defaults = require('./lib/defaults');
const config = require('./lib/config');
const utils = require('./lib/utils');

class Stack extends Array {
  push(...args) {
    for (const arg of args) {
      if (!this.includes(arg)) {
        super.push(arg);
      }
    }
  }
}

/**
 * Create the core application
 */

class LintDeps extends Base {
  constructor(options) {
    super(null, options);
    this.is('app');
    this.defaults = {};
    this.config = {};
    this.use(cwd());
    this.use(option());
    this.use(task());
    this.use(yarn());
    this.use(npm());
    this.use(pkg());
    this.validTypes = utils.validTypes;
    this.cache.files = {};
    this.files = new Stack();
  }

  /**
   * Initialize config and load plugins with the given `options`.
   */

  lazyInit() {
    if (!this.isInitialized && this.options.init !== false) {
      this.isInitialized = true;

      const resetCwd = function() {
        if (process.cwd() !== origCwd) {
          process.chdir(origCwd);
        }
      };

      this.on('cwd', function(cwd) {
        if (cwd !== origCwd) {
          console.log('changing cwd to:', cwd);
          process.chdir(cwd);
        }
      });

      this.once('end', resetCwd);
      process.on('exit', resetCwd);

      if (!this.options.verbose) {
        this.enable('silent');
      }

      this.rootFiles = fs.readdirSync(process.cwd());

      // load all config files
      this.loadConfig();
    }
  }

  /**
   * Initialize plugins and defaults with the given `options`
   *
   * ```js
   * var app = new LintDeps();
   * app.loadConfig(types[, options]);
   * // example
   * app.loadConfig(['global', 'local', 'cwd']);
   * ```
   * @param {Array} `types` Configuration types/locations to load. See [merge-configs][] for details.
   * @param {Object} `options`
   * @api public
   */

  loadConfig(types, options) {
    if (!Array.isArray(types)) {
      options = types;
      types = new Stack();
    }

    this.use(defaults());
    const opts = utils.merge({}, this.defaults, this.options, options);

    opts.types = utils.union([], utils.get(opts, 'config.types'), types);
    opts.files = utils.get(opts, 'config.files');
    opts.filter = utils.get(opts, 'config.filter');
    this.config = config(this, opts);

    // const userConfig = {};
    // const userConfig = glob.sync('lint-deps-*', { cwd: dir })
    //   .map(function(name) {
    //     return require.resolve(path.resolve(dir, name));
    //   });

    utils.normalizeOptions(this.config.merged);
    this.default(this.config.merged);

    this.pluginQueue = utils.union([], this.defaults.js, this.options.js, this.config.js);
    utils.normalizeOptions(this.options);

    const devDeps = this.options.dev;
    const deps = this.options.deps;

    if (devDeps) {
      utils.unionValue(this.options, 'devDependencies.files.patterns', devDeps);
      this.updatePackage('devDependencies.files.patterns', devDeps, utils.unionValue);
    }
    if (deps) {
      utils.unionValue(this.options, 'dependencies.files.patterns', deps);
      this.updatePackage('dependencies.files.patterns', deps, utils.unionValue);
    }
  }

  /**
   * Update `prop` in package.json with the given `value`.
   *
   * @param {String} `prop`
   * @param {Any} `val`
   * @param {Function} `fn` (optional)
   * @return {undefined}
   * @api public
   */

  updatePackage(prop, val, fn) {
    this.on('done', () => {
      const pkg = JSON.parse(fs.readFileSync(this.pkg.path, 'utf8'));
      if (typeof fn === 'function') {
        fn(pkg, 'lintDeps.' + prop, val);
      } else {
        utils.set(pkg, 'lintDeps.' + prop, val);
      }
      writeJson.sync(this.pkg.path, pkg);
    });
  }

  /**
   * Load an array of plugins. A plugin is a function that takes an
   * instance of `LintDeps`.
   *
   * ```js
   * const app = new LintDeps();
   * // plugins
   * app.loadPlugins([
   *   function(app) {},
   *   function(app) {},
   *   function(app) {},
   * ]);
   * ```
   * @param {Array|Function} `fns` One or more plugin functions.
   * @api public
   */

  loadPlugins(fns) {
    if (!Array.isArray(fns)) fns = [fns];
    for (let fn of fns) {
      if (typeof fn === 'string' && fs.existsSync(fn)) {
        fn = require(fn);
      }
      if (typeof fn === 'function') {
        this.use(fn);
      }
    }
  }

  /**
   * Lint for missing or unused dependencies for the given
   * dependency `types` in the specified `files`.
   *
   * @param {String|Array} `types` One or more dependency types (`dependency`, `devDependency` etc)
   * @param {String|Array} `files` Array of file objects, or glob pattern(s) of the files to include in the search. If files are objects, they must include a `type` property that specifies the dependency type associated with the file.
   * @param {Array} `options` Globbing options.
   * @return {Object} Returns an object with missing and unused dependencies.
   * @api public
   */

  lint(types, files, options) {
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

    this.report.types = new Stack();

    for (const type of types) {
      const report = this.lintType(type, options);

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
        let count = this._missingCount || 0;
        for (const type of this.types) count += this[type].missingCount;
        return count;
      }
    });

    Object.defineProperty(this.report, 'missingTypes', {
      configurable: true,
      get: function() {
        return this.types.filter(type => this[type].missingCount > 0);
      }
    });

    Object.defineProperty(this.report, 'unused', {
      configurable: true,
      get: function() {
        return this.types.reduce((acc, type) => {
          return acc.concat(this[type].unused);
        }, []);
      }
    });

    Object.defineProperty(this.report, 'unusedCount', {
      configurable: true,
      get: function() {
        return this.unused.length;
      }
    });

    this.uniquify(this.report);
    return this.report;
  }

  /**
   * Lint for missing or unused dependencies for a single dependency `type`.
   *
   * @param {String} `type` Dependency type (`dependency`, `devDependency` etc)
   * @param {String|Array} `files` Glob pattern(s) of the files to include in the search.
   * @param {Array} `options` Globbing options.
   * @return {Object} Returns an object with missing and unused dependencies.
   * @api public
   */

  lintType(type, files, options) {
    this.emit('lintType:starting', type);
    this.lazyInit();

    if (!Array.isArray(files)) {
      options = files;
      files = undefined;
    }

    this.report = this.report || {};
    const typeOpts = this.typeOptions(type, options);

    if (!files) files = this.loadFiles(typeOpts);
    if (Array.isArray(this.cache[type])) {
      utils.union(files, this.cache[type]);
    }

    if (files.length === 0) return;

    files = files.reduce((acc, file) => {
      if (utils.isGlob(file)) {
        return acc.concat(this.loadFiles(file, typeOpts));
      }

      if (this.filter(file) === false) {
        return acc;
      }

      if (typeof file === 'string') {
        file = this.toFile(file, options);
      }

      if (!utils.isObject(file) || !file._isVinyl) {
        throw new Error('cannot load file: ' + file);
      }

      if (file.isDirectory()) {
        return acc;
      }

      file.modules = file.modules || [];
      file.type = type;

      if (!this.cache.files[file.path]) {
        this.cache.files[file.path] = file;
        acc.push(file);
      }

      return acc;
    }, []);

    files = utils.sortFiles(files);
    this.files = files;

    this.loadPlugins(this.pluginQueue);

    const report = this.report[type] || (this.report[type] = {});
    const pkg = utils.clone(typeOpts.pkg || this.pkg.data);
    const deps = Object.keys(pkg[type] || {});
    const missing = { modules: [], files: {} };
    const modules = {};
    const used = new Stack();
    const all = new Stack();

    report.type = type;

    Object.defineProperty(report, 'missingCount', {
      configurable: true,
      get: function() {
        return this.missing.modules.length;
      }
    });

    for (const file of files) {
      file.missing = new Stack();

      this.emit('file', file);

      utils.union(used, file.modules);
      utils.unionValue(report, 'files', file);

      for (const name of file.modules) {
        utils.unionValue(modules, name, file.relative);
        utils.union(all, name);

        if (!utils.has(deps, name)) {
          const mkey = 'files.' + file.relative.split('.').join('\\.');
          utils.unionValue(missing, mkey, name);
          utils.unionValue(missing, 'modules', name);
          utils.unionValue(file, 'missing', name);
        }
      }
    }

    missing.modules.sort();

    const ignore = get(this, `config.merged.${type}.ignore`) || [];
    // var addl = get(this, 'config.pkg.missing') || [];
    // if (addl && type === 'devDependencies') {
    //   utils.union(missing.modules, addl);
    // }

    let unused = utils.diff(deps.slice(), used.slice());
    if (ignore.length) {
      unused = unused.filter(name => !mm.any(name, ignore));
    }

    utils.set(report, 'unused', unused);
    utils.set(report, 'missing', missing);
    utils.set(report, 'modules', modules);

    this.updateLocked(type, report, typeOpts);
    this.emit('lintType:finished', type);
    return report;
  }

  /**
   * Returns an object with information about why a package is used.
   *
   * @param {String} `name`
   * @param {Object} `options`
   * @returns {Object}
   * @api public
   */

  why(name, options) {
    if (typeof name !== 'string') {
      throw new TypeError('expected name to be a string');
    }

    const report = this.lint('*', options);
    const res = {name: name, files: {}, types: [], count: 0};

    for (const type of report.types) {
      const obj = report[type];

      if (obj.modules.hasOwnProperty(name)) {
        const files = obj.modules[name];
        res.files[type] = files;
        res.count += files.length;
      }
    }

    const pkg = this.pkg.data;
    for (const t of utils.validTypes) {
      if (pkg[t] && pkg[t][name]) {
        res.types.push(t);
      }
    }

    return res;
  }

  typeOptions(type, options) {
    const merged = this.mergeOpts(options);
    let opts = get(merged, type) || merged;
    if (opts.options) {
      opts = utils.merge({}, opts, opts.options);
      delete opts.options;
    }
    return opts;
  }

  isLocked(name) {
    // todo
  }

  /**
   * Remove module names from the "missing" list in a given type of
   * dependencies when the exist in another type of dependencies.
   *
   * @param {object} `report`
   * @param {string} `removeType` (optional) The type of dependencies to remove names from. Defaults to `devDependencies`
   * @param {string} `keepType` (optional) The type to reference. Defaults to `dependencies`
   * @returns {undefined}
   */

  uniquify(report, removeType, keepType) {
    const exclude = this.pkg.get('lintDeps.modules.exclude') || [];

    if (removeType && keepType) {
      utils.uniquify(report, removeType, keepType);
      return;
    }

    if (utils.has(report.types, 'dependencies')) {
      for (const type of report.types) {
        if (exclude.length) {
          utils.remove(report[type].missing.modules, exclude);

          for (const file of report[type].files) {
            utils.remove(file.missing, exclude);
          }
        }

        if (type !== 'dependencies') {
          utils.uniquify(report, type, 'dependencies');

          const deps = Object.keys(report.dependencies.modules);
          for (const file of report[type].files) {
            utils.remove(file.missing, deps);
          }
        }
      }
    }
  }

  /**
   * Update the array of "missing" modules on `report.missing.modules` with
   * matching modules that have locked versions defined on `options.lock`.
   */

  updateLocked(type, report, options) {
    const locked = options.lock || {};
    const mods = report.missing.modules;
    for (const key of Object.keys(locked)) {
      const val = locked[key];
      const idx = mods.indexOf(key);
      if (idx !== -1) {
        mods[idx] = key + '@' + val;
      }
    }
  }

  /**
   * Merge lint-deps defaults with user-provided config and `options`.
   *
   * @param {Object=} `options`
   * @returns {Object}
   * @api public
   */

  mergeOpts(options) {
    return utils.merge({}, this.defaults, this.options, options);
  }

  /**
   * Get a file from the cache.
   *
   * @param {String} `type`
   * @param {String} `basename`
   * @param {Function} `fn`
   * @return {Object|undefined}
   * @api public
   */

  getFile(type, basename, fn) {
    if (Array.isArray(this.cache[type])) {
      for (const file of this.cache[type]) {
        if (file.basename === basename) {
          return file;
        }
        if (typeof fn === 'function' && fn(file)) {
          return file;
        }
      }
    }
  }

  /**
   * Add a file to the `cache` array for the given dependency `type`.
   *
   * @param {String} type The dependency type to associate with the file.
   * @param {Object} file
   * @returns {Object} Returns the instance for chaining
   * @api public
   */

  addFile(type, file) {
    this.union(type, file);
    return this;
  }

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

  loadFiles(patterns, options) {
    this.emit('loading-files', patterns, options);
    let moduleOpts = {};

    if (utils.isObject(patterns) && patterns.files) {
      moduleOpts = Object.assign(patterns.modules);
      options = patterns.files.options;
      patterns = patterns.files.patterns;
    }

    if (!utils.isValidGlob(patterns)) return [];
    const opts = Object.assign({ cwd: this.cwd }, options);

    return glob.sync(patterns, opts).reduce((acc, basename) => {
      const fp = path.join(opts.cwd, basename);
      const file = this.toFile(fp, moduleOpts);
      if (file.isDirectory()) {
        return acc;
      }

      if (this.filter(file) === false) {
        return acc;
      }
      return acc.concat(file);
    }, []);
  }

  /**
   * Strip code comments and match requires/imports in the `file.contents`
   * of a vinyl `file`, then push it onto the given `files` array.
   *
   * ```js
   * lintDeps.toFile(files, file, options);
   *
   * // example gulp plugin usage
   * function plugin(options) {
   *   var files = new Stack();
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

  toFile(file, options) {
    const opts = Object.assign({}, this.options, options);

    if (typeof file === 'string') {
      file = new File({ path: path.resolve(this.cwd, file) });
    }

    if (!file.stat) {
      file.stat = fs.statSync(file.path);
    }

    if (file.isDirectory()) return file;

    if (!file.contents) {
      file.contents = fs.readFileSync(file.path);
    }

    file.folder = path.basename(file.dirname);

    if (file.extname === '.js') {
      this.stripComments(file, opts);
      this.matchModules(file, opts);
    }
    return file;
  }

  /**
   * Match module names defined using node's `require` system and
   * es imports. Adds a `file.modules` property with an array of matches.
   *
   * @param {Object} `file` Vinyl file
   * @param {Object} `options`
   * @returns {undefine}
   * @api public
   */

  matchModules(file, options = {}) {
    const opts = Object.assign({}, this.options, options);
    const matches = utils.modules(file.contents.toString(), true);
    const isIgnored = this.isIgnored(opts.exclude);
    file.modules = new Stack();

    for (let i = 0; i < matches.length; i++) {
      let name = matches[i].name;

      if (!utils.isValidPackageName(name)) {
        continue;
      }

      const segs = name.split(/[\\/]/);
      name = segs.shift();

      if (name[0] === '@') {
        name = `${name}/${segs.shift()}`;
      }

      if (!isIgnored(name) && !file.modules.includes(name)) {
        file.modules.push(name);
      }
    }
  }

  /**
   * Strip all comments from `file.contents`, to avoid false positives
   * when require statements or imports are commented out.
   *
   * @param {Object} `file` Vinyl file
   * @param {Object} `options`
   * @returns {undefine}
   * @api public
   */

  stripComments(file, options) {
    const opts = Object.assign({}, this.options, options);
    let str = file.contents.toString();
    if (!utils.isString(str)) return;

    if (typeof opts.stripComments === 'function') {
      opts.stripComments.call(this, file);
      return;
    }

    try {
      str = utils.stripComments(str, opts);
      // strip hash-bang from bos and quoted strings in
      // unit tests etc, since they choke esprima
      str = str.replace(/#!\/usr[^\n'",]+/gm, '');
      str = str.replace(/^\s*\/\/[^\n]+/gm, '');

      file.contents = new Buffer(str);
    } catch (err) {
      console.log('parsing error in: ' + file.path);
      console.log(err);
    }
  }

  /**
   * Returns a matcher function that returns true when the given
   * string matches one of the provided ignore `patterns`.
   *
   * @param {String|Array} patterns One or more glob patterns
   * @param {Object} options
   * @returns {Function} Returns a matcher function that takes a string.
   * @api public
   */

  isIgnored(patterns, options) {
    if (patterns == null) {
      return () => false;
    }
    if (typeof patterns === 'string') {
      patterns = [patterns];
    }
    if (patterns.length === 0) {
      return () => false;
    }
    return mm.matcher(patterns, options);
  }

  /**
   * Return true if `file` should be filtered out
   *
   * @param {[type]} file
   * @return {[type]}
   * @api public
   */

  filter(file) {
    if (file.isFiltered || file.isValid) {
      return true;
    }

    file.isFiltered = true;
    if (!file.stat) file.stat = fs.lstatSync(file.path);
    if (!file.stat.isFile()) {
      return false;
    }

    if (typeof this.options.filter === 'function') {
      return this.options.filter.call(this, file);
    }

    this.ignoredDirs = this.ignoredDirs || [];
    for (const dir of this.ignoredDirs) {
      if (startsWith(file.dirname, dir)) {
        return false;
      }
    }

    if (file.dirname !== file.cwd && fs.existsSync(path.join(file.dirname, 'package.json'))) {
      this.ignoredDirs.push(file.dirname);
      return false;
    }

    if (file.extname !== '.js' && file.folder !== 'bin') {
      return false;
    }
    return true;
  }
}

/**
 * Expose `LintDeps`
 * @type {constructor}
 */

module.exports = LintDeps;
