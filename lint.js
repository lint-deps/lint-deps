'use strict';

var requires = require('match-requires');

module.exports = function(deps) {
  this.on('file', function(file) {
    // console.log(file.relative);
  });

  this.register(/\.js$/, function(file) {
    file.requires = requires(file.content);
    if (file.requires.length) {
      this.requires(file.requires.map(toRequires));
    }
  });

  this.ignore(this.settings.ignore || []);
  this.devDeps(this.pkg.devDependencies);
  this.deps(this.pkg.dependencies);
  this.addFiles(['**/*.js']);

  this.pull('requires.npm', this.get('dependencies'));
  this.pull('requires.npm', this.get('devDependencies'));
  // console.log(this.get('requires.npm'))
};

function toRequires(obj) {
  return obj.module;
}
