'use strict';

module.exports = function generateQuestion(deps, inquirer) {
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

  if (deps.length > 1) {
    choices.push({name: 'install all missing deps', value: deps});
    choices.push(new inquirer.Separator('---'));
  }

  deps.forEach(function(dep) {
    choices.push({ name: dep });
  });

  /**
   * Generate actual questions based on missing
   * dependencies, where `type` is the type of
   * dependencies in package.json
   */

  Object.keys(types).forEach(function(type) {
    questions.push({
      type: 'checkbox',
      message: types[type],
      choices: choices,
      name: type,
      when: function (answers) {
        return answers.install === true;
      }
    });
  });

  return questions;
};
