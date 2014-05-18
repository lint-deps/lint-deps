const inquirer = require('inquirer');

module.exports = function prompt() {
  inquirer.prompt.apply(inquirer, arguments);
  return this;
};