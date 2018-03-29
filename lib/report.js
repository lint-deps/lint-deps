'use strict';

const inflection = require('inflection');
const union = require('arr-union');
const log = require('log-utils');

exports.format = function(val, options = {}) {
  if (Array.isArray(val) && typeof val[0] === 'string') {
    if (typeof options.color === 'string') {
      val = val.map(log[options.color]);
    }

    if (typeof options.color === 'function') {
      val = val.map(options.color);
    }

    switch (options.type) {
      case 'bullets':
        return log.bold('\n · ') + val.join('\n · ');
      case 'inline':
      default: {
        return val.join(', ');
      }
    }
  }
};

exports.unused = function(report) {
  const message = [];

  for (let i = 0; i < report.types.length; i++) {
    const type = report.types[i];
    const unused = report[type].unused;
    if (!unused.length) {
      continue;
    }

    if (i > 0) {
      message.push('');
    }

    let msg = log.heading('Unused ' + type + ' (' + unused.length + ')');
    msg += this.format(unused, {type: 'bullets', color: 'dim'});

    message.push(msg);
  }

  message.push('');
  return message.join('\n').replace(/\s+$/, '');
};

exports.missing = function(report, config) {
  const message = [];
  let total = {};

  for (let i = 0; i < report.types.length; i++) {
    let type = report.types[i];
    let names = [];
    const arr = [];

    const rpt = report[type];
    for (const file of rpt.files) {
      const missing = file.missing || [];
      let msg = log.bold(' · ') + file.relative + ' ';

      if (missing.length > 0) {
        names = union([], names, missing);
        msg += log.error + log.gray(' (' + missing.join(', ') + ')');
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
