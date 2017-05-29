
module.exports = function(verb) {
  verb.task('default', function(cb) {
    console.log('verb');
    cb();
  });

  verb.task('foo', function(cb) {
    console.log('foo');
    cb();
  });

  verb.register('docs', function(docs) {
    docs.task('foo', function(cb) {
      console.log('docs > foo');
      cb();
    });
  });
};
