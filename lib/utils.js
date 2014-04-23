const fs = require('fs');
const path = require('path');
const cwd = require('cwd');
const file = require('fs-utils');
const glob = require('globule');
const plasma = require('plasma');
const matchdep = require('matchdep');
const strip = require('strip-comments');
const _ = require('lodash');

const find = require('./find');
const excluded = require('./exclusions');
const pkgFile = path.resolve(cwd('package.json'));
const pkg = plasma(pkgFile);

// Omit assemble plugins
if (file.exists(cwd('.assemblerc.yml'))) {
  const plugins = plasma(cwd('.assemblerc.yml')).plugins;
  excluded.omit = excluded.omit.concat(plugins);
}

const utils = module.exports = {};


/**
 * Returns an array of directories, sans exclusions
 * @param   {String}  base  The base directory to start from.
 * @return  {Array}         array of directories
 * @api private
 */

utils.listDirs = function(base) {
  base = base || process.cwd();
  var dirs = [];

  fs.readdirSync(base).filter(function(filepath) {
    if (fs.statSync(filepath).isDirectory()) {
      return true;
    }
  }).filter(function(filepath) {
    return !_.contains(excluded.dirs, filepath);
  }).map(function(filepath) {
    dirs = dirs.concat(filepath);
  });
  return dirs;
};


/**
 * List the javascript files in each directory
 * @return  {Array}
 * @api private
 */

utils.listFiles = function () {
  var files = [];

  // Get files from the root directory, and from bin
  if (pkg.bin) {files.push(_.values(pkg.bin)[0]);}
  files.push(glob.find(['bin/*', '*.js'], {filter: 'isFile'}));

  // Search for javascript files in the provided directories
  utils.listDirs().map(function (filepath) {
    var options = {prefixBase: true, filter: 'isFile', cwd: filepath};
    files.push(glob.find(['**/*.js', 'bin/*'], options));
  });

  return _.flatten(files);
};


/**
 * List the dependencies currently listed in package.json
 * @param   {Object}  pkg  package.json object
 * @return  {Array}        Array of combined dependencies
 * @api private
 */

var deps = matchdep.filterAll(['*'], pkgFile);
if (_.contains(deps, 'load-grunt-tasks') || _.contains(deps, 'matchdep')) {
  excluded.omit = excluded.omit.concat(['grunt-']);
}

var omit = _.compact(_.flatten(excluded.omit)).join(',');
utils.listPkgDependencies = matchdep.filterAll(['*', '!verb', '!{'+omit+'}*'], pkgFile);


/**
 * List the required modules currently defined in each javascript file.
 * @return  {Array} Array of required modules
 * @api private
 */

utils.listRequires = function() {
  var requires = [];

  _.map(utils.listFiles(), function(filepath) {
    var str = strip(file.readFileSync(filepath));
    requires.push(find.requires(str));
    requires.push(find.tasks(str));
  });

  return _.unique(_.compact(_.flatten(requires))).filter(function(req) {
    return !_.contains(excluded.requires, req);
  });
};

utils.removeDeps = function(arr, omit) {
  return _.difference(arr, omit);
};


utils.deps = utils.listPkgDependencies;
utils.requires = utils.listRequires();
