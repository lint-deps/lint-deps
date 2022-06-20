#!/usr/bin/env node

const start = Date.now();
import fs from 'node:fs';
import path from 'node:path';
import colors from 'ansi-colors';
import minimist from 'minimist';
import bootstrap from './bootstrap.js';
import { isEmpty } from '../lib/utils.js';

const dir = path.dirname(new URL(import.meta.url).pathname);
const pkg = JSON.parse(fs.readFileSync(path.resolve(dir, '../package.json')));
const check = colors.green(colors.symbols.check);
const argv = minimist(process.argv.slice(2));

console.log(colors.bold('running lint-deps'), colors.blue(`v${pkg.version}`));
process.on('exit', () => console.log('', check, `finished in ${colors.magenta(`${Date.now() - start}ms`)}`));

bootstrap(process.cwd(), argv)
  .then(app => {
    if (isEmpty(app.unused) && isEmpty(app.missing)) {
      console.log('', check, 'no unused or missing dependencies found');
    }
  })
  .catch(console.error);
