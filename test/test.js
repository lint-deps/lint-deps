'use strict';

require('mocha');
var assert = require('assert');
var LintDeps = require('..');

describe('main export', function() {
  it('should export a constructor function', function() {
    assert.equal(typeof LintDeps, 'function');
    assert(new LintDeps() instanceof LintDeps);
  });
});
