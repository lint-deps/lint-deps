const _ = require('lodash');

/**
 * Generate the command line arguments to be used,
 * based on the answers provided by the user.
 *
 * This can easily be abstracted more, but I
 * prefer to keep the logic more transparent to
 * the developer (well lol, IMO)
 */

module.exports = function generateAnswers (answer) {
  var deps = answer.dependencies;
  var devDeps = answer.devDependencies;
  var installOnly = answer.nowhere;

  var cmd = [], a = [], b = [], c = [], sep = [];
  if (deps.length > 0) {
    a = _.union(['npm install'], deps, ['--save']);
  }
  if (devDeps.length > 0) {
    b = _.union(['npm install'], devDeps, ['--save-dev']);
  }
  if (installOnly.length > 0) {
    c = _.union(['npm install'], installOnly);
  }
  if (deps.length > 0 && (devDeps.length > 0 || installOnly.length > 0)) {
    sep = ['&&'];
  }

  cmd = cmd.concat(a, sep, b, sep, c);
  return cmd.join(' ');
};