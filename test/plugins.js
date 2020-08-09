'use strict';

require('mocha');
var assert = require('assert');
var LintDeps = require('..');

describe('plugins', function() {
  it('should support plugins', function() {
    var app = new LintDeps();
    app.loadPlugins([
      function() {
        this.foo = 'bar';
      },
      function() {
        this.baz = 'qux';
      }
    ]);

    assert.equal(app.foo, 'bar');
    assert.equal(app.baz, 'qux');
  });
});
