module.exports = function generateQuestion (deps) {
  var types = ['dependencies', 'devDependencies', 'nowhere'];
  var choices = [];
  var questions = [];


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

  types.forEach(function(type) {
    questions.push({
      type: 'checkbox',
      message: 'Install and add to ' + type + '?',
      name: type,
      choices: choices,
      when: function (answers) {
        return answers.install === true;
      }
    });
  });

  return questions;
};
