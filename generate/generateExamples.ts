import rimraf from 'rimraf';
import * as fs from 'fs';
import * as child from 'child_process';
import {GlobalProtocolDefinition} from '../includedCustomLibraries/globalProtocolDefinition';
import {generateGlobalProtocolProject} from './generateGlobalProtocolProject';
import {capitalize,readFile} from '../includedCustomLibraries/sharedFunctions';

type protocolExampleType = {
    jsonDataSource: string;
    filesSourceLocation: string;
    description: string;
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

async function generateExamples(exampleProtocol:string,startupExample:boolean,protocolExamples:Map<string,protocolExampleType>) {
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

export {generateExamples, protocolExampleType}