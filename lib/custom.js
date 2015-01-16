'use strict';

/**
 * Allow custom matchers to be defined
 */

var gruntRe = /grunt\.loadNpmTasks\(['"]([^(]*?)['"]\)/


module.exports = function customMatchers(str, matchers) {
  matchers = !Array.isArray(matchers) ? [matchers] : matchers;
  matchers.unshift(gruntRe);

  var len = matchers.length;
  var res = [];
  var i = 0;

  while (len--) {
    res.push.apply(res, getMatches(str, matchers[i++]));
  }

  return res;
};


function getMatches(str, re) {
  var res = [], match;
  while (match = re.exec(str)) {
    str = str.replace(match[0], '');
    res.push({module: match[1]});
  }
  return res.length ? res : null;
}