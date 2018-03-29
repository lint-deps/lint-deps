'use strict';

const File = require('vinyl');
const Deps = require('..');
const deps = new Deps({ verbose: true });

const a = deps.toFile(new File({ path: 'index.js' }));
const b = deps.toFile(new File({ path: 'lib/utils.js' }));
const c = deps.toFile(new File({ path: 'lib/defaults.js' }));

// const report = deps.lint('devDependencies', 'gulpfile.js');
const report = deps.lint('devDependencies', [a, b, c]);
// console.log(report.devDependencies);

const res = deps.why('gulp');
console.log(res);
