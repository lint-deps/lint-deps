#!/usr/bin/env node

'use strict';

process.title = 'lint-deps';

var wrap = require('word-wrap');
var argv = require('minimist')(process.argv.slice(2));
var inquirer = require('inquirer');
var write = require('write');
var log = require('verbalize');

var question = require('../lib/question');
var answers = require('../lib/answers');
var spawn = require('../lib/spawn');
var deps = require('..');


var dir = argv.d || argv.dir || '.';
var exc = argv.e || argv.exclude;
var report = argv.r || argv.report;

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
  write.sync(report, JSON.stringify(res, null, 2));
  log.success('\n  Report written to: ' + report);
  process.exit(0);
}

// excludeDirs
var notused = res.notused;
var missing = res.missing;

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
  prompts = prompts.concat(question(missing));

  // Generate the list of missing dependencies
  // to allow the user to select which ones to
  // install
  inquirer.prompt(prompts, function (answer) {
    if(answer.install === true) {
      spawn([answers(answer)]);
    } else {
      log.success('\n  Got it. All is good.');
      process.exit(0);
    }
  });
}
