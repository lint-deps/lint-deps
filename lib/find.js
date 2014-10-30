'use strict';

var re = require('requires-regex')();


exports.requires = function(str, options) {
  var res = [];
  var match;

  while (match = re.exec(str)) {
    res = res.concat(match[3]);
    str = str.replace(match[0], '');
  }

  return res;
};