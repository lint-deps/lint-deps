module.exports = function generateQuestion (deps) {
  var types = ['dependencies', 'devDependencies'];
  var choices = [];
  var questions = [];

  deps.forEach(function(dep) {
    choices = choices.concat({ name: dep });
  });

  types.forEach(function(type) {
    questions.push({
      type: 'checkbox',
      message: 'Install to ' + type + '?',
      name: type,
      choices: choices,
      when: function (answers) {
        return answers.install === true;
      }
    });
  });
  return questions;
};
