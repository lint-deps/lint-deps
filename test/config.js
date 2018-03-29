'use strict';

require('mocha');
var assert = require('assert');
var LintDeps = require('..');
var app;

describe('config', function() {
  beforeEach(function() {
    app = new LintDeps();
  });

  it('should merge package.json config', function() {
    // console.log(app);

  });
});
