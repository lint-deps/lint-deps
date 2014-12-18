'use strict';

var flatten = require('arr-flatten');

/**
 * Automatically generate the command line arguments
 * to be used, based on the answers provided by the user.
 */

module.exports = function generateAnswers(answers) {
  var keys = ['dependencies', 'devDependencies', 'nowhere'];

  return keys.map(function (key) {
    var values = answers[key].length !== 0
      ? answers[key]
      : false;

    var append = '';
    append += key.toLowerCase().indexOf('dependencies') > -1
      ? '--save' :
      '';
    append += key.toLowerCase().indexOf('dev') > -1
      ? '-dev':
      '';

    if (values) {

      return {
        args: ['i'].concat(flatten(values), [append]),
        cmd: 'npm'
      };
    }
    return false;
  }).filter(Boolean);
};