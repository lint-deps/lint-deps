'use strict';

var path = require('path');
var union = require('arr-union');
var utils = require('./utils');

module.exports = function(app, options) {
  var pkg = utils.clone(app.pkg.data);
  var opts = utils.merge({nocase: true}, utils.get(pkg, 'lintDeps'), options);
  var ignoredFiles = utils.get(opts, 'files.ignore') || [];
  opts.ignoreDeps = opts.ignore || [];
  opts.pkgFiles = utils.clone(utils.get(pkg, 'files') || []).map(function(str) {
    return !/[*.]/.test(str) ? path.join(str, '**') : str;
  });

  var _ignore = [
    '_gh_pages',
    'dist',
    'fixtures',
    'node_modules',
    'temp',
    'tmp',
    'vendor'
  ];

  // var defaults = [`**/{${_ignore.join(',')}}/**`];
  // var pkgName = utils.get(pkg, 'name');
  // if (!/^(templates|base-test-suite)$/.test(pkgName) && !opts.defaultIgnores) {
  //   defaults.push('**/templates/**');
  // }

  // opts.defaultIgnores = opts.defaultIgnores || defaults;
  opts.patterns = opts.patterns || '**/*.js';
  // opts.ignore = union([], opts.defaultIgnores, app.gitignore(ignoredFiles)).map(resolve);
  opts.ignore = [];

  opts.files = opts.files || {};
  delete opts.files.ignore;

  var defaultFiles = {
    dependencies: [
      'bin/*.js',
      'cli.js',
      'index.js',
      'lib/**/*.js',
      'utils.js',

      // TODO: externalize special exceptions
      'generator.js',
      'updatefile.js',
    ],
    devDependencies: [
      '*file.js',
      'benchmark/{,code/**/}*.js',
      'build/**/*.js',
      'examples/*.js',
      'example{,s}.js',
      'test.js',
      'test/**/*.js',
    ],
    optionalDependencies: [],
    peerDependencies: []
  };

  if (opts.files.union !== false) {
    delete opts.files.union;
    combine('dependencies');
    combine('devDependencies');
    combine('optionalDependencies');
    combine('peerDependencies');

  } else {
    or('dependencies');
    or('devDependencies');
    or('optionalDependencies');
    or('peerDependencies');
  }

  function resolve(pattern) {
    return path.resolve(app.cwd, pattern);
  }

  function combine(prop, arr) {
    opts.files[prop] = union([], arr, opts.files[prop], defaultFiles[prop]);
  }

  function or(prop, arr) {
    opts.files[prop] = opts.files[prop] || arr || defaultFiles[prop];
  }
  // console.log(opts);
  // process.exit()
  return opts;
};
