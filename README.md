# lint-deps [![NPM version](https://badge.fury.io/lint-deps.png)](http://badge.fury.io/lint-deps)

> Command-line tool to check for dependencies that are not listed in package.json, and optionally add them.

Also tells you if packages are listed in package.json but aren't used anywhere.

## Install

### [npm](npmjs.org)

```bash
 npm i -g lint-deps
 ```

## Usage

In the command line:

```bash
deps
```

If packages are missing, you'll see a prompt like this:

![image](https://f.cloud.github.com/assets/383994/2192597/99266548-986a-11e3-98e2-5b6c4ff53719.png)

If you type <kbd>y</kbd> + <kbd>enter</kbd>:

![image](https://f.cloud.github.com/assets/383994/2192611/fa215b6e-986a-11e3-9eb9-f2b5875dbf82.png)

If you want `dependencies`, just hit <kbd>enter</kbd>, or do `-e` for `devDependencies`:

![image](https://f.cloud.github.com/assets/383994/2192633/6d5b7e3e-986b-11e3-9d91-26eb1b87cc3b.png)

Done.

## Docs

Currently this tool is very limited, does not have any options or settings, and is really experimental. Also, _`node_modules` is omitted from the search (and result set)_ and the following glob patterns are used to find files to scan:

```js
['**/*.js', 'bin/**', '!**/{tmp,temp}/**'];
```

All Node.js built-ins are excluded from the result set (e.g. `path`, `fs` etc.)

## Author

**Jon Schlinkert**

+ [github/jonschlinkert](https://github.com/jonschlinkert)
+ [twitter/jonschlinkert](http://twitter.com/jonschlinkert)

## License
Copyright (c) 2014 Jon Schlinkert, contributors.
Released under the MIT license