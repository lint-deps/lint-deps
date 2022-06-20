import fs from 'node:fs';
import path from 'node:path';
import Events from 'node:events';
import xdg from '@folder/xdg';
import pico from 'picomatch';
import Dirent from 'dirent';
import findPkg from 'find-pkg';
import startsWith from 'path-starts-with';
import { projectFiles as readdir, createMatchers } from '/Users/jonschlinkert/dev/parse-project/index.js';
import { env, isObject, hasPackage, matcher, sortFiles, isInDirs, isInFiles } from './lib/utils.js';
import { DEFAULT_DEV_DIRS, DEFAULT_DEV_NAMES, DEFAULT_IGNORED } from './lib/constants.js';

const kIsIgnored = Symbol('is-ignored');
const kIsDevFile = Symbol('is-development-file');

class LintDeps extends Events {
  constructor(dir, options) {
    super();
    this.dir = path.resolve(dir);
    this.root = path.dirname(findPkg.sync(this.dir));
    this.options = { ...options };
    this.ignored = [].concat(this.options.ignored || env('ignored') || DEFAULT_IGNORED);
    this.installer = this.options.mgr || 'npm';
    this.paths = xdg({ ...this.options.xdg, subdir: 'lint-deps' });
    this.modules = { dependencies: [], devDependencies: [] };
    this.middleware = new Set();
    this.missing = {};
    this.unused = {};
    this.files = [];
    this.types = [];
    this.suggestions = [];
    this.pkg = this.loadPackage();
  }

  use(pattern, fn) {
    if (typeof pattern === 'function' && !fn) return this.use(() => true, pattern);
    this.middleware.add({ pattern, isMatch: matcher(pattern), fn });
  }

  async run(file) {
    for (const { isMatch, fn } of this.middleware) {
      if (file.name === 'package.json') file = this.pkg;
      if (isMatch(file.relative)) {
        await fn(file, this);
      }
    }
  }

  onFile(file) {
    // noop
  }

  isIgnored(file) {
    if (this[kIsIgnored]) {
      return !file.name || this.ignored.includes(file.name) || this[kIsIgnored](file.relative);
    }

    const ignored = [];
    for (const pattern of this.ignored) {
      if (!pattern.startsWith('**/') && !pattern.endsWith('/**')) {
        ignored.push(`**/${pattern}/**`);
      } else {
        ignored.push(pattern);
      }
    }

    const isMatch = pico(ignored, { dot: true });
    this[kIsIgnored] = isMatch;
    return !file.name || this.ignored.includes(file.name) || isMatch(file.relative);
  }

  isType(type, name) {
    if (this.options.ignored?.[type]?.includes(name)) {
      return false;
    }
    return this.modules[type].includes(name);
  }

  isDependency(name) {
    return this.isType('dependencies', name);
  }

  isDevDependency(name) {
    if (name.includes('eslint') || name.includes('typescript')) {
      return true;
    }

    return !this.isDependency(name) && this.isType('devDependencies', name);
  }

  isDevFile(file) {
    const resolved = path.resolve(this.root, file.path);
    const relative = path.relative(this.root, resolved);
    const dirs = [].concat(this.options.devDirs || env('dev_dirs') || DEFAULT_DEV_DIRS);
    const names = [].concat(this.options.devFilenames || env('dev_names') || DEFAULT_DEV_NAMES);
    const segs = relative.toLowerCase().split(path.sep);
    const name = segs.pop();

    if (segs.length > 0 && segs.some(d => dirs.includes(d))) {
      return true;
    }

    if (names.includes(name)) {
      return true;
    }

    this[kIsDevFile] ||= pico(names, { dot: true });
    return this[kIsDevFile](name);
  }

  isProductionFile(file) {
    if (this.isDevFile(file)) return false;
    if (isInFiles(this, file)) return true;
    if (isInDirs(this, file)) return true;
    return false;
  }

  jsconfig() {
    const configpath = path.join(this.root, 'jsconfig.json');
    const jsconfig = fs.existsSync(configpath) ? JSON.parse(fs.readFileSync(configpath)) : {};
    const { compilerOptions = {} } = jsconfig;

    const paths = Object.values(compilerOptions.paths || [])
      .flat()
      .map(p => p.endsWith('/*') ? p + '*' : p)
      .map(p => path.resolve(this.root, p));

    const has = paths.length ? pico(paths) : () => false;

    return { has: name => has(name) };
  }

  loadPackage() {
    const pkg = new Dirent(path.join(this.dir, 'package.json'));

    if (!fs.existsSync(pkg.path)) {
      throw new Error('Cannot find package.json in the current project');
    }

    pkg.stat = fs.statSync(pkg.path);
    pkg.contents ||= fs.readFileSync(pkg.path);
    pkg.data ||= JSON.parse(pkg.contents);

    const config = pkg.data.lintDeps || pkg.data.lintDepsConfig;
    if (config) {
      this.options = { ...this.options, ...config };
    }

    pkg.data.files ||= [];
    pkg.data.dirs ||= [];

    const devdirs = DEFAULT_DEV_DIRS
      .concat(Array.isArray(config?.dirs) && config?.dirs)
      .concat(config?.dirs?.devDependencies)
      .concat(config?.dirs?.dependencies)
      .filter(Boolean);

    if (Array.isArray(pkg.data.workspaces)) {
      devdirs.push(...pkg.data.workspaces);
    }

    if (isObject(pkg.data.workspaces)) {
      for (const value of Object.values(pkg.data.workspaces)) {
        devdirs.push(...[].concat(value));
      }
    }

    const data = { ...pkg.data };

    for (const [key, value] of Object.entries(this.options)) {
      if (Array.isArray(value)) {
        if (data[key]) {
          data[key] = [...new Set(data[key].concat(value))];
        } else {
          data[key] = value;
        }
      }
    }

    const { main, files, dirs, directories } = data;
    const allPaths = [main, dirs, files, directories, devdirs].flat().filter(Boolean);
    const uniquePaths = [...new Set(allPaths.map(f => path.resolve(this.dir, f)))];

    pkg.files = [];
    pkg.dirs = [];

    for (const p of uniquePaths) {
      if (!fs.existsSync(p)) continue;
      if (fs.statSync(p).isDirectory() && !pkg.dirs.includes(p)) {
        pkg.dirs.push(p);
        continue;
      }

      if (!pkg.files.some(f => f.path === p)) {
        const f = new Dirent(p);
        f.stat = fs.statSync(f.path);

        if (f.stat.isFile()) {
          pkg.files.push(f);
        }
      }
    }

    for (const key of Object.keys(pkg.data)) {
      if (/dependencies/i.test(key)) {
        this.types.push(key);
      }
    }

    return pkg;
  }

  async readdir(options) {
    const pending = new Set();
    const files = [];

    for (const file of this.pkg.files) {
      pending.add(this.run(file));
      files.push(file);
    }

    const opts = {
      recursive: true,
      base: this.dir,
      cwd: this.dir,
      exts: ['.jsx', '.js', '.mjs'],
      ...this.options,
      ...options
    };

    const onDirectory = ({ dir, isMatch }) => file => {
      file.keep = file.recurse = !this.isIgnored(file) && !hasPackage(file.path);
    };

    const onFile = ({ dir, isMatch }) => file => {
      file.keep = !this.isIgnored(file);

      if (file.keep) {
        file.basedir = dir;
        file.isMatch = isMatch;

        const promise = this.run(file).then(() => {
          pending.delete(promise);

          if (file.modules) {
            this.files.push(file);
            this.onFile(file);
          }
        });

        pending.add(promise);
      }
    };

    for (const dir of this.pkg.dirs) {
      const { fileIsMatch, dirIsMatch } = createMatchers(dir, opts);

      await readdir(dir, {
        ...opts,
        onFile: onFile({ dir, isMatch: fileIsMatch }),
        onDirectory: onDirectory({ dir, isMatch: dirIsMatch })
      });
    }

    await Promise.all(pending);

    sortFiles(this.files);
    return this.files;
  }

  findUnusedDependencies() {
    if (this.pkg.data.dependencies) {
      return Object.keys(this.pkg.data.dependencies).filter(name => !this.isDependency(name));
    }
    return [];
  }

  findUnusedDevDependencies() {
    if (this.pkg.data.devDependencies) {
      return Object.keys(this.pkg.data.devDependencies).filter(name => !this.isDevDependency(name));
    }
    return [];
  }

  findUnused() {
    return {
      dependencies: this.findUnusedDependencies(),
      devDependencies: this.findUnusedDevDependencies()
    };
  }

  findMissing() {
    const { has } = this.jsconfig();
    const missing = { dependencies: new Set(), devDependencies: new Set() };
    const local = new Set();

    const getPackageName = name => {
      const segs = name.split('/');

      if (name.startsWith('@')) {
        return segs.slice(0, 2).join('/');
      }

      return segs[0];
    };

    for (const file of this.files) {
      if (file.isFile() && file.missing?.length > 0) {
        for (const name of file.missing) {
          const pkgname = getPackageName(name);
          const filepath = path.resolve(this.root, name);

          if (fs.existsSync(filepath)) {
            console.log(filepath);
          } else if (fs.existsSync(name)) {
            console.log(filepath);
          }

          if (!has(filepath)) {
            missing[file.type].add(pkgname);
          } else {
            local.add(pkgname);
          }
        }
      }
    }

    for (const [key, set] of Object.entries(missing)) {
      missing[key] = [...set].sort();
    }

    return { missing, local };
  }

  cleanupDepsNames() {
    for (const file of this.files) {
      if (file.type === 'dependencies') continue;
      for (const name of file.modules || []) {
        if (this.modules.dependencies.includes(name)) {
          this.modules[file.type] = this.modules[file.type].filter(n => n !== name);
          file.modules.splice(file.modules.indexOf(name), 1);
        }
      }

      for (const name of file.missing || []) {
        if (this.missing.dependencies?.includes?.(name)) {
          this.missing[file.type] = this.missing[file.type].filter(n => n !== name);
          file.missing.splice(file.missing.indexOf(name), 1);
        }
      }
    }

    for (const [k, v] of Object.entries(this.modules)) {
      this.modules[k] = [...new Set(v)].sort();
    }

    for (const [k, v] of Object.entries(this.missing)) {
      this.missing[k] = [...new Set(v)].sort();
    }
  }
}

export { LintDeps };
export default (...args) => new LintDeps(...args);
