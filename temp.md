
## Setting options

There are several ways to override default settings. Any of the following may be used:

- CLI commands
- API options
- [config values](#config)

**API**

`lintDeps.option()`: Set options using `lintDeps.option('foo', 'bar')`

## Configuration

- [cwd]()
- [package.json]()
- [user home]()
- [global npm modules]()
- [local npm modules]()

**CWD**

In `process.cwd()`. The following files are supported:

- `.lintdepsrc.json`
- `.lintdepsrc.yml`

**package.json**

- `lintDeps` object in package.json


**User home**

In `~/.lint-deps` (or equivalent to user home on your OS). The following files are supported

- `index.js`
- `.lintdepsrc.json`
- `.lintdepsrc.yml`

**Locally installed modules**

Locally installed modules with a name that matches `lint-deps-config-*`. The following files are supported:

- `index.js`
- `.lintdepsrc.json`
- `.lintdepsrc.yml`

**Globally installed modules**

Globally installed modules with a name that matches `lint-deps-config-*`. The following files are supported:

- `index.js`
- `.lintdepsrc.json`
- `.lintdepsrc.yml`

## Options

- `lock`
