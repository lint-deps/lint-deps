#!/usr/bin/env node

var LintDeps = require('./');
var lintDeps = new LintDeps(argv);

var argv = require('minimist')(process.argv.slice(2), {
  alias: {verbose: 'v'}
});

function run(cb) {
  var env = {};
  env.cwd = argv.cwd ? path.resolve(cwd) : process.cwd();

  if (env.cwd !== process.cwd()) {
    process.chdir(cwd);
    env.cwd = process.cwd();
  }


  cb(null, env);
}


run(function(err, env) {

});
