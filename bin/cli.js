#!/usr/bin/env node

var Deps = require('..');
var deps = new Deps(argv);

var expand = require('expand-args');
var argv = require('minimist')(process.argv.slice(2), {
  alias: {verbose: 'v'}
});

deps.set('argv', expand(argv));
// deps.cli.process(deps.get('argv'));

console.log(deps)
// function run(cb) {
//   cb(null, {});
// }

// run(function(err, env) {

// });
