import spawn from 'cross-spawn';

export const exec = (mgr, cmds = [], args = [], options = {}) => {
  const opts = { cwd: process.cwd(), stdio: 'inherit', ...options };

  return new Promise((resolve, reject) => {
    spawn(mgr, [].concat(cmds).concat(args), opts)
      .on('error', reject)
      .on('close', (code, err) => {
        if (err) {
          reject(err);
        } else {
          resolve(code);
        }
      });
  });
};

export const npm = (cmds = [], args = [], options = {}) => {
  return exec('npm', cmds, args, options);
};

export const npmInstall = (args = [], options = {}) => {
  return npm('install', args, options);
};

export const yarn = (cmds = [], args = [], options = {}) => {
  return exec('yarn', cmds, args, options);
};

export const yarnInstall = (args = [], options = {}) => {
  return yarn('add', args, options);
};

npm.install = npmInstall;
yarn.install = yarnInstall;

export default { npm, yarn };
