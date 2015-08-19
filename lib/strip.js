'use strict';

/**
 * temporarily use regex based on
 * https://github.com/tunnckoCore/code-comments-regex/blob/master/lib/block.js
 */

var re = /(?:^|\s)(?:\/\*(?!\*?\/)([\s\S]+?)\*\/)/;

module.exports = function strip(str) {
  var match;
  while (match = re.exec(str)) {
    str = str.replace(match[1], '');
  }
  while (match = /(\/{2}[^\n]+)/.exec(str)) {
    str = str.replace(match[1], '');
  }
  return str;
};
