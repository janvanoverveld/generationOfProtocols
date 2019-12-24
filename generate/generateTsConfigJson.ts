
function returnTsConfigJson(roles:string[]){
   let tsConfigJson:string =
`{
    "compilerOptions": {
      "target": "es2018",
      "module": "commonjs",
      "outDir": "./js",
      "strict": true,
      "noImplicitAny": false,
      "strictNullChecks": true,
      "resolveJsonModule": true,
      "esModuleInterop": true
    },
    "files": [
      "mediator.ts",
      "receiveMessageServer.ts",
      "sendMessage",
      "Message.ts",
      "globalObjects.ts",`

   for ( const r of roles ){
       tsConfigJson += `
      "${r}.ts",
      "start${r}.ts",`
   }
tsConfigJson +=
`
      "start.ts"
    ]
}`;

   return tsConfigJson;
}

export {returnTsConfigJson}