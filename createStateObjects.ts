import {Transition,State,Protocol,RootObject,StateInterface,objProperty,objMethod} from './protocolTypeInterface';
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

const cReceive   = 'recv';
const cSend      = 'send';
const cInitial   = 'initial';
const cFinal     = 'final';
const cStateProp = 'state';
const idResolve = ts.createIdentifier('resolve');
const idReject  = ts.createIdentifier('reject');
const idPromise = ts.createIdentifier('Promise');
const idState   = ts.createIdentifier(cStateProp);
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
    return importCode;
}

function getStateInterface(role:string,state:State,alleStates:State[]):StateInterface{
    const transitionMessageProps=receivedMessages(state.name,alleStates);
    let retInf:StateInterface={name:`I${role}_${state.name}`,props:[],methods:[],inherit:`I${role}`};
    retInf.props.push({ name:cStateProp, optional: false, readonly: true, default:`${state.name}` });
    for ( let i=0; i<transitionMessageProps.length; i++ ){
      // a message is received, must be available as prop
      const optionalProp  = (state.type===cInitial||transitionMessageProps.length>1)?true:false;
      const transPropName = transitionMessageProps[i].toLocaleLowerCase();
      const transPropType = transitionMessageProps[i].toLocaleUpperCase();
      retInf.props.push({name:transPropName,optional:optionalProp,type:transPropType,readonly:false});
    }
    if (state.transitions){
      let receiveMultipleTypes:string[]=[];
      state.transitions.forEach(
          (transition) => {
              if ( transition.op === cSend ) {
                  // possible to send a message from this state and continue to a next state
                  let method:objMethod={name:`${cSend}${transition.message.toUpperCase()}`,props:[],return:[],promise:false};
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

function getStateInterfaces(localProtocol:Protocol){
    const stateInterfaces:StateInterface[]=[];
    const abstractInterface:StateInterface={name:`I${localProtocol.role}`,props:[],methods:[]};
    abstractInterface.props.push( { name:cStateProp, optional: false, readonly: false, type:'string'} );
    stateInterfaces.push(abstractInterface);
    localProtocol.states.forEach( (s) => stateInterfaces.push( getStateInterface( localProtocol.role, s, localProtocol.states) )  );
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
    return returnText + ts.sys.newLine;
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
            if ( transition.op === cSend ) {
              methodId = ts.createIdentifier(`${cSend}${transition.message.toUpperCase()}`);

              const methodParameter=ts.createParameter(
                undefined,
                undefined,
                undefined,
                ts.createIdentifier(`${transition.message.toLowerCase()}`),
                undefined,
                ts.createTypeReferenceNode(ts.createIdentifier(`${transition.message.toUpperCase()}`), undefined),
                undefined);

              const methodReturnState = ts.createTypeReferenceNode(ts.createIdentifier(`I${role}_${transition.next}`), undefined);

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
                      ts.createReturn( ts.createNew(ts.createIdentifier(`${role}_${transition.next}`), undefined, [sendMessageProperty]) )
                    ],
                    true
              );

              methods.push(ts.createMethod(undefined,undefined,undefined,methodId,undefined,undefined,[methodParameter],methodReturnState,currMethodBlock));
            }
            if ( transition.op === cReceive ) {
              receiveMultipleTypes.push(ts.createTypeReferenceNode( ts.createIdentifier(`I${role}_${transition.next}`), undefined));
              toReceiveMessages.push(`${transition.message.toUpperCase()}`);
              toCreateStates.push(`${role}_${transition.next}`);
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
                       if ( t.next === stateName ) {
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
    const protocolMessages=getMessagesFromProtocol(protocol).map((s)=>s.toUpperCase());

    // create import definitions
    let returnTxt=getImportDefinitions(protocolMessages);
    const stateInterfaces:StateInterface[]=getStateInterfaces(protocol);
    returnTxt += getInterfacesAsText(stateInterfaces);

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