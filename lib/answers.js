const _ = require('lodash');

/**
 * Automatically generate the command line arguments
 * to be used based on the answers provided by the user.
 */

module.exports = function generateAnswers (answers) {
  var command = [], append = '';

  Object.keys(answers).map(function(key) {
    var value = answers[key];

    if (key === 'dependencies') {
      append = ' --save';
    }
    if (key === 'devDependencies') {
      append = ' --save-dev';
    }

    if (Array.isArray(value) && value.length) {
      command = command.concat('npm i ' + [value.join(' ')] + append);
    }
  });

  return command.join(' && ');
};