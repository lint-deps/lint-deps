'use strict';

var omitEmpty = require('omit-empty');
var writeJson = require('write-json');
var omit = require('object.omit');

/**
 * Remove unused dependencies
 */

module.exports = async (app, argv) => {
  const report = app.report || app.lint('*', argv);
  const obj = Object.assign({}, app.pkg.data);
  const unused = [];
  let count = 0;

  report.types.forEach(function(type) {
    const keys = report[type].unused;
    count += keys.length;
    unused.push({name: type, modules: keys});
    obj[type] = omit(obj[type], keys);
  });

  if (count === 0) {
    return Promise.resolve(0);
  }

  const pkg = omitEmpty(obj);
  app.pkg.data = pkg;

  return await writeJson(app.pkg.path, pkg).then(() => unused);
};
