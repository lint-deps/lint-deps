/**
 * lint-deps <https://github.com/jonschlinkert/lint-deps>
 *
 * Copyright (c) 2014 Jon Schlinkert, contributors.
 * Licensed under the MIT license.
 */

'use strict';

var file = require('fs-utils');
var strip = require('strip-comments');
var _ = require('lodash');
var pkg = require('./package.json');


/**
 * Find require() statements. Locally required
 * libs will not be returned in the result.
 *
 * @title findRequires
 * @param   {String}  src  The string to search
 * @return  {Array}        Returns an array of required modules
 */

var findRequires = function(src) {
  var arr = [];
  // Basic require statement regex
  var re = /^.+require\('(.+)'\)/gm;
  if(src.match(re) !== null) {
    src.match(re).filter(function(ea) {
      ea = ea.replace(re, '$1');
      if(ea.indexOf('./') === -1) {
        arr.push(ea);
      }
    });
  }
  return _.flatten(arr);
};

/**
 * Expand glob patterns into filepaths, and
 * read in content from each file.
 *
 * @title expandFiles
 * @param   {Array,String} src      An array or string of glob/minimatch patterns.
 * @param   {Function}     fn       Function to run against the file content.
 * @param   {Object}       options  Options to pass to globule
 * @return  {Array} Array of expanded filepaths
 */

var expandFiles = function(src, fn, options) {
  var opts = _.extend({nonull: true, filter: 'isFile'}, options);
  fn = fn || function(src) {
    return src;
  };
  var result = file.expand(src, opts).filter(function(filepath) {

    // Filter out node_modules from result set
    return !~filepath.search('node_modules');
  }).map(function(filepath) {

    // remove banners from files before searching for
    // require statements, so that "unused" require
    // statements aren't included in the result.
    var src = strip(file.readFileSync(filepath, opts));
    return fn(src);
  });
  return result;
};

/**
 * Strings to omit from the comparison
 * (this is just a start)
 *
 * @type  {Array}
 */

var nodeBuiltins = [
  'assert',
  'buffer',
  'child_process',
  'cluster',
  'crypto',
  'dns',
  'domain',
  'event',
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

/*
 * Flatten the array of require statements,
 * remove any junk and omit exclusions.
 *
 * @title buildResult
 * @param   {String}  src      [description]
 * @param   {[type]}  exclude  [description]
 * @return  {[type]}           [description]
 */

exports.buildResult = function(src, exclude) {
  var arr = [];

  arr.push(nodeBuiltins);
  arr.push(exclude || []);
  arr.push(expandFiles(src, findRequires));

  return _.unique(_.compact(_.flatten(arr)));
};

var deps = _.keys(pkg.dependencies);
var devDeps = _.keys(pkg.devDependencies);
var peerDeps = _.keys(pkg.peerDependencies);

exports.allDeps = _.union([], deps, devDeps, peerDeps, nodeBuiltins);
exports.allReq = exports.buildResult(['**/*.js', '!**/{tmp,temp}/**', 'bin/**']);

