'use strict';

var paths = require('../paths');

module.exports = function() {
  return paths('lintDeps', {
    keys: ['global', 'home', 'local', 'cwd'],
    repo: `{lintdeps,}`,
  });
};
