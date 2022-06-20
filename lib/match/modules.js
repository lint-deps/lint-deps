import fs from 'fs';
import path from 'path';
import babel from '@babel/parser';
import Dirent from 'dirent';
import stripComments from 'strip-comments';
import isValidModuleName from './is-valid-module-name.js';
import { parseTypescript } from './typescript.js';
import { DEFAULT_EXTS, LINE_COMMENT_REGEX } from '../constants.js';

const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const isTypescript = extname => /^\.tsx?$/.test(extname);
const isReact = extname => /^\.[jt]sx$/.test(extname);

const findFile = pathname => {
  if (fs.existsSync(pathname)) {
    const file = new Dirent(pathname);
    file.stat = fs.statSync(file.path);
    return file;
  }

  for (const ext of DEFAULT_EXTS) {
    const filepath = `${pathname}.${ext}`;

    if (fs.existsSync(filepath)) {
      const file = new Dirent(filepath);
      file.stat = fs.statSync(file.path);
      return file;
    }
  }

  return null;
};

const toPackageName = (name, ignore = []) => {
  const segs = name.split('/');

  if (name.startsWith('@')) {
    return segs.slice(0, 2).join('/');
  }

  return segs[0];
};

const isFile = (file, token) => {
  return fs.existsSync(path.resolve(file.base, token.name));
};

const parse = (file, input, options = {}) => {
  const defaults = {
    strictMode: false,
    allowImportExportEverywhere: true,
    allowAwaitOutsideFunction: true,
    allowReturnOutsideFunction: true,
    allowSuperOutsideMethod: true,
    allowUndeclaredExports: true,
    errorRecovery: true,
    sourceType: 'unambiguous',
    sourceFilename: file.path
  };

  const isIgnored = options.ignore ? this.isIgnored(options.ignore) : () => false;
  const plugins = [].concat(options.plugins || []);
  const presets = [].concat(options.presets || []);
  const opts = { ...defaults, plugins, presets };
  let ts = false;

  if (options.ts || isTypescript(file.extname)) {
    ts = true;
    opts.sourceType = 'module';
    plugins.push('@babel/plugin-transform-typescript');
    // plugins.push('@babel/plugin-syntax-typescript');
    // presets.push('@babel/preset-typescript');
  }

  if (options.jsx || isReact(file.extname)) {
    opts.sourceType = 'module';
    plugins.push('jsx');
  }

  const seen = new Set();
  const modules = [];
  let tree;

  try {
    tree = ts ? parseTypescript(file, input, opts) : babel.parse(input, opts);
  } catch (err) {
    if (err.missingPlugin?.includes('jsx')) {
      return parse(file, input, { ...options, plugins: ['jsx'] });
    }

    err.__filename = new URL(import.meta.url).pathname;
    console.log(err);
    console.log(opts);
    process.exit();
  }

  const push = token => {
    if (!token.name) return;
    token.name = toPackageName(token.name);

    if (!seen.has(token.name) && isValidModuleName(token.name, file) && !isIgnored(token.name)) {
      seen.add(token.name);
      modules.push(token);
      return;
    }

    if (!seen.has(token.name) && /^[./]/.test(token.name)) {
      seen.add(token.name);

      const pathname = path.resolve(file.dirname, token.name);
      const dirent = new Dirent(pathname);

      if (file.isMatch && file.isMatch(dirent)) {
        const dirent = findFile(pathname);

        if (dirent) {
          file.local ||= [];
          file.local.push(dirent);
        }
      }
    }
  };

  visit(tree.program, node => {
    if (!node) return;

    const { source, specifiers } = node;

    if (node.type === 'ExportNamedDeclaration' && specifiers?.length && source?.value) {
      try {
        const { start, end } = specifiers[0];
        const value = input.slice(start, end);

        if (value.startsWith('* as')) {
          push({ type: 'import', name: source.value, node });
        }
      } catch (error) {
        // ignore
      }
    }

    if (node.type === 'ImportDeclaration' && source.value) {
      push({ type: 'import', name: source.value, node });
      return;
    }

    if (node.init?.callee && node.init?.arguments) {
      const { callee } = node.init;
      let { type, name } = callee;

      if (type === 'Import') {
        name = 'import';
      } else if (name !== 'require') {
        // Ex. "const debug = require('debug')('foo');"
        if (callee.callee?.name === 'require') {
          if (Array.isArray(callee.arguments)) {
            for (const arg of callee.arguments) {
              push({ type: 'require', name: arg.value, node });
            }
          }
        }
        return;
      }

      for (const arg of node.init.arguments) {
        push({ type: name, name: arg.value, node });
      }
      return;
    }

    if (node.type === 'CallExpression') {
      const { callee } = node;

      if (node.arguments && callee?.name === 'require') {
        for (const arg of node.arguments) {
          push({ type: 'require', name: arg.value, node });
        }
      }
    }
  });

  // console.log({ modules });
  return modules;
};

const visit = (node, fn, parent) => {
  if (!node) return;

  fn(node, parent);

  if (Array.isArray(node.body)) {
    mapVisit(node.body, fn, node.body);
    return;
  }

  if (node.expression?.callee) {
    const { body } = node.expression.callee;

    if (body && body.body) {
      mapVisit(body.body, fn, body);
      return;
    }

    return;
  }

  if (Array.isArray(node.declarations)) {
    mapVisit(node.declarations, fn, node);
    return;
  }

  if (Array.isArray(node.body?.body)) {
    mapVisit(node.body.body, fn, node.body);
    return;
  }

  const walk = (node, parent) => {
    for (const [key, value] of Object.entries(node)) {
      if (key === 'loc') continue;
      if (value == null) continue;

      if (isObject(value)) {
        visit(value, fn, node);
        continue;
      }

      if (Array.isArray(value)) {
        mapVisit(value, fn, node);
      }
    }
  };

  walk(node);
};

const mapVisit = (nodes, fn, parent) => {
  for (const node of nodes) {
    visit(node, fn, parent);
  }
};

const matchModules = (file, options = {}) => {
  let contents = file.contents && file.contents.toString();
  if (!contents) return [];

  if (typeof options === 'boolean' || typeof options === 'function') {
    options = { stripComments: options };
  }

  if (typeof options.stripComments === 'function') {
    contents = options.stripComments(contents);
  } else if (typeof options.stripComments === 'boolean') {
    contents = stripComments(contents, options);
  }

  const lines = contents.split(/\r*\n/);
  const output = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];

    if (/^#!\//.test(line)) continue;
    if (/\/\/!? *lint-deps-disable-next-line *$/.test(line)) index++;
    if (!/\/\/!? *lint-deps-disable-line *$/.test(line)) {
      output.push(line.replace(LINE_COMMENT_REGEX, ''));
    }
  }

  try {
    return parse(file, output.join('\n'), options);
  } catch (err) {
    console.log(file);
    throw err;
  }
};

export { isValidModuleName, matchModules as modules };
export default matchModules;
