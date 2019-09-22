import {createProtocolFrameWork} from './createProtocolFrameWork';

type protocolExampleType = {
    jsonDataSource: string;
    filesSourceLocation: string;
}

const protocolExamples:Map<string,protocolExampleType>=new Map();

const registerProtocolExample = (id:string,jsonDataSource:string,filesSourceLocation:string) => protocolExamples.set(id,{jsonDataSource:jsonDataSource,filesSourceLocation:filesSourceLocation});

async function starter(pars:string[]){
    console.log(`${new Date()}  parameter 1 = ${pars[2]}  parameter 2 = ${pars[3]}`);
    let opstartenRepo:boolean=false;
    let protocolExample = protocolExamples.get('A');
    if ( pars[3] && pars[3].toLowerCase() === 'j' ) opstartenRepo = true;
    if ( pars[2] && pars[2] === '0' ){
        for ( const protocolId of protocolExamples.keys() ){
            protocolExample = protocolExamples.get(protocolId);
            if (protocolExample) {
                await createProtocolFrameWork( protocolExample.jsonDataSource, protocolExample.filesSourceLocation, opstartenRepo ); 
            }
        }
        return;
    }
    if ( pars[2] ) {
       protocolExample=protocolExamples.get(pars[2].toUpperCase());
    } 
    if ( protocolExample ){
        createProtocolFrameWork( protocolExample.jsonDataSource, protocolExample.filesSourceLocation, opstartenRepo );
        return;
    }
    console.log(`not a valid repository option --> ${pars[2]}`);
}

registerProtocolExample( 'A', 'AliceBob.json',              'sources/aliceBob/');
registerProtocolExample( 'B', 'AliceBobFred.json',          'sources/aliceBobFred/');
registerProtocolExample( 'C', 'MathSvc.json',               'sources/mathSvc/');
registerProtocolExample( 'D', 'Http.json',                  'sources/http/');
registerProtocolExample( 'E', 'CustomerAgencyService.json', 'sources/customerAgencyService/');

starter(process.argv);
