'use strict';

var utils = require('../utils');

module.exports = function(app) {
  return function(fp) {
    console.log('cli > init (implement me!)');
    app.enable('questions.options.forceAll');
  };
};
