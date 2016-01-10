'use strict';

var path = require('path');
var utils = require('../utils');

module.exports = function(app) {
  return function(cwd) {
    var cwd = path.resolve(cwd);
    if (cwd !== process.cwd()) {
      process.chdir(cwd);
      cwd = process.cwd();
    }
    app.option('cwd', cwd);
  }
};
