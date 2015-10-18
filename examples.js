
var requires = require('match-requires');
var Lint = require('./');
var lint = new Lint();

// lint.option('a', 'b');

lint.require({module: 'a'});
lint.require({module: 'b'});
lint.require({module: 'c'});

lint.exclude('one');
lint.exclude('two');
lint.exclude('three');

lint.include('alpha');
lint.include('beta');
lint.include('gamma');

lint.unused('foo');
lint.unused('bar');
lint.unused('baz');
lint.unused('baz');
lint.unused('baz');
lint.unused('baz');

lint
  .ignore('{tmp,temp}/**')
  .ignore('vendor/**')
  .ignore('node_modules/**');

lint.matcher(/package\.json$/, function(file) {
  file.data = require(file.path);
  this.deps(file.data.dependencies);
  this.devDeps(file.data.devDependencies);
});

lint.matcher(/\.js$/, function(file) {
  file.requires = requires(file.content);
  this.requires(file.requires);
});

lint
  .addFiles('*.json')
  .addFiles('**/*.js');

console.log(lint.files)

var gruntRe = /grunt\.loadNpmTasks\(['"]([^'"]+?)['"]\)/;
var htmlRe = /<!--\s*(?:require|deps):((?:[^-]+|-[^-]+)*?)-->/;


// console.log(lint)