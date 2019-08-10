import {message,receivedMessagesInState,Transition,State,Protocol,RootObject,StateInterface,objProperty,objMethod,StateClass,objReceiveMethod,objSendMethod,objToReceiveMessages} from './protocolTypeInterface';
import * as ts from "typescript";

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const resultFile = ts.createSourceFile("dummy.ts","",ts.ScriptTarget.Latest,false,ts.ScriptKind.TS);
const printer    = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
const printCode  = (node:ts.Node) => printer.printNode( ts.EmitHint.Unspecified, node, resultFile );

const cReceive       = 'recv';
const cSend          = 'send';
const cInitial       = 'initial';
const cAbstractState = 'abstractState';
const cMsgFrom       = 'messageFrom';
const cMsgType       = 'messageType';
const cMsg           = 'message';
const cMsgs          = 'messages';
const cRoles         = 'roles';
//
const idMsgFrom = ts.createIdentifier(cMsgFrom);
const idMsgType = ts.createIdentifier(cMsgType);
const idMsg     = ts.createIdentifier(cMsg);
const idRoles   = ts.createIdentifier(cRoles);
const idMsgs    = ts.createIdentifier(cMsgs);
const idPromise = ts.createIdentifier('Promise');
const idPropReadOnly = [ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)];

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
    let retInf:StateInterface={name:`I${role}_${state.name}`,props:[],methods:[],inherit:`I${role}`,stateType:state.type, role:role};
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
                  let method:objMethod={name:`${cSend}${transition.message.toUpperCase()}`,props:[],return:[],promise:true};
                  method.return.push(`I${role}_${transition.next}`);
                  method.props.push( {  name: transition.message.toLowerCase()
                                      , type: transition.message.toUpperCase()
                                      , from: role
                                      , optional: false
                                      , readonly: false });
                  retInf.methods.push(method);
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
                 receiveMultipleTypes.push(nextStateName);
              }
          }
      );
      if (receiveMultipleTypes.length > 0){
          let method:objMethod={name:cReceive,props:[],return:[],promise:true};
          method.return = receiveMultipleTypes;
          retInf.methods.push(method);
      }
    }
    return retInf;
}

function getStateInterfaces(role:string, possibleStates:State[],stateWithMessages:receivedMessagesInState,stateWithPossibleOriginStates:Map<string,string[]>){
    const stateInterfaces:StateInterface[]=[];
    const abstractInterface:StateInterface={name:`I${role}`,props:[],methods:[],stateType:cAbstractState,role:role};
    //abstractInterface.props.push( { name:cStateProp, optional: false, readonly: false, type:'string'} );
    stateInterfaces.push(abstractInterface);
    possibleStates.forEach( (s) => {
            const originatedStates=getStatesThatPossibleLeadToThisState(s.name,stateWithPossibleOriginStates);
            stateInterfaces.push( getStateInterface( role, s, getReceivedMessagesInState(s.name,stateWithMessages ), originatedStates, stateWithMessages ) );
        }
    );
    return stateInterfaces;
}

function getInterfacesAsText(interfaces:StateInterface[]):string{
    let returnText=ts.sys.newLine;
    for ( const inf of interfaces ){
        let subInterfaces:string|undefined=undefined;
        let tsTypeElements:ts.TypeElement[]=[];
        // adding message properties to the abstract interface
        if (inf.stateType === cAbstractState ) {
            /*
            tsTypeElements.push(
               ts.createPropertySignature( undefined, idMsgFrom, undefined, ts.createTypeReferenceNode(idRoles, undefined), undefined )
            );
            tsTypeElements.push(
               ts.createPropertySignature( undefined, idMsgType, undefined, ts.createTypeReferenceNode(idMsgs, undefined), undefined )
            );
            tsTypeElements.push(
               ts.createPropertySignature( undefined, idMsg, ts.createToken(ts.SyntaxKind.QuestionToken), ts.createTypeReferenceNode(ts.createIdentifier('Message'), undefined), undefined )
            );
            */
        }
        if ( inf.props && inf.props.length === 1 ) {
            const msgFrom = ts.createTypeReferenceNode(ts.createQualifiedName(idRoles,ts.createIdentifier(inf.props[0].from.toLowerCase())),undefined);
            const msgType = ts.createTypeReferenceNode(ts.createQualifiedName(idMsgs,ts.createIdentifier(inf.props[0].name.toUpperCase())),undefined);
            const msgRetType = ts.createTypeReferenceNode(ts.createIdentifier(inf.props[0].name.toUpperCase()), undefined);
            tsTypeElements.push(
                ts.createPropertySignature( idPropReadOnly, idMsgFrom, undefined, msgFrom, undefined )
             );
             tsTypeElements.push(
                ts.createPropertySignature( idPropReadOnly, idMsgType, undefined, msgType, undefined)
             );
             const optionalParameter=inf.props[0].optional?ts.createToken(ts.SyntaxKind.QuestionToken):undefined;             
             tsTypeElements.push(
                ts.createPropertySignature( undefined, idMsg, optionalParameter, msgRetType, undefined )
             );
        }
        if ( inf.props && inf.props.length > 1 ) {
            let interfaceNumber=0;
            for ( const intProperty of inf.props ){
                interfaceNumber++;
                const intName = ts.createIdentifier(`${inf.name}_${interfaceNumber}`);
                const intExtends = [ ts.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [ ts.createExpressionWithTypeArguments( undefined, ts.createIdentifier(inf.name) ) ]) ];

                const tsTypeEleSubInterface:ts.TypeElement[]=[];
                tsTypeEleSubInterface.push(
                    ts.createPropertySignature(idPropReadOnly,idMsgFrom,undefined,ts.createTypeReferenceNode(ts.createQualifiedName(idRoles,ts.createIdentifier( intProperty.from.toLowerCase())),undefined),undefined)
                );
                tsTypeEleSubInterface.push(
                    ts.createPropertySignature(idPropReadOnly,idMsgType,undefined,ts.createTypeReferenceNode(ts.createQualifiedName(idMsgs,ts.createIdentifier(intProperty.name.toUpperCase())),undefined),undefined)
                );
                tsTypeEleSubInterface.push(
                    ts.createPropertySignature(undefined,idMsg,undefined,ts.createTypeReferenceNode(ts.createIdentifier(intProperty.name.toUpperCase()), undefined),undefined)
                );

                const subInterfaceTxt = printCode(ts.createInterfaceDeclaration(undefined,undefined,intName,undefined,intExtends,tsTypeEleSubInterface )) + ts.sys.newLine + ts.sys.newLine;
                if (!subInterfaces) {
                    subInterfaces = subInterfaceTxt ;
                } else {
                    subInterfaces += subInterfaceTxt;
                }
            }
        }
        for ( const meth of inf.methods ){
            let methParameters:ts.ParameterDeclaration[] = [];
            for ( const methPar of meth.props ) {
                const methParType=methPar.type?ts.createTypeReferenceNode(ts.createIdentifier(methPar.type),undefined):undefined;
                methParameters.push(ts.createParameter(undefined,undefined,undefined,ts.createIdentifier(methPar.name),undefined,methParType,undefined));
            }
            let metReturnTypes:ts.TypeNode[]=[];
            for ( const metReturnType of meth.return ){
                metReturnTypes.push(ts.createTypeReferenceNode(ts.createIdentifier(metReturnType), undefined));
            }
            let metReturnType:ts.TypeNode=ts.createUnionTypeNode(metReturnTypes);
            if ( meth.promise ){
                metReturnType = ts.createTypeReferenceNode(idPromise, [metReturnType]);
            }
            const interfaceMethod = ts.createMethodSignature( undefined, methParameters, metReturnType, ts.createIdentifier(meth.name), undefined);
            tsTypeElements.push(interfaceMethod);
        }

        const inheritFromSuperInterfaces = inf.inherit?[ts.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [ts.createExpressionWithTypeArguments(undefined,ts.createIdentifier(inf.inherit))])]:undefined;
        const tsInterface = ts.createInterfaceDeclaration(undefined,undefined,ts.createIdentifier(inf.name),undefined,inheritFromSuperInterfaces, tsTypeElements );
        returnText += printCode(tsInterface) + ts.sys.newLine + ts.sys.newLine;
        if ( subInterfaces ){
            returnText += subInterfaces;
        }
    }
    return returnText;
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
        for ( const meth of inf.methods ){
            const returnObjects=meth.return.reduce((a,e)=>a+=e);
            console.log(`   method:${meth.name}    promise:${meth.promise}      objectsReturned:${returnObjects}`);
            meth.props.forEach((p)=>showObjProperty(p,'   '));
        }
    }
}

export {getStateInterfaces,getInterfacesAsText,showInterfaces}
