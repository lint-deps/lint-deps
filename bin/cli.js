#!/usr/bin/env node

const path = require('path');
const find = require('find-pkg');
const colors = require('ansi-colors');
const tasks = require('../lib/tasks');
const utils = require('../lib/utils');
const pkg = require('../package');
const LintDeps = require('..');
const nano = arr => arr[0] * 1e9 + arr[1];
const ms = nano => nano / 1e6;

const ORIGINAL_CWD = process.cwd();
const rootDir = find.sync(process.cwd());

if (!rootDir) {
  throw new Error('Cannot find package.json');
}

// TODO: prompt to create package.json when it doesn't exist
const cwd = path.dirname(rootDir);
const start = process.hrtime();

if (cwd !== ORIGINAL_CWD) {
  process.chdir(cwd);
  process.on('exit', () => process.chdir(ORIGINAL_CWD));
}

const argv = require('yargs')
  .usage('Usage: $0 <command> [options]')
  .option('upgrade', {
    describe: 'Update all deps to the latest version and clear out unused deps.'
  })
  .option('add', {
    alias: 'a',
    describe: 'Add a glob pattern to package.json "lintDeps" config'
  })
  .option('deps', {
    alias: 'd',
    describe: 'Add a glob pattern to package.json "lintDeps" config for "dependencies" files'
  })
  .option('dev', {
    alias: 'e',
    describe: 'Add a glob pattern to package.json "lintDeps" config for "devDependencies" files'
  })
  .option('types', {
    alias: 't',
    describe: 'Specify the types of dependencies to lint',
    default: ['dependencies', 'devDependencies']
  })
  .option('why', {
    describe: 'Show a report that explains why the given module exists in your library. Use npm ls to see where a module exists in your dependency tree.'
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

if (argv.why) {
  argv._.push('why', argv.why);
  delete argv.why;
}

/**
 * Instantiate LintDeps and run tasks
 */

console.log('Running lint-deps v' + pkg.version);

const cli = new LintDeps(argv);

cli.use(tasks(argv));
cli.build(argv._.length ? argv._ : ['default'])
  .then(() => {
    let total = Number(ms(nano(process.hrtime(start)))).toFixed(0) + 'ms';
    console.log(colors.green(colors.symbols.check), 'done in', total);
    process.exit();
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
