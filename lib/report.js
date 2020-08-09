'use strict';

const inflection = require('inflection');
const log = require('log-utils');
const utils = require('./utils');

exports.format = (value, options = {}) => {
  if (Array.isArray(value) && typeof value[0] === 'string') {
    if (typeof options.color === 'string') {
      value = value.map(log[options.color]);
    }

    if (typeof options.color === 'function') {
      value = value.map(options.color);
    }

    switch (options.type) {
      case 'bullets':
        return log.bold('\n · ') + value.join('\n · ');
      case 'inline':
      default: {
        return value.filter(Boolean).join(', ');
      }
    }
  }
};

exports.unused = report => {
  const message = [''];

  for (let i = 0; i < report.types.length; i++) {
    const type = report.types[i];
    const unused = report[type].unused;

    if (!unused.length) {
      continue;
    }

    if (i > 0) {
      message.push('');
    }

    const suffix = this.format(unused, { type: 'bullets', color: 'dim' });
    const output = log.heading(`Unused ${type} (${unused.length})`) + suffix;
    message.push(output);
  }

  message.push('');
  return message.join('\n').replace(/\s+$/, '');
};

exports.missing = (report, config) => {
  const message = [];

  for (let i = 0; i < report.types.length; i++) {
    const type = report.types[i];
    let names = [];
    const arr = [];

    const rpt = report[type];
    for (const file of rpt.files || []) {
      const missing = [].concat(file.missing || []);
      let msg = `${log.bold(' · ')}${file.relative} `;

      if (missing.length > 0) {
        names = utils.union([], names, missing);
        msg += log.error + log.gray(` (${missing.join(', ')})`);
      } else {
        msg += log.success;
      }
      arr.push(msg);
    }

    const name = inflection.inflect(type, names.length);
    message.push('', log.heading(`Missing ${names.length} ${name}`));
    message.push(...arr);
  }

  return message.join('\n');
};
