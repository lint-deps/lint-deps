'use strict';

var defaults = require('./defaults');
var argv = require('yargs-parser')(process.argv.slice(2));
var questions = require('base-questions');
var ignore = require('base-ignore');
var option = require('base-option');
var yarn = require('base-yarn');
var npm = require('base-npm');
var pkg = require('base-pkg');
var App = require('base-app');

module.exports = new App()
  .use(questions())
  .use(option())
  .use(ignore())
  .use(yarn())
  .use(npm())
  .use(pkg())
  .use(function() {
    this.cache.requires = { npm: [] };
    this.cache.missing = { all: [] };
    this.cache.unused = { all: [] };
    this.cache.files = {};
    this.option(argv);
    this.option(defaults(this, argv));
    this.enable('silent');
  });
