'use strict';

var fs = require('fs');
var path = require('path');
var cwd = require('cwd');
var file = require('fs-utils');
var plasma = require('plasma');
var matched = require('matched');
var multimatch = require('multimatch');
var matchdep = require('matchdep');
var strip = require('strip-comments');
var _ = require('lodash');

var find = require('./find');
var excluded = require('./exclusions');
var utils = require('./utils');
var pkgFile = path.resolve(cwd('package.json'));
var pkg = plasma(pkgFile);

var lint = module.exports = {};



/**
 * Returns an array of directories, sans exclusions
 *
 * @param   {String} `base` The base directory to start from.
 * @param   {Object} `options`
 * @return  {Array} array of directories
 * @api private
 */

lint._listDirs = function(omit) {
  var dirs = fs.readdirSync(cwd()).filter(utils.isDir);
  return _.difference(dirs, _.union(excluded.rootDirs, omit));
};


/**
 * List the javascript files in each directory
 *
 * @param   {String} `base` The base directory to start from.
 * @param   {Object} `options`
 * @return  {Array}
 * @api private
 */

function matches(cwd, patterns) {
  return
}

lint.listFiles = function (omit) {
  var files = [];

  // Get files from the root directory, and from bin
  if (pkg.bin) {files.push(_.values(pkg.bin)[0]);}

  var dir = file.glob.sync(['bin/*', '*.js']).map(function(fp) {
    return path.resolve(process.cwd(), fp);
  });
  files = files.concat(dir);

  // var bin = matched('bin', '*', function() {

  // });
  // console.log(bin)

  // Search for javascript files in the provided directories
  lint._listDirs(omit).forEach(function (filepath) {
    var patterns = ['**/*.js', '!**/fixtures/**'];
    var results = file.glob.sync(patterns, {cwd: filepath}).map(function(fp) {
      return utils.normalize(path.resolve(filepath, fp));
    });
    files = files.concat(results);
  });

  // We uniquify b/c it's possible to have the
  // file registered twice, since we ask package.json
  // for whatever is in `bin`, so let's uniquify
  return _.unique(files.map(utils.normalize));
};


/**
 * List the dependencies currently listed in
 * package.json
 *
 * @param {Object} `pkg` package.json object
 * @return {Array} Array of combined dependencies
 * @api private
 */

lint._listPkgDependencies = function(options) {
  var deps = matchdep.filterAll('*', pkgFile);
  if (_.contains(deps, 'load-grunt-tasks') || _.contains(deps, 'matchdep')) {
    excluded.packageNames = excluded.packageNames.concat(['grunt-']);
  }

  // Create a comma-separated list of deps to exclude from the search
  var omissions = _.unique(excluded.packageNames).join(',');
  var patterns = ['*', '!verb', '!{' + omissions + '}*'];
  return matchdep.filterAll(patterns, pkgFile);
};


/**
 * @param {Array} `omit`  Array of dependencies to omit.
 * @param {Array} `arr`   Array of dependencies
 * @return {Array}
 * @api private
 */

lint._removeModules = function(arr, omit) {
  return _.difference(arr, omit);
};


/**
 * List the required modules currently defined
 * in each javascript file.
 *
 * @return  {Array} Array of required modules
 * @api private
 */

lint._listRequiredModules = function(omit) {
  var req = [];

  lint.listFiles(omit).forEach(function(filepath) {
    var str = strip(file.readFileSync(filepath));
    req = req.concat(find.requiredModules(str), find.gruntTasks(str));
  });

  // Sort and remove an junk from the array
  req = _.unique(req).filter(Boolean).sort();
  return lint._removeModules(req, excluded.requiredModules);
};


lint.packageDeps = lint._listPkgDependencies;
lint.requiredModules = lint._listRequiredModules;