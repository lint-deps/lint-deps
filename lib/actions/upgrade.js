import install from './install-missing.js';

export default async (app, options) => {
  const deps = {};

  if (options.lint === true) {
    await app.lint(options.types, options);
  }

  for (const type of Object.keys(app.pkg.data)) {
    const opts = app.typeOptions(type) || {};
    deps[type] = [];

    if (!app.options.types.includes(type)) {
      continue;
    }

    for (const name of Object.keys(app.pkg.data[type])) {
      const version = app.pkg.data[type][name];

      if (/^[^:]+:/.test(version)) {
        deps[type].push(`${version.replace(/^[^:]+:/, '')}`);
        continue;
      }

      if (opts.lock && hasOwnProperty.call(opts.lock, name)) {
        if (opts.lock[name] === true) {
          continue;
        }

        deps[type].push(`${name}@${opts.lock[name]}`);
        continue;
      }

      deps[type].push(`${name}@latest`);
    }
  }

  return install(app, options, deps);
};
