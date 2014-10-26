'use strict';

var file = require('fs-utils');
var utils = module.exports = {};

/**
 * Normalize filepaths
 * @param   {String}  str
 * @return  {String}
 */

utils.normalize = function(str) {
  return str
    .replace(/\\/g, '/')
    .replace(/^\.[\/\\]?/, '');
};

/**
 * Is the filepath a directory?
 * @param   {String} filepath
 * @return  {Boolean}
 */

utils.isDir = function(filepath) {
  return file.isDir(filepath);
};