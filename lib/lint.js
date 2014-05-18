const fs = require('fs');
const path = require('path');
const cwd = require('cwd');
const file = require('fs-utils');
const plasma = require('plasma');
const matchdep = require('matchdep');
const strip = require('strip-comments');
const _ = require('lodash');

const find = require('./find');
const excluded = require('./exclusions');
const pkgFile = path.resolve(cwd('package.json'));
const pkg = plasma(pkgFile);

const lint = module.exports = {};


function normalize(str) {
  str = str.replace(/\\/g, '/');
  return str.replace(/^\.[\/\\]?/, '');
}

function is(filepath) {
  return file.isDir(filepath);
}


/**
 * ## .listDirs()
 *
 * Returns an array of directories, sans exclusions
 *
 * @param   {String} `base` The base directory to start from.
 * @param   {Object} `options`
 * @return  {Array} array of directories
 *
 * @api private
 */

lint.listDirs = function(omit) {
  var dirs = fs.readdirSync(cwd()).filter(is);
  return _.difference(dirs, _.union(excluded.rootDirs, omit));
};


/**
 * ## .listFiles()
 *
 * List the javascript files in each directory
 *
 * @param   {String} `base` The base directory to start from.
 * @param   {Object} `options`
 * @return  {Array}
 *
 * @api private
 */

lint.listFiles = function (omit) {
  var files = [];

  // Get files from the root directory, and from bin
  if (pkg.bin) {files.push(_.values(pkg.bin)[0]);}
  files = files.concat(file.find(['bin/*', '*.js'], {filter: 'isFile'}));

  // Search for javascript files in the provided directories
  lint.listDirs(omit).forEach(function (filepath) {
    var options = {prefixBase: true, filter: 'isFile', cwd: filepath};
    var patterns = ['**/*.js', 'bin/*', '!**/fixtures/**'];
    var results = file.find(patterns, options).map(normalize);
    files = files.concat(results);
  });

  // We uniquify b/c it's possible to have the file registered twice,
  // since we ask package.json for whatever is in `bin`, so let's uniquify
  return _.unique(files.map(normalize));
};


/**
 * ## .listPkgDependencies()
 *
 * List the dependencies currently listed in
 * package.json
 *
 * @param {Object} `pkg` package.json object
 * @return {Array} Array of combined dependencies
 *
 * @api private
 */

lint.listPkgDependencies = function(options) {
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
 * ## .removeModules( arr, omit )
 *
 * @param {Array} `omit`  Array of dependencies to omit.
 * @param {Array} `arr`   Array of dependencies
 * @return {Array}
 */

lint.removeModules = function(arr, omit) {
  return _.difference(arr, omit);
};


/**
 * ## .listRequiredModules()
 *
 * List the required modules currently defined
 * in each javascript file.
 *
 * @return  {Array} Array of required modules
 * @api private
 */

lint.listRequiredModules = function(omit) {
  var req = [];

  lint.listFiles(omit).forEach(function(filepath) {
    var str = strip(file.readFileSync(filepath));
    req = req.concat(find.requiredModules(str), find.gruntTasks(str));
  });

  // Sort and remove an junk from the array
  req = _.unique(req).filter(Boolean).sort();
  return lint.removeModules(req, excluded.requiredModules);
};


lint.packageDeps = lint.listPkgDependencies;
lint.requiredModules = lint.listRequiredModules;