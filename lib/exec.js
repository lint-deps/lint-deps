// Sourced from shelljs http://github.com/arturadib/shelljs
const child = require('child_process');
const wrap = require('word-wrap');

module.exports = function exec(cmd, callback) {
  var output = '';

  var command = child.exec(cmd, function (err) {
    if (callback) {
      callback(err, output);
    }
  });

  command.stdout.on('data', function (data) {
    output += data;
    process.stdout.write(data);
  });

  command.stderr.on('data', function (data) {
    output += data;
    process.stdout.write(data);
  });

  return command;
};