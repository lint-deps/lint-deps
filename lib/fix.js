'use strict';

const fs = require('fs');
const get = require('get-value');
const write = require('write');
const utils = require('./utils');

module.exports = async(app, argv) => {
  if (!app.report) {
    return Promise.resolve(null);
  }

  let pkgBuffer = fs.readFileSync(app.pkg.path);
  let pkg = JSON.parse(pkgBuffer);
  let missing = get(app, 'report.dependencies.missing.modules') || [];
  let deps = Object.keys(get(app, 'report.dependencies.modules') || {});

  let ignored = app.state.ignored;
  deps = utils.union([], deps, missing).filter(n => !ignored.includes(n));
  deps.sort();

  for (let type of app.report.types) {
    if (type === 'dependencies') continue;
    let report = app.report[type];
    let modules = Object.keys(report.modules);

    if (deps.length) {
      modules = modules.filter(name => deps.indexOf(name) === -1);
    }

    if (pkg[type]) {
      pkg[type] = utils.pick(pkg[type], modules);
    }
  }

  try {
    // await write(app.pkg.path, JSON.stringify(pkg, null, 2));
  } catch (err) {
    await write(app.pkg.path, pkgBuffer);
    return Promise.reject(err);
  }
};
