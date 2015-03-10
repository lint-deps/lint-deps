'use strict';

/**
 * Module dependencies
 */

var fs = require('fs');
var path = require('path');
var parse = require('parse-gitignore');
var pkg = require('load-pkg');

/**
 * Parse the local `.gitignore` file and add
 * the resulting ignore patterns.
 */

function gitignore(fp) {
  fp = path.resolve(fp);
  var str = fs.readFileSync(fp, 'utf8');
  return parse(str);
}

/**
 * Directories at the root of the current working
 * directory. These are used for glob patterns.
 */

var defaults = [
  '.git',
  'node_modules',
  'temp',
  'test/actual',
  'test/fixtures',
  'tmp',
  'vendor',
  'wip'
];

/**
 * Expose `ignore` patterns. This includes ignore
 * patterns from `.gitignore`, and any patterns defined
 * in package.json on `verb.deps.ignore`.
 *
 * @type {Array}
 */

exports.ignore = gitignore('.gitignore')
  .concat((pkg.verb && pkg.verb.deps && pkg.verb.deps.ignore) || [])
  .concat(defaults);

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
