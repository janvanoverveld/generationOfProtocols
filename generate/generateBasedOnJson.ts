import rimraf from 'rimraf';
import * as fs from 'fs';
import * as child from 'child_process';
import {GlobalProtocolDefinition,displayProtocol} from '../includedCustomLibraries/globalProtocolDefinition';
import {generateGlobalProtocolProject} from './generateGlobalProtocolProject';
import {capitalize,writeFile,readFile,getEnumWithRoles} from '../includedCustomLibraries/sharedFunctions';
import {generateMessages} from './generateMessages';

async function generateBasedOnJson(jsonProtocolDslInputFile:string){
    console.log(`generate protocol api based on json input file ${jsonProtocolDslInputFile}`);

    if (!fs.existsSync(jsonProtocolDslInputFile)){
        console.log(`json input file does not exist ${jsonProtocolDslInputFile}`);
        return;
    }

    const protocolData = await readFile ( jsonProtocolDslInputFile );
    let protoSpec:GlobalProtocolDefinition;
    try{
        protoSpec = JSON.parse(protocolData);
    } catch (e){
        console.log(`json input file ${jsonProtocolDslInputFile} is wrong`);
        console.log(`${e}`);
        return;
    }

    const rolePartOfName = capitalize(protoSpec.roles.sort().reduce( (ret,role) => ret+=capitalize(role) ));
    const targetRepoName = `../protoFw${rolePartOfName}/`;

    if (fs.existsSync(targetRepoName)) {
        rimraf.sync(targetRepoName);
        console.log(`${targetRepoName} has been deleted`);
    }
    fs.mkdirSync(targetRepoName);
    console.log(`${targetRepoName} is created`);

    // get roles and messages of protocol
    const roles:string[]    = [];
    const messages = new Set<string>();
    protoSpec.protocol.forEach(
        (e) => { roles.push(e.role);
                 for ( const state of e.states ){
                     if ( state.transitions ) {
                         state.transitions.forEach( (t) => messages.add(t.message.toUpperCase()) )
                     }
                 }
        }
    );

    protoSpec.protocol.forEach( (e) => roles.push(e.role) );

    // globalObjects
    let textFromSource = await readFile( 'sources/_global/globalObjects.src' );
    textFromSource += getEnumWithRoles(roles);
    await writeFile(targetRepoName + 'globalObjects.ts',textFromSource);

    // mediator
    textFromSource = await readFile( 'sources/_global/mediator.src' );
    await writeFile(targetRepoName + 'mediator.ts',textFromSource);

    // messageDB
    textFromSource = await readFile( 'sources/_global/messageDB.src' );
    await writeFile(targetRepoName + 'messageDB.ts',textFromSource);

    // receiveMessageServer.ts
    textFromSource = await readFile( 'sources/_global/receiveMessageServer.src' );
    await writeFile(targetRepoName + 'receiveMessageServer.ts',textFromSource);

    // sendMessage.ts
    textFromSource = await readFile( 'sources/_global/sendMessage.src' );
    await writeFile(targetRepoName + 'sendMessage.ts',textFromSource);

    // Message.ts
    textFromSource = generateMessages(messages);
    await writeFile(targetRepoName + 'Message.ts',textFromSource);

    //displayProtocol(protoSpec);
    //messages.forEach( s => console.log(`- ${s}`));
}

export {generateBasedOnJson}