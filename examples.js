
var requires = require('match-requires');
var LintDeps = require('./');
var deps = new LintDeps();

// deps.option('a', 'b');

deps.require({module: 'a'});
deps.require({module: 'b'});
deps.require({module: 'c'});

deps.exclude('one');
deps.exclude('two');
deps.exclude('three');

deps.include('alpha');
deps.include('beta');
deps.include('gamma');

deps
  .unused('foo')
  .unused('bar')
  .unused('baz')
  .unused('baz')
  .unused('baz')
  .unused('baz')
  .unused('browserify')
  .unused('mocha');

deps
  .ignore('{tmp,temp}/**')
  .ignore('vendor/**')
  .ignore('node_modules/**');

deps.matcher(/package\.json$/, function(file) {
  this.deps(file.json.dependencies);
  this.devDeps(file.json.devDependencies);
      console.log(this.cache)
  return file;
});

deps.matcher(/package\.json$/, function(file) {
  if (file.json.hasOwnProperty('scripts')) {
    for (var key in file.json.scripts) {
      var script = file.json.scripts[key];
      var matches = this.matches('unused', script);
      if (matches) {
        this.del('unused', matches);
      }
    }
  }
  return file;
});

deps.matcher(/\.js$/, function(file) {
  file.requires = requires(file.content);
  this.requires(file.requires);
});

deps.use(function fn(file) {
  if (!file.isFile) return fn;
  if (file.isMatch(/\.json$/)) {

  }
});

deps.addFiles(['*.json', '**/*.js']);

var gruntRe = /grunt\.loadNpmTasks\(['"]([^'"]+?)['"]\)/;
var htmlRe = /<!--\s*(?:require|deps):((?:[^-]+|-[^-]+)*?)-->/;


// console.log(deps)
