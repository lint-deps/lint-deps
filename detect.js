'use strict';

var path = require('path');
var relative = require('relative');
var detective = require('detective');
var mapFiles = require('map-files');
var mapReqs = require('map-requires');
var filter = require('filter-object');

// var requires = detective(src);
// console.dir(requires);

var files = mapFiles('test/uppercut/**/*.js');

function reqs(o) {
  var arr = Object.keys(o);
  return arr.reduce(function(acc, key) {
    var value = o[key];
    var requires = detective(value.content);
    value.matches = {};

    requires.forEach(function(req) {

      console.log(req)
      var name = path.basename(req);
      if (/^\./.test(req)) {
        var match = filter(o, name);
        if (match && match[name] && match[name].hasOwnProperty('path')) {
          var a = path.resolve(value.path);
          var b = path.resovle(match[name].path)
      console.log(relative.toBase(match[name].path, value.path));
        }
      }
    });

    value.requires = requires;
    acc[key] = value;
    return acc;
  }, {});
}

var r = reqs(files);

// console.log(r)