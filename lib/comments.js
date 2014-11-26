'use strict';

var debug = require('debug')('lint-deps:comments');

var a = /\/\*\s*deps:/;
var b = /\*\/|$/;

module.exports = function comments(str) {
  debug('comments');
  if (!str) {
    return [];
  }

  str = str.replace(/\r/g, '');
  var lines = str.split(/\n/);
  var len = lines.length;
  var i = 0;

  debug('comments [len]: ', len);

  var isComment = false;
  var comment = [];

  while (len--) {
    var line = lines[i++];
    debug('comments [line]: ', i)

    if (a.test(line)) {
      isComment = true;
    }

    if (typeof line === 'string' && isComment) {
      comment.push(line.trim());
    }

    if (b.test(line)) {
      isComment = false;
    }
  }

  return comment;
};