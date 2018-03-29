'use strict';

const fs = require('fs');
const util = require('util');
const write = require('write');
const fix = require('./fix');

module.exports = async function(app, argv, choices) {
  if (!choices) {
    return Promise.resolve(null);
  }

  const pkgBuffer = fs.readFileSync(app.pkg.path);
  const installer = app.installer;
  const depsInstaller = app[installer];

  if (typeof depsInstaller === 'undefined') {
    return Promise.reject(new Error('cannot get installer: ' + util.inspect(installer)));
  }

  const installEach = async() => {
    for (const key of Object.keys(choices)) {
      const modules = mapAliases(app, choices[key]);
      const install = util.promisify(depsInstaller[key]);

      if (typeof install !== 'function') {
        return Promise.reject(new Error('cannot get installer: ' + app.installer));
      }
      await install(modules);
    }
  };

  return fix(app, argv).then(async() => {
    return await installEach()
      .catch(err => {
        // if installation failed, ensure that package.json is not modified
        if (err.code !== 0) {
          write.sync(app.pkg.path, pkgBuffer);
          process.exit(err.code);
        }

        err.installer = app.installer;
        throw err;
      });
  });
};

/**
 * Map globally defined "aliases" to the modules.
 * Aliases allow you to override the version of a
 * module, or the module name.
 */

function mapAliases(app, names) {
  const aliases = app.option('alias') || {};

  return names.reduce(function(acc, name) {
    if (aliases[name]) {
      acc = acc.concat(aliases[name]);
    } else {
      acc.push(name);
    }
    return acc;
  }, []);
}
