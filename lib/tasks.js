'use strict';

const kUnused = Symbol('unused');
const xdg = require('@folder/xdg');
const fs = require('fs');
const path = require('path');
const colors = require('ansi-colors');
const DataStore = require('data-store');
const Enquirer = require('enquirer');
const write = require('write');
const questions = require('./questions');
const utils = require('./utils');
const rpt = require('./report');
const install = require('./install');
const bold = (msg, ...rest) => console.log(colors.bold(msg), ...rest);
const cross = colors.red(colors.symbols.cross);
const error = str => console.log(cross, str);
const info = str => console.log(colors.cyan(colors.symbols.info), str);

module.exports = argv => {
  const paths = xdg({ expanded: true, subdir: 'lint-deps' });
  const storePath = path.join(paths.config.home, 'config.json');
  const enquirer = new Enquirer({ ...argv });
  const store = new DataStore('lint-deps', { path: storePath });

  enquirer.on('cancel', () => {
    console.log(colors.red('cancelled'));
    process.exit();
  });

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

    const prompts = questions(app, store);

    /**
     * task: "lint"
     */

    app.task('lint', function() {
      app.lint(argv.types, argv);
      const missingCount = app.report.missingCount;
      const unusedCount = app.report.unusedCount;
      const tasks = [];

      if (unusedCount > 0) {
        console.log(rpt.unused(app.report));
        console.log();
        tasks.push('prompt-unused');
      }

      if (missingCount > 0) {
        console.log(rpt.missing(app.report));
        console.log();
        tasks.push('prompt-missing');
      }

      if (argv.update) {
        return app.build('install');
      }

      if (tasks.length > 0) {
        return app.build(tasks);
      }

      return Promise.resolve(null);
    });

    app.task('add', () => {
      // const type = /^(D|devDependencies)$/.test(argv.type) ? 'devDependencies': 'dependencies';
      console.log('add is not implemented yet.');
      process.exit();
    });

    /**
     * task: "upgrade" (updates all deps then runs `yarn` upgrade)
     */

    app.task('upgrade', ['installer'], async () => {
      if (argv.lint === true) app.lint(argv.types, argv);
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
        if (report.types.length) {
          error(`${colors.bold(name)} is specified in "${report.types.join(', ')}" but is not used anywhere`);
          console.log(`  in your project (run ${colors.dim('$ deps clean')} to remove unused deps)`);
        } else {
          error(`${colors.bold(name)} is not used anywhere in ${pkgName}, and is not in package.json.`);
        }
      } else {
        const types = Object.keys(report.files);
        const files = [];
        types.forEach(type => files.push(...report.files[type]));

        const list = rpt.format(files, { color: 'yellow', type: 'inline' });
        const singular = utils.singularize(report.types[0]);
        info(`${name} is a ${colors.cyan(singular)}, used in ${list}`);
      }
      return Promise.resolve(null);
    });

    /**
     * task: "prompt-installer"
     */

    app.task('installer', async () => {
      app.installer = store.get('config.installer') || 'npm';
      store.set('config.installer', 'npm');
      // let question = prompts.find(p => p.name === 'installer');
      // let answers = await enquirer.prompt(question);
      // if (answers.installer) {
      //   app.installer = answers.installer;
      // }
      return Promise.resolve(null);
    });

    /**
     * task: "prompt-install"
     */

    app.task('prompt-missing', ['installer'], async () => {
      if (app.report.missingCount === 0) {
        utils.ok('no dependencies are missing');
        return Promise.resolve(null);
      }

      const question = prompts.find(p => p.name === 'install');
      question.choices = utils.createChoices(app);

      const answers = await enquirer.prompt(question);
      if (answers.install) {
        return install(app, argv, answers.install);
      }

      return Promise.resolve(null);
    });

    /**
     * task: "prompt-install"
     */

    app.task('prompt-unused', async () => {
      if (app.report.unusedCount === 0) {
        utils.ok('no dependencies are unused');
        return Promise.resolve(null);
      }

      const question = prompts.find(p => p.name === 'unused');
      question.choices = utils.createChoices(app, 'unused')
        .filter(ele => ele.choices.length > 0);

      const answers = await enquirer.prompt(question);

      if (answers.unused && answers.unused.length > 0) {
        app[kUnused] = answers.unused;
        return app.build('clean');
      }

      app.removeUnused = false;
      return Promise.resolve(null);
    });

    /**
     * task: "clean"
     */

    app.task('clean', ['remove-unused']);
    app.task('remove-unused', async () => {
      const pkgPath = app.pkg.path;
      let contents = fs.readFileSync(pkgPath, 'utf8');
      let newline = '';

      if (contents.endsWith('\n')) {
        contents = contents.trim();
        newline = '\n';
      }

      const pkg = JSON.parse(contents);
      const omit = [].concat(app[kUnused] || []);
      const removed = {};

      for (const key of Object.keys(pkg)) {
        removed[key] = [];

        if (utils.validTypes.includes(key)) {
          const obj = pkg[key];

          for (const name of omit) {
            if (obj[name]) {
              removed[key].push(name);
              delete obj[name];
            }
          }
        }
      }

      return write(app.pkg.path, JSON.stringify(pkg, null, 2))
        .then(() => {
          Object.keys(removed).forEach(type => {
            if (removed[type].length) {
              utils.ok(`removed: "${removed[type].join(', ')}" from ${type} in package.json`);
            }
          });
        })
        .catch(async err => {
          // restore original package contents if an error occurs
          await write(app.pkg.path, contents + newline);
          return Promise.reject(err);
        });
    });

    /**
     * task: "default"
     */

    app.task('default', async () => {
      const tasks = getTasks(app, argv);
      if (tasks.length) {
        await app.build(tasks);
      }
      app.emit('done');
      return Promise.resolve(null);
    });
  };
};

function getTasks(app, argv) {
  const names = utils.pick(argv, Object.keys(app.tasks));
  const arr = Object.keys(names).filter(name => Boolean(argv[name]));
  return arr.length > 0 ? arr : ['lint'];
}
