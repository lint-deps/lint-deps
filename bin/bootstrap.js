import fs from 'fs';
import path from 'path';
import match from '../lib/match/index.js';

import report from '../lib/report/index.js';
import { addFilesToPkgFiles, removeFilesFromPkgFiles, install, remove } from '../lib/actions/index.js';
import { DEFAULT_EXTS } from '../lib/constants.js';
import { LintDeps } from '../index.js';

import {
  isInFiles,
  isInDirs,
  isDependency,
  isDevDependency,
  isEmpty,
  removeDevDependency
} from '../lib/utils.js';

const walk = (app, file, isLocal = false) => {
  if (!file.isFile()) return;
  file.isLocal = isLocal;
  file.contents = fs.readFileSync(file.path);

  file.modules = match.modules(file, app.options)?.map?.(token => token.name) || [];
  file.type ||= (app.isProductionFile(file) ? 'dependencies' : 'devDependencies');

  file.missing = [];
  app.missing[file.type] ||= [];

  const deps = new Set(app.modules[file.type] || []);
  const pkgDeps = app.pkg.data[file.type] || {};

  for (const name of file.modules) {
    deps.add(name);

    if (!pkgDeps[name]) {
      if (file.type === 'dependencies' && isDevDependency(app, name)) {
        removeDevDependency(app, name);
      }

      if (!isDependency(app, name)) {
        file.missing.push(name);
        app.missing[file.type].push(name);
      }
    }
  }

  app.modules[file.type] = [...deps].sort();
};

const bootstrap = async (cwd, options) => {
  const app = new LintDeps(cwd, options);

  app.use([`**/*.{${DEFAULT_EXTS.join(',')}}`, 'bin/!(*.*)'], async (file, app) => {
    try {
      const missingPkgFiles = [];

      walk(app, file);

      if (file.local) {
        file.isLocal = true;

        for (const f of file.local) {
          f.isLocal = true;
          app.files.push(f);
          f.type = file.type;
          f.isMatch = file.isMatch;

          walk(app, f, true);

          // console.log({
          //   'f.path': f.path,
          //   'f.relative': f.relative,
          //   pkg_dirs: app.pkg.dirs,
          //   pkg_files: app.pkg.files,
          //   pkg_data: app.pkg.data
          // });

          const isMain = path.normalize(app.pkg.data.main) === path.normalize(f.relative);

          if (!isMain && !isInFiles(app, f) && !isInDirs(app, f)) {
            missingPkgFiles.push({ file: f, parent: file, local: true });
          }
        }
      }

      if (missingPkgFiles.length) {
        await addFilesToPkgFiles(app, missingPkgFiles);
      }

    } catch (err) {
      console.error(err);
      console.error('Invalid file: ' + file.path);
    }
  });

  app.use('package.json', (file, app) => {
    for (const appname of ['verb', 'assemble', 'generate', 'update']) {
      if (file.data[appname]) {
        for (const name of file.data[appname].plugins || []) {
          file.modules ||= [];
          file.modules.push(name);

          if (!file.data.devDependencies?.[name]) {
            file.missing ||= [];
            file.missing.push(name);
            app.missing.devDependencies ||= [];
            app.missing.devDependencies.push(name);
          }
        }
      }
    }
  });

  await app.readdir();
  await removeFilesFromPkgFiles(app);
  await app.cleanupDepsNames();

  const { missing } = await app.findMissing();
  app.unused = await app.findUnused();
  app.missing = missing;

  if (!isEmpty(app.unused)) console.info(await report.unused(app));
  if (!isEmpty(app.missing)) console.info(await report.missing(app));

  if (app.options.prompt !== false) {
    console.log();
    if (!isEmpty(app.unused)) await remove(app);
    if (!isEmpty(app.missing)) await install(app);
  }

  // console.log('modules:', app.modules);
  // console.log('---');
  // console.log('Unused devDeps:', app.findUnusedDevDependencies());
  // console.log('---');
  // console.log('Unused deps:', app.findUnusedDependencies());

  return app;
};

export default bootstrap;
