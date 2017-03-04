'use strict';

var through = require('through2');
var utils = require('../lib/utils');

module.exports = function() {
  return through.obj(function(file, enc, next) {
    if (file.extname !== '.js') {
      next(null, file);
      return;
    }

    if (file.isNull()) {
      next(null, file);
      return;
    }

    var str = file.contents.toString();
    // strip hash-bang from b-o-s and quoted strings
    // (in unit tests etc)
    str = str.replace(/#!\/usr[^\n'",]+/gm, '');
    str = str.replace(/^\s*\/\/[^\n]+/gm, '');

    try {
      str = utils.stripComments(str);
    } catch (err) {
      console.log('esprima parsing error in: ' + file.path);
    }

    file.contents = new Buffer(str);
    next(null, file);
  });
};
