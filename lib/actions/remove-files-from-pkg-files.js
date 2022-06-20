import fs from 'fs';
import path from 'path';
import write from 'write';
import colors from 'ansi-colors';
import enquirer from 'enquirer';

const action = async app => {
  const pkgpath = path.resolve(app.root, 'package.json');
  const pkg = { ...app.pkg.data };
  const files = [];

  if (!pkg.files) {
    return;
  }

  for (const name of pkg.files) {
    const absolute = path.resolve(app.root, name);

    if (fs.existsSync(absolute)) {
      files.push(name);
    }
  }

  if (files.length < pkg.files.length) {
    pkg.files = files;
    fs.writeFileSync(pkgpath, JSON.stringify(pkg, null, 2));
    app.loadPackage();
  }
};

export default action;
