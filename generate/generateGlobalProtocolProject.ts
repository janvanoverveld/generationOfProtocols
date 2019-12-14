import {GlobalProtocolDefinition} from '../includedCustomLibraries/globalProtocolDefinition';
import {createLocalProtocolAPI} from '../localProtocolAPI/createLocalProtocolAPI';
import {readFile,writeFile,getEnumWithRoles} from '../includedCustomLibraries/sharedFunctions';
import * as fs from 'fs';

const fileNameGlobalObjects = 'globalObjects.src';
const fileNameMessages      = 'Message.src';
const fileNameExtraMessages = 'ExtraMessages.src';
const globalSourceLocation  = 'sources/_global/';

async function generateGlobalProtocolProject(protocolSpec:GlobalProtocolDefinition,targetLocation:string,extraSourceFilesLoc:string){
   console.log(`writing sourcefiles for ${extraSourceFilesLoc} `);
   const srcFiles              = fs.readdirSync(globalSourceLocation).filter((f)=>f.includes('.src'));
   const extraMessagesTxt      = await readFile(extraSourceFilesLoc + fileNameExtraMessages );
   for ( const srcFile of srcFiles ){
       // console.log(`writing sourcefile ${srcFile} `);
       let textFromSource = await readFile( globalSourceLocation + srcFile );
       if (srcFile === fileNameGlobalObjects){
           const roles:string[] = [];
           protocolSpec.protocol.forEach( (e) => roles.push(e.role) );
           textFromSource += getEnumWithRoles(roles);
       }
       if (srcFile === fileNameMessages){
           textFromSource += extraMessagesTxt;
       }
       const targetFileName = srcFile.search('json')>0?srcFile.replace('.src',''):srcFile.replace('.src','.ts');
       await writeFile(targetLocation + targetFileName,textFromSource);
   }
   //
   // process rest of extra files, specific for example. (the use of the protocol api, tsconfig, package.json, )
   const specificRepoSourceFiles = fs.readdirSync(extraSourceFilesLoc).filter((f)=>f.includes('.src')&&f!==fileNameExtraMessages);
   for ( const xSrcFile of specificRepoSourceFiles ){
       //console.log(`writing sourcefile ${xSrcFile} `);
       let textFromSource = await readFile( extraSourceFilesLoc + xSrcFile );
       let targetFileName = xSrcFile.search('json')>0?xSrcFile.replace('.src',''):xSrcFile.replace('.src','.ts');
       await writeFile(targetLocation + targetFileName,textFromSource);
   }
   //
   //
   console.log(`Generate the protocol api`);
   protocolSpec.protocol.forEach(
       proto => writeFile(targetLocation + proto.role + '.ts',createLocalProtocolAPI(proto))
   );
}

export {generateGlobalProtocolProject}
