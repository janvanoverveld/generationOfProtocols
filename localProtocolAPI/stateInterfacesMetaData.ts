import {StateInterface,objProperty,sendMethod} from '../includedCustomLibraries/localProtocolInterfaceData';
import {message,receivedMessagesInState} from '../includedCustomLibraries/messageDataTypes';
import {Transition,State,displayProtocol} from '../includedCustomLibraries/globalProtocolDefinition';
import {cAbstractState, cInitial, cSend, cReceive} from './variousLocalProtocolObjects';

function getReceivedMessagesInState(state:string,stateMessageMap:receivedMessagesInState ):message[]{
    let messages = stateMessageMap.get(state);
    if (!messages) messages = [];
    return messages;
}

function getStatesThatPossibleLeadToThisState(state:string,originatedStatesMap:Map<string,string[]>):string[]{
    let oriStates = originatedStatesMap.get(state);
    if (!oriStates) oriStates = [];
    return oriStates;
}

function getStateInterface(role:string,state:State,messagesThatLedToState:message[],originatedStates:string[],stateWithLeadingMessages:receivedMessagesInState):StateInterface{
    let retInf:StateInterface={name:`I${role}_${state.name}`,props:[],sendMethods:[],recvInterfaces:[],inherit:`I${role}`,stateType:state.type, role:role};
    //retInf.props.push({ name:cStateProp, optional: false, readonly: true, default:state.name });
    for ( let i=0; i<messagesThatLedToState.length; i++ ){
      // a message is received, must be available as prop
      const optionalProp  = (state.type===cInitial||originatedStates.length>1)?true:false;
      const transPropName = messagesThatLedToState[i].name.toLowerCase();
      const transPropType = messagesThatLedToState[i].name.toUpperCase();
      const messageFrom   = messagesThatLedToState[i].from.toLowerCase() ;
      retInf.props.push({name:transPropName,optional:optionalProp,type:transPropType,from:messageFrom,readonly:false});
    }
    if (state.transitions){
      let receiveMultipleTypes:string[]=[];
      state.transitions.forEach(
          (transition) => {
              if ( transition.op === cSend ) {
                  // possible to send a message from this state and continue to a next state
                  const nm=`${cSend}_${transition.message.toUpperCase()}_to_${transition.role}`;
                  const returnInterface=`I${role}_${transition.next}`;
                  const method:sendMethod={ name:nm, msgName:transition.message.toLowerCase(), msgType:transition.message.toUpperCase(),msgTo:transition.role, return:returnInterface };
                  retInf.sendMethods.push(method);
              }
              if ( transition.op === cReceive ) {
                 let nextStateName = `I${role}_${transition.next}`;
                 //
                 // determine subinterface name (if relevant)
                 const differentNextStateProperties=getReceivedMessagesInState(transition.next,stateWithLeadingMessages);
                 const totalProps=differentNextStateProperties.length;
                 let   positionProp=0;
                 if (totalProps>1) {
                    differentNextStateProperties.forEach( (p,i) => {
                       if (p.name.toUpperCase() === transition.message.toUpperCase() ) {
                          positionProp=i;
                       }
                    } );
                    nextStateName = `I${role}_${transition.next}_${positionProp+1}`;
                 }
                 // message can be received to continue to next state
                 //receiveMultipleTypes.push(nextStateName);
                 retInf.recvInterfaces.push(nextStateName);
              }
          }
      );
    }
    return retInf;
}

function getStateInterfaces(role:string, possibleStates:State[],stateWithMessages:receivedMessagesInState,stateWithPossibleOriginStates:Map<string,string[]>){
    const stateInterfaces:StateInterface[]=[];
    const abstractInterface:StateInterface={name:`I${role}`,props:[],sendMethods:[],recvInterfaces:[],stateType:cAbstractState,role:role};
    //abstractInterface.props.push( { name:cStateProp, optional: false, readonly: false, type:'string'} );
    stateInterfaces.push(abstractInterface);
    possibleStates.forEach( (s) => {
            const originatedStates=getStatesThatPossibleLeadToThisState(s.name,stateWithPossibleOriginStates);
            stateInterfaces.push( getStateInterface( role, s, getReceivedMessagesInState(s.name,stateWithMessages ), originatedStates, stateWithMessages ) );
        }
    );
    return stateInterfaces;
}

function showObjProperty(objProp:objProperty, extraChars?:string){
    let printString=`   property:${objProp.name}       type:${objProp.type}   optional:${objProp.optional}   readonly:${objProp.readonly}  from:${objProp.from}    default:${objProp.default}`;
    if (extraChars){
        printString = extraChars + printString;
    }
    console.log(printString);
}

function showInterfaces(interfaces:StateInterface[]){
    console.log(`show the interfaces`);
    for (const inf of interfaces){
        console.log(`name interface:${inf.name}   inherit:${inf.inherit}   stateType:${inf.stateType}   role:${inf.role}`);
        inf.props.forEach((p)=>showObjProperty(p));
        if(inf.recvInterfaces.length>0){
            const returnObjects=inf.recvInterfaces.reduce((a,e)=>a+=' ' + e);
            console.log(`recv method with ${returnObjects}`);
        }
        for ( const sendMeth of inf.sendMethods ){
            console.log(`add method ${sendMeth.name}  ${sendMeth.msgName}  ${sendMeth.msgType}  ${sendMeth.msgTo}  ${sendMeth.return}   `);
        }
    }
}

export {getStateInterfaces,showInterfaces}
