'use strict';

var enquirer = require('enquirer')();
enquirer.register('checkbox', require('prompt-checkbox'));

enquirer.question('types', 'Want to select packages to install?', {
  type: 'checkbox',
  radio: true,
  choices: {
    dependencies: ['a', 'b', 'c'],
    devDependencies: ['c', 'd', 'e']
  }
});

enquirer.ask('types')
  .then(function(answers) {
    console.log(answers);
  })
