'use strict';

/**
 * Module dependencies
 */

const { defineProperty } = Reflect;
const origCwd = process.cwd();
const fs = require('fs');
const path = require('path');
const Base = require('base');
const cwd = require('base-cwd');
const File = require('vinyl');
const get = require('get-value');
const glob = require('matched');
const pico = require('picomatch');
const npm = require('base-npm');
const task = require('base-task');
const startsWith = require('path-starts-with');
const write = require('write');

/**
 * Local dependencies
 */

const defaults = require('./lib/defaults');
const config = require('./lib/config');
const utils = require('./lib/utils');
const { Stack } = utils;

/**
 * Create the core application
 */

class LintDeps extends Base {
  constructor(options = {}) {
    super(null, options);
    this.is('app');
    this.options = options;
    this.defaults = {};
    this.config = {};
    this.use(cwd());
    this.use(task());
    this.use(npm());
    this.pkg = {};
    this.pkg.path = path.join(this.cwd, 'package.json');
    this.pkg.data = JSON.parse(fs.readFileSync(this.pkg.path));
    this.validTypes = utils.validTypes;
    this.cache.files = {};
    this.files = new Stack();
    this.state = {};
  }

  option(key, value) {
    switch (utils.typeOf(key)) {
      case 'object':
        for (const k of Object.keys(key)) this.option(k, key[k]);
        break;
      case 'array':
      case 'string':
        if (typeof value === 'undefined') {
          return [key, utils.get(this.defaults, key)].find(v => v != null);
        }
        utils.set(this.options, key, value);
        break;
      default: {
        throw new TypeError('expected key to be a string, object or array');
      }
    }
    return this;
  }

  /**
   * Initialize config and load plugins with the given `options`.
   */

  lazyInit() {
    if (!this.isInitialized && this.options.init !== false) {
      this.isInitialized = true;

      const resetCwd = () => {
        if (process.cwd() !== origCwd) {
          process.chdir(origCwd);
        }
      };

      this.on('cwd', cwd => {
        if (cwd !== origCwd) {
          console.log('changing cwd to:', cwd);
          process.chdir(cwd);
        }
      });

      this.once('end', resetCwd);
      process.on('exit', resetCwd);

      if (!this.options.verbose) {
        this.options.silent = true;
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
   * const app = new LintDeps();
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

    utils.normalizeOptions(this.config.merged);
    this.default(this.config.merged);
    this.runPlugins();
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
    for (let fn of [].concat(fns || [])) {
      if (typeof fn === 'string' && fs.existsSync(fn)) {
        fn = require(fn);
      }
      if (typeof fn === 'function') {
        this.use(fn);
      }
    }
  }

  /**
   * Run plugins that were previously loaded
   */

  runPlugins() {
    const { config, defaults, options } = this;
    const { dev, deps } = options;

    if (!this.pluginQueue) {
      this.pluginQueue = utils.union([], defaults.js, options.js, config.js);
      utils.normalizeOptions(options);
    }

    if (dev && !this.cache.updatedDevDeps) {
      this.cache.updatedDevDeps = true;
      utils.unionValue(options, 'devDependencies.files.patterns', dev);
      this.updatePackage('devDependencies.files.patterns', dev, utils.unionValue);
    }

    if (deps && !this.cache.updatedDeps) {
      this.cache.updatedDeps = true;
      utils.unionValue(options, 'dependencies.files.patterns', deps);
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
      const pkg = JSON.parse(fs.readFileSync(this.pkg.path));
      const key = `lintDeps.${prop}`;

      if (typeof fn === 'function') {
        fn(pkg, key, val);
      } else {
        utils.set(pkg, key, val);
      }

      write.sync(this.pkg.path, JSON.stringify(pkg, null, 2));
    });
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
    if (utils.isObject(files)) options = files;
    if (types === '*') types = utils.validTypes;
    types = [].concat(types || []);

    this.report = this.report || {};
    this.report.types = new Stack();

    for (const type of types) {
      const report = this.lintType(type, options);

      if (report) {
        this.report.types.push(report.type);
        this.report.missingCount += report.missingCount;
      }
    }

    defineProperty(this.report, 'missingCount', {
      configurable: true,
      set(val) {
        this._missingCount = val;
      },
      get() {
        let count = this._missingCount || 0;
        for (const type of this.types) {
          count += this[type].missingCount;
        }
        return count;
      }
    });

    defineProperty(this.report, 'missingTypes', {
      configurable: true,
      get() {
        return this.types.filter(type => this[type].missingCount > 0);
      }
    });

    defineProperty(this.report, 'unused', {
      configurable: true,
      get() {
        return this.types.reduce((acc, type) => acc.concat(this[type].unused), []);
      }
    });

    defineProperty(this.report, 'unusedCount', {
      configurable: true,
      get() {
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

    const report = this.report[type] || (this.report[type] = { unused: [], missing: {} });
    const pkg = utils.clone(typeOpts.pkg || this.pkg.data);
    const deps = Object.keys(pkg[type] || {});
    const missing = { modules: [], files: {} };
    const modules = {};
    const used = new Stack();
    const all = new Stack();

    report.type = type;

    defineProperty(report, 'missingCount', {
      configurable: true,
      get() {
        return this.missing.modules.length;
      }
    });

    let ignore = get(this, `config.merged.${type}.ignore`) || get(this, 'config.merged.ignore');
    if (Array.isArray(ignore) || typeof ignore === 'string') {
      ignore = { patterns: ignore };
    }

    let isIgnored = () => false;
    if (ignore) {
      isIgnored = pico(ignore.patterns, { dot: true, nocase: true, ...ignore.options });
    }

    this.state.ignored = isIgnored;

    for (const file of files) {
      file.missing = new Stack();

      this.emit('file', file);

      utils.union(used, file.modules);
      utils.unionValue(report, 'files', file);

      for (const name of file.modules) {
        if (isIgnored(file.relative)) continue;

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
    let unused = utils.diff(deps.slice(), used.slice());
    unused = unused.filter(name => !isIgnored(name));

    this.state.unused = unused;
    this.loadPlugins(this.pluginQueue);
    unused = this.state.unused;

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
    const res = { name: name, files: {}, types: [], count: 0 };

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
    const exclude = get(this.pkg.data, 'lintDeps.modules.exclude') || [];

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
          for (const file of [].concat(report[type].files || [])) {
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
   * const files = lintDeps.glob('*.js');
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
    const files = glob.sync(patterns, opts);
    const result = [];

    for (const basename of files) {
      const fp = path.join(opts.cwd, basename);
      const file = this.toFile(fp, moduleOpts);
      if (!file.isDirectory() && this.filter(file)) {
        result.push(file);
      }
    }

    return result;
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
   *   let files = new Stack();
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
    const opts = { ...this.options, ...options };

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
      this.matchRequires(file, opts);
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

  matchRequires(file, options = {}) {
    const opts = { ...this.options, ...options };

    try {
      const { matchModules, isValidPackageName } = utils;
      const matches = matchModules(file.contents.toString(), { stripComments: false }, file);
      const isIgnored = this.isIgnored(opts.exclude);
      file.modules = new Stack();

      for (let i = 0; i < matches.length; i++) {
        let name = matches[i].name;

        if (name.startsWith('/') || name.startsWith('.') || !isValidPackageName(name)) {
          continue;
        }

        if (name[0] !== '@' && name.includes('/')) {
          name = name.slice(0, name.indexOf('/'));
        }

        if (name[0] === '@') {
          const segs = name.split('/');
          if (segs.length > 2) {
            name = segs.slice(0, 2).join('/');
          }
        }

        if (!isIgnored(name) && !file.modules.includes(name)) {
          file.modules.push(name);
        }
      }
    } catch (err) {
      err.file = file;
      err.path = file.path;
      throw err;
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
    const contents = utils.stripComments(file.contents, { ...this.options, ...options, file });

    if (contents) {
      file.contents = Buffer.from(contents);
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
    if (!patterns) return () => false;
    if (typeof patterns === 'string') patterns = [patterns].filter(Boolean);
    if (patterns.length === 0) return () => false;
    return pico(patterns, options);
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

    if (path.basename(file.path) === 'bin') {
      return file.extname === '.js' || file.extname === '';
    }

    return file.extname === '.js';
  }
}

/**
 * Expose `LintDeps`
 * @type {constructor}
 */

module.exports = LintDeps;
