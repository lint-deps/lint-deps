'use strict';

const get = require('get-value');
const pick = require('object.pick');
const write = require('write');
const utils = require('./utils');

module.exports = async(app, argv) => {
  if (!app.report) {
    return Promise.resolve(null);
  }

  const pkg = Object.assign({}, app.pkg.data);
  const missing = get(app, 'report.dependencies.missing.modules') || [];
  let deps = Object.keys(get(app, 'report.dependencies.modules') || {});

  deps = utils.union([], deps, missing);
  deps.sort();

  for (const type of app.report.types) {
    if (type === 'dependencies') {
      continue;
    }
    const report = app.report[type];
    let modules = Object.keys(report.modules);

    if (deps.length) {
      modules = modules.filter(name => deps.indexOf(name) === -1);
    }
    if (pkg[type]) {
      pkg[type] = pick(pkg[type], modules);
    }
  }

  return await write(app.pkg.path, JSON.stringify(pkg, 2));
};
