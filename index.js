/**
 * lint-deps <https://github.com/jonschlinkert/lint-deps>
 *
 * Copyright (c) 2014 Jon Schlinkert, contributors.
 * Licensed under the MIT license.
 */

const file = require('fs-utils');
const strip = require('strip-comments');
const plasma = require('plasma');
const _ = require('lodash');

const exclusions = require('./lib/exclusions');
const pkg = plasma('package.json');

/**
 * Find require() statements. Locally required
 * libs will not be returned in the result.
 *
 * @title findRequires
 * @param   {String}  src  The string to search
 * @return  {Array}        Returns an array of required modules
 */

exports.findRequires = function(str) {
  var arr = [];
  // Basic require statement regex
  var re = /require\(['"]([^"']+)['"]\)/g;
  if(re.test(str)) {
    str.match(re).filter(function(ea) {
      ea = ea.replace(re, '$1');
      if(!/\.\//.test(ea)) {
        arr.push(ea);
      }
    });
  }
  return _.flatten(arr);
};

// var req = file.expand('tmp/**/*.js').map(function(filepath) {
//   var matches = [];
//   var re = /require\(['"]([^"']+)['"]\)/g;
//   var content = file.readFileSync(filepath);
//   content.replace(re, function(whole, $1, index) {
//     matches.push($1);
//   });

//   return {
//     file: filepath,
//     require: matches
//   };
// });

/**
 * Find grunt.loadTasks() and grunt.loadNpmTasks().
 *
 * @title findTasks
 * @param   {String}  src  The string to search
 * @return  {Array}        Returns an array of required modules
 */

exports.findTasks = function(str) {
  var arr = [];
  // Basic require statement regex
  var re = /loadTasks|loadNpmTask\(['"]([^"']+)['"]\)/gm;
  if(re.test(str)) {
    str.match(re).filter(function(ea) {
      ea = ea.replace(re, '$1');
      if(!/\.\//.test(ea) && !/^tasks$/.test(ea)) {
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

exports.expandFiles = function(src, fn, options) {
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

  arr.push(exclusions);
  arr.push(exclude || []);
  arr.push(exports.expandFiles(src, exports.findRequires));
  arr.push(exports.expandFiles(src, exports.findTasks));

  return _.unique(_.compact(_.flatten(arr)));
};

var deps = _.keys(pkg.dependencies);
var devDeps = _.keys(pkg.devDependencies);
var peerDeps = _.keys(pkg.peerDependencies);
var globOmissions = ['lint-deps-test', 'vendor', 'temp', 'tmp'];

// Aggregate dependencies from package.json, then add exclusion strings to this list
exports.allDeps = _.union([], deps, devDeps, peerDeps, exclusions);
exports.allReq = exports.buildResult(['**/*.js', 'bin/**', '!**/{' + globOmissions.join(',') + '}/**']);
