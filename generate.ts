import {Transition,State,Protocol,RootObject} from './protocolTypeInterface';
import {getStateObjects} from './createStateObjects';
import {getEnumWithRoles} from './createGlobalObjects';
import rimraf from 'rimraf';
import * as fs from 'fs';
import * as child from 'child_process';

const jsonAliceBob               = "AliceBob.json";
const sourceLocationAliceBob     = 'sources/aliceBob/';
const jsonAliceBobFred           = "AliceBobFred.json";
const sourceLocationAliceBobFred = 'sources/aliceBobFred/';
const jsonMatSvc                 = "MathSvc.json";
const sourceLocationMathSvc      = 'sources/mathSvc/';
const jsonHttp                   = "Http.json";
const sourceLocationHttp         = 'sources/http/'
const jsonCustomerAgency         = "CustomerAgencyService.json";
const srcLocCustomerAgency       = 'sources/customerAgencyService/';

const fileNameGlobalObjects      = 'globalObjects.src';
const fileNameMessages           = 'Message.src';
const fileNameExtraMessages      = 'ExtraMessages.src';

async function sleep(ms:number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    console.log(`writing sourcefiles for ${extraSourceFilesLoc} `);
    let srcFiles = fs.readdirSync(sourceFilesLocation).filter((f)=>f.includes('.src'));
    const extraMessagesTxt=await readFile(extraSourceFilesLoc + fileNameExtraMessages );
    for ( const srcFile of srcFiles ){
        // console.log(`writing sourcefile ${srcFile} `);
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
        //console.log(`writing sourcefile ${xSrcFile} `);
        let textFromSource = await readFile( extraSourceFilesLoc + xSrcFile );
        let targetFileName = xSrcFile.search('json')>0?xSrcFile.replace('.src',''):xSrcFile.replace('.src','.ts');
        await writeFile(targetLocation + targetFileName,textFromSource);
    }

}

async function startGeneratieRepository(sourceProtocolJson:string, repoSourceLocation:string, startTargetRepo:boolean ):Promise<void>
{
    console.log(`generatie repository o.b.v. ${sourceProtocolJson}`);
    const globalSourceLocation             = 'sources/';
    const protocolData=await readFile ( repoSourceLocation+sourceProtocolJson);
    const protoSpec:RootObject = JSON.parse(protocolData);

    const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    let rolePartOfName = protoSpec.roles.sort().reduce( (ret,role) => ret+=capitalize(role) );
    rolePartOfName = capitalize(rolePartOfName);
    const targetRepoName = `../generated${rolePartOfName}/`;

    if (fs.existsSync(targetRepoName)) {
        rimraf.sync(targetRepoName);
        console.log(`${targetRepoName} is verwijderd`);
    }
    fs.mkdirSync(targetRepoName);
    console.log(`${targetRepoName} is aangemaakt`);

    //displayProtocol(protoSpec);

    await generateProjectFiles(globalSourceLocation,protoSpec,targetRepoName,repoSourceLocation);

    console.log(`Aanmaken klassen van de states`);
    // creatie van de state klassen van de rollen
    protoSpec.protocol.forEach(
        (proto) => {
            let classText = getStateObjects(proto);
            writeFile(targetRepoName + proto.role + '.ts',classText);
        }
    );
    var repoGeneratorResolver: () => void;
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
        return new Promise( (resolve) => resolve());
    }
    return new Promise ( ( resolve ) => repoGeneratorResolver=resolve );
}

async function starter(pars:string[]){
    console.log(`${new Date()}  options are ${pars[2]} ${pars[3]}`);
    let opstartenRepo:boolean=false;
    if ( pars[3] && pars[3].toLowerCase() === 'j' ) opstartenRepo = true;
    if ( pars[2] ){
        switch (pars[2].toUpperCase()){
            case 'A':
                await startGeneratieRepository(jsonAliceBob, sourceLocationAliceBob, opstartenRepo );
                break;
            case 'B':
                await startGeneratieRepository(jsonAliceBobFred, sourceLocationAliceBobFred, opstartenRepo );
                break;
            case 'C':
                await startGeneratieRepository(jsonMatSvc, sourceLocationMathSvc, opstartenRepo );
                break;
            case 'D':
                await startGeneratieRepository(jsonHttp, sourceLocationHttp, opstartenRepo );
                break;
            case 'E':
                await startGeneratieRepository(jsonCustomerAgency, srcLocCustomerAgency, opstartenRepo );
                break;
            case '0':
                console.log(`startup generation of Alice and Bob example`);
                await startGeneratieRepository(jsonAliceBob, sourceLocationAliceBob, opstartenRepo );
                await sleep ( 500 );
                console.log(`startup generation of Fred, Alice and Bob example`);
                await startGeneratieRepository(jsonAliceBobFred, sourceLocationAliceBobFred, opstartenRepo );
                await sleep ( 500 );
                console.log(`startup generation of MatSvc from scribble paper`);
                await startGeneratieRepository(jsonMatSvc, sourceLocationMathSvc, opstartenRepo );
                console.log(`startup generation of Http Example from the scribble paper`);
                await startGeneratieRepository(jsonHttp, sourceLocationHttp, opstartenRepo );
                console.log(`multi party, customer agency`);
                await startGeneratieRepository(jsonCustomerAgency, srcLocCustomerAgency, opstartenRepo );
                break;
            default:
                console.log(`not a valid repository option --> ${pars[2]}`);
                break;
            }
    } else {
        await startGeneratieRepository(jsonAliceBob, sourceLocationAliceBob, false );
    }
    console.log(`${new Date()}  eind`);
}

starter(process.argv);
