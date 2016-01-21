'use strict';

var find = require('find-pkg');
var pkg;
module.exports = pkg || (pkg = find.sync(process.cwd()));
