#!/usr/bin/env node

'use strict';

process.title = 'lint-deps';

var cwd = require('cwd');
var wrap = require('word-wrap');
var argv = require('minimist')(process.argv.slice(2));
var log = require('verbalize');
var _ = require('lodash');

var generateCommand = require('../lib/answers');
var question = require('../lib/question');
var prompt = require('../lib/prompt');
var spawn = require('../lib/spawn');
var lint = require('../lib/lint');

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


// Update the list of required modules, excluding omissions
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

// inform the user if package.json has deps
// that don't appear to be necessary,
if(notRequired.length > 0) {
  unusedPackages();
}

if(missingDeps.length === 0) {
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
    message: log.bold('Want to install? (you can choose which packages)'),
    default: false
  });

  // Generate questions based on missing deps.
  prompts = prompts.concat(question(missingDeps));

  // Actually prompt the user, using questions
  // generated based on missing dependencies.
  prompt(prompts, function (answers) {
    if(answers.install === true) {
      spawn([generateCommand(answers)]);
    } else {
      log.success('\n  Got it. All is good.');
      process.exit(0);
    }
  }.bind(this));
}
