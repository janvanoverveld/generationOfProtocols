import rimraf from 'rimraf';
import * as fs from 'fs';
import * as child from 'child_process';
import {GlobalProtocolDefinition} from './includedCustomLibraries/globalProtocolDefinition';
import {generateGlobalProtocolProject} from './generateGlobalProtocolProject';
import {capitalize,readFile} from './includedCustomLibraries/sharedFunctions';

type protocolExampleType = {
    jsonDataSource: string;
    filesSourceLocation: string;
    description: string;
}

const protocolExamples:Map<string,protocolExampleType>=new Map();
const registerProtocolExample = (id:string,jsonDataSource:string,filesSourceLocation:string,description:string) => protocolExamples.set(id,{jsonDataSource:jsonDataSource,filesSourceLocation:filesSourceLocation,description:description});

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

    await generateGlobalProtocolProject(protoSpec,targetRepoName,repoSourceLocation);

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

async function startProtocolExamples(exampleProtocol:string,startupExample:boolean) {
    if ( exampleProtocol === '0' && startupExample ){
        console.log(`${new Date()}  all example repositories are started up`);
    }
    if ( exampleProtocol !== '0' && startupExample ){
        console.log(`${new Date()}  ${protocolExamples.get(exampleProtocol) } is started up`);
    }
    if ( exampleProtocol === '0' && !startupExample ){
        console.log(`${new Date()}  all example repositories are build`);
    }
    if ( exampleProtocol !== '0' && !startupExample ){
        console.log(`${new Date()}  ${protocolExamples.get(exampleProtocol) } is build`);
    }

    if ( exampleProtocol === '0' ){
        for ( const protocolId of protocolExamples.keys() ){
            const protocolExample = protocolExamples.get(protocolId);
            if (protocolExample) {
                await createProtocolFrameWork( protocolExample.jsonDataSource, protocolExample.filesSourceLocation, startupExample ); 
            }
        }
        return;
    }
    const protocolExample=protocolExamples.get(exampleProtocol);
    if ( protocolExample ){
        createProtocolFrameWork( protocolExample.jsonDataSource, protocolExample.filesSourceLocation, startupExample );
        return;
    }
}

function printHelp(){
    console.log(`
       examples for generating code are:
       build all the example protocols   => node js/start 0
       build and start all the excamples => node js/start 0 j
    `);
    console.log(`
    generate commands for the examples separately are:
    `)
    protocolExamples.forEach( (v,k) => {
       console.log(` ${v.description.padStart(20) }   : node js/start ${k}  `);
    });
    console.log(`
    generate and startup commands for the examples separately are:
    `)
    protocolExamples.forEach( (v,k) => {
       console.log(` ${v.description.padStart(20)}   : node js/start ${k} Y `);
    });
}

function starter(pars:string[]){

    if (!pars[2]) {
        console.log(`There are no parameters specified, try 'node js/start help' for more information.`);
        return;
    }

    if (pars[2].toLowerCase() === 'help' ) {
        printHelp();
        return;
    }

    if (pars[2]){
        if (pars[2] === '0' || protocolExamples.has(pars[2].toUpperCase()) ){
            const exampleProtocol = pars[2].toUpperCase();
            let startupRepo:boolean=false;
            if ( pars[3] && (pars[3].toLowerCase() === 'j' || pars[3].toLowerCase() === 'y') ) startupRepo = true;
            startProtocolExamples(exampleProtocol,startupRepo);
            return;
        }
    }

    console.log(`not a valid repository option --> ${pars[2]}`);
}

registerProtocolExample( 'A',  'AliceBob.json'              , 'sources/aliceBob/'              , 'Alice and Bob'             );
registerProtocolExample( 'B',  'AliceBobFred.json'          , 'sources/aliceBobFred/'          , 'Alice, Bob and Fred'       );
registerProtocolExample( 'C',  'MathSvc.json'               , 'sources/mathSvc/'               , 'Math Service'              );
registerProtocolExample( 'D',  'Http.json'                  , 'sources/http/'                  , 'HTTP protocol '     );
registerProtocolExample( 'E',  'CustomerAgencyService.json' , 'sources/customerAgencyService/' , 'Travel agency'             );
registerProtocolExample( 'F',  'PerfectNumber.json'         , 'sources/perfectNumber/'         , 'Perfect number' );

starter(process.argv);
