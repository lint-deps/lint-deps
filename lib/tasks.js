'use strict';

const log = require('log-utils');
const pick = require('object.pick');
const DataStore = require('data-store');
const Enquirer = require('enquirer');
const isValid = require('is-valid-app');
const removeUnused = require('./remove-unused');
const questions = require('./questions');
const utils = require('./utils');
const rpt = require('./report');
const install = require('./install');

module.exports = function(argv) {
  const enquirer = new Enquirer({options: argv});
  const store = new DataStore('lint-deps');

  enquirer.register('confirm', require('prompt-confirm'));
  enquirer.register('checkbox', require('prompt-checkbox'));
  enquirer.register('radio', require('prompt-radio'));

  return function(app) {
    if (!isValid(app, 'lint-deps-lintfile')) return;
    const pkgName = app.pkg.get('name');

    if (argv.deps) {
      app.option('dependencies.files.patterns', argv.deps);
    }
    if (argv.dev) {
      app.option('devDependencies.files.patterns', argv.dev);
    }

    if (argv._.indexOf('why') === 0) {
      argv.why = argv._.pop();
      argv._ = argv._.shift();
    }

    if (argv._.indexOf('installer') !== -1 && argv.del) {
      store.del('config.installer');
    }

    /**
     * Get the installer to use, if defined. If not defined,
     * the user will be prompted.
     */

    app.installer = store.get('config.installer');

    /**
     * Add prompt questions
     */

    questions(app, enquirer, store);

    /**
     * task: "lint"
     */

    app.task('lint', function() {
      app.lint(argv.types, argv);
      const missingCount = app.report.missingCount;
      const unusedCount = app.report.unusedCount;
      const tasks = [];

      if (unusedCount > 0) {
        console.log();
        console.log(rpt.unused(app.report));
        tasks.push('prompt-unused');
      }

      if (missingCount > 0) {
        console.log(rpt.missing(app.report));
        console.log();
        tasks.push('prompt-install');
      }

      if (argv.update) {
        return app.build('install');
      }

      if (tasks.length > 0) {
        return app.build(tasks);
      }

      return Promise.resolve(null);
    });

    /**
     * task: "upgrade" (updates all deps then runs `yarn` upgrade)
     */

    app.task('upgrade', ['installer'], async() => {
      app.lint(argv.types, argv);
      const deps = {};

      try {
        for (const type of Object.keys(app.pkg.data)) {
          const opts = app.typeOptions(type) || {};

          if (app.options.types.indexOf(type) === -1) {
            continue;
          }

          deps[type] = [];
          for (const name of Object.keys(app.pkg.data[type])) {
            const version = app.pkg.data[type][name];

            if (/^[^:]+:/.test(version)) {
              deps[type].push(`${version.replace(/^[^:]+:/, '')}`);
              continue;
            }

            if (opts.lock && opts.lock.hasOwnProperty(name)) {
              deps[type].push(name + '@' + opts.lock[name]);
              continue;
            }
            deps[type].push(name + '@latest');
          }
        }
      } catch (err) {
        return Promise.reject(err);
      }

      return install(app, argv, deps);
    });

    /**
     * task: "why"
     */

    app.task('why', function() {
      const name = argv.why;
      const report = app.why(name, argv);

      bold('Why does "%s" exist in %s?', name, pkgName);

      if (report.count === 0) {
        error('"%s is not used anwhere in %s', name, pkgName);
        if (report.types.length) {
          error(`Specified in "${report.types.join(', ')}"`);
          error('Run "$ deps clean" to remove unused deps');
        } else {
          error('"%s is not defined in package.json', name);
        }
      } else {
        const types = Object.keys(report.files);
        types.forEach(function(type) {
          const list = rpt.format(report.files[type], { color: 'yellow', type: 'inline' });
          const singular = utils.singularize(type);
          log.ok(`${name} is a ${log.cyan(singular)}, used in ${list}`);
        });
      }

      return Promise.resolve(null);
    });

    /**
     * task: "prompt-installer"
     */

    app.task('installer', async() => {
      const answers = await enquirer.prompt('installer');
      if (answers.installer) {
        app.installer = answers.installer;
      }
    });

    /**
     * task: "prompt-install"
     */

    app.task('prompt-install', ['installer'], async() => {
      if (app.report.missingCount === 0) {
        log.ok('no dependencies are missing');
        return Promise.resolve(null);
      }

      const answers = await enquirer.prompt('install');
      if (answers.install) {
        return install(app, argv, answers.install);
      }

      return Promise.resolve(null);
    });

    /**
     * task: "prompt-install"
     */

    app.task('prompt-unused', async() => {
      if (app.report.unusedCount === 0) {
        log.ok('no dependencies are unused');
        return Promise.resolve(null);
      }

      const answers = await enquirer.prompt('unused');
      if (answers.unused) {
        return app.build('clean');
      }

      return Promise.resolve(null);
    });

    /**
     * task: "clean"
     */

    app.task('clean', async() => {
      const unused = await removeUnused(app, argv);
      if (unused === 0) {
        log.ok('no dependencies are unused');
      } else {
        unused.forEach(function(type) {
          if (type.modules.length) {
            const names = type.modules.join(', ');
            log.ok(`removed: "${names}" from ${type.name} in package.json`);
          }
        });
      }
      return Promise.resolve(null);
    });

    /**
     * task: "default"
     */

    app.task('default', async() => {
      const tasks = getTasks(app, argv);
      if (tasks.length) {
        await app.build(tasks);
      }
      if (app.hasListeners('done')) {
        app.emit('done');
      }
      return Promise.resolve(null);
    });
  };
};

function getTasks(app, argv) {
  var names = pick(argv, Object.keys(app.tasks));
  var keys = Object.keys(names);
  var len = keys.length;
  var idx = -1;
  var arr = [];
  while (++idx < len) {
    var name = keys[idx];
    if (name === 'help') {
      continue;
    }
    if (typeof argv[name] !== 'undefined') {
      arr.push(name);
    }
  }
  if (arr.length === 0) {
    return ['lint'];
  }
  return arr;
}

function bold(msg, ...args) {
  args.unshift(log.bold(msg));
  console.log(...args);
}

function error(msg, ...args) {
  args.unshift(log.error + ' ' + args[0]);
  console.log(...args);
}

function handleError(err) {
  if (err) {
    console.error(err);
    process.exit(1);
  }
}
