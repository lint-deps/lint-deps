'use strict';

var path = require('path');
var lookup = require('look-up');

module.exports = path.dirname(lookup('package.json', {cwd: process.cwd()}));