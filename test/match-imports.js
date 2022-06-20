
// const strings = [
//   'import "../bar"',
//   'import \'../bar\'',
//   'import foo from \'../bar\'',
//   'import foo from "@scoped/package-name"',
//   'import foo from "not-scoped-package/folder-name"',
//   'import foo from "./local/lib/path.ts"',
//   'import { foo } from \'bar\'',
//   'import defaultExport from "module-name";',
//   "import {myExport} from '/modules/my-module.js';",
//   "import {foo, bar} from '/modules/my-module.js';",
//   "import myDefault, {foo, bar} from '/modules/my-module.js';",
//   `import {reallyReallyLongModuleExportName as shortName}
//   from '/modules/my-module.js';`,
//   `(async () => {
//   if (somethingIsTrue) {
//     const { default: myDefault, foo, bar } = await import('/modules/my-module.js');
//   }
// })();`,
//   'import * as path from "path";',
//   'import { foo as bar, baz as bat, lol } from \'quz\';',
//   'import foobar, { foo as FOO, bar } from \'foobar\';',
//   'import * as name from "module-name";',
//   'import { export1 } from "module-name";',
//   'import { export1 as alias1 } from "module-name";',
//   'import { export1 , export2 } from "module-name";',
//   'import { foo , bar } from "module-name/path/to/specific/un-exported/file";',
//   'import { export1 , export2 as alias2 , [...] } from "module-name";',
//   'import defaultExport, { export1 [ , [...] ] } from "module-name";',
//   'import defaultExport, * as name from "module-name";',
//   'import "module-name";',
//   'var promise = import("module-name");',
//   `import {
//   reallyReallyLongModuleExportName as shortName,
//   anotherLongModuleName as short
// } from '/modules/my-module.js';`,
//   `(async () => {
//     if (somethingIsTrue) {
//       // import module for side effects
//       await import('/modules/my-module.js');
//     }
//   })();`,
//   `const main = document.querySelector("main");
//   for (const link of document.querySelectorAll("nav > a")) {
//     link.addEventListener("click", e => {
//       e.preventDefault();

//       import('/modules/my-module.js')
//         .then(module => {
//           module.loadPageInto(main);
//         })
//         .catch(err => {
//           main.textContent = err.message;
//         });
//     });
//   }`
// ];

// const input = `
// 'use strict';

// import fs from 'fs';
// import path from 'path';
// import Events from 'events';
// import readdir from '@folder/readdir';
// import xdg from '@folder/xdg';

// class LintDeps extends Events {
//   constructor(dir, options) {
//     super();
//     this.options = { ...options };
//     this.plugins = new Set();
//     this.ignored = this.options.ignored || ['tmp', 'temp', 'vendor', 'node_modules', '.git'];
//     this.paths = xdg({ ...this.options.xdg, subdir: 'lint-deps' });
//     this.dir = dir;
//   }

//   plugin(fn) {
//     this.plugins.add(fn);
//   }

//   async run(file) {
//     for (const fn of this.plugins) {
//       await fn(file);
//     }
//   }

//   async readdir(options) {
//     const ignored = [].concat(this.ignored);
//     const opts = { recursive: true, ...this.options, ...options };
//     const pending = new Set();
//     const files = [];

//     const push = promise => {
//       const p = promise.then(() => pending.delete(p));
//       pending.add(p);
//       return p;
//     };

//     const onDirectory = file => {
//       file.keep = file.recurse = !ignored.includes(file.name);
//     };

//     const onFile = file => {
//       push(this.run(file));
//       files.push(file);
//     };

//     await readdir(this.dir, { ...opts, onFile, onDirectory });
//     await Promise.all(pending);
//     return files;
//   }
// }

// export default (...args) => new LintDeps(...args);

// // const url = new URL(import.meta.url);
// // const cwd = path.dirname(url.pathname);
// // const deps = new LintDeps(process.cwd());

// // deps.plugin(file => {
// //   file.extname = path.extname(file.name);
// // });

// // deps.plugin(file => {
// //   file.contents = fs.readFileSync(file.path);
// // });

// // deps.readdir().then(files => {
// //   console.log(files);
// // })
// `;

// matchImports(input);

// for (const input of strings) {
//   matchImports(input);
//   // const match = UNNAMED_IMPORTS().exec(input) || NAMED_IMPORTS().exec(input);
//   // if (!match) {
//   //   console.log([input]);
//   // }
// }
