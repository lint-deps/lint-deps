'use strict';

var utils = require('./utils');

module.exports = function(app, enquirer, store) {

  /**
   * Listen for answers
   */

  enquirer.on('prompt', function(prompt) {
    if (prompt.question.name === 'install') {
      prompt.choices = utils.createChoices(app);
    }
  });

  /**
   * Prompt the user to decide which installer to use (npm or yarn).
   */

  enquirer.question('installer', 'What is your preferred installer?', {
    type: 'radio',
    choices: ['npm', {name: 'yarn', disabled: true}],
    when: function() {
      return !store.get('config.installer');
    },
    transform: function(answer) {
      store.set('config.installer', answer);
      return answer;
    }
  });

  enquirer.question('install', 'Install missing packages', {
    type: 'checkbox',
    radio: true,
    choices: [],
    transform: function(answer) {
      if (answer) {
        var res = {};
        for (var i = 0; i < answer.length; i++) {
          var choice = this.choices.get(answer[i]);
          var name = choice.groupName;
          res[name] = res[name] || [];
          res[name].push(choice.name);
        }
        return res;
      }
    }
  });

  enquirer.question('unused', 'Want to remove unused packages?', {
    type: 'confirm',
    default: false
  });
};
