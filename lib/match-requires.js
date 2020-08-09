'use strict';

const stripComments = require('strip-comments');
const { REQUIRES_REGEX } = require('./constants');
const { defineProperty } = Reflect;

module.exports = (contents, options = {}, file) => {
  if (typeof options === 'boolean' || typeof options === 'function') {
    options = { stripComments: options };
  }

  if (typeof options.stripComments === 'function') {
    contents = options.stripComments(contents);
  }

  if (typeof options.stripComments === 'boolean') {
    contents = stripComments(contents, options);
  }

  const path = file ? file.relative : null;
  const token = (input, variable, name) => ({ path, input, variable, name });
  const tokens = [];

  contents.replace(REQUIRES_REGEX, (match, $1, variable, $3, name) => {
    if (name) {
      tokens.push(token(match.trim(), variable, name));
    }
  });

  return tokens;
};
