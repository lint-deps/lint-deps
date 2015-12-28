#!/usr/bin/env node

'use strict';

process.title = 'lint-deps';

/**
 * Module dependencies
 */

var path = require('path');
var omit = require('object.omit');
var wrap = require('word-wrap');
var gray = require('ansi-gray');
var extend = require('extend-shallow');
var argv = require('minimist')(process.argv.slice(2));
var spawn = require('spawn-commands');
var filter = require('filter-object');
var symbol = require('log-symbols');
var inquirer2 = require('inquirer2');
var writeJson = require('write-json');
var pkg = require('load-pkg').sync(process.cwd());
var log = require('verbalize');

/**
 * Local dependencies
 */

var cwd = require('./lib/cwd');
var utils = require('./lib/utils');
var question = require('./lib/question');
var answers = require('./lib/answers');
var deps = require('./');

var options = {};
options.dir         = path.resolve(cwd, argv.d || argv.dir || '.');
options.only        = argv.only || [];
options.files       = argv.files || [];
options.clean       = argv.c || argv.clean;
options.ignore      = argv.i || argv.ignore || [];
options.report      = argv.r || argv.report;
options.missingOnly = argv.m || argv.missing;

var res = deps(options.dir, extend(argv, options));

var report = options.report;
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

function formatEach(results) {
  console.log();
  console.log('  Files scanned:');

  var keys = Object.keys(results);
  if (keys.length === 0) return '';

  return keys.reduce(function(acc, key) {
    var value = results[key];
    var missing = value.missing;
    var check = symbol.success;

    if (missing.length > 0) {
      check = symbol.error + gray('  (' + missing.join(', ') + ')');
      if (options.missingOnly) {
        return acc.concat(format(key, check));
      }
    }
    return acc.concat(format(key, check));
  }, []);
}

function format(key, check) {
  return log.bold('    · ') + key + ' ' + check;
}

formatEach(res.report.files).forEach(function (ele) {
  console.log(ele);
});

// excludeDirs
var notused = res.notused;
var missing = res.missing;

if (options.clean) {
  if (pkg.dependencies) {
    pkg.dependencies = omit(pkg.dependencies, notused);
  }
  if (pkg.devDependencies) {
    pkg.devDependencies = omit(pkg.devDependencies, notused);
  }
  writeJson.sync('package.json', pkg);
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

  var inquirer = inquirer2();

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
