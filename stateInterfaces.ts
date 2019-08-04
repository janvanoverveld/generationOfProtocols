import {Transition,State,Protocol,RootObject,StateInterface,objProperty,objMethod,StateClass,objReceiveMethod,objSendMethod,objToReceiveMessages} from './protocolTypeInterface';
import * as ts from "typescript";

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const resultFile = ts.createSourceFile("dummy.ts","",ts.ScriptTarget.Latest,false,ts.ScriptKind.TS);
const printer    = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
const printCode  = (node:ts.Node) => printer.printNode( ts.EmitHint.Unspecified, node, resultFile );

const cReceive   = 'recv';
const cSend      = 'send';
const cInitial   = 'initial';
const cStateProp = 'state';
const idPromise = ts.createIdentifier('Promise');

function getReceivedMessagesInState(state:string,stateMessageMap:Map<string,string[]>):string[]{
    let messages = stateMessageMap.get(state);
    if (!messages) messages = [];
    return messages;
}

function getStatesThatPossibleLeadToThisState(state:string,originatedStatesMap:Map<string,string[]>):string[]{
    let oriStates = originatedStatesMap.get(state);
    if (!oriStates) oriStates = [];
    return oriStates;
}

function getStateInterface(role:string,state:State,messagesThatLedToState:string[],originatedStates:string[]):StateInterface{
    let retInf:StateInterface={name:`I${role}_${state.name}`,props:[],methods:[],inherit:`I${role}`,stateType:state.type, role:role};
    retInf.props.push({ name:cStateProp, optional: false, readonly: true, default:state.name });
    for ( let i=0; i<messagesThatLedToState.length; i++ ){
      // a message is received, must be available as prop
      const optionalProp  = (state.type===cInitial||originatedStates.length>1)?true:false;
      const transPropName = messagesThatLedToState[i].toLocaleLowerCase();
      const transPropType = messagesThatLedToState[i].toLocaleUpperCase();
      retInf.props.push({name:transPropName,optional:optionalProp,type:transPropType,readonly:false});
    }
    if (state.transitions){
      let receiveMultipleTypes:string[]=[];
      state.transitions.forEach(
          (transition) => {
              if ( transition.op === cSend ) {
                  // possible to send a message from this state and continue to a next state
                  let method:objMethod={name:`${cSend}${transition.message.toUpperCase()}`,props:[],return:[],promise:true};
                  method.return.push(`I${role}_${transition.next}`);
                  method.props.push( {  name:     transition.message.toLowerCase()
                                      , type:     transition.message.toUpperCase()
                                      , optional: false
                                      , readonly: false });
                  retInf.methods.push(method);
              }
              if ( transition.op === cReceive ) {
                  // message can be received to continue to next state
                  receiveMultipleTypes.push( `I${role}_${transition.next}` );
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

function getStateInterfaces(role:string, possibleStates:State[],stateWithMessages:Map<string,string[]>,stateWithPossibleOriginStates:Map<string,string[]>){
    const stateInterfaces:StateInterface[]=[];
    const abstractInterface:StateInterface={name:`I${role}`,props:[],methods:[],stateType:'abstractState',role:role};
    abstractInterface.props.push( { name:cStateProp, optional: false, readonly: false, type:'string'} );
    stateInterfaces.push(abstractInterface);
    possibleStates.forEach( (s) => {
            const originatedStates=getStatesThatPossibleLeadToThisState(s.name,stateWithPossibleOriginStates);
            stateInterfaces.push( getStateInterface( role, s, getReceivedMessagesInState(s.name,stateWithMessages ), originatedStates ) );
        }
    );
    return stateInterfaces;
}

function getInterfacesAsText(interfaces:StateInterface[]):string{
    let returnText=ts.sys.newLine;
    for ( const inf of interfaces ){
        let tsTypeElements:ts.TypeElement[]=[];
        for ( const prop of inf.props ){
            const readonlyProp=prop.readonly?[ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)]:undefined;
            const optionalProp=prop.optional?ts.createToken(ts.SyntaxKind.QuestionToken):undefined;
            let datatypeProp:ts.TypeNode|undefined=prop.type?ts.createTypeReferenceNode(ts.createIdentifier(prop.type), undefined):undefined;
            if ( prop.default ) datatypeProp = ts.createLiteralTypeNode(ts.createStringLiteral( prop.default ));
            tsTypeElements.push(
                ts.createPropertySignature( readonlyProp
                ,                           ts.createIdentifier(prop.name)
                ,                           optionalProp
                ,                           datatypeProp
                ,                           undefined )
            );
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
    }
    return returnText;
}

function showObjProperty(objProp:objProperty, extraChars?:string){
    let printString=`   property:${objProp.name}       type:${objProp.type}   optional:${objProp.optional}   readonly:${objProp.readonly}    default:${objProp.default}`;
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
