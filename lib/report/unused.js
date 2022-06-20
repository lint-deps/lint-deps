
import inflection from 'inflection';
import colors from 'ansi-colors';
import { error, heading, success } from '../utils.js';

const reportUnused = async app => {
  const unused = await app.findUnused();
  const message = [];

  for (const [type, names] of Object.entries(unused)) {
    const lines = [];

    for (const name of names) {
      lines.push(`${colors.bold(' · ')}${name} `);
    }

    if (app.options.verbose || names.length) {
      const title = inflection.pluralize(type);
      message.push('', heading(`Unused ${title} (${colors.red(names.length)})`));
      message.push(...lines);
    }
  }

  if (message.length) message.push('');
  return message.join('\n');
};

export default reportUnused;
