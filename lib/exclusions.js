'use strict';

/**
 * Directories at the root of the current working
 * directory. These are used for glob patterns.
 */

exports.ignore = [
  '.git',
  // 'docs',
  'node_modules',
  'temp',
  'test[\\\\\\/]actual',
  'test[\\\\\\/]fixtures',
  'tmp',
  'vendor',
  'wip'
];

/**
 * Required modules to exclude
 */

exports.builtins = require('repl')._builtinLibs.concat([
  'console',
  'repl'
]);

// Final omissions. These can give false-negatives,
// since tools like load-grunt-tasks obscure the
// fact that modules are being required.
exports.packageNames = [
  'handlebars-'
];
