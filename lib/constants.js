// regular expressions
export const HASH_BANG_REGEX = /#!\/usr[^\n'",]+/gm;
export const LINE_COMMENT_REGEX = /^\s*\/\/[^\n]+/gm;

// common variables
export const DEFAULT_EXTS = ['js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx'];
export const DEFAULT_DEV_NAMES = [
  'example.{js,jsx,ts}',
  'test.{js,jsx,ts}',
  'benchmark.{js,ts}',
  'benchmarks.{js,ts}',
  '*.stories.{js,jsx,ts}',
  '*.test.{js,jsx,ts}'
];

export const DEFAULT_DEV_DIRS = [
  '__tests__',
  'bench',
  'benchmarks',
  'build',
  'coverage',
  'examples',
  'packages',
  'scripts',
  'spec',
  'test',
  'tests'
];

export const DEFAULT_IGNORED = [
  '.git',
  '.github',
  '.nyc_output',
  '_*',
  'node_modules',
  'packages',
  'temp',
  'test/fixtures',
  'tmp',
  'vendor',
  '*.d.ts'
];
