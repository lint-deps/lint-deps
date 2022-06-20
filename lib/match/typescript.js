import ts from 'typescript';

export const parseTypescript = (file, input, parserOptions) => {
  console.log([file.path]);
  // const sourceFile = ts.createSourceFile(file.path, input, ts.ScriptTarget.Latest);
  // const allRootNames = [file.path];

  // const options = testSupport.createCompilerOptions({
  //   noResolve: true,
  //   generateCodeForLibraries: false
  // });

  // const program = ts.createProgram([file.path], {
  //   // target: ts.ScriptTarget.Latest,
  //   // module: ts.ModuleKind.ESNext,
  //   // ...options
  // });

  // console.log(sourceFile);
  // console.log(program);

  // const checker = program.getTypeChecker();
  const output = [];

  // // Visit every sourceFile in the program
  // for (const sourceFile of program.getSourceFiles()) {
  //   if (!sourceFile.isDeclarationFile) {
  //     // Walk the tree to search for classes
  //     ts.forEachChild(sourceFile, visit);
  //   }
  // }

  /** visit nodes finding exported classes */
  // const visit = node => {
  //   console.log(node);

  //   ts.forEachChild(node, visit);
  // };

  // ts.forEachChild(sourceFile, visit);
  console.log('---');
  return output;
};

export default parseTypescript;
