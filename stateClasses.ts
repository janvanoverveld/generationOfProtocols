import {StateInterface,objProperty} from './interfacesAndDatatypes/localProtocolInterfaceData';
import {StateClass,objReceiveMethod,objSendMethod,objToReceiveMessages} from './interfacesAndDatatypes/localProtocolClassData';
import {message,receivedMessagesInState} from './interfacesAndDatatypes/messageDataTypes';
import {Transition,State,displayProtocol,LocalProtocolDefinition} from './interfacesAndDatatypes/globalProtocolDefinition';
import * as ts from "typescript";

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const resultFile = ts.createSourceFile("dummy.ts","",ts.ScriptTarget.Latest,false,ts.ScriptKind.TS);
const printer    = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
const printCode  = (node:ts.Node) => printer.printNode( ts.EmitHint.Unspecified, node, resultFile );

const cReceive       = 'recv';
const cSend          = 'send';
const cInitial       = 'initial';
const cFinal         = 'final';
const cMsgFrom       = 'messageFrom';
const cMsgType       = 'messageType';
const cMsg           = 'message';
const cMsgs          = 'messages';
const cRoles         = 'roles';
const idResolve = ts.createIdentifier('resolve');
const idReject  = ts.createIdentifier('reject');
const idPromise = ts.createIdentifier('Promise');
const idReceive = ts.createIdentifier(cReceive);
const idMsgFrom = ts.createIdentifier(cMsgFrom);
const idMsgType = ts.createIdentifier(cMsgType);
const idMsg     = ts.createIdentifier(cMsg);
const idRoles   = ts.createIdentifier(cRoles);
const idMsgs    = ts.createIdentifier(cMsgs);
//
const idPropReadOnly = [ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)];
const idPublic       = [ts.createModifier(ts.SyntaxKind.PublicKeyword)];

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

function getCheckOneTransitionPossibleForReceive(){
   const exceptionIdentifier=ts.createIdentifier('exc');
   const tryBlock = ts.createBlock( [ ts.createExpressionStatement(ts.createCall(ts.createPropertyAccess(ts.createSuper(), ts.createIdentifier('checkOneTransitionPossible')),undefined,[]) ) ], true );
   const variableDeclaration:ts.VariableDeclaration=ts.createVariableDeclaration(exceptionIdentifier,undefined,undefined);

   const rejectArrowFunction=ts.createArrowFunction(undefined,undefined,
    [ ts.createParameter( undefined, undefined, undefined, idResolve, undefined, undefined, undefined )
    , ts.createParameter( undefined, undefined, undefined, idReject,  undefined, undefined, undefined ) ]
    , undefined
    , ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken)
    , ts.createCall( idReject, undefined, [exceptionIdentifier] )
    );

   const rejectionReturn=ts.createReturn(ts.createNew(idPromise, undefined, [ rejectArrowFunction ]));
   const catchBlock = ts.createCatchClause(variableDeclaration, ts.createBlock([rejectionReturn], true));
   const statement:ts.Statement = ts.createTry( tryBlock, catchBlock, undefined );
   return statement;
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

function getTextFromStateClassDefinition(stateClass:StateClass):string{
    let extraSubClasses:string|undefined=undefined;
    const extendsAndImplements = [
        ts.createHeritageClause(ts.SyntaxKind.ExtendsKeyword,          [ ts.createExpressionWithTypeArguments( undefined, ts.createIdentifier(stateClass.extends) ) ] )
    ,   ts.createHeritageClause(ts.SyntaxKind.FirstFutureReservedWord, [ ts.createExpressionWithTypeArguments( undefined, ts.createIdentifier(stateClass.implements) ) ] ) ];

    let classMembers:ts.ClassElement[] = [];
//    for ( const prop of stateClass.regularProps ){
//        const modifiers:ts.Modifier[]=[ts.createModifier(ts.SyntaxKind.PublicKeyword)];
//        if (prop.readonly) modifiers.push(ts.createModifier(ts.SyntaxKind.ReadonlyKeyword));
//        const defaultValue=prop.default?ts.createStringLiteral(prop.default):undefined;
//        classMembers.push( ts.createProperty( undefined, modifiers, ts.createIdentifier(prop.name), undefined, undefined, defaultValue ) );
//    }

    let classParameters:ts.ParameterDeclaration[]=[];
    if ( stateClass.constructorProps && stateClass.constructorProps.length === 1){
        classMembers.push(
            ts.createProperty(undefined,idPropReadOnly,idMsgFrom,undefined,undefined,ts.createPropertyAccess(idRoles,ts.createIdentifier(stateClass.constructorProps[0].from)))
        );
        classMembers.push(
            ts.createProperty(undefined,idPropReadOnly,idMsgType,undefined,undefined,ts.createPropertyAccess(idMsgs,ts.createIdentifier(stateClass.constructorProps[0].name.toUpperCase())))
        );
        // creating constructor parameters
        const optionalParameter=stateClass.constructorProps[0].optional?ts.createToken(ts.SyntaxKind.QuestionToken):undefined;
        classParameters.push(
            ts.createParameter(undefined,idPublic,undefined,idMsg,optionalParameter,ts.createTypeReferenceNode(ts.createIdentifier(stateClass.constructorProps[0].name.toUpperCase()), undefined),undefined)
        );
    }

    if ( stateClass.constructorProps && stateClass.constructorProps.length > 1){
      let classNumber = 0;
      for ( const prop of stateClass.constructorProps ){
        classNumber++;
        const subClassName=ts.createIdentifier(`${stateClass.name}_${classNumber}`);
        const ext_and_impl=[ ts.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [ts.createExpressionWithTypeArguments(undefined,ts.createIdentifier(stateClass.name))])
                           , ts.createHeritageClause(ts.SyntaxKind.FirstFutureReservedWord, [ts.createExpressionWithTypeArguments(undefined,ts.createIdentifier(`I${stateClass.name}_${classNumber}`))])];
        const classProps = [
            ts.createProperty(undefined,idPropReadOnly,idMsgFrom,undefined,undefined,ts.createPropertyAccess(idRoles,ts.createIdentifier(prop.from.toLowerCase()))),
            ts.createProperty(undefined,idPropReadOnly,idMsgType,undefined,undefined,ts.createPropertyAccess(idMsgs,ts.createIdentifier(prop.name.toUpperCase()))),
            ts.createConstructor(undefined,undefined,
              [ ts.createParameter(undefined,idPublic,undefined,idMsg,undefined,ts.createTypeReferenceNode(ts.createIdentifier(prop.name.toUpperCase()), undefined),undefined)]
              , ts.createBlock( [ ts.createExpressionStatement(ts.createCall(ts.createSuper(), undefined, [])) ], true )
            )
        ];

        const subClass = ts.createClassDeclaration(undefined,undefined,subClassName,undefined,ext_and_impl,classProps);
        if ( !extraSubClasses ){
            extraSubClasses = printCode(subClass) + ts.sys.newLine;
        } else {
            extraSubClasses += printCode(subClass) + ts.sys.newLine;
        }
      }
    }

    let constructorBlockCode:ts.Statement[] = [];
    constructorBlockCode.push(ts.createExpressionStatement(ts.createCall(ts.createSuper(), undefined, [])));
    if (stateClass.stateType===cFinal){
       constructorBlockCode.push(ts.createExpressionStatement(ts.createCall(ts.createPropertyAccess(ts.createIdentifier('receiveMessageServer'),ts.createIdentifier('terminate')),undefined,[])));
    }
    const superCall=ts.createBlock(constructorBlockCode,true);

    classMembers.push(ts.createConstructor(undefined,undefined,classParameters,superCall));

    for ( const sendM of stateClass.sendMethods ){
        const methodParameter = ts.createParameter(undefined,undefined,undefined,ts.createIdentifier(sendM.msg.toLowerCase()),undefined,ts.createTypeReferenceNode(ts.createIdentifier(sendM.msg.toUpperCase()), undefined),undefined);
        const methodNextState = ts.createTypeReferenceNode(idPromise, [ ts.createTypeReferenceNode(ts.createIdentifier(sendM.nextStateInterface), undefined) ] );
        const sendMessage     = ts.createIdentifier( sendM.msg.toLowerCase() );
        const resolvePromise  = ts.createArrowFunction(undefined,undefined
                                , [ts.createParameter(undefined,undefined,undefined,ts.createIdentifier('resolve'),undefined,undefined,undefined)]
                                , undefined, ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken)
                                , ts.createCall( ts.createIdentifier('resolve'), undefined, [ ts.createNew( ts.createIdentifier(sendM.nextStateClass), undefined, undefined ) ] ) );
        const currMethodBlock = ts.createBlock(
              [ ts.createExpressionStatement( ts.createCall(ts.createPropertyAccess(ts.createSuper(),ts.createIdentifier('checkOneTransitionPossible') ),undefined, [] ) )
              , ts.createExpressionStatement(
                  ts.createAwait(
                    ts.createCall( ts.createIdentifier('sendMessage')
                                 , undefined
                                 , [  ts.createPropertyAccess(ts.createIdentifier('roles'),ts.createIdentifier(sendM.from.toLowerCase()))
                                    , ts.createPropertyAccess(ts.createIdentifier('roles'),ts.createIdentifier(sendM.to.toLowerCase()))
                                    , sendMessage
                                   ] )
                    )
                  )
              , ts.createReturn( ts.createNew( idPromise, undefined, [resolvePromise] ) )
              ],
              true
        );
        classMembers.push(
            ts.createMethod( undefined
            ,                [ts.createModifier(ts.SyntaxKind.AsyncKeyword)]
            ,                undefined
            ,                ts.createIdentifier(sendM.name)
            ,                undefined
            ,                undefined
            ,                [methodParameter]
            ,                methodNextState
            ,                currMethodBlock )
        );
    }

    if (stateClass.receiveMethod){
        let receiveMultipleTypes:ts.TypeReferenceNode[]=[];
        for ( const retType of stateClass.receiveMethod.messages ){
            let retInterfaceType=ts.createIdentifier( retType.nextStateInterface);
            if ( retType.totalCountOfNextClassProps > 1 ) {
                retInterfaceType=ts.createIdentifier( `${retType.nextStateInterface}_${retType.positionNumberNextClassProps+1}`);
            }
            receiveMultipleTypes.push( ts.createTypeReferenceNode( retInterfaceType, undefined) );
        }
        const methodModifiers=[ts.createModifier(ts.SyntaxKind.AsyncKeyword)];
        const methodReturn = ts.createTypeReferenceNode( idPromise, [ ts.createUnionTypeNode(receiveMultipleTypes) ]);
        const methodStatements=[getCheckOneTransitionPossibleForReceive()];
        //
        //
        const messagePredicateType = ts.createFunctionTypeNode( undefined, [ ts.createParameter(undefined,undefined,undefined,ts.createIdentifier('message'),undefined,ts.createTypeReferenceNode(ts.createIdentifier('Message'),undefined),undefined) ],ts.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword));
        const messagePredicateExpressens:ts.Expression[]=[];
        for ( const retType of stateClass.receiveMethod.messages ){
           const predicatePiece = ts.createParen(
                ts.createBinary(
                  ts.createBinary(ts.createPropertyAccess(ts.createIdentifier('m'),ts.createIdentifier('name')),
                    ts.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
                    ts.createPropertyAccess(ts.createIdentifier(retType.message.toUpperCase()),ts.createIdentifier('name')
                    )
                  ),
                  ts.createToken(ts.SyntaxKind.AmpersandAmpersandToken),
                  ts.createBinary(
                    ts.createPropertyAccess(ts.createIdentifier('m'),ts.createIdentifier('from')),
                    ts.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
                    ts.createPropertyAccess(ts.createIdentifier('roles'),ts.createIdentifier(retType.from.toLowerCase()))
                  )
                )
           );
           messagePredicateExpressens.push(predicatePiece);
        }

        let msgPredicateExpression:ts.Expression = messagePredicateExpressens[0];
        for ( let i=1; i<messagePredicateExpressens.length; i++){
            msgPredicateExpression = ts.createBinary(msgPredicateExpression,ts.createToken(ts.SyntaxKind.BarBarToken),messagePredicateExpressens[i]);
        }
        const messagePredicateBody:ts.ConciseBody = msgPredicateExpression;
        const messagePredicate = ts.createArrowFunction(undefined,undefined,[ ts.createParameter(undefined,undefined,undefined,ts.createIdentifier('m'),undefined,undefined,undefined)],undefined,ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken),messagePredicateBody);
        const messagePredicateVar = ts.createVariableStatement( undefined, ts.createVariableDeclarationList( [ ts.createVariableDeclaration(ts.createIdentifier('msgPredicate'),messagePredicateType,messagePredicate) ], ts.NodeFlags.Const ) );
        methodStatements.push(messagePredicateVar);
        //
        // await op msg
        const awaitOpMsg=ts.createVariableStatement(undefined,
            ts.createVariableDeclarationList(
              [ ts.createVariableDeclaration(ts.createIdentifier('msg'),undefined
                ,ts.createAwait(ts.createCall(ts.createPropertyAccess(ts.createIdentifier('messageDB'),ts.createIdentifier('remove')),undefined,[ts.createIdentifier('msgPredicate')])) ) ],
              ts.NodeFlags.Const
        ));
        methodStatements.push(awaitOpMsg);
        //
        const switchCaseClauses:ts.CaseOrDefaultClause[]=[];
        for ( const retType of stateClass.receiveMethod.messages ){
            const caseBranch = ts.createBinary(
                ts.createPropertyAccess( ts.createIdentifier(retType.message.toUpperCase()), ts.createIdentifier('name') )
              , ts.createToken(ts.SyntaxKind.PlusToken)
              , ts.createPropertyAccess( ts.createIdentifier('roles'), ts.createIdentifier(retType.from.toLowerCase() ) ) );
            let returnState = ts.createIdentifier(retType.nextStateClass);
            if(retType.totalCountOfNextClassProps>1){
                returnState = ts.createIdentifier(`${retType.nextStateClass}_${retType.positionNumberNextClassProps+1}`);
            }
            const nextStateConstructorParameters:ts.Expression[]=[];
            const nextStateConstructorPar = ts.createTypeAssertion( ts.createTypeReferenceNode( ts.createIdentifier(retType.message.toUpperCase()), undefined ), ts.createIdentifier('msg') );
            nextStateConstructorParameters.push(nextStateConstructorPar);
            const resolveState = ts.createCall( idResolve, undefined, [ ts.createNew( returnState, undefined, nextStateConstructorParameters ) ]  );
            switchCaseClauses.push(ts.createCaseClause( caseBranch, [ ts.createBlock( [ ts.createExpressionStatement( resolveState ), ts.createBreak(undefined) ], true ) ] ) );
        }
        const switchStatement = ts.createSwitch(
            ts.createBinary( ts.createPropertyAccess(ts.createIdentifier('msg'),ts.createIdentifier('name'))
            ,                ts.createToken(ts.SyntaxKind.PlusToken)
            ,                ts.createPropertyAccess(ts.createIdentifier('msg'),ts.createIdentifier('from')) )
            , ts.createCaseBlock(switchCaseClauses) ) ;
        const promiseReturn = ts.createArrowFunction( undefined
        , undefined
        , [ts.createParameter(undefined,undefined,undefined,idResolve,undefined,undefined,undefined ) ]
        , undefined
        , ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken)
        , ts.createBlock([switchStatement], true ) );
        methodStatements.push( ts.createReturn(ts.createNew(idPromise, undefined, [promiseReturn])) );
        const methodBlock:ts.Block = ts.createBlock(methodStatements,true);
        classMembers.push(ts.createMethod(undefined,methodModifiers,undefined,idReceive,undefined,undefined,[],methodReturn,methodBlock));
    }

    const stateClassDeclaration = ts.createClassDeclaration( undefined, undefined, ts.createIdentifier(stateClass.name), undefined, extendsAndImplements, classMembers );
    let returnClassCode = printCode(stateClassDeclaration) + ts.sys.newLine;
    if ( extraSubClasses ){
        returnClassCode += extraSubClasses;
    }
    return returnClassCode
}

function getTextFromStateClasses(stateClasses:StateClass[]):string{
    let returnText:string='';
    for ( const stateClass of stateClasses ){
        returnText += getTextFromStateClassDefinition(stateClass) + ts.sys.newLine;
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

export {getTextFromStateClasses,getStateClassDefinitions,showClasses};
