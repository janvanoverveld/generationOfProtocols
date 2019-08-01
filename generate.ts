import {Transition,State,Protocol,RootObject} from './protocolTypeInterface';
import {getStateObjects} from './createStateObjects';
import {getEnumWithRoles} from './createGlobalObjects';
import rimraf from 'rimraf';
import * as fs from 'fs';
import * as child from 'child_process';

const sourceLocation             = 'sources/';

const jsonAliceBob               = "AliceBob.json";
const sourceLocationAliceBob     = 'sources/aliceBob/';

const jsonAliceBobFred           = "AliceBobFred.json";
const sourceLocationAliceBobFred = 'sources/aliceBobFred/';

const jsonMatSvc                 = "MathSvc.json";
const sourceLocationMathSvc      = 'sources/mathSvc/';

const fileNameGlobalObjects      = 'globalObjects.src';
const fileNameMessages           = 'Message.src';
const fileNameExtraMessages      = 'ExtraMessages.src';

function displayProtocol(proto:RootObject){
    console.log(proto.roles);
    for ( let p of proto.protocol  ){
        console.log(`${p.role}`);
        for ( let state of p.states ){
            console.log(`  ${state.name}  ${state.type}`);
            if (state.transitions) state.transitions.forEach( (trans) => console.log(`      ${trans.next} ${trans.op} ${trans.message}`) );
        }
    }
}

function readFile (path:string, opts = 'utf8'):Promise<string>{
    return new Promise(
        (resolve, reject) => {
            fs.readFile( path, opts, (err, data) => { if (err) reject(err); else resolve(data); } )
        }
    );
}

function writeFile (path:string, data:string, opts = 'utf8'):Promise<void> {
   return new Promise(
      (resolve, reject) => {
         fs.writeFile(path, data, opts, (err) => { if (err) reject(err); else resolve(); })
      }
   );
}

async function generateProjectFiles(sourceFilesLocation:string,protocolSpec:RootObject,targetLocation:string,extraSourceFilesLoc:string){
    let srcFiles = fs.readdirSync(sourceFilesLocation).filter((f)=>f.includes('.src'));
    const extraMessagesTxt=await readFile(extraSourceFilesLoc + fileNameExtraMessages );
    for ( const srcFile of srcFiles ){
        console.log(`dit is ${srcFile} `);
        let textFromSource = await readFile( sourceFilesLocation + srcFile );
        if (srcFile === fileNameGlobalObjects){
            textFromSource += getEnumWithRoles(protocolSpec.protocol);
        }
        if (srcFile === fileNameMessages){
            textFromSource += extraMessagesTxt;
        }
        let targetFileName = srcFile.search('json')>0?srcFile.replace('.src',''):srcFile.replace('.src','.ts');
        await writeFile(targetLocation + targetFileName,textFromSource);
    }
    //
    // process rest of extra files per protocol
    srcFiles = fs.readdirSync(extraSourceFilesLoc).filter((f)=>f.includes('.src')&&f!==fileNameExtraMessages);
    for ( const xSrcFile of srcFiles ){
        console.log(`dit is ${xSrcFile} `);
        let textFromSource = await readFile( extraSourceFilesLoc + xSrcFile );
        let targetFileName = xSrcFile.search('json')>0?xSrcFile.replace('.src',''):xSrcFile.replace('.src','.ts');
        await writeFile(targetLocation + targetFileName,textFromSource);
    }

}

async function starter(pars:string[]){

    let sourceLocationExtra = sourceLocationAliceBob;
    let sourceProtocolJson = jsonAliceBob;

    if ( pars.length > 1 ){
        switch (pars[2]){
            case 'A':
                sourceLocationExtra = sourceLocationAliceBob;
                sourceProtocolJson = jsonAliceBob;
                break;
            case 'B':
                sourceLocationExtra = sourceLocationAliceBobFred;
                sourceProtocolJson = jsonAliceBobFred;
                break;
            case 'C':
                sourceLocationExtra = sourceLocationMathSvc;
                sourceProtocolJson = jsonMatSvc;
                break;
            default:
                break;
        }
    }

    console.log(`start generatie  ${sourceLocationExtra}`);

    const protocolData=await readFile ( sourceLocationExtra+sourceProtocolJson);
    const protoSpec:RootObject = JSON.parse(protocolData);

    const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const rolePartOfName = protoSpec.roles.sort().reduce((ret,role)=>ret+=capitalize(role));
    const targetRepoName = `../generated${rolePartOfName}/`;

    if (fs.existsSync(targetRepoName)) {
        rimraf.sync(targetRepoName);
        console.log(`${targetRepoName} is verwijderd`);
    }
    fs.mkdirSync(targetRepoName);
    console.log(`${targetRepoName} is aangemaakt`);

    displayProtocol(protoSpec);

    await generateProjectFiles(sourceLocation,protoSpec,targetRepoName,sourceLocationExtra);

    console.log(`starten met aanmaken klassen`);
    // creatie van de state klassen van de rollen
    protoSpec.protocol.forEach(
        (proto) => {
            let classText = getStateObjects(proto);
            writeFile(targetRepoName + proto.role + '.ts',classText);
        }
    );

    if ( false ) {
        console.log('opstarten gegenereerde code mbv. start.ts via npm start')
        child.exec('npm start', {cwd:`${targetRepoName}`}
        , (err,data) => { if (err){ console.log(`err : ${err}`); }
                          console.log('npm start uitgevoerd voor target repo, resultaat is:');
                          console.log(data);
                          console.log(`einde van het generatie process, inclusief opstarten nieuwe applicatie`); } );
    }

    console.log('eind generatie');
}

starter(process.argv);
