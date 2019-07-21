import {Parameter,Message,Transition,State,Protocol,RootObject} from './protocolTypeInterface';
import * as ts from "typescript";

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const resultFile = ts.createSourceFile("dummy.ts","",ts.ScriptTarget.Latest,false,ts.ScriptKind.TS);
const printer    = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
const printCode  = (node:ts.Node) => printer.printNode( ts.EmitHint.Unspecified, node, resultFile );

const getInitialStateName      = (protocol:Protocol) => protocol.states.filter((state)=>state.type===cInitial)[0].name;
const getInitialStateClass     = (protocol:Protocol) => `${protocol.role}_${getInitialStateName(protocol)}`;
const getInitialStateInterface = (protocol:Protocol) => `I${getInitialStateClass(protocol)}`;
const getFinalStateName        = (protocol:Protocol) => protocol.states.filter((state)=>state.type===cFinal)[0].name;
const getFinalStateClass       = (protocol:Protocol) => `${protocol.role}_${getFinalStateName(protocol)}`;
const getFinalStateInterface   = (protocol:Protocol) => `I${getFinalStateClass(protocol)}`;

const cReceive  = 'receive';
const cSend     = 'send';
const cInitial  = 'initial';
const cFinal    = 'final';
const idResolve = ts.createIdentifier('resolve');
const idReject  = ts.createIdentifier('reject');
const idPromise = ts.createIdentifier('Promise');
const idState   = ts.createIdentifier('state');
const idReceive = ts.createIdentifier(cReceive);

// Map with key for every state and a array with the messages that can lead to the state
const stateReceivedMessages:Map<string,string[]> = new Map();

function getImportDefinition(fileName:string, importObjects:string[]):string {
    const fileStringLiteral = ts.createStringLiteral(fileName);
    const importedElements  = importObjects.map( (e) => ts.createImportSpecifier( undefined, ts.createIdentifier( e) ) );
    const importDeclaration = ts.createImportDeclaration(undefined, undefined, ts.createImportClause(undefined,  ts.createNamedImports( importedElements ) ), fileStringLiteral );
    return printCode(importDeclaration) + ts.sys.newLine;
}

function getImportDefinitions(messages:string[]):string {
    let importCode:string='';
    importCode += getImportDefinition('./receiveMessageServer',['receiveMessageServer','waitForMessage']);
    importCode += getImportDefinition('./Message', messages );
    importCode += getImportDefinition('./sendMessage',['sendMessage']);
    importCode += getImportDefinition('./globalObjects',['roles','initialize','connectedRoles','OneTransitionPossibleException']);
    return importCode + ts.sys.newLine;
}

function getAbstractInterface(role:string):string{
    const stateProp = ts.createPropertySignature(undefined,ts.createIdentifier('state'),undefined,ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),undefined);
    const abstractInterfaceDef = ts.createInterfaceDeclaration(undefined,undefined,ts.createIdentifier(`I${capitalize(role)}`),undefined,undefined,[stateProp]);
    return printCode(abstractInterfaceDef) + ts.sys.newLine;
}

function createStateInterface(role:string,state:State,transitionMessageProps:string[]):string{
  const interfaceName:ts.Identifier=ts.createIdentifier(`I${role}_${state.name}`);

  const stateProp = ts.createPropertySignature( [ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)], idState, undefined, ts.createLiteralTypeNode(ts.createStringLiteral(`${state.name}`)), undefined );
  let tsTypeElements:ts.TypeElement[]=[];

  tsTypeElements.push( stateProp );

  for ( let i=0; i<transitionMessageProps.length; i++ ){
    // a message is received, must be available as prop
    const optionalProp  = (state.type===cInitial||transitionMessageProps.length>1)?ts.createToken(ts.SyntaxKind.QuestionToken):undefined;
    const transPropName = ts.createIdentifier(transitionMessageProps[i].toLocaleLowerCase());
    const transPropType = ts.createTypeReferenceNode(ts.createIdentifier(transitionMessageProps[i].toLocaleUpperCase()), undefined);
    const transMsgProp  = ts.createPropertySignature( undefined, transPropName, optionalProp, transPropType, undefined );
    tsTypeElements.push( transMsgProp );
  }

  if (state.transitions){
    let receiveMultipleTypes:ts.TypeNode[]=[];
    state.transitions.forEach(
        (transition) => {
            if ( transition.flow === cSend ) {
                // possible to send a message from this state and continue to a next state
                const sendMethReturnTypeIdentifier = ts.createIdentifier(`I${role}_${transition.destination}`);
                const sendMethReturnType = ts.createTypeReferenceNode(sendMethReturnTypeIdentifier, undefined);
                const sendMethIdentifier = ts.createIdentifier(`${cSend}${transition.message.toUpperCase()}`);
                const sendMethParName = ts.createIdentifier(transition.message.toLowerCase());
                const sendMethParType = ts.createTypeReferenceNode(ts.createIdentifier(transition.message.toUpperCase()),undefined);
                const sendMethParameters = [ts.createParameter(undefined,undefined,undefined,sendMethParName,undefined,sendMethParType, undefined)];
                const sendInterfaceMethod = ts.createMethodSignature( undefined, sendMethParameters, sendMethReturnType, sendMethIdentifier, undefined);
                tsTypeElements.push(sendInterfaceMethod);
            }
            if ( transition.flow === cReceive ) {
                // message can be received to continue to next state
                const receiveMethReturnTypeIdentifier = ts.createIdentifier(`I${role}_${transition.destination}`);
                receiveMultipleTypes.push( ts.createTypeReferenceNode(receiveMethReturnTypeIdentifier, undefined) );
            }
        }
    );
    if (receiveMultipleTypes.length > 0){
        // messages can be received from this state, create a union type
        const receiveMethReturnTypes = ts.createUnionTypeNode(receiveMultipleTypes);
        // wrap it in a promise
        const receivePromiseMethRetTypes = ts.createTypeReferenceNode(idPromise, [receiveMethReturnTypes]);
        const interfaceMethod = ts.createMethodSignature( undefined, [], receivePromiseMethRetTypes, idReceive, undefined);
        tsTypeElements.push(interfaceMethod);
    }
  }

  const inheritFromSuperInterface = ts.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [ts.createExpressionWithTypeArguments(undefined,ts.createIdentifier(`I${role}`))]);
  const tsInterface = ts.createInterfaceDeclaration(undefined,undefined,interfaceName,undefined,[inheritFromSuperInterface], tsTypeElements );

  return printCode(tsInterface) + ts.sys.newLine;
}

function getStateAbstractClass(role:string):string{
  let classMembers:ts.ClassElement[]=[];
  const constructorParameter = ts.createParameter( undefined, [ts.createModifier(ts.SyntaxKind.ProtectedKeyword)], undefined, ts.createIdentifier('transitionPossible'), undefined, ts.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword), ts.createTrue() );
  const constructor = ts.createConstructor( undefined, undefined, [ constructorParameter ], ts.createBlock([],false) );
  const chkOneTransition = ts.createMethod(undefined
    , [ts.createModifier(ts.SyntaxKind.ProtectedKeyword)]
    , undefined
    , ts.createIdentifier('checkOneTransitionPossible')
    , undefined
    , undefined
    , []
    , undefined
    , ts.createBlock(
        [ ts.createIf( ts.createPrefix( ts.SyntaxKind.ExclamationToken, ts.createPropertyAccess( ts.createThis(), ts.createIdentifier('transitionPossible') ) )
                     , ts.createThrow(ts.createNew( ts.createIdentifier('OneTransitionPossibleException'), undefined, [ ts.createStringLiteral( 'Only one transition possible from a state' ) ] ) )
                     , undefined )
          , ts.createExpressionStatement(
              ts.createBinary(
                  ts.createPropertyAccess( ts.createThis(), ts.createIdentifier('transitionPossible') ), ts.createToken(ts.SyntaxKind.FirstAssignment), ts.createFalse() ) )
        ]
      , true ) );
  classMembers = [ constructor, ts.createSemicolonClassElement(), chkOneTransition ];
  const abstractClass = ts.createClassDeclaration( undefined, [ts.createModifier(ts.SyntaxKind.AbstractKeyword)], ts.createIdentifier(role), undefined, undefined, classMembers );

  return printCode(abstractClass) + ts.sys.newLine;
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

function getPromiseWithMessageSwitchForReceive(messages:string[],states:string[],roles:string[]):ts.Statement{
   let switchCaseClauses:ts.CaseOrDefaultClause[]=[];

   for ( let i=0; i<messages.length; i++){
      let caseBranch = ts.createBinary(
          ts.createPropertyAccess( ts.createIdentifier(`${messages[i]}`), ts.createIdentifier('name') )
        , ts.createToken(ts.SyntaxKind.PlusToken)
        , ts.createPropertyAccess( ts.createIdentifier('roles'), ts.createIdentifier(`${roles[i].toLowerCase()}`) ) );
      let returnState = ts.createIdentifier(`${states[i]}`);
      let returnMsg = ts.createTypeAssertion( ts.createTypeReferenceNode( ts.createIdentifier(`${messages[i]}`), undefined ), ts.createIdentifier('msg') );
      let resolveState = ts.createCall( idResolve, undefined, [ ts.createNew( returnState, undefined, [ returnMsg ] ) ]  );
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
   return ts.createReturn( ts.createNew( idPromise, undefined, [ promiseReturn ] ) ) ;
}

function getMethods(role:string,state:State):ts.MethodDeclaration[]{
  let methods:ts.MethodDeclaration[]=[];
  let methodModifiers:ts.Modifier[]=[];
  let methodId:ts.Identifier|undefined;
  let methodReturn:ts.TypeReferenceNode|undefined;
  let methodStatements:ts.Statement[]=[];
  let toReceiveMessages:string[]=[];
  let toCreateStates:string[]=[];
  let toRoles:string[]=[];

  if (state.transitions){
    let receiveMultipleTypes:ts.TypeReferenceNode[]=[];
    state.transitions.forEach(
        (transition) => {
            if ( transition.flow === cSend ) {
              methodId = ts.createIdentifier(`${cSend}${transition.message.toUpperCase()}`);

              const methodParameter=ts.createParameter(
                undefined,
                undefined,
                undefined,
                ts.createIdentifier(`${transition.message.toLowerCase()}`),
                undefined,
                ts.createTypeReferenceNode(ts.createIdentifier(`${transition.message.toUpperCase()}`), undefined),
                undefined);

              const methodReturnState = ts.createTypeReferenceNode(ts.createIdentifier(`I${role}_${transition.destination}`), undefined);

              const sendMessageProperty=ts.createIdentifier(`${transition.message.toLocaleLowerCase()}`);
              const currMethodBlock = ts.createBlock(
                    [ ts.createExpressionStatement( ts.createCall(ts.createPropertyAccess(ts.createSuper(),ts.createIdentifier('checkOneTransitionPossible') ),undefined, [] ) )
                    , ts.createExpressionStatement(
                      ts.createCall( ts.createIdentifier('sendMessage')
                                   , undefined
                                   , [  ts.createPropertyAccess(ts.createIdentifier('roles'),ts.createIdentifier(`${role.toLowerCase()}`))
                                      , ts.createPropertyAccess(ts.createIdentifier('roles'),ts.createIdentifier(`${transition.role.toLowerCase()}`))
                                      , sendMessageProperty
                                     ] )
                      ),
                      ts.createReturn( ts.createNew(ts.createIdentifier(`${role}_${transition.destination}`), undefined, [sendMessageProperty]) )
                    ],
                    true
              );

              methods.push(ts.createMethod(undefined,undefined,undefined,methodId,undefined,undefined,[methodParameter],methodReturnState,currMethodBlock));
            }
            if ( transition.flow === cReceive ) {
              receiveMultipleTypes.push(ts.createTypeReferenceNode( ts.createIdentifier(`I${role}_${transition.destination}`), undefined));
              toReceiveMessages.push(`${transition.message}`);
              toCreateStates.push(`${role}_${transition.destination}`);
              toRoles.push(`${transition.role}`);
            }
        }
    );
    if (receiveMultipleTypes.length > 0){
      methodModifiers.push(ts.createModifier(ts.SyntaxKind.AsyncKeyword));
      methodReturn = ts.createTypeReferenceNode( idPromise, [ ts.createUnionTypeNode(receiveMultipleTypes) ]);
      methodStatements.push(getCheckOneTransitionPossibleForReceive());
      const msgWaitForMessageVarDeclaration = ts.createVariableDeclaration( ts.createIdentifier('msg'), undefined, ts.createAwait( ts.createCall( ts.createIdentifier('waitForMessage'), undefined, [] ) ) );
      const msgWaitForMessage = ts.createVariableStatement( undefined, ts.createVariableDeclarationList( [ msgWaitForMessageVarDeclaration ], ts.NodeFlags.AwaitContext | ts.NodeFlags.Let  ) );
      methodStatements.push(msgWaitForMessage);
      methodStatements.push(getPromiseWithMessageSwitchForReceive(toReceiveMessages,toCreateStates,toRoles));
      const methodBlock:ts.Block = ts.createBlock(methodStatements,true);
      methods.push(ts.createMethod(undefined,methodModifiers,undefined,idReceive,undefined,undefined,[],methodReturn,methodBlock));
    }
  }

  return methods;
}

function returnConstructor(classProperties:string[],stateType:string):ts.ClassElement{
   let classParameters:ts.ParameterDeclaration[]=[];

   for ( let i=0; i<classProperties.length;i++){
      classParameters.push( ts.createParameter( undefined
                          , [ts.createModifier(ts.SyntaxKind.PublicKeyword)]
                          , undefined
                          , ts.createIdentifier(`${classProperties[i].toLowerCase()}`)
                          , (stateType===cInitial||classProperties.length>1)?ts.createToken(ts.SyntaxKind.QuestionToken):undefined
                          , ts.createTypeReferenceNode(ts.createIdentifier(`${classProperties[i].toUpperCase()}`), undefined)
                          , undefined )
      );
   }

   let constructorBlockCode:ts.Statement[] = [];
   constructorBlockCode.push(ts.createExpressionStatement(ts.createCall(ts.createSuper(), undefined, [])));
   if (stateType===cFinal){
      constructorBlockCode.push(ts.createExpressionStatement(ts.createCall(ts.createPropertyAccess(ts.createIdentifier('receiveMessageServer'),ts.createIdentifier('terminate')),undefined,[])));
   }
   const superCall=ts.createBlock(constructorBlockCode,true);
   return ts.createConstructor(undefined,undefined,classParameters,superCall);
}

function createStateClass(role:string,state:State,transitionMessageProps:string[]):string{
    const stateClassId=ts.createIdentifier(`${role}_${state.name}`);
    const stateInterfaceId=ts.createIdentifier(`I${role}_${state.name}`);
    const superBaseClassId=ts.createIdentifier(`${role}`);

    const extendsAndImplements = [
        ts.createHeritageClause(ts.SyntaxKind.ExtendsKeyword,          [ ts.createExpressionWithTypeArguments( undefined, superBaseClassId ) ] )
    ,   ts.createHeritageClause(ts.SyntaxKind.FirstFutureReservedWord, [ ts.createExpressionWithTypeArguments( undefined, stateInterfaceId ) ] ) ];

    let classMembers:ts.ClassElement[] = [];
    const stateProperty = ts.createProperty( undefined, [ ts.createModifier(ts.SyntaxKind.PublicKeyword), ts.createModifier(ts.SyntaxKind.ReadonlyKeyword) ], idState, undefined, undefined, ts.createStringLiteral(state.name) );
    classMembers.push(stateProperty);

    classMembers.push(returnConstructor(transitionMessageProps,state.type));

    getMethods(role,state).forEach( (e)=>classMembers.push(e) );

    const stateClassDeclaration = ts.createClassDeclaration( undefined, undefined, stateClassId, undefined, extendsAndImplements, classMembers );
    return printCode(stateClassDeclaration) + ts.sys.newLine;
}

function getReceivedMessagesForState(stateName:string, states:State[]):string[]{
    let messages:string[]=[];
    states.forEach(
        (state) => {
           if (state.transitions)
               state.transitions.forEach(
                   (t) => {
                       //console.log(`${stateName}  ${state.name}   ${t.destination}   ${t.flow}  ${t.message}  ${t.role}`);
                       if ( t.destination === stateName ) {
                           messages.push(t.message);
                       }
                   }
               );
        }
    );
    return Array.from(new Set(messages));
}

function initializeReceivedMessagesArrayPerState(protocol:Protocol){
    protocol.states.forEach(
        (s)=>{
            const messages=getReceivedMessagesForState(s.name,protocol.states);
            stateReceivedMessages.set(s.name,messages);
        }
    );
}

function receivedMessages(stateName:string, states:State[]):string[]{
    let messages=stateReceivedMessages.get(stateName);
    if (!messages) messages = [];
    return messages;
}

function getMessagesFromProtocol(protocol:Protocol){
    let messages:string[]=[];
    protocol.states.forEach( (s) => {
        if (s.transitions)
            s.transitions.forEach(
                (t)=>messages.push(t.message)
            );
    } );
    return Array.from(new Set(messages));
}

function getExecuteProtocolFunction(protocol:Protocol){
    const modifiers:ts.Modifier[]=[];
    modifiers.push(ts.createModifier(ts.SyntaxKind.ExportKeyword));
    modifiers.push(ts.createModifier(ts.SyntaxKind.AsyncKeyword));

    const parameterFunctionF=ts.createFunctionTypeNode(undefined
        , [ ts.createParameter(
            undefined,undefined,undefined
            ,ts.createIdentifier(`${getInitialStateName(protocol)}`),undefined
            ,ts.createTypeReferenceNode(ts.createIdentifier(`${getInitialStateInterface(protocol)}`),undefined),undefined
            )
          ]
        , ts.createTypeReferenceNode(idPromise, [ts.createTypeReferenceNode(ts.createIdentifier(`${getFinalStateInterface(protocol)}`),undefined)])
    );

    const parameters:ts.ParameterDeclaration[]=[];
    const idF=ts.createIdentifier('f');
    const idHost=ts.createIdentifier('host');
    const idPort=ts.createIdentifier('port');
    parameters.push(ts.createParameter(undefined,undefined,undefined,idF,undefined,parameterFunctionF,undefined));
    parameters.push(ts.createParameter(undefined,undefined,undefined,idHost,undefined,ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),undefined));
    parameters.push(ts.createParameter(undefined,undefined,undefined,idPort,undefined,ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),undefined));

    const statements:ts.Statement[]=[];

    // logging role name and time/date
    statements.push(
        ts.createExpressionStatement(
            ts.createCall(
                ts.createPropertyAccess(ts.createIdentifier('console'),ts.createIdentifier('log')),undefined,
                [ ts.createTemplateExpression(ts.createTemplateHead(`${protocol.role} started `),[ts.createTemplateSpan(ts.createNew(ts.createIdentifier('Date'), undefined, []),ts.createTemplateTail(''))])]
        )
    ));

    const idDone=ts.createIdentifier('done');
    statements.push(ts.createExpressionStatement(ts.createAwait(ts.createCall(ts.createIdentifier('initialize'), undefined, [ts.createPropertyAccess(ts.createIdentifier('roles'),ts.createIdentifier(`${protocol.role.toLowerCase()}`)),idPort,idHost]))));
    statements.push(ts.createVariableStatement(undefined,ts.createVariableDeclarationList([ ts.createVariableDeclaration(idDone,undefined,ts.createAwait(ts.createCall(idF, undefined, [ts.createNew(ts.createIdentifier(`${getInitialStateClass(protocol)}`), undefined, [])]))) ],ts.NodeFlags.AwaitContext | ts.NodeFlags.Let)));

    const returnStatement:ts.ReturnStatement=ts.createReturn(
        ts.createNew(idPromise
        , [ ts.createTypeReferenceNode( ts.createIdentifier(`${getFinalStateInterface(protocol)}`), undefined ) ],
          [ ts.createArrowFunction(undefined,undefined,[ ts.createParameter(undefined,undefined,undefined,idResolve,undefined,undefined,undefined) ],undefined,ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken),ts.createCall(idResolve, undefined, [ idDone ]))]
        )
    );

    statements.push(returnStatement);

    const codeBlock:ts.Block=ts.createBlock(statements, true);
    const executeProtocolFunction:ts.FunctionDeclaration=ts.createFunctionDeclaration(undefined,modifiers,undefined,ts.createIdentifier('executeProtocol'),undefined,parameters,undefined,codeBlock);

    return printCode(executeProtocolFunction) + ts.sys.newLine;
}

function getStateObjects( protocol:Protocol ):string{
    console.log(`start getStateObjects  ${protocol.role}`);

    // initialize a map with states and the messages that lead to the state
    initializeReceivedMessagesArrayPerState(protocol);
    //stateReceivedMessages.forEach((val,key)=> console.log(`${key}  --  ${val}`));

    // ophalen van messages
    const protocolMessages=getMessagesFromProtocol(protocol);

    // create import definitions
    let returnTxt=getImportDefinitions(protocolMessages);

    // create top/abstract interface
    returnTxt += getAbstractInterface(protocol.role) + ts.sys.newLine;

    // create interfaces
    protocol.states.forEach(
        (state) => {
            let transitionMessageProps=receivedMessages(state.name,protocol.states);
            returnTxt+=createStateInterface(protocol.role, state, transitionMessageProps ) + ts.sys.newLine;
        }
    );

    // create abstract class
    returnTxt += getStateAbstractClass(protocol.role) + ts.sys.newLine;

    // create state classes
    protocol.states.forEach(
        (state) => {
            let transitionMessageProps=receivedMessages(state.name,protocol.states);
            returnTxt += createStateClass(protocol.role,state,transitionMessageProps) + ts.sys.newLine;
        }
    );

    // create exports
    let exportsSpecifiers:ts.ExportSpecifier[]=[];
    exportsSpecifiers.push(ts.createExportSpecifier(undefined, ts.createIdentifier(`I${protocol.role}`)));
    protocol.states.forEach(
        (state) => exportsSpecifiers.push(ts.createExportSpecifier(undefined, ts.createIdentifier(`I${protocol.role}_${state.name}`)))
    );

    returnTxt += printCode(ts.createExportDeclaration(undefined,undefined,ts.createNamedExports(exportsSpecifiers),undefined) )  + ts.sys.newLine + ts.sys.newLine;

    // create executeProtocol function
    returnTxt += getExecuteProtocolFunction(protocol);

    return returnTxt;
}

export {getStateObjects};