import {StateInterface,objProperty} from '../includedCustomLibraries/localProtocolInterfaceData';
import {StateClass,objReceiveMethod,objSendMethod,objToReceiveMessages} from '../includedCustomLibraries/localProtocolClassData';
import {message,receivedMessagesInState} from '../includedCustomLibraries/messageDataTypes';
import {Transition,State,LocalProtocolDefinition,displayProtocol} from '../includedCustomLibraries/globalProtocolDefinition';
import {getInterfacesAsText} from './stateInterfacesText';
import {getStateInterfaces,showInterfaces} from './stateInterfacesMetaData';
import {getTextFromStateClasses} from './stateClassesText';
import {getStateClassDefinitions, showClasses} from './stateClassesMetaData';
import {getImportDefinitions,getEnumWithMessages,getStateAbstractClass,getStartAndEndTypes,getPublicExportsAsText,cMessageEnum,getExecuteProtocolFunction,cReceive} from './variousLocalProtocolObjects';

function getReceivedMessagesForState(stateName:string, states:State[]):message[]{
    let messages:message[]=[];
    states.forEach(
        (state) => {
           if (state.transitions)
               state.transitions.forEach(
                   (t) => {
                       //console.log(`${stateName}  ${state.name}   ${t.next }   ${t.op}  ${t.message}  ${t.role}`);
                       if ( t.next === stateName && t.op === cReceive ) {
                           messages.push({name:t.message,from:t.role});
                       }
                   }
               );
        }
    );
    return Array.from(new Set(messages));
}

function getPossibleOriginatedStates(stateName:string, states:State[]):string[]{
    let oriStates:string[]=[];
    states.forEach(
        (state) => {
           if (state.transitions)
               state.transitions.forEach(
                   (t) => {
                       if ( t.next === stateName ) {
                           oriStates.push(state.name);
                       }
                   }
               );
        }
    );
    return Array.from(new Set(oriStates));
}

function getMessagesFromProtocol(protocol:LocalProtocolDefinition){
    let messages:string[]=[];
    protocol.states.forEach( (s) => {
        if (s.transitions)
            s.transitions.forEach(
                (t)=>messages.push(t.message)
            );
    } );
    return Array.from(new Set(messages));
}

function createLocalProtocolAPI( protocol:LocalProtocolDefinition ):string{
    console.log(`start createLocalProtocolAPI  ${protocol.role}`);

    // get states and messages that led to the state (these will be properties), 
    // Map with key for every state and a array with the messages that can led to the state
    const receivedMessagesInState:receivedMessagesInState = new Map();
    protocol.states.forEach( (s) => {
        receivedMessagesInState.set(s.name,getReceivedMessagesForState(s.name,protocol.states));
    } );
    // debug
    // receivedMessagesInState.forEach((val,key)=> console.log(`${key}  ----  ${val}`));

    const stateWithPossibleOriginStates:Map<string,string[]> = new Map();
    protocol.states.forEach( (s) => {
       stateWithPossibleOriginStates.set(s.name,getPossibleOriginatedStates(s.name,protocol.states));
    })
    //for ( let key of stateWithPossibleOriginStates.keys() ){
    //    console.log(`state ${key}  comes from ${stateWithPossibleOriginStates.get(key)}`);
    //}
    // get possible messages in the protocol
    const protocolMessages=getMessagesFromProtocol(protocol).map((s)=>s.toUpperCase());

    // create import definitions
    const importDefinitions = getImportDefinitions(protocolMessages);

    // create a enum with the different Messages
    const enumWithMessages = getEnumWithMessages(protocolMessages);

    // get interfaces
    const stateInterfaces:StateInterface[]=getStateInterfaces(protocol.role, protocol.states, receivedMessagesInState,stateWithPossibleOriginStates);
    // debug, show interfaces
    //showInterfaces(stateInterfaces);

    // get classes
    const stateClasses = getStateClassDefinitions(protocol,receivedMessagesInState,stateWithPossibleOriginStates);
    // debug show classes
    //showClasses(stateClasses);

    // revert interfaces to text
    const interfacesAsText = getInterfacesAsText(stateInterfaces);

    // get role abstract class as text
    const stateAbstractClass = getStateAbstractClass(protocol.role);

    // revert classes to text
    const classesAsText = getTextFromStateClasses(stateClasses);

    // get start and End types
    const startAndEndTypes = getStartAndEndTypes(protocol.role,stateClasses);
    // console.log(`start en end types zijn :  ${startAndEndTypes}`);

    // create executeProtocol function
    const executeProtocolFunction = getExecuteProtocolFunction(stateClasses);

    // create exports
    const publicExportsAsText = getPublicExportsAsText(protocol.role,stateInterfaces);

    const localProtocolAPI = importDefinitions + enumWithMessages + interfacesAsText + stateAbstractClass + classesAsText + startAndEndTypes + executeProtocolFunction + publicExportsAsText;

    console.log(`end  createLocalProtocolAPI  ${protocol.role}`);

    return localProtocolAPI;
}

export {createLocalProtocolAPI};
