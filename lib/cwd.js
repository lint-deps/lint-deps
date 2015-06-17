'use strict';

var fs = require('fs');
var path = require('path');
var lookup = require('look-up');
var fp = lookup('package.json', {cwd: process.cwd()});
module.exports = path.dirname(fp);