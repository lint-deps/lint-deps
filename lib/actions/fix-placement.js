import fs from 'fs';
import get from 'get-value';
import write from 'write';
import { pick } from '../utils.js';

/**
 * Fix placement of dependencies.
 * Ensures that devDependencies are not in dependencies, and vice versa.
 */

export default async (app, options) => {
  if (!app.report) {
    return Promise.resolve(null);
  }

  const pkgPath = app.pkg.path;
  const pkgBuffer = fs.readFileSync(pkgPath);
  const pkg = JSON.parse(pkgBuffer);
  const missing = get(app, 'report.dependencies.missing.modules') || [];
  const modules = get(app, 'report.dependencies.modules') || {};
  const keys = Object.keys(modules);

  const isIgnored = app.state.ignored || (() => false);
  const deps = [...new Set([...keys, ...missing])].filter(n => isIgnored(n));
  deps.sort();

  for (const type of app.report.types) {
    if (type !== 'dependencies') {
      const report = app.report[type];
      const modules = Object.keys(report.modules).filter(name => !deps.includes(name));

      if (pkg[type]) {
        pkg[type] = pick(pkg[type], modules);
      }
    }
  }

  try {
    console.log(pkg);
    // await write(pkgPath, JSON.stringify(pkg, null, 2));
  } catch (err) {
    await write(app.pkg.path, pkgBuffer);
    return Promise.reject(err);
  }
};
