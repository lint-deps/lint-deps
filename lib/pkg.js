'use strict';

var find = require('find-pkg');
module.exports = find.sync(process.cwd());
