const _ = require('lodash');


// Basic require statement regex
var moduleRegex = /require\(['"]([^"']+)['"]\)/g;

// Grunt tasks
var taskRegex = /loadNpmTasks\(['"]([^"']+)['"][\S]+/g;


/**
 * ## .requiredModules( str )
 *
 * Find require() statements. Locally required
 * libs will not be returned in the result.
 *
 * @method requiredModules
 * @param   {String} `str` The string to search
 * @return  {Array}        Returns an array of required modules
 */

var moduleArray = [];
exports.requiredModules = function(str, options) {
  options = options || {};
  var re = options.moduleRegex || moduleRegex;

  if(/require\(/.test(str)) {
    _.forEach(str.match(re), function(ea) {
      ea = ea.split(/['"]/)[1];
      if(!/^[\.\/]/.test(ea)) {
        moduleArray = moduleArray.concat(ea);
      }
    });
  }
  return _.unique(moduleArray);
};

/**
 * ## .gruntTasks( str )
 *
 * Find grunt.loadTasks() and grunt.loadNpmTasks().
 *
 * @method gruntTasks
 * @param   {String} `str`  The string to search
 * @return  {Array} array of grunt tasks
 */

exports.gruntTasks = function(str, options) {
  options = options || {};
  var re = options.taskRegex || taskRegex;
  var taskArray = [];

  if(re.test(str)) {
    str.match(re).forEach(function(ea) {
      ea = ea.replace(re, '$1');
      if(!/\.\//.test(ea) && !/^task$/i.test(ea)) {
        taskArray = taskArray.concat(ea);
      }
    });
  }
  return _.unique(taskArray);
};