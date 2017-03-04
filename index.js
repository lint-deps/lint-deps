'use strict';

var fs = require('fs');
var path = require('path');
var del = require('delete');
var Enquirer = require('enquirer');
var enquirer = new Enquirer();
var utils = require('./lib/utils');
var actions = require('./lib/actions');
var prompts = require('./lib/prompts');
var plugins = require('./plugins');
var app = require('./lib/app');

/**
 * Help
 */

app.task('help', function() {
  return enquirer.ask('help');
});

/**
 * Requires
 */

app.task('requires', function() {
  return app.src(app.options.patterns, app.options)
    .pipe(plugins.stripComments())
    .pipe(plugins.requires(app))
    .on('end', function() {
      enquirer.use(prompts(app));
    })
});

/**
 * Delete node_modules
 */

app.task('fresh', function(cb) {
  // delete devDeps and deps, then node_modules
  del(path.join(app.cwd, 'node_modules'), cb);
});

/**
 * Delete dependencies from package.json
 */

app.task('update', function(cb) {
  var pkg = utils.extend({}, app.pkg.data);
  var obj = {};

  for (var key in pkg) {
    // strip all "*dependencies" properties
    if (pkg.hasOwnProperty(key) && !/dependencies/i.test(key)) {
      obj[key] = pkg[key];
    }
  }

  fs.writeFile(app.pkg.path, JSON.stringify(obj, null, 2), cb);
});

/**
 * Run plugins
 */

app.task('plugins', function(cb) {
  // console.log(app)
  cb();
});

/**
 * Prompts
 */

app.task('prompts', ['plugins'], function() {
  return enquirer.ask('installer')
    .then(ask('unused'))
    .then(ask('missing'))
    .then(ask('install'))
});

/**
 * Actions
 */

app.task('remove', function(cb) {
  actions.remove(app, cb);
});

app.task('install', function(cb) {
  actions.install(app, cb);
});

/**
 * Default task
 */

app.task('default', ['prompts', 'remove', 'install']);

function ask(name) {
  return function() {
    return enquirer.ask(name);
  }
}

/**
 * Expose `app`
 */

module.exports = app;
