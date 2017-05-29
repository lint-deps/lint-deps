'use strict';

var utils = require('./lib/utils');
var File = require('vinyl');
var LintDeps = require('./');
var app = new LintDeps({verbose: true});

var a = app.toFile(new File({path: 'index.js'}));
var b = app.toFile(new File({path: 'lib/utils.js'}));
var c = app.toFile(new File({path: 'lib/defaults.js'}));

var report = app.lint('devDependencies', 'gulpfile.js');
var report = app.lint('devDependencies', [a, b, c]);
console.log(report.devDependencies)

var res = app.why('gulp');
console.log(res)
