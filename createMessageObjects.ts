import {Parameter,Message,Transition,State,Protocol,RootObject} from './protocolTypeInterface';
import * as ts from "typescript";

const resultFile = ts.createSourceFile("dummy.ts","",ts.ScriptTarget.Latest,false,ts.ScriptKind.TS);
const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

function getTextMessageClass(msg:Message):string {
    let parameters: ts.ParameterDeclaration[]=[];
    msg.parameters.forEach( (par) => {
        let parDatatype:ts.TypeNode=ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
        if ( par.type === 'number' ) parDatatype=ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
        parameters.push(
            ts.createParameter( undefined, [ts.createModifier(ts.SyntaxKind.PublicKeyword)], undefined, ts.createIdentifier(par.name), undefined, parDatatype, undefined )
        );
    });
    const messageClassDeclaration=ts.createClassDeclaration(
        undefined,
        [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
        ts.createIdentifier(msg.name),
        undefined,
        [ ts.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [ ts.createExpressionWithTypeArguments( undefined, ts.createIdentifier('Message'))] ) ],
        [ ts.createConstructor( undefined, undefined, parameters
          , ts.createBlock( [ ts.createExpressionStatement( ts.createCall(ts.createSuper(), undefined, [ ts.createPropertyAccess( ts.createIdentifier(msg.name), ts.createIdentifier('name') ) ] ) ) ], true ) )
        ]
    );
    return printer.printNode(ts.EmitHint.Unspecified,messageClassDeclaration,resultFile) + ts.sys.newLine;
}

function getMessageClasses(messages:Message[]):string{
    return messages.map((msg)=>getTextMessageClass(msg)).reduce((ret,msgTxt)=>ret+=msgTxt,ts.sys.newLine);
}

export {getMessageClasses}