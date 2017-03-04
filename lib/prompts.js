'use strict';

var store = require('data-store')('lint-deps');
var argv = require('yargs-parser')(process.argv.slice(2));
var reports = require('./reports');
var utils = require('./utils');

module.exports = function(app) {
  app.set('actions', {install: [], unused: []});

  return function(enquirer) {
    if (enquirer.isRegistered) return;
    enquirer.isRegistered = true;
    enquirer.use(require('enquirer-prompts'));

    /**
     * Get the installer to use (`npm` or `yarn`).
     * If undefined the user will be prompted.
     */

    var installer = store.get('config.installer');
    var types = [
      'dependencies',
      'devDependencies',
      'peerDependencies',
      'optionalDependencies'
    ];

    /**
     * Listen for answers
     */

    enquirer.on('answer', function(val, key, question, answers) {
      if (question.name === 'installer') {
        question.answer = question.answer || installer;
        store.set('config.installer', question.answer);
      }
      if (question.answer) {
        app.set('actions.' + question.name, question.answer);
      }
    });

    /**
     * Prompts
     */

    enquirer.question('installer', 'What is your preferred installer?', {
      type: 'radio',
      choices: ['npm', 'yarn'],
      when: function() {
        return argv.init || typeof installer !== 'string';
      }
    });

    enquirer.question('missing', 'Want to select packages to install?', {
      type: 'confirm',
      when: function(answers) {
        return reports.missing(app);
      }
    });

    enquirer.question('install', 'Which packages?', {
      type: 'checkbox',
      choices: utils.createPromptList(app, 'missing', enquirer),
      choiceObject: true,
      radio: types,
      when: function(answers) {
        return answers.missing === true;
      }
    });

    enquirer.question('unused', 'Want to remove unused deps?', {
      type: 'checkbox',
      choices: utils.createPromptList(app, 'unused', enquirer),
      choiceObject: true,
      radio: types,
      when: function(answers) {
        return reports.unused(app);
      }
    });
  };
};
