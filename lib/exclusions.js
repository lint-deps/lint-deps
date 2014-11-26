'use strict';

/**
 * Directories at the root of the current working
 * directory. These are used for glob patterns.
 */

exports.invalid = [
  '.git',
  // 'docs',
  'node_modules',
  'temp',
  'test[\\\\\\/]actual',
  'test[\\\\\\/]fixtures',
  'tmp',
  'vendor'
];

/**
 * Required modules to exclude
 */

exports.builtins = [
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