'use strict';

/**
 * Automatically generate the command line arguments
 * to be used, based on the answers provided by the user.
 */

module.exports = function generateAnswers(answers) {
  return ['dependencies', 'devDependencies', 'nowhere']
    .map(function (key) {
      var values = answers[key].length === 0 ? false : answers[key];
      var append = '';
      append += key.toLowerCase().indexOf('dependencies') > -1 ? '--save' : '';
      append += key.toLowerCase().indexOf('dev') > -1 ? '-dev': '';

      if (values) {
        return { cmd: 'npm', args: ['i'].concat(values, [append]) };
      }
      return false;
    })
    .filter(Boolean);
};