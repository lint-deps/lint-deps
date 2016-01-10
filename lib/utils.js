'use strict';

/**
 * Module dependencies
 */

var utils = require('lazy-cache')(require);
var fn = require;
require = utils;

/**
 * Module dependencies
 */

require('base-cli', 'cli');
require('base-config', 'config');
require('base-plugins', 'plugin');
require('extend-shallow', 'extend');
require('get-value', 'get');
require('has-glob');
require('match-requires');
require('matched', 'glob');
require('micromatch', 'mm');
require('minimist');
require('strip-comments', 'strip');
require('to-file');
require('union-value', 'union');

/**
 * Restore `require`
 */

require = fn;

/**
 * Cast val to an array
 */

utils.arrayify = function arrayify(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
};

/**
 * Expose `utils` modules
 */

module.exports = utils;
