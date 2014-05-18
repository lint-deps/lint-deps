const _ = require('lodash');

/**
 * Strings to omit from comparisons
 * (this is just a start)
 *
 * @type  {Array}
 */

var dirs = exports.userExludedDirs = function() {
  var nested = ['test/fixtures'];
  return {
    root: [],
    nested: nested
  };
};


/**
 * Directories at the root of the current working
 * directory. These are used for glob patterns.
 */

exports.rootDirs = (function() {
  var defaults = [
    '.git',
    'node_modules',
    'temp',
    'tmp',
    'vendor'
  ];
  return _.union(dirs().root, defaults);
}());


/**
 * Nested directories
 */

exports.nestedDirs = (function() {
  return dirs().nested || [];
}());


/**
 * Required modules to exclude
 */

exports.requiredModules = [
  // Node.js
  'assert',
  'buffer',
  'child_process',
  'cluster',
  'crypto',
  'dns',
  'domain',
  'events',
  'fs',
  'http',
  'https',
  'net',
  'os',
  'path',
  'punycode',
  'querystring',
  'readline',
  'repl',
  'stream',
  'string_decoder',
  'tls',
  'tty',
  'dgram',
  'udp4',
  'udp6',
  'url',
  'util',
  'vm',
  'zlib'
];

// Final omissions. These can give false-negatives,
// since tools like load-grunt-tasks obscure the
// fact that modules are being required.
exports.packageNames = [
  'handlebars-'
];