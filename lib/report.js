'use strict';

var log = require('log-utils');

exports.format = function(val, options) {
  var opts = Object.assign({}, options);

  if (Array.isArray(val) && typeof val[0] === 'string') {
    if (typeof opts.color === 'string') {
      val = val.map(log[opts.color]);
    }

    if (typeof opts.color === 'function') {
      val = val.map(opts.color);
    }

    switch (opts.type) {
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
  var message = [''];

  for (var i = 0; i < report.types.length; i++) {
    var type = report.types[i];
    var unused = report[type].unused;
    if (!unused.length) {
      continue;
    }

    if (i > 0) {
      message.push('');
    }

    var msg = log.heading('Unused ' + type)
      + this.format(unused, {type: 'bullets'});

    message.push(msg);
  }

  return message.join('\n');
};

exports.missing = function(report) {
  var message = [];

  for (var i = 0; i < report.types.length; i++) {
    var type = report.types[i];
    message.push('', log.heading(type));

    var rpt = report[type];
    var files = rpt.files;
    var len = files.length;
    var idx = -1;

    while (++idx < len) {
      var file = files[idx];
      var missing = file.missing || [];
      var msg = log.bold(' · ') + file.relative + ' ';

      if (missing.length > 0) {
        msg += log.error + log.gray(' (' + missing.join(', ') + ')');
      } else {
        msg += log.success;
      }

      message.push(msg);
    }
  }

  message.push('');
  return message.join('\n');
};
