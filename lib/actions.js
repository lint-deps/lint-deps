'use strict';

var fs = require('fs');
var each = require('async-each');
var utils = require('./utils');

exports.remove = function(app, cb) {
  var pkg = utils.clone(app.pkg.data);
  var orig = JSON.stringify(pkg, null, 2);
  var unused = app.get('actions.unused');
  var len = unused.length;
  var idx = -1;
  var keys = {};

  while (++idx < len) {
    var ele = unused[idx];
    if (ele.name === 'none') {
      keys = [];
      break;
    }
    if (!ele.type || ele.name === 'all') {
      continue;
    }

    utils.union(keys, ele.type, ele.name);
  }

  for (var key in keys) {
    if (keys.hasOwnProperty(key)) {
      var obj = utils.omit(utils.get(pkg, key), keys[key]);

      var msg = utils.log.gray(keys[key].join(', '));
      utils.log.ok('removed from ' + key + ':', msg);

      if (Object.keys(obj).length) {
        pkg[key] = obj;
      } else {
        delete pkg[key];
      }
    }
  }

  var str = JSON.stringify(pkg, null, 2);
  if (str !== orig) {
    fs.writeFileSync(app.pkg.path, str);
  }
  cb();
};

exports.install = function(app, cb) {
  var groups = {};
  var installer = app.get('actions.installer');
  var install = app.get('actions.install');
  var len = install.length;
  var idx = -1;

  while (++idx < len) {
    var ele = install[idx];
    if (!ele.type) continue;
    utils.union(groups, ele.type, ele.name);
  }

  var keys = Object.keys(groups);

  each(keys, function(type, next) {
    var method = type;
    if (type === 'unknown') {
      method = (installer === 'npm') ? 'install' : 'devDependencies';
    }
    app[installer][method](groups[type], next);
  }, cb);
};
