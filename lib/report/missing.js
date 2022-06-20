
import inflection from 'inflection';
import colors from 'ansi-colors';
import { error, heading, success } from '../utils.js';

const reportMissing = app => {
  const message = [];

  for (const type of app.types) {
    const files = app.files.filter(file => file.type === type);
    const lines = [];
    let names = [];

    for (const file of files || []) {
      const missing = [].concat(file.missing || [])
        .filter(m => file.type === 'dependencies' || !app.isDependency(m.name || m))
        .map(m => m.name || m);

      let output = `${colors.bold(' · ')}${file.relative} `;

      if (missing.length > 0) {
        names = [...new Set(names.concat(missing))];
        output += error + colors.gray(` (${missing.join(', ')})`);
      } else {
        output += success;
      }

      lines.push(output);
    }

    if (app.options.verbose || names.length) {
      const title = inflection.pluralize(type);
      message.push('', heading(`Missing ${title} (${colors.red(names.length)})`));
      message.push(...lines);
    }
  }

  return message.join('\n');
};

export default reportMissing;
