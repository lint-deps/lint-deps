'use strict';

const colors = require('ansi-colors');
const DataStore = require('data-store');
const Enquirer = require('enquirer');
const removeUnused = require('./remove-unused');
const questions = require('./questions');
const utils = require('./utils');
const rpt = require('./report');
const install = require('./install');
const bold = (msg, ...rest) => console.log(colors.bold(msg), ...rest);
const cross = colors.red(colors.symbols.cross);
const error = str => console.log(cross, str);
const info = str => console.log(colors.cyan(colors.symbols.info), str);

module.exports = argv => {
  const enquirer = new Enquirer({ ...argv });
  const store = new DataStore('lint-deps');

  return app => {
    if (!app.task) return;
    const pkgName = app.pkg.data.name;

    /**
     * Listen for answers
     */

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

    let prompts = questions(app, store);

    /**
     * task: "lint"
     */

    app.task('lint', function() {
      app.lint(argv.types, argv);
      let missingCount = app.report.missingCount;
      let unusedCount = app.report.unusedCount;
      let tasks = [];

      if (unusedCount > 0) {
        console.log(rpt.unused(app.report));
        console.log();
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
      let deps = {};

      try {
        for (let type of Object.keys(app.pkg.data)) {
          let opts = app.typeOptions(type) || {};

          if (app.options.types.indexOf(type) === -1) {
            continue;
          }

          deps[type] = [];
          for (let name of Object.keys(app.pkg.data[type])) {
            let version = app.pkg.data[type][name];

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
      let name = argv.why;
      let report = app.why(name, argv);

      bold('Why does "%s" exist in %s?', name, pkgName);

      if (report.count === 0) {
        if (report.types.length) {
          error(`${colors.bold(name)} is specified in "${report.types.join(', ')}" but is not used anywhere`);
          console.log(`  in your project (run ${colors.dim('$ deps clean')} to remove unused deps)`);
        } else {
          error(`${colors.bold(name)} is not used anywhere in ${pkgName}, and is not in package.json.`);
        }
      } else {
        let types = Object.keys(report.files);
        let files = [];
        types.forEach(type => files.push(...report.files[type]));

        let list = rpt.format(files, { color: 'yellow', type: 'inline' });
        let singular = utils.singularize(report.types[0]);
        info(`${name} is a ${colors.cyan(singular)}, used in ${list}`);
      }
      return Promise.resolve(null);
    });

    /**
     * task: "prompt-installer"
     */

    app.task('installer', async() => {
      let question = prompts.find(p => p.name === 'installer');
      let answers = await enquirer.prompt(question);
      if (answers.installer) {
        app.installer = answers.installer;
      }
      return Promise.resolve(null);
    });

    /**
     * task: "prompt-install"
     */

    app.task('prompt-install', ['installer'], async() => {
      if (app.report.missingCount === 0) {
        utils.ok('no dependencies are missing');
        return Promise.resolve(null);
      }

      let question = prompts.find(p => p.name === 'install');
      question.choices = utils.createChoices(app);

      let answers = await enquirer.prompt(question);
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
        utils.ok('no dependencies are unused');
        return Promise.resolve(null);
      }

      let question = prompts.find(p => p.name === 'unused');
      let answers = await enquirer.prompt(question);
      if (answers.unused) {
        return app.build('clean');
      }

      app.removeUnused = false;
      return Promise.resolve(null);
    });

    /**
     * task: "clean"
     */

    app.task('clean', ['remove-unused']);
    app.task('remove-unused', async() => {
      let unused = await removeUnused(app, argv);
      if (unused === 0) {
        utils.ok('no dependencies are unused');
      } else {
        unused.forEach(function(type) {
          if (type.modules.length) {
            let names = type.modules.join(', ');
            utils.ok(`removed: "${names}" from ${type.name} in package.json`);
          }
        });
      }
      return Promise.resolve(null);
    });

    /**
     * task: "default"
     */

    app.task('default', async() => {
      let tasks = getTasks(app, argv);
      if (tasks.length) {
        await app.build(tasks);
      }
      app.emit('done');
      return Promise.resolve(null);
    });
  };
};

function getTasks(app, argv) {
  let names = utils.pick(argv, Object.keys(app.tasks));
  let arr = Object.keys(names).filter(name => !!argv[name]);
  return arr.length > 0 ? arr : ['lint'];
}
