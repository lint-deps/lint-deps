const path = require('path');
const Deps = require('..');
const deps = new Deps({ verbose: true });
const file = deps.toFile(path.join(__dirname, '../index.js'));
console.log(file);
