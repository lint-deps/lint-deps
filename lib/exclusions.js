const _ = require('lodash');

/**
 * Strings to omit from comparisons
 * (this is just a start)
 *
 * @type  {Array}
 */

var dirs = exports.userExludedDirs = {
  root: [],
  nested: ['test/fixtures']
};


/**
 * Directories at the root of the current working
 * directory. These are used for glob patterns.
 */

exports.rootDirs = _.union(dirs.root, [
  '.git',
  'node_modules',
  'temp',
  'tmp',
  'vendor'
]);


/**
 * Nested directories
 */

exports.nestedDirs = dirs.nested || [];


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