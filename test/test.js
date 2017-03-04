'use strict';

require('mocha');
var assert = require('assert');
var lintDeps = require('..');

describe('lint-deps', function() {
  it('should export a function', function() {
    assert.equal(typeof lintDeps, 'function');
  });

  it('should export an object', function() {
    assert(lintDeps);
    assert.equal(typeof lintDeps, 'object');
  });

  it('should throw an error when invalid args are passed', function(cb) {
    try {
      lintDeps();
      cb(new Error('expected an error'));
    } catch (err) {
      assert(err);
      assert.equal(err.message, 'expected first argument to be a string');
      assert.equal(err.message, 'expected callback to be a function');
      cb();
    }
  });
});
