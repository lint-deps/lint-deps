const _ = require('lodash');

module.exports = function generateAnswers (answer) {
  var deps = answer.dependencies;
  var devDeps = answer.devDependencies;

  var cmd = [], a = [], b = [], c = [];
  if (deps.length > 0) {
    a = _.union(['npm install'], deps, ['--save']);
  }
  if (devDeps.length > 0) {
    c = _.union(['npm install'], devDeps, ['--save-dev']);
  }
  if (deps.length > 0 && devDeps.length > 0) {
    b = ['&&'];
  }

  cmd = cmd.concat(a, b, c);
  return cmd.join(' ');
};