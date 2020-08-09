'use strict';

const fs = require('fs');
const util = require('util');
const write = require('write');
const fix = require('./fix');
const { mapAliases } = require('./utils');

module.exports = async (app, argv, deps) => {
  if (!deps) return Promise.resolve(null);

  const pkgBuffer = fs.readFileSync(app.pkg.path);
  const installer = app.installer;
  const depsInstaller = app[installer];

  if (typeof depsInstaller === 'undefined') {
    return Promise.reject(new Error(`cannot get installer: ${util.inspect(installer)}`));
  }

  const installEach = async () => {
    const pending = [];

    for (const type of Object.keys(deps)) {
      const modules = mapAliases(app, deps[type]);
      const install = util.promisify(depsInstaller[type]);

      if (typeof install !== 'function') {
        return Promise.reject(new Error(`cannot get installer: ${app.installer}`));
      }

      pending.push(install(modules));
    }

    return Promise.all(pending);
  };

  return fix(app, argv)
    .catch(async err => {
      // if installation failed, ensure that package.json was not modified
      await write(app.pkg.path, pkgBuffer);

      console.error(err);
      err.installer = app.installer;
      return Promise.reject(err);
    })
    .then(() => installEach());
};
