import * as ts from "typescript";
import {printCode} from '../includedCustomLibraries/sharedFunctions';
import {StateClass} from '../includedCustomLibraries/localProtocolClassData';
import {StateInterface} from '../includedCustomLibraries/localProtocolInterfaceData';

const cMessageEnum = 'messages';
const cReceive     = 'recv';
const cInitial     = 'initial';
const cFinal       = 'final';
const cExecutePro  = 'executeProtocol';
const cSend          = 'send';
const cAbstractState = 'abstractState';
const cMsgFrom       = 'messageFrom';
const cMsgType       = 'messageType';
const cMsg           = 'message';
const cMsgs          = 'messages';
const cRoles         = 'roles';
//
const idResolve    = ts.createIdentifier('resolve');
const idPromise    = ts.createIdentifier('Promise');
const idMsgFrom = ts.createIdentifier(cMsgFrom);
const idMsgType = ts.createIdentifier(cMsgType);
const idMsg     = ts.createIdentifier(cMsg);
const idRoles   = ts.createIdentifier(cRoles);
const idMsgs    = ts.createIdentifier(cMsgs);
const idPropReadOnly = [ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)];
const idReject  = ts.createIdentifier('reject');
const idReceive = ts.createIdentifier(cReceive);
const idPublic       = [ts.createModifier(ts.SyntaxKind.PublicKeyword)];

// export constants
export {cMessageEnum,cReceive,cInitial,cFinal,cExecutePro,cSend,cAbstractState,cMsgFrom,cMsgType,cMsg,cMsgs,cRoles,idResolve,idPromise,idMsgFrom,idMsgType,idMsg,idRoles,idMsgs,idPropReadOnly,idReject,idReceive,idPublic  }

const getStartInterface = (role:string) => `${role}_Start`;
const getEndInterface   = (role:string) => `${role}_End`;

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

  return printCode(abstractClass) + ts.sys.newLine + ts.sys.newLine;
}

function getPublicExportsAsText(role:string,stateInterfaces:StateInterface[]):string{
    const publicExports:string[]=[];
    stateInterfaces.forEach( i => { if (i.stateType!==cInitial && i.stateType !== cFinal ) publicExports.push(i.name); }  );
    publicExports.push(cMessageEnum);
    publicExports.push(getStartInterface(role));
    publicExports.push(getEndInterface(role));
    publicExports.push(cExecutePro);
    publicExports.push('roles');
    //
    const exportsSpecifiers:ts.ExportSpecifier[]=[];
    publicExports.forEach( ( exp ) => exportsSpecifiers.push(ts.createExportSpecifier( undefined, ts.createIdentifier(exp) ) ) );
    const exportDeclaration=ts.createExportDeclaration(undefined,undefined,ts.createNamedExports(exportsSpecifiers),undefined);
    return printCode(exportDeclaration) + ts.sys.newLine + ts.sys.newLine;
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

// export functions
export { getStartInterface,getEndInterface,getImportDefinitions,getEnumWithMessages,getStateAbstractClass,getPublicExportsAsText,getStartAndEndTypes,getExecuteProtocolFunction}
