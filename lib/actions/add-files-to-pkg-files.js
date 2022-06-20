import fs from 'fs';
import path from 'path';
import write from 'write';
import colors from 'ansi-colors';
import enquirer from 'enquirer';
import { answerResultToObject, choicesObjectToArray } from '../utils.js';

const getFolder = file => {
  const parts = file.relative.split(path.sep);

  if (file.isFile()) {
    parts.pop();
  }

  return parts[0];
};

const createChoices = missing => {
  const files = [];
  const dirs = {};

  for (const { file, parent } of missing) {
    if (file.isLocal) continue;

    const folder = getFolder(file);
    if (!folder) {
      files.push({ name: file.relative, file, hint: `Used by ${parent.relative}` });
    } else {
      dirs[folder] ||= [];
      dirs[folder].push(file);
    }
  }

  const choices = { files, dirs: [] };

  for (const [name, files = []] of Object.entries(dirs)) {
    const deps = files.slice(0, 3).map(f => f.path).join(', ');
    const diff = Math.max(files.length - 3, 0);

    const suffix = diff ? ` and ${diff} other file${diff > 1 ? 's' : ''}` : '';
    choices.dirs.push({ name, hint: `Used for ${deps}${suffix}` });
  }

  return choices;
};

const permission = async (app, missing) => {
  const obj = createChoices(missing);
  const choices = choicesObjectToArray(obj);

  if (choices.length === 0) {
    return [];
  }

  // const { dirs, files } = obj;
  const answer = await enquirer.prompt({
    name: 'add',
    type: 'multiselect',
    skip: choices.length === 0,
    margin: [1, 0, 1, 1],
    // message: `${colors.red('HEADS UP!')} File "${file.relative}" is used by "${parent.relative}" but is not defined by the "files" or "directories" properties in package.json. ${colors.bold('We recommend you add it to the "files" property. Want lint-deps to do that now?')}`
    message: 'The following file/dirs are missing from package.json, want it/them add now?',
    choices,
    result() {
      return answerResultToObject(this.state._choices);
    }
  });

  return answer.add;
  // console.log(choicesObjectToArray(obj));

  // const arr = dirs.concat(files);
  // const pronoun = arr.length > 1 ? 'them' : 'it';
  // const verb = arr.length !== 1 ? 'are' : 'is';
  // const choices = [];
  // const types = [];

  // if (dirs.length) {
  //   if (dirs.length > 1 || files.length > 0) {
  //     types.push('dirs');
  //     choices.push({ name: 'dirs', message: 'Folders', choices: dirs });

  //   } else {
  //     types.push('folder');
  //     choices.push(dirs[0]);
  //   }
  // }

  // if (files.length) {
  //   if (files.length > 1 || dirs.length > 0) {
  //     types.push('files');
  //     choices.push({ name: 'files', message: 'Files', choices: files });

  //   } else {
  //     types.push('file');
  //     choices.push(files[0]);
  //   }
  // }

  // if (!choices.some(ele => ele.name !== '')) {
  //   return [];
  // }

  // const type = types.length > 1 ? types.join(' and ') : types[0];
  // const answer = await enquirer.prompt({
  //   name: 'add',
  //   type: 'multiselect',
  //   margin: [1, 0, 1, 1],
  //   // message: `${colors.red('HEADS UP!')} File "${file.relative}" is used by "${parent.relative}" but is not defined by the "files" or "directories" properties in package.json. ${colors.bold('We recommend you add it to the "files" property. Want lint-deps to do that now?')}`
  //   message: `The following ${type} ${verb} missing from the "files" property in package.json, want to add ${pronoun} now?`,
  //   choices
  // });

  // return answer.add;
};

const action = async (app, missing) => {
  const { files, dirs } = await permission(app, missing);

  if (files?.length > 0 || dirs?.length > 0) {
    const pkgpath = path.join(app.dir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgpath));
    const arr = [].concat(pkg.files || []).concat(files).concat(dirs);
    pkg.files = [...new Set(arr)].sort();
    await write(pkgpath, JSON.stringify(pkg, null, 2));

    // reset package.json on app
    app.loadPackage();
  }
};

export default action;
