#!/usr/bin/env node

'use strict';

process.title = 'lint-deps';

var cwd = require('cwd');
var wrap = require('word-wrap');
var argv = require('minimist')(process.argv.slice(2));
var inquirer = require('inquirer');
var log = require('verbalize');
var _ = require('lodash');

var generateCommand = require('../lib/answers');
var question = require('../lib/question');
var spawn = require('../lib/spawn');
var lint = require('..');


var dir = argv.d || argv.dir || '.';
var exc = argv.e || argv.exclude || '';
var pattern = argv.p || argv.pattern || '';


function requires(dir, exclude) {
  var exclusions = exclude && exclude.split(',').filter(Boolean);
  return lint(dir, exclusions);
}

console.log(requires(dir))

// var deps = lint(pattern);
// var reqs = requires(dir, exc);

// // excludeDirs
// var notused = _.difference(deps, reqs);
// var missing = _.difference(reqs, deps);


// // Prompts
// function unusedPackages() {
//   console.log();
//   console.log(log.bold(wrap(notused.length + ' unused packages found: ')) + '\'' + notused.join('\', \'') + '\'');
//   console.log();
//   console.log(log.gray(wrap('This tool doesn\'t remove dependencies, you\'ll have to do that manually.')));
//   console.log('  ---');
// }

// function missingPackages() {
//   console.log();
//   log.error('  ' + missing.length + ' missing packages found:', wrap('\'' + missing.join('\', \'') + '\''));
//   console.log();
// }

// // inform the user if package.json has deps
// // that don't appear to be necessary,
// if(notused.length > 0) {
//   unusedPackages();
// }

// if(missing.length === 0) {
//   // Inform the user if all packages appear to be installed
//   log.success('\n  All packages appear to be listed. OK!');
// } else {

//   // If packages appear to be missing, inform the user, and
//   // ask them to choose where they would like them to be
//   // installed.
//   missingPackages();
//   var prompts = [];

//   prompts.push({
//     type: "confirm",
//     name: 'install',
//     message: log.bold('Want to install? (you can choose which packages)'),
//     default: false
//   });

//   // Generate questions based on missing deps.
//   prompts = prompts.concat(question(missing));

//   // Actually prompt the user, using questions
//   // generated based on missing dependencies.
//   inquirer.prompt(prompts, function (answers) {
//     if(answers.install === true) {
//       spawn([generateCommand(answers)]);
//     } else {
//       log.success('\n  Got it. All is good.');
//       process.exit(0);
//     }
//   }.bind(this));
// }
