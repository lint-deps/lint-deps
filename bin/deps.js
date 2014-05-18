#!/usr/bin/env node

process.title = 'lint-deps';

const cwd = require('cwd');
const wrap = require('word-wrap');
const argv = require('minimist')(process.argv.slice(2));
const log = require('verbalize');
const _ = require('lodash');

const spawn = require('../lib/spawn');
const question = require('../lib/question');
const generateCommand = require('../lib/answers');
const prompt = require('../lib/prompt');
const lint = require('../lib/lint');

/**
 * ## -e
 *
 * Comma-separated list of directories to exlude
 *
 * **Example**
 *
 * ```bash
 * deps -e test
 * ```
 * or
 *
 * ```bash
 * deps -e test,lib
 * ```
 */

var exclusions = argv.e || argv.exclude || '';

var requiredModules = function() {
  var userOmissions = exclusions.split(',').filter(Boolean);
  return lint.requiredModules(userOmissions);
};

// excludeDirs
var notRequired = _.difference(lint.packageDeps(), requiredModules());
var missingDeps = _.difference(requiredModules(), lint.packageDeps());

// Prompts
function unusedPackages() {
  console.log();
  console.log(log.bold(wrap(notRequired.length + ' unused packages found: ')) + '\'' + notRequired.join('\', \'') + '\'');
  console.log();
  console.log(log.gray(wrap('This tool doesn\'t remove dependencies, you\'ll have to do that manually.')));
  console.log('  ---');
}

function missingPackages() {
  console.log();
  log.error('  ' + missingDeps.length + ' missing packages found:', wrap('\'' + missingDeps.join('\', \'') + '\''));
  console.log();
}

if(notRequired.length > 0) {
  unusedPackages();
}

if(missingDeps.length === 0) {
  log.success('\n  All packages appear to be listed. OK!');
} else {
  missingPackages();
  var prompts = [];

  prompts.push({
    type: "confirm",
    name: 'install',
    message: log.bold('Want to install and add to package.json?'),
    default: false
  });

  // Generate questions based on missing deps.
  prompts = prompts.concat(question(missingDeps));

  prompt(prompts, function (answers) {
    if(answers.install === true) {
      spawn([generateCommand(answers)]);
    } else {
      log.success('\n  Got it. All is good.');
      process.exit(0);
    }
  }.bind(this));
}
