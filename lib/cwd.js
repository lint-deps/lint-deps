'use strict';

var fs = require('fs');
var path = require('path');
var findPkg = require('find-pkg');
module.exports = path.dirname(findPkg.sync(process.cwd()));
