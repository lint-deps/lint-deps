#!/usr/bin/env node

var pkg = require('../package');
var write = require('write-json');
var loadPkg = require('load-pkg');
console.log('Running lint-deps v' + pkg.version);

var utils = require('../lib/utils');
var tasks = require('../lib/tasks');
var LintDeps = require('..');
var spinner;

var argv = require('yargs')
  .usage('Usage: $0 <command> [options]')
  .option('upgrade', {
    describe: 'Update all deps to the latest version and clear out unused deps.'
  })
  .option('types', {
    alias: 't',
    describe: 'Specify the types of dependencies to lint',
    default: ['dependencies', 'devDependencies']
  })
  .option('why', {
    describe: 'Show a report that explains why the given module exists in your library.'
  })
  .option('deps', {
    alias: 'd',
    describe: 'Glob pattern for "dependencies" files'
  })
  .option('dev', {
    alias: 'e',
    describe: 'Glob pattern for "devDependencies" files'
  })
  .option('update', {
    alias: 'u',
    describe: 'Add missing deps and update all existing deps to the latest version.'
  })
  .option('verbose', {
    alias: 'v',
    describe: 'Enable verbose logging'
  })
  .help('h')
  .alias('h', 'help')
  .argv;

/**
 * Instantiate LintDeps and run tasks
 */

const cli = new LintDeps(argv);

cli.use(tasks(argv));
cli.build(argv._.length ? argv._ : ['default'])
  .then(() => {
    utils.log.ok('done');
    process.exit();
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
