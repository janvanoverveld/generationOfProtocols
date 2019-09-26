import {StateInterface,objProperty} from '../includedCustomLibraries/localProtocolInterfaceData';
import {StateClass,objReceiveMethod,objSendMethod,objToReceiveMessages} from '../includedCustomLibraries/localProtocolClassData';
import {message,receivedMessagesInState} from '../includedCustomLibraries/messageDataTypes';
import {Transition,State,displayProtocol,LocalProtocolDefinition} from '../includedCustomLibraries/globalProtocolDefinition';
import {cInitial, cSend, cReceive} from './variousLocalProtocolObjects';

function getReceivedMessagesInState(state:string,stateMessageMap:receivedMessagesInState):message[]{
    let messages = stateMessageMap.get(state);
    if (!messages) messages = [];
    return messages;
}

function getStatesThatPossibleLeadToThisState(state:string,originatedStatesMap:Map<string,string[]>):string[]{
    let oriStates = originatedStatesMap.get(state);
    if (!oriStates) oriStates = [];
    return oriStates;
}

function createStateClassDefinition(role:string,state:State,receivedMsgPerStateMap:receivedMessagesInState,originatedStates:string[]):StateClass{
   let stateClass:StateClass={name:`${role}_${state.name}`, stateType:state.type, role:role, extends:role,implements:`I${role}_${state.name}`,regularProps:[],constructorProps:[],sendMethods:[]};
   //cd stateClass.regularProps.push({name:cStateProp,optional:false,readonly:true,default:state.name});
   const transitionMessageProps=getReceivedMessagesInState(state.name,receivedMsgPerStateMap);
   for ( let i=0; i<transitionMessageProps.length;i++){
      const propName     = `${transitionMessageProps[i].name.toLowerCase()}`;
      const propDataType = `${transitionMessageProps[i].name.toUpperCase()}`;
      const propOptional = (state.type===cInitial||originatedStates.length>1);
      const messageFrom  = `${transitionMessageProps[i].from.toLowerCase()}`;
      stateClass.constructorProps.push({name:propName,type:propDataType,optional:propOptional,from:messageFrom,readonly:false});
   }
   if (state.transitions){
      let dealWithMultipleReceivedMessages:objToReceiveMessages[]=[];
      state.transitions.forEach(
          (transition) => {
              if ( transition.op === cSend ) {
                 const methName        = `${cSend}_${transition.message.toUpperCase()}_to_${transition.role}`;
                 const methReturnType  = `I${role}_${transition.next}`;
                 const methReturnClass = `${role}_${transition.next}`;
                 const sendMethod:objSendMethod = {name:methName, msg:transition.message, nextStateInterface: methReturnType, nextStateClass:methReturnClass, from: role, to:transition.role};
                 stateClass.sendMethods.push(sendMethod);
              }
              if ( transition.op === cReceive ) {
                 const nextClass     = `${role}_${transition.next}`;
                 const nextInterface = `I${nextClass}`;
                 const differentNextStateProperties=getReceivedMessagesInState(transition.next,receivedMsgPerStateMap);
                 const totalProps=differentNextStateProperties.length;
                 let   positionProp=0;
                 if (totalProps>1) {
                    differentNextStateProperties.forEach( (p,i) => {
                        if (p.name.toUpperCase() === transition.message.toUpperCase() ) {
                            positionProp=i;
                        }
                    } );
                 }
                 dealWithMultipleReceivedMessages.push( {message:transition.message, from:transition.role, nextStateClass:nextClass, nextStateInterface:nextInterface, totalCountOfNextClassProps:totalProps, positionNumberNextClassProps:positionProp} );
              }
          }
      );
      if (dealWithMultipleReceivedMessages.length > 0) {
         stateClass.receiveMethod = {name:cReceive, messages:dealWithMultipleReceivedMessages};
      }
   }
   return stateClass;
}

function getStateClassDefinitions(protocol:LocalProtocolDefinition,receivedMsgPerStateMap:receivedMessagesInState,stateWithPossibleOriginStates:Map<string,string[]>):StateClass[]{
    const stateClasses:StateClass[]=[];
    protocol.states.forEach(
        (state) => {
            const originatedStates=getStatesThatPossibleLeadToThisState(state.name,stateWithPossibleOriginStates);
            stateClasses.push(createStateClassDefinition(protocol.role,state,receivedMsgPerStateMap,originatedStates));
        }
    );
    return stateClasses;
}

function showObjProperty(objProp:objProperty, extraChars?:string){
    let printString=`   property:${objProp.name}       type:${objProp.type}   optional:${objProp.optional}   readonly:${objProp.readonly}    default:${objProp.default}`;
    if (extraChars){
        printString = extraChars + printString;
    }
    console.log(printString);
}

function showClasses(classes:StateClass[]){
    console.log(`show the classes`);
    for (const cl of classes){
        console.log(`name class:${cl.name}   stateType:${cl.stateType}  role:${cl.role}  extends:${cl.extends}  implements:${cl.implements}`);
        cl.regularProps.forEach((p)=>showObjProperty(p));
        if (cl.constructorProps.length > 0 ) console.log(`   constructor properties`);
        cl.constructorProps.forEach((p)=>showObjProperty(p,'  '));
        for ( const sendMeth of cl.sendMethods ){
            console.log(`   name:${sendMeth.name}   msg:${sendMeth.msg}   nextStateInterface:${sendMeth.nextStateInterface}    nextStateClass:${sendMeth.nextStateClass}   from:${sendMeth.from}   to:${sendMeth.to}`);
        }
        if (cl.receiveMethod){
            //const messages=cl.receiveMethod.messages.reduce((a,e)=>a+=e);
            console.log(`   there is a receive methode : ${cl.receiveMethod.name}`);
            for ( const rMsg of cl.receiveMethod.messages ){
                console.log(`   msg:${rMsg.message}   from:${rMsg.from}    nextStateInterface:${rMsg.nextStateInterface}   nextStateClass:${rMsg.nextStateClass}    positionNumberNextClassProps:${rMsg.positionNumberNextClassProps}    totalCountNextClassProps:${rMsg.totalCountOfNextClassProps}   `);
            }
        }
    }
}

export {getStateClassDefinitions,showClasses};
