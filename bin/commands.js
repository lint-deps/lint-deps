'use strict';

var log = require('log-utils');
var omit = require('object.omit');
var pick = require('object.pick');
var writeJson = require('write-json');
var DataStore = require('data-store');
var Enquirer = require('enquirer');
var removeUnused = require('./remove-unused');
var utils = require('../lib/utils');
var rpt = require('../lib/report');
var install = require('./install');

module.exports = function(argv) {
  var enquirer = new Enquirer({options: argv});
  var store = new DataStore('lint-deps');

  enquirer.register('confirm', require('prompt-confirm'));
  enquirer.register('checkbox', require('prompt-checkbox'));
  enquirer.register('radio', require('prompt-radio'));

  return function(cli) {
    var pkgName = cli.pkg.get('name');

    if (argv.deps) {
      cli.option('dependencies.files.patterns', argv.deps);
    }
    if (argv.dev) {
      cli.option('devDependencies.files.patterns', argv.dev);
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

    cli.installer = store.get('config.installer');

    /**
     * Listen for answers
     */

    enquirer.on('prompt', function(prompt) {
      prompt.on('answer', function(answer) {
        if (prompt.question.name === 'installer') {
          if (prompt.question.answer === 'yarn' && !utils.isInstalled('yarn')) {
            console.log(log.error, 'yarn could not be found in global npm modules,');
            console.log(log.error, 'please install yarn first to continue with');
            console.log(log.error, 'this option');
            process.exit(1);
          }
          prompt.question.answer = prompt.question.answer || cli.installer;
          store.set('config.installer', prompt.question.answer);
        }
      });
    });

    /**
     * Prompt the user to decide which installer to use (npm or yarn).
     */

    enquirer.question('installer', 'What is your preferred installer?', {
      type: 'radio',
      choices: ['npm', {name: 'yarn', disabled: true}],
      when: function() {
        return typeof store.get('config.installer') !== 'string';
      }
    });

    /**
     * task: "lint"
     */

    cli.task('lint', function(cb) {
      cli.lint(argv.types, argv);
      var tasks = [];

      console.log(rpt.unused(cli.report));
      console.log(rpt.missing(cli.report));

      if (cli.report.unusedCount > 0) {
        tasks.push('prompt-unused');
      } else {
        log.ok('no dependencies are unused');
      }

      if (cli.report.missingCount > 0) {
        tasks.push('prompt-install');
      } else {
        log.ok('no dependencies are missing');
      }

      if (argv.update) {
        cli.build('install', cb);
        return;
      }

      if (tasks.length === 0) {
        cb();
        return;
      }

      cli.build(tasks, cb);
    });

    /**
     * task "update"
     */

    cli.task('update', function(cb) {
      var pkg = Object.assign({}, cli.pkg.data);
      pkg = omit(pkg, utils.validTypes);
      cli.pkg.data = pkg;

      writeJson(cli.pkg.path, pkg, function(err) {
        if (err) {
          cb(err);
          return;
        }
        cli.build('lint', cb);
      });
    });

    /**
     * task: "upgrade" (updates all deps then runs `yarn` upgrade)
     */

    cli.task('upgrade', function(cb) {
      cli.build('update', function(err) {
        if (err) {
          cb(err);
          return;
        }

        if (store.get('config.installer') === 'npm') {
          cli.npm.latest(cb);
        } else {
          cli.yarn.upgrade(cb);
        }
      });
    });

    /**
     * task: "why"
     */

    cli.task('why', function(cb) {
      var name = argv.why;
      var report = cli.why(name, argv);

      bold('Why does "%s" exist in %s?', name, pkgName);
      if (report.count === 0) {
        error('"%s is not used anwhere in %s', name, pkgName);
        if (report.types.length) {
          error(`Specified in "${report.types.join(', ')}"`);
          error('Run "$ deps clean" to remove unused deps');
        } else {
          error('"%s is not defined in package.json', name);
        }
        cb();
        return;
      }

      var types = Object.keys(report.files);
      types.forEach(function(type) {
        var list = rpt.format(report.files[type], {
          color: 'yellow',
          type: 'inline',
        });

        log.ok(`Used in "${type}" files: ${list}`);
      });

      report.types.forEach(function(type) {
        log.ok(`Specified in package.json "${type}"`);
      });
      cb();
    });

    /**
     * task: "prompt-installer"
     */

    cli.task('installer', function(cb) {
      return enquirer.prompt('installer')
        .then(function(answers) {
          if (answers.installer) {
            cli.installer = answers.installer;
          }
        })
    });

    /**
     * task: "prompt-install"
     */

    cli.task('prompt-install', ['installer'], function(cb) {
      if (cli.report.missingCount === 0) {
        log.ok('no dependencies are missing');
        cb();
        return;
      }

      enquirer.question('install', 'Want to install missing packages?', {
        type: 'checkbox',
        radio: true,
        choices: utils.createChoices(cli),
        transform: function(answer) {
          if (answer) {
            var res = {};
            for (var i = 0; i < answer.length; i++) {
              var choice = this.choices.get(answer[i]);
              var name = choice.groupName;
              res[name] = res[name] || [];
              res[name].push(choice.name);
            }
            return res;
          }
        }
      });

      enquirer.prompt('install')
        .then(function(answers) {
          if (answers.install) {
            install(cli, argv, answers.install, cb);
          } else {
            cb();
          }
        })
        .catch(cb);
    });

    /**
     * task: "prompt-install"
     */

    cli.task('prompt-unused', function(cb) {
      if (cli.report.unusedCount === 0) {
        log.ok('no dependencies are unused');
        cb();
        return;
      }

      enquirer.question('unused', 'Want to remove unused packages?', {
        type: 'confirm'
      });

      enquirer.prompt('unused')
        .then(function(answers) {
          if (answers.unused) {
            cli.build('clean', cb);
          } else {
            cb();
          }
        });
    });

    /**
     * task: "clean"
     */

    cli.task('clean', function(cb) {
      removeUnused(cli, argv, function(err, unused) {
        handleError(err);
        if (unused === 0) {
          log.ok('no dependencies are unused');
        } else {
          unused.forEach(function(type) {
            var len = type.modules.length;
            if (len) {
              type.modules.forEach(function(name) {
                log.ok(`removed "${name}" from package.json "${type.name}"`);
              });
            }
          });
        }
        cb();
      });
    });

    /**
     * task: "default"
     */

    cli.task('default', function(cb) {
      var tasks = getTasks(cli, argv);
      if (tasks.length) {
        cli.build(tasks, cb);
      } else {
        cb();
      }
    });
  };
};

function getTasks(cli, argv) {
  var names = pick(argv, Object.keys(cli.tasks));
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

function bold() {
  var args = [].slice.call(arguments);
  args[0] = log.bold(args[0]);
  console.log.apply(console, args);
}

function error() {
  var args = [].slice.call(arguments);
  args[0] = log.error + ' ' + args[0];
  console.log.apply(console, args);
}

function handleError(err) {
  if (err) {
    console.error(err);
    process.exit(1);
  }
}
