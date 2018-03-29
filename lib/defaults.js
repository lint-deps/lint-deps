'use strict';

var fs = require('fs');
var path = require('path');
var isValid = require('is-valid-app');
var findPkg = require('find-pkg');
var utils = require('./utils');

/**
 * Intialize LintDeps defaults. Visit the readme to learn how to
 * override defaults.
 */

module.exports = function(options) {
  options = options || {};

  return function(app) {
    if (!isValid(app, 'lint-deps-defaults')) return;
    app.option(options);

    /**
     * package.json
     */

    var pkgPath = findPkg.sync(app.cwd);
    if (!pkgPath) {
      console.log('no package.json');
      process.exit(1);
    }

    var str = fs.readFileSync(pkgPath, 'utf8');
    var pkg = JSON.parse(str);
    var files = pkg.files || [];

    /**
     * Update cwd (when cwd is changed, an event is fired for logging)
     */

    var dir = path.dirname(pkgPath);
    if (dir !== app.cwd) {
      app.cwd = dir;
    }

    /**
     * Config
     */

    app.default('config', {
      types: ['global', 'home', 'local', 'cwd', 'pkg'],
      files: ['{.lintdeps,config}.{json,yml}', '*.js'],
      filter: function(file) {
        var ext = file.extname;
        if (ext === '.json' || ext === '.yaml' || ext === '.yml') {
          return true;
        }
        return path.basename(file.path) === 'lintfile.js';
      }
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

    app.option('dependencies', utils.merge({}, common, {
      files: {
        patterns: utils.union([], files.slice(), [
          'bin/*',
          'cli.js',
          'index.js',
          '{app,lib,src}/**/*.js',
          'utils.js',

          // TODO: externalize
          'updatefile.js',
          'generator.js'
        ])
      }
    }));

    /**
     * Defaults for devDependencies
     */

    app.option('devDependencies', utils.merge({}, common, {
      files: {
        patterns: [
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

          // TODO: externalize
          'lintdeps.js',
          'assemblefile.js',
          'verbfile.js'
        ]
      }
    }));

    /**
     * Defaults for optionalDependencies and peerDependencies
     */

    app.option('optionalDependencies', utils.clone(common));
    app.option('peerDependencies', utils.clone(common));
  };
};
