import fs from 'fs';
import util from 'util';
import write from 'write';
import enquirer from 'enquirer';
import manager from './manager.js';
// import fix from './fix-placement.js';
import { answerResultToObject, choicesObjectToArray, mapAliases } from '../utils.js';

/**
 * Prompt for packages to install
 */

export const prompt = async deps => {
  const choices = choicesObjectToArray(deps);

  if (!choices.some(ele => ele.choices.length > 0)) {
    return [];
  }

  const { install } = await enquirer.prompt({
    type: 'multiselect',
    name: 'install',
    message: 'Install missing packages?',
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

const installPackages = async (app, deps, exec) => {
  for (const type of Object.keys(deps)) {
    const modules = mapAliases(app, deps[type]);
    const args = type === 'devDependencies' ? ['-D'] : [];
    await exec(args.concat(modules));
  }
};

const atomicWrite = filepath => {
  const buffer = fs.readFileSync(filepath);
  const undo = () => write(filepath, buffer);
  return undo;
};

export const install = async (app, deps = app.missing) => {
  const undo = atomicWrite(app.pkg.path);
  const exec = manager[app.installer]?.install;

  if (typeof exec !== 'function') {
    return Promise.reject(new Error(`cannot get installer: ${util.inspect(app.installer)}`));
  }

  const answer = await prompt(deps);

  // return fix(app, options)
  return installPackages(app, answer, exec)
    .catch(async err => {
      // log error first, in case we get another error for some reason
      err.installer = app.installer;
      console.error(err);
      // if installation failed, ensure package.json was not modified
      await undo();
      return Promise.reject(err);
    });
};

install.prompt = prompt;
export default install;
