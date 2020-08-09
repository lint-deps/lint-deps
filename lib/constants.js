'use strict';

module.exports = {
  REQUIRES_REGEX: /(?:(?:\\['"`][\s\S])*?(['"`](?=[\s\S]*?require\s*\(['"`][^`"']+?[`'"]\)))(?:\\\1|[\s\S])*?\1|\s*(?:(?:var|const|let)?\s*([_.\w/$]+?)\s*=\s*)?require\s*\(([`'"])((?:@([^/]+?)\/([^/]*?)|[-.@\w/$]+?))\3(?:, ([`'"])([^\7]+?)\7)?\);?)/g,
  HASH_BANG_REGEX: /#!\/usr[^\n'",]+/gm,
  LINE_COMMENT_REGEX: /^\s*\/\/[^\n]+/gm
};
