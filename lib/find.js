const _ = require('lodash');


/**
 * Find require() statements. Locally required
 * libs will not be returned in the result.
 *
 * @title findRequires
 * @param   {String}  src  The string to search
 * @return  {Array}        Returns an array of required modules
 */

exports.requires = function(str) {
  var arr = [];
  // Basic require statement regex
  var re = /require\(['"]([^"']+)['"]\)/g;
  if(re.test(str)) {
    _.map(str.match(re), function(ea) {
      ea = ea.replace(re, '$1');
      if(!/\.\//.test(ea)) {
        arr.push(ea);
      }
    });
  }
  return _.flatten(arr);
};

/**
 * Find grunt.loadTasks() and grunt.loadNpmTasks().
 *
 * @title findTasks
 * @param   {String}  src  The string to search
 * @return  {Array}        Returns an array of required modules
 */

exports.tasks = function(str) {
  var arr = [];
  // Grunt tasks
  var re = /loadTasks|loadNpmTask\(['"]([^"']+)['"]\)/gm;
  if(re.test(str)) {
    _.map(str.match(re), function(ea) {
      ea = ea.replace(re, '$1');
      if(!/\.\//.test(ea) && !/^task$/i.test(ea)) {
        arr.push(ea);
      }
    });
  }
  return _.flatten(arr);
};