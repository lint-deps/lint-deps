'use strict';

const os = require('os');
const path = require('path');
const Config = require('merge-configs');
const gm = require('global-modules');

module.exports = function(options) {
  const config = new Config();
  const js = [];

  config.loader('js', (file, obj) => {
    const files = obj.files.filter(file => file.extname === '.js');
    if (files.length >= 1) {
      js.push(file.path);
    }
  });

  config.type('global', {
    patterns: ['lint-deps-*/.lintdeps.{json,yaml,yml}', 'lint-deps-*/{index,lintfile}.js'],
    options: { cwd: gm }
  });

  config.type('home', {
    patterns: ['.lint-deps/.lintdeps.{json,yaml,yml}', '.lint-deps/{index,lintfile}.js'],
    options: { cwd: os.homedir() }
  });

  config.type('local', {
    patterns: ['lint-deps-*/.lintdeps.{json,yaml,yml', '{index,lintfile}.js'],
    options: { cwd: path.join(process.cwd(), 'node_modules') }
  });

  config.type('cwd', {
    patterns: ['.lintdeps.{json,yaml,yml}', 'lintfile.js']
  });

  config.type('package', {
    patterns: ['package.json'],
    load: file => file.data && file.data.lintDeps
  });

  config.merged = config.merge();
  config.js = js;
  return config;
};
