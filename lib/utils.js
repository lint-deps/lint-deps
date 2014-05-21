const file = require('fs-utils');
const utils = module.exports = {};

/**
 * Normalize filepaths
 * @param   {String}  str
 * @return  {String}
 */

utils.normalize = function(str) {
  str = str.replace(/\\/g, '/');
  return str.replace(/^\.[\/\\]?/, '');
};

/**
 * Is the filepath a directory?
 * @param   {String} filepath
 * @return  {Boolean}
 */

utils.isDir = function(filepath) {
  return file.isDir(filepath);
};