import {generateExamples,protocolExampleType} from './generate/generateExamples';
import {generateBasedOnJson} from './generate/generateBasedOnJson';

const protocolExamples:Map<string,protocolExampleType>=new Map();
const registerProtocolExample = (id:string,jsonDataSource:string,filesSourceLocation:string,description:string) => protocolExamples.set(id,{jsonDataSource:jsonDataSource,filesSourceLocation:filesSourceLocation,description:description});

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
        if (pars[2].toLowerCase().endsWith(".json")){
            generateBasedOnJson(pars[2]);
            return;
        }
        if (pars[2] === '0' || protocolExamples.has(pars[2].toUpperCase()) ){
            const exampleProtocol = pars[2].toUpperCase();
            let startupRepo:boolean=false;
            if ( pars[3] && (pars[3].toLowerCase() === 'j' || pars[3].toLowerCase() === 'y') ) startupRepo = true;
            generateExamples(exampleProtocol,startupRepo,protocolExamples);
            return;
        }
    }

    console.log(`not a valid repository option --> ${pars[2]}`);
}

registerProtocolExample( 'A',  'AliceBob.json'              , 'sources/aliceBob/'              , 'Alice and Bob'             );
registerProtocolExample( 'B',  'AliceBobFred.json'          , 'sources/aliceBobFred/'          , 'Alice, Bob and Fred'       );
registerProtocolExample( 'C',  'MathSvc.json'               , 'sources/mathSvc/'               , 'Math Service'              );
registerProtocolExample( 'D',  'Http.json'                  , 'sources/http/'                  , 'HTTP protocol '            );
registerProtocolExample( 'E',  'CustomerAgencyService.json' , 'sources/customerAgencyService/' , 'Travel agency'             );
registerProtocolExample( 'F',  'PerfectNumber.json'         , 'sources/perfectNumber/'         , 'Perfect number'            );

starter(process.argv);
