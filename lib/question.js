'use strict';

module.exports = function generateQuestion(deps) {
  var questions = [];
  var choices = [];

  var groups = {
    dependencies: 'Install and add to dependencies?',
    devDependencies: 'Install and add to devDependencies?',
    nowhere: 'Don\'t add to package.json, just install.'
  };

  /**
   * Generate a list of checkboxes, one for each
   * missing dependency.
   */

  if (deps.length > 1) {
    choices.push({ name: 'install all missing deps', value: deps });
    choices.push({ type: 'separator', line: '\u001b[2m---\u001b[22m' });
  }

  deps.forEach(function(dep) {
    choices.push({ name: dep });
  });

  /**
   * Generate actual questions based on missing
   * dependencies, where `type` is the type of
   * dependencies in package.json
   */

  Object.keys(groups).forEach(function(type) {
    questions.push({
      type: 'checkbox',
      message: groups[type],
      choices: choices,
      name: type,
      when: function (answers) {
        return answers.install === true;
      }
    });
  });

  return questions;
};
