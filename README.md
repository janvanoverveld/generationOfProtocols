

This is the protocol code generator

To execute the code make sure you have installed node.js and TypeScript (globally).
Also Typescript must be linked.

npm install -g typescript
npm link typescript

After cloning the github repo, install the additional modules specified in package.json.

1. first run 'npm install' to install the dependencies from package.json (node_modules is created)
2. 'npm start' runs the application

With the tsc command the .ts files are transpiled to .js files into the js directory.

After running the program, a directory next to the root directory of this git repository is created.
This repo has the name, generatedROLE1ROLE2, where ROLE1 and ROLE2 wille be the roles involved 
in the protocol. (like for example Alice and Bob).

