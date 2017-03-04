#!/usr/bin/env node

var ok = require('log-ok');
var argv = require('yargs-parser')(process.argv.slice(2));
var app = require('..');
var tasks = argv._.length ? argv._ : ['default'];

if (tasks.length !== 1 || (tasks[0] !== 'update' && tasks[0] !== 'fresh')) {
  if (tasks.indexOf('requires') === -1) {
    tasks.unshift('requires');
  }
  if (argv.fresh) {
    tasks.unshift('fresh', 'update');
  }
}

app.build(tasks, function(err) {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  ok('done');
  process.exit();
});
