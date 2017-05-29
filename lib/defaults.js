'use strict';

var fs = require('fs');
var path = require('path');
var findPkg = require('find-pkg');
var utils = require('./utils');

/**
 * Intialize LintDeps defaults. Visit the readme to learn how to
 * override defaults.
 */

module.exports = function(app) {

  /**
   * package.json
   */

  var pkgFile = findPkg.sync(app.cwd);
  var str = fs.readFileSync(pkgFile, 'utf8');
  var pkg = JSON.parse(str);
  var files = pkg.files || [];

  /**
   * Update cwd (when cwd is changed, an event is fired for logging)
   */

  var dir = path.dirname(pkgFile);
  if (dir !== app.cwd) {
    app.cwd = dir;
  }

  /**
   * Config
   */

  app.default('config', {
    types: ['global', 'home', 'local', 'cwd', 'pkg'],
    files: ['{.lintdepsrc,config}.{json,yml}']
  });

  /**
   * Prime options and patterns for:
   *   - matching modules
   *   - globbing files for each dependency type
   */

  var common = {
    alias: {},
    lock: {},
    modules: { whitelist: [], exclude: [] },
    files: {
      options: {
        nocase: true,
        cwd: app.cwd,
        ignore: [
          '**/_gh_pages/**',
          '**/dist/**',
          '**/{,test/}actual/**',
          '**/{,test/}fixtures/**',
          '**/node_modules/**',
          '**/temp/**',
          '**/tmp/**',
          '**/vendor/**'
        ]
      },
      patterns: []
    }
  };

  /**
   * Defaults for dependencies
   */

  app.default('dependencies', utils.merge({}, common, {
    files: {
      patterns: utils.union([], files.slice(), [
        'bin/*',
        'cli.js',
        'index.js',
        'app/**/*.js',
        'lib/**/*.js',
        'utils.js',

        // TODO: externalize special exceptions
        'generator.js',
        'updatefile.js'
      ])
    }
  }));

  /**
   * Defaults for devDependencies
   */

  app.default('devDependencies', utils.merge({}, common, {
    files: {
      patterns: [
        'assemblefile.js',
        'benchmark/*.js',
        'benchmark/code/**/*.js',
        'build/**/*.js',
        'examples/*.js',
        'example{,s}.js',
        'Gruntfile.js',
        'gulpfile.js',
        'test.js',
        'test/*.js',
        'test/support/*.js',
        'verbfile.js'
      ]
    }
  }));

  /**
   * Defaults for optionalDependencies and peerDependencies
   */

  app.default('optionalDependencies', utils.clone(common));
  app.default('peerDependencies', utils.clone(common));
};
