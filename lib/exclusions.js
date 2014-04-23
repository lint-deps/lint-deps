/**
 * Strings to omit from comparisons
 * (this is just a start)
 *
 * @type  {Array}
 */

exports.dirs = [
  'node_modules',
  '.git',
  'lint-deps-test',
  'vendor',
  'temp',
  'tmp'
];

exports.requires = [
  'handlebars-helper',

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
