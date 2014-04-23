const fs = require('fs');
const file = require('fs-utils');
const glob = require('globule');
const plasma = require('plasma');
const strip = require('strip-comments');
const _ = require('lodash');

const find = require('./find');
const excluded = require('./exclusions');
const pkg = plasma('package.json');



/**
 * Returns an array of directories, sans exclusions
 * @param   {String}  base  The base directory to start from.
 * @return  {Array}         array of directories
 * @api private
 */

var listDirs = function(base) {
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

var listFiles = function () {
  var files = [];

  // Get files from the root directory, and from bin
  if (pkg.bin) {files.push(_.values(pkg.bin)[0]);}
  files.push(glob.find(['bin/*', '*.js'], {filter: 'isFile'}));

  // Search for javascript files in the provided directories
  listDirs().map(function (filepath) {
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

var listPkgDependencies = function(pkg) {
  var types = ['dependencies', 'devDependencies', 'peerDependencies'];
  return _.flatten(_.map(types, function (type) {
    return _.keys(pkg[type]);
  }));
};


/**
 * List the required modules currently defined in each javascript file.
 * @return  {Array} Array of required modules
 * @api private
 */

var listRequires = function() {
  var requires = [];

  _.map(listFiles(), function(filepath) {
    var str = strip(file.readFileSync(filepath));
    requires.push(find.requires(str));
    requires.push(find.tasks(str));
  });

  return _.unique(_.compact(_.flatten(requires))).filter(function(req) {
    return !_.contains(excluded.requires, req);
  });
};


exports.deps = listPkgDependencies(pkg);
exports.requires = listRequires();
