/**
 * Strings to omit from comparisons
 * (this is just a start)
 *
 * @type  {Array}
 */

exports.dirs = [
  '.git',
  'node_modules',
  'temp',
  'tmp',
  'vendor'
];

exports.requires = [
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
exports.omit = [
  'handlebars-'
];