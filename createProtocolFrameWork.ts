import {GlobalProtocolDefinition} from './interfacesAndDatatypes/globalProtocolDefinition';
import {getProtocolApiForLocalProtocol} from './createLocalProtocolAPI';
import rimraf from 'rimraf';
import * as fs from 'fs';
import * as child from 'child_process';
import * as ts from "typescript";

const capitalize = (s:string) => s.charAt(0).toUpperCase() + s.slice(1);
const readFile:(path:string)=>Promise<string> = (p) => new Promise( (resolve, reject) => fs.readFile( p, 'utf8', (err, data) => { if (err) reject(err); else resolve(data); } ) );
const writeFile:(path:string,data:string)=>Promise<void> = (p,d) => new Promise( (resolve, reject) => fs.writeFile(p, d, 'utf8', (err) => { if (err) reject(err); else resolve(); }) );

const fileNameGlobalObjects = 'globalObjects.src';
const fileNameMessages      = 'Message.src';
const fileNameExtraMessages = 'ExtraMessages.src';
const globalSourceLocation  = 'sources/_global/';

function getEnumWithRoles(roles:string[]):string{
    let enumMembers:ts.EnumMember[]=[];
    roles.forEach((e)=>{
        enumMembers.push(
            ts.createEnumMember(
                ts.createIdentifier(`${e.toLowerCase()}`)
               ,ts.createStringLiteral(`${e.charAt(0).toUpperCase()}${e.slice(1).toLowerCase()}` ) )
        );
    });
    const resultFile = ts.createSourceFile("dummy.ts","",ts.ScriptTarget.Latest,false,ts.ScriptKind.TS);
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    const rolesEnum:ts.EnumDeclaration=ts.createEnumDeclaration(undefined, undefined, ts.createIdentifier('roles'), enumMembers);
    return printer.printNode( ts.EmitHint.Unspecified, rolesEnum, resultFile );
}

async function generateProjectFiles(protocolSpec:GlobalProtocolDefinition,targetLocation:string,extraSourceFilesLoc:string){
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
       proto => writeFile(targetLocation + proto.role + '.ts',getProtocolApiForLocalProtocol(proto))
   );
}

async function createProtocolFrameWork(sourceProtocolJson:string, repoSourceLocation:string, startTargetRepo:boolean ):Promise<void>
{
    console.log(`generatie repository o.b.v. ${sourceProtocolJson}`);
    const protocolData = await readFile ( repoSourceLocation+sourceProtocolJson);
    const protoSpec:GlobalProtocolDefinition = JSON.parse(protocolData);
    const rolePartOfName = capitalize(protoSpec.roles.sort().reduce( (ret,role) => ret+=capitalize(role) ));
    const targetRepoName = `../generated${rolePartOfName}/`;

    if (fs.existsSync(targetRepoName)) {
        rimraf.sync(targetRepoName);
        console.log(`${targetRepoName} is verwijderd`);
    }
    fs.mkdirSync(targetRepoName);
    console.log(`${targetRepoName} is aangemaakt`);

    //displayProtocol(protoSpec);

    await generateProjectFiles(protoSpec,targetRepoName,repoSourceLocation);

    let repoGeneratorResolver: () => void;

    // startup generated code and wait for execution?
    if ( startTargetRepo ) {
        console.log(`opstarten repository o.b.v. ${sourceProtocolJson}  en tonen output`);
        child.exec('npm start', {cwd:`${targetRepoName}`}
        , (err,data) => { if (err){ console.log(`err : ${err}`); }
                          console.log(`npm start uitgevoerd voor ${sourceProtocolJson}, het resultaat is:`);
                          console.log(data);
                          console.log(`einde van het generatie process, inclusief opstarten nieuwe applicatie`);
                          repoGeneratorResolver();
                        } );
    } else{
        console.log(`einde van het generatie process o.b.v. ${sourceProtocolJson}`);
        return new Promise( resolve => resolve());
    }
    return new Promise ( resolve => repoGeneratorResolver=resolve );
}

export {createProtocolFrameWork}
