#!/usr/bin/env node

const path = require('path');
const find = require('find-pkg');
const colors = require('ansi-colors');
const tasks = require('../lib/tasks');
const utils = require('../lib/utils');
const pkg = require('../package');
const LintDeps = require('..');

const ORIGINAL_CWD = process.cwd();
const cwd = path.dirname(find.sync(process.cwd()));
if (cwd !== ORIGINAL_CWD) {
  process.chdir(cwd);
  process.on('exit', () => process.chdir(ORIGINAL_CWD));
}

const argv = require('yargs')
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
    describe: 'Show a report that explains why the given module exists in your library. Use npm ls to see where a module exists in your dependency tree.'
  })
  .option('deps', {
    alias: 'd',
    describe: 'Add a glob pattern to package.json "lintDeps" config for "dependencies" files'
  })
  .option('dev', {
    alias: 'e',
    describe: 'Add a glob pattern to package.json "lintDeps" config for "devDependencies" files'
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
  .alias('help', 'h')
  .argv;

/**
 * Instantiate LintDeps and run tasks
 */

console.log('Running lint-deps v' + pkg.version);

const cli = new LintDeps(argv);

cli.use(tasks(argv));
cli.build(argv._.length ? argv._ : ['default'])
  .then(() => {
    console.log(colors.green(colors.symbols.check), 'done');
    process.exit();
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
