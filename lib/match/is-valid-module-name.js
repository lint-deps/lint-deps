import validateName from 'validate-npm-package-name';

const isValidPackageName = name => {
  const { validForNewPackages, validForOldPackages } = validateName(name);
  return validForNewPackages === true && validForOldPackages === true;
};

const isValidModuleName = (name, file) => {
  if (!name || typeof name !== 'string') {
    return false;
    // const err = new TypeError('Expected name to be a string');
    // err.name = name;
    // err.path = file.path;
    // throw err;
  }

  const char = name[0];
  if (char === '/' || char === '.') return false;
  if (char === '@') {
    // "@foo/bar/baz" => "@foo/bar"
    name = name.split('/').slice(0, 2).join('/');
  } else if (name.includes('/')) {
    // "foo/bar" => "foo"
    name = name.slice(0, name.indexOf('/'));
  }

  return isValidPackageName(name);
};

export default isValidModuleName;
