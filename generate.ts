import {Parameter,Message,Transition,State,Protocol,RootObject} from './protocolTypeInterface';
import {getStateObjects} from './createStateObjects';
import {getMessageClasses} from './createMessageObjects';
import {getEnumWithRoles} from './createGlobalObjects';
import rimraf from 'rimraf';
import * as fs from 'fs';
import * as child from 'child_process';

const sourceLocation             = 'sources/';
const sourceLocationAliceBob     = 'sources/aliceBob/';
const sourceLocationAliceBobFred = 'sources/aliceBobFred/';
const fileNameGlobalObjects      = 'globalObjects.src';
const fileNameMessages           = 'Message.src';

function displayProtocol(proto:RootObject){
    for ( let msg of proto.messages) {
        console.log(`${msg.name} `);
        msg.parameters.forEach( (par) => console.log(`  ${par.name} ${par.type}`) );
    }
    console.log(proto.roles);
    for ( let p of proto.protocol  ){
        console.log(`${p.role}`);
        for ( let state of p.states ){
            console.log(`  ${state.name}  ${state.type}`);
            if (state.transitions) state.transitions.forEach( (trans) => console.log(`      ${trans.destination} ${trans.flow} ${trans.message}`) );
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

async function generateProjectFiles(sourceFilesLocation:string,protocolSpec:RootObject,targetLocation:string){
    const srcFiles = fs.readdirSync(sourceFilesLocation).filter((f)=>f.includes('.src'));
    for ( const srcFile of srcFiles ){
        console.log(`dit is ${srcFile} `);
        let textFromSource = await readFile( sourceFilesLocation + srcFile );
        if ( srcFile === fileNameGlobalObjects){
            textFromSource += getEnumWithRoles(protocolSpec.protocol);
        }
        if ( srcFile === fileNameMessages){
            textFromSource += getMessageClasses(protocolSpec.messages);
        }
        let targetFileName = srcFile.search('json')>0?srcFile.replace('.src',''):srcFile.replace('.src','.ts');
        await writeFile(targetLocation + targetFileName,textFromSource);
    }
}

async function starter(){

    //const sourceLocationExtra = sourceLocationAliceBob;
    //const sourceProtocolJson = "exampleProtocol.json";
    const sourceLocationExtra = sourceLocationAliceBobFred;
    const sourceProtocolJson = "exampleProtocolFred.json";

    console.log(`start generatie  ${sourceLocationExtra}`);

    const protocolData=await readFile ( sourceLocationExtra+sourceProtocolJson);
    const protoSpec:RootObject = JSON.parse(protocolData);

    const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const rolePartOfName = protoSpec.roles.reduce((ret,role)=>ret+=capitalize(role));
    const targetRepoName = `../generated${rolePartOfName}/`;

    if (fs.existsSync(targetRepoName)) {
        rimraf.sync(targetRepoName);
        console.log(`${targetRepoName} is verwijderd`);
    }
    fs.mkdirSync(targetRepoName);
    console.log(`${targetRepoName} is aangemaakt`);

    displayProtocol(protoSpec);

    await generateProjectFiles(sourceLocation,protoSpec,targetRepoName);

    await generateProjectFiles(sourceLocationExtra,protoSpec,targetRepoName);

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

starter();
