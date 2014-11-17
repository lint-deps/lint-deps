'use strict';

module.exports = function generateQuestion (deps) {
  var choices = [];
  var questions = [];

  var types = {
    dependencies: 'Install and add to dependencies?',
    devDependencies: 'Install and add to devDependencies?',
    nowhere: 'Don\'t add to package.json, just install.'
  };

  /**
   * Generate a list of checkboxes, one for each
   * missing dependency.
   */

  deps.forEach(function(dep) {
    choices = choices.concat({ name: dep });
  });


  /**
   * Generate actual questions based on missing
   * dependencies.
   *
   * @param   {[type]}  type  [description]
   * @return  {[type]}        [description]
   */

  Object.keys(types).forEach(function(type) {
    questions.push({
      type: 'checkbox',
      message: types[type],
      name: type,
      choices: choices,
      when: function (answers) {
        return answers.install === true;
      }
    });
  });

  return questions;
};
