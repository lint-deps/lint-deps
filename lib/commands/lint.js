'use strict';

var path = require('path');
var utils = require('../utils');

module.exports = function(app) {
  return function(patterns) {
    app.lint(patterns);
  }
};
