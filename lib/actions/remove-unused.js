import write from 'write';
import Enquirer from 'enquirer';
import { answerResultToObject, choicesObjectToArray, omit } from '../utils.js';

export const prompt = async deps => {
  const choices = choicesObjectToArray(deps);

  if (!choices.some(ele => ele.choices.length > 0)) {
    return [];
  }

  const enquirer = new Enquirer();
  const { install } = await enquirer.prompt({
    type: 'multiselect',
    name: 'install',
    message: 'Remove unused packages?',
    margin: [0, 0, 0, 1],
    choices,
    result() {
      return answerResultToObject(this.state._choices);
    }
  });

  return install;
};

/**
 * Install missing dependencies
 */

export const remove = async (app, deps = app.unused) => {
  const unused = await prompt(deps);
  const data = app.pkg.data;
  let changed = false;

  for (const [type, names] of Object.entries(unused)) {
    if (names.length) {
      changed = true;
      data[type] = omit(data[type], names);
    }
  }

  if (changed === true) {
    await write(app.pkg.path, JSON.stringify(data, null, 2));
  }
};

remove.prompt = prompt;
export default remove;
