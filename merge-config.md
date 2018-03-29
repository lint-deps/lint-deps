
**How does it work?**

We start with an empty config object that looks something like this:

```js
{
  // config "locations"
  pkg: {},     // namespaced object in "package.json"
  cwd: {},     // config from files in "process.cwd()"
  local: {},   // config from installed packages in local "node_modules"
  global: {},  // config from installed packages in global "node_modules"
  home: {},    // config from files in user home

  // if a list of locations is passed, the "merged" object is created
  // by merging the config from each location, left-to-right.
  merged: {},

  // array of absolute paths to any matching javascript
  // files. Useful for gulpfile.js, Gruntfile.js, etc.
  js: []
}
```


When `merge(name)` is called:

1. [glob patterns](#glob-patterns) are created by combining your application's `name` with a list of directories that corresponds to the pre-defined locations, along with some minimal `*` wildcard magic.
1. glob patterns are used to match files
1. config is loaded onto the property for the respective "location" of matching files


### Limit the search

Pass a list of location names to limit the search _and merge config for those locations_:

**Example**

The following will limit the search to only the `pkg` and `cwd` patterns:

```js
console.log(merge('foo', ['pkg', 'cwd']));
```


## Options

### options.locations

**Type**: `array`

**Default**: `undefined`

Specify the locations to load onto the returned object.

```js
var config = merge('foo', {locations: ['cwd', 'home']});
// locations can also be passed directly to the main export
var config = merge('foo', ['cwd', 'home']);
```

### options.merge

**Type**: `boolean`

**Default**: `undefined`

merge onto the `config.merged` object. No config objects will be merged onto `config.merged` unless specified.
If one or more [locations](#optionstypes) are specified locations are merged onto the returned `config.merged` object.

```js
var config = merge('foo', {merge: false});
```

### options.filter

**Type**: `function`

**Default**: `undefined`

Filter files before they're added or merged onto the config.

```js
var config = merge('foo', {
  filter: function(file) {
    return !/whatever/.test(file.path);
  }
});
```

### options.files

**Type**: `Array<string>`

**Default**: `['.name*.{json,yaml,yml}', 'name*.js']` _(Note the leading `.` on the first string)_

Specify the glob pattern to use for matching basenames.

```js
var config = merge('amazing', {
  files: ['amazing.json']
});
```


## Glob patterns

In case it helps to visualize what this does, assuming no options are defined, the default list of glob patterns created by `{%= name %}` looks something like this:

```js
[
  {
    type: 'pkg',
    cwd: process.cwd(),
    patterns: ['package.json']
  },
  {
    type: 'cwd',
    cwd: process.cwd(),
    patterns: ['.foo*.{json,yaml,yml}', 'foo*.js']
  },
  {
    type: 'local',
    cwd: process.cwd() + '/node_modules',
    patterns: ['foo-config-*/.foo*.{json,yaml,yml}', 'foo-config-*/foo*.js']
  },
  {
    type: 'global',
    cwd: '/usr/local/lib/node_modules', // depends on platform and custom settings
    patterns: ['foo-config-*/.foo*.{json,yaml,yml}', 'foo-config-*/foo*.js']
  },
  {
    type: 'home',
    cwd: '/Users/jonschlinkert', // depends on platform and custom settings
    patterns: ['.foo/.foo*.{json,yaml,yml}', '.foo/foo*.js']
  }
]
```

{%= name %} then loops over each "location" and loads any config files/settings found in that location.
