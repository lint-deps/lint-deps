'use strict';

var fs = require('fs');
var path = require('path');
var load = require('load-pkg');
module.exports = path.dirname(load.sync(process.cwd()));
