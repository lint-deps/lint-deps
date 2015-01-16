#!/usr/bin/env node

'use strict';

process.title = 'lint-deps';

var chalk = require('chalk');
var wrap = require('word-wrap');
var argv = require('minimist')(process.argv.slice(2));
var spawn = require('spawn-commands');
var filter = require('filter-object');
var symbol = require('log-symbols');
var inquirer = require('inquirer');
var writeJson = require('write-json');
var pkg = require('load-pkg');
var log = require('verbalize');

var question = require('./lib/question');
var answers = require('./lib/answers');
var deps = require('./');

var dir = argv.d || argv.dir || '.';
var exc = argv.e || argv.exclude;
var omit = argv.o || argv.omit;
var clean = argv.c || argv.clean;
var omitdev = argv.m || argv.omitdev;
var report = argv.r || argv.report;

if (omit) {
  if (pkg.hasOwnProperty('dependencies')) {
    pkg.dependencies = filter(pkg.dependencies, ['*', '!' + omit]);
    writeJson('package.json', pkg);
  }
}

if (omitdev) {
  if (pkg.hasOwnProperty('devDependencies')) {
    pkg.devDependencies = filter(pkg.devDependencies, ['*', '!' + omitdev]);
    writeJson('package.json', pkg);
  }
}

function requires(dir, exclude) {
  var exclusions = exclude && exclude.split(',').filter(Boolean);
  return deps(dir, exclusions);
}

var res = requires(dir, exc);
if (report) {
  if (report === true) {
    report = 'report.json';
  }
  if (!/\./.test(report)) {
    report = report + '.json';
  }
  writeJson(report, res);
  log.success('\n  Report written to: ' + report);
  process.exit(0);
}

function format(results) {
  console.log();
  console.log('  Files scanned:');

  var keys = Object.keys(results);
  if (keys.length === 0) return '';

  return keys.map(function(key) {
    var value = results[key];
    var missing = value.missing;
    var check = symbol.success;

    if (missing.length > 0) {
      check = symbol.error + chalk.gray('  (' + missing.join(', ') + ')');
    }
    return console.log(log.bold('    · ') + key + ' ' + check);
  });
}

format(res.report.files);

// excludeDirs
var notused = res.notused;
var missing = res.missing;

if (clean) {
  var omit = notused.map(function (dep) {
    return '!' + dep;
  });

  if (pkg.hasOwnProperty('dependencies')) {
    pkg.dependencies = filter(pkg.dependencies, ['*'].concat(omit));
  }
  if (pkg.hasOwnProperty('devDependencies')) {
    pkg.devDependencies = filter(pkg.devDependencies, ['*'].concat(omit));
  }
  writeJson('package.json', pkg);
}

// Prompts
function unusedPackages() {
  console.log();
  console.log(log.bold(wrap(notused.length + ' unused packages found: ')) + '\'' + notused.join('\', \'') + '\'');
  console.log();
  console.log(log.gray(wrap('This tool doesn\'t remove dependencies, you\'ll have to do that manually.')));
  console.log('  ---');
}

function missingPackages() {
  console.log();
  log.error('  ' + missing.length + ' missing packages found:', wrap('\'' + missing.join('\', \'') + '\''));
  console.log();
}

// inform the user if package.json has deps
// that don't appear to be necessary,
if(notused.length > 0) {
  unusedPackages();
}

if(missing.length === 0) {
  // Inform the user if all packages appear to be installed
  log.success('\n  All packages appear to be listed. OK!');
} else {

  // If packages appear to be missing, inform the user, and
  // ask them to choose where they would like them to be
  // installed.
  missingPackages();
  var prompts = [];

  prompts.push({
    type: "confirm",
    name: 'install',
    message: log.bold('Want to select packages to install?'),
    default: false
  });

  // Generate questions based on missing deps.
  prompts = prompts.concat(question(missing, inquirer));

  // Generate the list of missing dependencies
  // to allow the user to select which ones to
  // install
  inquirer.prompt(prompts, function (answer) {
    if(answer.install === true) {
      spawn(answers(answer));
    } else {
      log.success('\n  Got it. All is good.');
      process.exit(0);
    }
  });
}
