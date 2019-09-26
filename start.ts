import rimraf from 'rimraf';
import * as fs from 'fs';
import * as child from 'child_process';
import {GlobalProtocolDefinition} from './includedCustomLibraries/globalProtocolDefinition';
import {generateGlobalProtocolProject} from './generateGlobalProtocolProject';
import {capitalize,readFile} from './includedCustomLibraries/sharedFunctions';

type protocolExampleType = {
    jsonDataSource: string;
    filesSourceLocation: string;
}

const protocolExamples:Map<string,protocolExampleType>=new Map();

const registerProtocolExample = (id:string,jsonDataSource:string,filesSourceLocation:string) => protocolExamples.set(id,{jsonDataSource:jsonDataSource,filesSourceLocation:filesSourceLocation});

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
