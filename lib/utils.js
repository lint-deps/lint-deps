import fs from 'fs';
import path from 'path';
import colors from 'ansi-colors';
import picomatch from 'picomatch';
import startsWith from 'path-starts-with';

export const pick = (obj, keys = []) => {
  const res = {};
  for (const key of keys) {
    if (obj[key] !== undefined) {
      res[key] = obj[key];
    }
  }
  return res;
};

export const omit = (obj, keys = []) => {
  const res = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!keys.includes(key)) {
      res[key] = value;
    }
  }
  return res;
};

export const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);

export const isEmpty = (v, omitZero) => {
  if (v == null) return true;
  if (v === '') return true;

  if (typeof v === 'number') {
    return omitZero ? v === 0 : false;
  }

  if (v instanceof RegExp) {
    return v.source === '';
  }

  if (v instanceof Error) {
    return v.message === '';
  }

  if (v instanceof Date) {
    return false;
  }

  if (Array.isArray(v)) {
    for (const e of v) {
      if (!isEmpty(e)) {
        return false;
      }
    }
    return true;
  }

  if (isObject(v)) {
    if (typeof v.size === 'number') {
      return v.size === 0;
    }

    for (const k of Object.keys(v)) {
      if (!isEmpty(v[k])) {
        return false;
      }
    }
    return true;
  }

  return false;
};

export const choicesObjectToArray = obj => {
  const choices = [];

  for (const [name, values] of Object.entries(obj)) {
    if (values.length) {
      choices.push({ name, choices: values });
    }
  }
  return choices;
};

export const answerResultToObject = stateChoices => {
  const result = {};

  for (const choice of stateChoices) {
    if (choice.enabled) {
      const [key, ...parts] = choice.path.split('.');

      if (parts.length) {
        result[key] ||= [];
        result[key].push(parts.join('.'));
      }
    }
  }

  return result;
};

/**
 * Map globally defined "aliases" to the modules. Aliases allow you to override
 * the version of a module, or the module name.
 */

export const mapAliases = (app, names) => {
  if (app.options.aliases) {
    return names.map(name => app.options.aliases[name] || name);
  }
  return names;
};

export const hasPackage = dir => fs.existsSync(path.resolve(dir, 'package.json'));

export const matcher = pattern => {
  if (pattern === '*') pattern = '**/*';

  if (Array.isArray(pattern) || typeof pattern === 'string') {
    return picomatch(pattern, { dot: true, nocase: true });
  }

  if (typeof pattern === 'function') {
    return pattern;
  }

  if (pattern instanceof RegExp) {
    return file => pattern.test(file.relative);
  }

  return () => false;
};

export const env = name => {
  const key = `LINT_DEPS_${name.toUpperCase()}`;
  const val = process.env[key];

  if (val) {
    return val.includes(',') ? val.split(',') : val;
  }

  return null;
};

export const error = colors.red(colors.symbols.cross);
export const info = colors.cyan(colors.symbols.info);
export const success = colors.green(colors.symbols.check);
export const warning = colors.yellow(colors.symbols.warning);
export const heading = (...args) => {
  return colors.bold.underline(args.filter(v => v != null).map(String).join(' '));
};

// pass `import.meta.url`
export const cwd = import_meta_url => {
  const url = new URL(import_meta_url);
  return path.dirname(url.pathname);
};

export const sortFiles = (files = []) => files.sort((a, b) => {
  const alen = a.relative.split(path.sep).length;
  const blen = b.relative.split(path.sep).length;
  if (alen < blen) return 1;
  if (alen > blen) return -1;
  return a.relative.localeCompare(b.relative);
});

export const toPosixSlashes = str => str.replace(/\\/g, '/');
export const isPathSeparator = code => code === 47 || code === 92;
export const isDot = code => code === 46;

export const removeDotSlash = str => {
  if (isDot(str.charCodeAt(0)) && isPathSeparator(str.charCodeAt(1))) {
    return str.slice(2);
  }
  return str;
};

export const normalizePath = pathname => {
  return toPosixSlashes(removeDotSlash(pathname));
};

export const isInDirs = (app, file) => {
  const dataDirs = app.pkg.data.dirs || [];
  const pkgDirs = app.pkg.dirs || [];
  const dirs = [...new Set(dataDirs.concat(pkgDirs))].map(dirname => normalizePath(dirname));
  const filepath = normalizePath(file.path);
  const relative = normalizePath(file.relative);

  if (dirs?.includes?.(filepath)) {
    return true;
  }

  if (dirs?.includes?.(relative)) {
    return true;
  }

  for (const dir of dirs) {
    if (startsWith(relative, dir)) {
      return true;
    }

    if (startsWith(filepath, dir)) {
      return true;
    }
  }

  return false;
};

export const isInFiles = (app, file) => {
  const paths = app.pkg.data.files.map(pathname => normalizePath(pathname));
  const relative = normalizePath(file.relative);

  if (paths.includes(relative)) {
    return true;
  }

  for (const pathname of paths) {
    if (startsWith(relative, pathname)) {
      return true;
    }
  }

  for (const dirent of app.pkg.files) {
    if (normalizePath(dirent.relative) === relative) {
      return true;
    }
    if (normalizePath(dirent.path) === normalizePath(file.path)) {
      return true;
    }
  }

  return false;
};

export const isDependency = (app, name) => {
  return app.missing.dependencies?.includes(name) || app.modules.dependencies?.includes(name);
};

export const isDevDependency = (app, name) => {
  return app.missing.devDendencies?.includes(name);
};

export const removeDevDependency = (app, name) => {
  app.missing.devDendencies ||= [];
  app.modules.devDendencies ||= [];
  app.missing.devDendencies.splice(app.missing.devDendencies.indexOf(name), 1);
  app.modules.devDendencies.splice(app.modules.devDendencies.indexOf(name), 1);
};

export default {
  answerResultToObject,
  choicesObjectToArray,
  cwd,
  env,
  error,
  hasPackage,
  heading,
  info,
  isDependency,
  isDevDependency,
  isDot,
  isEmpty,
  isInDirs,
  isInFiles,
  isObject,
  isPathSeparator,
  mapAliases,
  matcher,
  normalizePath,
  omit,
  pick,
  removeDevDependency,
  removeDotSlash,
  sortFiles,
  success,
  toPosixSlashes,
  warning
};
