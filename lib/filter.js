
module.exports = function filter(arr, exclusions) {
  var matches = [];
  arr.map(function(item) {
    exclusions.forEach(function(exclusion) {
      if (item.indexOf(exclusion) === -1) {
        matches.push(item);
      }
    });
  });
  return matches;
};