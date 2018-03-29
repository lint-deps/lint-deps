'use strict';

const path = require('path');
const home = require('homedir-polyfill');
const gm = require('global-modules');

module.exports = function() {
  this.type('cwd', {
    patterns: ['.lintdeps.{json,yaml,yml}']
  });

  this.type('package', {
    patterns: ['package.json'],
    load: file => file.data.verb
  });

  this.type('local', {
    patterns: ['lint-deps-config-*/.lintdeps.{json,yaml,yml}'],
    options: {
      cwd: path.join(process.cwd(), 'node_modules')
    }
  });

  this.type('global', {
    patterns: ['lint-deps-config-*/*.{json,yaml,yml}'],
    options: { cwd: gm }
  });

  this.type('home', {
    patterns: ['.lintdeps.{json,yaml,yml}'],
    options: { cwd: home() }
  });
};
