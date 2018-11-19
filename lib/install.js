'use strict';

const fs = require('fs');
const util = require('util');
const write = require('write');
const fix = require('./fix');

module.exports = async function(app, argv, deps) {
  if (!deps) return Promise.resolve(null);

  let pkgBuffer = fs.readFileSync(app.pkg.path);
  let installer = app.installer;
  let depsInstaller = app[installer];

  if (typeof depsInstaller === 'undefined') {
    return Promise.reject(new Error('cannot get installer: ' + util.inspect(installer)));
  }

  const installEach = async() => {
    let pending = [];

    for (let type of Object.keys(deps)) {
      let modules = mapAliases(app, deps[type]);
      let install = util.promisify(depsInstaller[type]);

      if (typeof install !== 'function') {
        return Promise.reject(new Error('cannot get installer: ' + app.installer));
      }

      pending.push(install(modules));
    }

    return Promise.all(pending);
  };

  return fix(app, argv)
    .then(() => installEach())
    .catch(err => {
      // if installation failed, ensure that package.json is not modified
      if (err.code !== 0) {
        write.sync(app.pkg.path, pkgBuffer);
        console.log(err);
        process.exit(err.code);
      }

      err.installer = app.installer;
      throw err;
    });
};

/**
 * Map globally defined "aliases" to the modules.
 * Aliases allow you to override the version of a
 * module, or the module name.
 */

function mapAliases(app, names) {
  let aliases = app.option('alias') || {};

  return names.reduce((acc, name) => {
    if (aliases[name]) {
      acc = acc.concat(aliases[name]);
    } else {
      acc.push(name);
    }
    return acc;
  }, []);
}
