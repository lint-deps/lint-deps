'use strict';

const fs = require('fs');
const write = require('write');
const omitEmpty = require('omit-empty');
const utils = require('./utils');

/**
 * Remove unused dependencies
 */

module.exports = async(app, argv) => {
  let pkgBuffer = fs.readFileSync(app.pkg.path);
  let report = app.report || app.lint('*', argv);
  let obj = JSON.parse(pkgBuffer);
  let unused = [];
  let count = 0;

  report.types.forEach(type => {
    const keys = report[type].unused;
    count += keys.length;
    unused.push({ name: type, modules: keys });
    obj[type] = utils.omit(obj[type], keys);
  });

  if (count === 0) {
    return Promise.resolve(0);
  }

  let pkg = omitEmpty(obj);
  app.pkg.data = pkg;

  return write(app.pkg.path, JSON.stringify(pkg, null, 2))
    .then(() => unused)
    .catch(async err => {
      await write(app.pkg.path, pkgBuffer);
      return Promise.reject(err);
    });
};
