import {message,receivedMessagesInState,Transition,State,Protocol,RootObject,StateInterface,objProperty,StateClass,objReceiveMethod,objSendMethod,objToReceiveMessages} from './protocolTypeInterface';
import {getStateInterfaces,getInterfacesAsText,showInterfaces} from './stateInterfaces';
import {getTextFromStateClasses,getStateClassDefinitions, showClasses} from './stateClasses';
import * as ts from "typescript";

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const resultFile = ts.createSourceFile("dummy.ts","",ts.ScriptTarget.Latest,false,ts.ScriptKind.TS);
const printer    = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
const printCode  = (node:ts.Node) => printer.printNode( ts.EmitHint.Unspecified, node, resultFile );

const cReceive     = 'recv';
const cInitial     = 'initial';
const cFinal       = 'final';
const cMessageEnum = 'messages';
const cExecutePro  = 'executeProtocol';
const idResolve    = ts.createIdentifier('resolve');
const idPromise    = ts.createIdentifier('Promise');

function getImportDefinition(fileName:string, importObjects:string[]):string {
    const fileStringLiteral = ts.createStringLiteral(fileName);
    const importedElements  = importObjects.map( (e) => ts.createImportSpecifier( undefined, ts.createIdentifier( e) ) );
    const importDeclaration = ts.createImportDeclaration(undefined, undefined, ts.createImportClause(undefined,  ts.createNamedImports( importedElements ) ), fileStringLiteral );
    return printCode(importDeclaration) + ts.sys.newLine;
}

function getImportDefinitions(messages:string[]):string {
   let importCode:string='';
   importCode += getImportDefinition('./receiveMessageServer',['receiveMessageServer']);
   importCode += getImportDefinition('./Message', messages.concat(['Message']) );
   importCode += getImportDefinition('./sendMessage',['sendMessage']);
   importCode += getImportDefinition('./globalObjects',['roles','initialize','connectedRoles','OneTransitionPossibleException']);
   importCode += getImportDefinition('./messageDB',['messageDB']);
   return importCode + ts.sys.newLine;
}

function getEnumWithMessages(protocolMessages):string {
   const enumMessages:ts.EnumMember[]=[];
   protocolMessages.forEach( (msg) => enumMessages.push(ts.createEnumMember(ts.createIdentifier(msg),ts.createStringLiteral(msg))));
   //enumMessages.push(ts.createEnumMember(ts.createIdentifier(cNoMessage),ts.createStringLiteral(cNoMessage) ) );
   const messagesEnums = ts.createEnumDeclaration(undefined,undefined,ts.createIdentifier(cMessageEnum),enumMessages);
   return printCode(messagesEnums) + ts.sys.newLine;
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

  //const msgFrom:ts.ClassElement = ts.createProperty(undefined,[ts.createModifier(ts.SyntaxKind.PublicKeyword)],ts.createIdentifier('messageFrom'),undefined,undefined, ts.createPropertyAccess(ts.createIdentifier('roles'),ts.createIdentifier(role.toLowerCase())) );
  //const msgType:ts.ClassElement = ts.createProperty(undefined,[ts.createModifier(ts.SyntaxKind.PublicKeyword)],ts.createIdentifier('messageType'),undefined,undefined, ts.createPropertyAccess(ts.createIdentifier('messages'),ts.createIdentifier(cNoMessage)));
  //const msg:ts.ClassElement     = ts.createProperty(undefined,[ts.createModifier(ts.SyntaxKind.PublicKeyword)],ts.createIdentifier('message'),ts.createToken(ts.SyntaxKind.QuestionToken),ts.createTypeReferenceNode(ts.createIdentifier('Message'), undefined),ts.createNew(ts.createIdentifier(cNoMessage), undefined, []));

  //classMembers = [ msgFrom, msgType, msg, constructor, ts.createSemicolonClassElement(), chkOneTransition ];
  classMembers = [ constructor, ts.createSemicolonClassElement(), chkOneTransition ];
  const implementsInterface = [ ts.createHeritageClause(ts.SyntaxKind.FirstFutureReservedWord, [ ts.createExpressionWithTypeArguments( undefined, ts.createIdentifier(`I${role}`) ) ]) ];
  const abstractClass = ts.createClassDeclaration( undefined, [ts.createModifier(ts.SyntaxKind.AbstractKeyword)], ts.createIdentifier(role), undefined, implementsInterface, classMembers );

  return printCode(abstractClass) + ts.sys.newLine;
}

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

function getStartInterface(role:string){
    return `${role}_Start`;
}

function getEndInterface(role:string){
    return `${role}_End`;
}

function getStartAndEndTypes(role:string,stateClasses:StateClass[]):string{
    const startStateInterface=stateClasses.filter((cl)=>cl.stateType===cInitial).map((cl)=>cl.implements).reduce((c,i)=>c+=i);
    const startInterface=ts.createTypeReferenceNode(ts.createIdentifier(startStateInterface), undefined);
    const startType=ts.createTypeAliasDeclaration(undefined,undefined,ts.createIdentifier(getStartInterface(role)),undefined,startInterface);
    const startTypeTxt=printCode(startType) + ts.sys.newLine;

    const endStateInterface=stateClasses.filter((cl)=>cl.stateType===cFinal).map((cl)=>cl.implements).reduce((c,i)=>c+=i);
    const finalInterface=ts.createTypeReferenceNode(ts.createIdentifier(endStateInterface), undefined);
    const finalType=ts.createTypeAliasDeclaration(undefined,undefined,ts.createIdentifier(getEndInterface(role)),undefined,finalInterface);
    const finalTypeTxt=printCode(finalType) + ts.sys.newLine;
    return startTypeTxt + finalTypeTxt + ts.sys.newLine;
}

function getExecuteProtocolFunction(stateClasses:StateClass[]){
    const role=stateClasses.filter((cl)=>cl.stateType===cInitial).map((cl)=>cl.extends).reduce((c,i)=>c+=i);
    const initialStateInterface=ts.createIdentifier(getStartInterface(role));
    const finalStateInterface=ts.createIdentifier(getEndInterface(role));
    const initialStateClass=ts.createIdentifier(stateClasses.filter((cl)=>cl.stateType===cInitial).map((cl)=>cl.name).reduce((c,i)=>c+=i));
    const modifiers:ts.Modifier[]=[];
    modifiers.push(ts.createModifier(ts.SyntaxKind.AsyncKeyword));

    const parameterFunctionF=ts.createFunctionTypeNode(undefined
        , [ ts.createParameter(
            undefined,undefined,undefined
            ,initialStateInterface,undefined
            ,ts.createTypeReferenceNode(initialStateInterface,undefined),undefined
            )
          ]
        , ts.createTypeReferenceNode(idPromise, [ts.createTypeReferenceNode(finalStateInterface,undefined)])
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
                [ ts.createTemplateExpression(ts.createTemplateHead(`${role} started `),[ts.createTemplateSpan(ts.createNew(ts.createIdentifier('Date'), undefined, []),ts.createTemplateTail(''))])]
        )
    ));

    const idDone=ts.createIdentifier('done');
    statements.push(ts.createExpressionStatement(ts.createAwait(ts.createCall(ts.createIdentifier('initialize'), undefined, [ts.createPropertyAccess(ts.createIdentifier('roles'),ts.createIdentifier(`${role.toLowerCase()}`)),idPort,idHost]))));
    statements.push(ts.createVariableStatement(undefined,ts.createVariableDeclarationList([ ts.createVariableDeclaration(idDone,undefined,ts.createAwait(ts.createCall(idF, undefined, [ts.createNew(initialStateClass, undefined, [])]))) ],ts.NodeFlags.AwaitContext | ts.NodeFlags.Let)));

    const returnStatement:ts.ReturnStatement=ts.createReturn(
        ts.createNew(idPromise
        , [ ts.createTypeReferenceNode( finalStateInterface, undefined ) ],
          [ ts.createArrowFunction(undefined,undefined,[ ts.createParameter(undefined,undefined,undefined,idResolve,undefined,undefined,undefined) ],undefined,ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken),ts.createCall(idResolve, undefined, [ idDone ]))]
        )
    );

    statements.push(returnStatement);

    const codeBlock:ts.Block=ts.createBlock(statements, true);
    const executeProtocolFunction:ts.FunctionDeclaration=ts.createFunctionDeclaration(undefined,modifiers,undefined,ts.createIdentifier(cExecutePro),undefined,parameters,undefined,codeBlock);

    return printCode(executeProtocolFunction) + ts.sys.newLine + ts.sys.newLine;
}

function getPublicExportsAsText(publicExports:string[]):string{
    const exportsSpecifiers:ts.ExportSpecifier[]=[];
    publicExports.forEach( ( exp ) => exportsSpecifiers.push(ts.createExportSpecifier( undefined, ts.createIdentifier(exp) ) ) );
    const exportDeclaration=ts.createExportDeclaration(undefined,undefined,ts.createNamedExports(exportsSpecifiers),undefined);
    return printCode(exportDeclaration) + ts.sys.newLine + ts.sys.newLine;
}

function getStateObjects( protocol:Protocol ):string{
    console.log(`start getStateObjects  ${protocol.role}`);

    // get states and messages that led to the state (these will be properties), Map with key for every state and a array with the messages that can lead to the state
    let receivedMessagesInState:receivedMessagesInState = new Map();
    protocol.states.forEach( (s) => {
        receivedMessagesInState.set(s.name,getReceivedMessagesForState(s.name,protocol.states));
    } );
    // debug
    // receivedMessagesInState.forEach((val,key)=> console.log(`${key}  ----  ${val}`));

    let stateWithPossibleOriginStates:Map<string,string[]> = new Map();
    protocol.states.forEach( (s) => {
       stateWithPossibleOriginStates.set(s.name,getPossibleOriginatedStates(s.name,protocol.states));
    })
    //for ( let key of stateWithPossibleOriginStates.keys() ){
    //    console.log(`state ${key}  comes from ${stateWithPossibleOriginStates.get(key)}`);
    //}
    // get possible messages in the protocol
    const protocolMessages=getMessagesFromProtocol(protocol).map((s)=>s.toUpperCase());

    // create import definitions
    let returnTxt=getImportDefinitions(protocolMessages);

    // create a enum with the different Messages
    returnTxt += getEnumWithMessages(protocolMessages);

    // get interfaces
    const stateInterfaces:StateInterface[]=getStateInterfaces(protocol.role, protocol.states, receivedMessagesInState,stateWithPossibleOriginStates);
    // debug, show interfaces
    //showInterfaces(stateInterfaces);

    // get classes
    const stateClasses = getStateClassDefinitions(protocol,receivedMessagesInState,stateWithPossibleOriginStates);
    // debug show classes
    //showClasses(stateClasses);

    // revert interfaces to text
    returnTxt += getInterfacesAsText(stateInterfaces);

    // get role abstract class as text
    returnTxt += getStateAbstractClass(protocol.role) + ts.sys.newLine;

    // revert classes to text
    returnTxt += getTextFromStateClasses(stateClasses);

    // get start and End types
    returnTxt += getStartAndEndTypes(protocol.role,stateClasses);

    // create executeProtocol function
    returnTxt += getExecuteProtocolFunction(stateClasses);

    // create exports
    const publicExports:string[]=[];
    stateInterfaces.forEach( ( inf ) => {
        if (inf.stateType!==cInitial && inf.stateType !== cFinal ) publicExports.push(inf.name);
    }  );
    publicExports.push(cMessageEnum);
    publicExports.push(getStartInterface(protocol.role));
    publicExports.push(getEndInterface(protocol.role));
    publicExports.push(cExecutePro);
    publicExports.push('roles');

    returnTxt += getPublicExportsAsText(publicExports);

    return returnTxt;
}

export {getStateObjects};
