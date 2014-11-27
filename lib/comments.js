'use strict';

var debug = require('debug')('lint-deps:comments');
var extract = require('esprima-extract-comments');
var _ = require('lodash');

module.exports = function(str, options) {
  debug('comments');
  if (!str) {
    return [];
  }

  str = str.replace(/#!\/usr[\s\S]+?\n/, '');
  var opts = _.extend({ safe: false }, options);
  var comment = ['empty'];

  try {
    var comments = extract.fromString(str);
    var len = comments.length;
    var i = 0;

    while (i < len) {
      var obj = comments[i++];

      if (obj.type === 'Block') {
        comment.push(obj.value.replace(/\*\s+/, ''));
      }
    }
  } catch(err) {
    if (opts.silent) return;
    console.log(err);
    throw err;
  }

  return comment;
};