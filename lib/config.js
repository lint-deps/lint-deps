'use strict';

const path = require('path');
const Config = require('merge-configs');
const xdg = require('@folder/xdg');

module.exports = function(options) {
  const gm = require('global-modules');
  const config = new Config();
  const paths = xdg({ expanded: true, platform: 'linux', subdir: 'lint-deps' });
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
    patterns: ['config.{json,yaml,yml}', 'index.js'],
    options: { cwd: paths.config.home }
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
    load: file => file.data && (file.data.lintDeps || file.data['lint-deps'])
  });

  config.merged = config.merge();
  config.js = js;
  return config;
};
