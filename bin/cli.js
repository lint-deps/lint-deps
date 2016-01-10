#!/usr/bin/env node

var Deps = require('..');
var deps = new Deps(argv);

var expand = require('expand-args');
var argv = require('minimist')(process.argv.slice(2), {
  alias: {verbose: 'v'}
});

var isEmpty = Object.keys(argv).length === 1 && argv._.length === 0;
if (isEmpty) {
  deps.enable('lint');
}

/**
 * Init questions
 */

deps.questions
  .set('init.config', 'Would you like to setup your global lint-deps config?');

/**
 * Set `argv` on the instance
 */

deps.set('argv', expand(argv));

/**
 * If `--ask` or `--init` is passed, ask init questions
 */

if (deps.option('questions.init')) {
  deps.ask('init', function(err, answers) {
    console.log(answers)
  });
}
