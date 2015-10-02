'use strict';

/**
 * Allow custom matchers to be defined
 */

var gruntRe = /grunt\.loadNpmTasks\(['"]([^'"]+?)['"]\)/;
var htmlRe = /<!--\s*(?:require|deps):((?:[^-]+|-[^-]+)*?)-->/;
var lazyRe = /(?:^|\s)lazy\(['"]([^'"]+?)['"]/;


module.exports = function customMatchers(str, matchers) {
  matchers = !Array.isArray(matchers) ? [matchers] : matchers;
  matchers = matchers.concat([gruntRe, htmlRe, lazyRe]);

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
    var m = match[1].trim();
    if (/[ \t]/.test(m)) {
      res.push.apply(res, m.split(/[ \t]/).map(addModule));
    } else {
      res.push({module: m});
    }
  }
  return res.length ? res : null;
}

function addModule(name) {
  return {module: name};
}