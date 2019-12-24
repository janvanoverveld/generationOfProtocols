import * as ts from "typescript";

const resultFile = ts.createSourceFile("dummy.ts","",ts.ScriptTarget.Latest,false,ts.ScriptKind.TS);
const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
const computationLogicProcedureName='protocolComputationLogic';


function getLocalApiImport(role:string){
    const localRoleImport = ts.createImportDeclaration(undefined,undefined,
       ts.createImportClause( undefined,
          ts.createNamedImports([ ts.createImportSpecifier(undefined, ts.createIdentifier(`${role}_Start`))
          ,                       ts.createImportSpecifier(undefined, ts.createIdentifier(`${role}_End`))
          ,                       ts.createImportSpecifier(undefined,ts.createIdentifier('executeProtocol'))
          ,                       ts.createImportSpecifier(undefined, ts.createIdentifier('messages')) ])
       ),
       ts.createStringLiteral(`./${role}`)
       );
    return localRoleImport;
}

function getMessagesImport(messages:Set<string>){
    const importMessages:ts.ImportSpecifier[] = [];
    for (const msg of messages ){
        importMessages.push(
            ts.createImportSpecifier(undefined, ts.createIdentifier(msg))
        );
    }
    //
    const messagesImport =ts.createImportDeclaration(undefined,undefined,
        ts.createImportClause(undefined,ts.createNamedImports(importMessages)),
        ts.createStringLiteral('./Message')
      );
    return messagesImport;
}

function getStartComputationLogic(role:string){
   const computationLogic = ts.createFunctionDeclaration(undefined,
      [ ts.createModifier(ts.SyntaxKind.AsyncKeyword)],
        undefined,
        ts.createIdentifier(computationLogicProcedureName),
        undefined,
        [ ts.createParameter(undefined,undefined,undefined,ts.createIdentifier('s1'),undefined,
            ts.createTypeReferenceNode(ts.createIdentifier(`${role}_Start`),undefined),
            undefined
          ) ],
        ts.createTypeReferenceNode(ts.createIdentifier('Promise'), [
          ts.createTypeReferenceNode(ts.createIdentifier(`${role}_End`), undefined)
        ]),
        ts.createBlock(
        [ ]
/*        
           ts.createVariableStatement(
           undefined,
           ts.createVariableDeclarationList(
                    [ ts.createVariableDeclaration(
                        ts.createIdentifier('resolver'),
                        ts.createUnionTypeNode([
                          ts.createParenthesizedType(
                            ts.createFunctionTypeNode(
                              undefined,
                              [ ts.createParameter(undefined,undefined,undefined,ts.createIdentifier('s'),undefined,ts.createTypeReferenceNode(ts.createIdentifier(`${role}_End`),undefined),undefined) ],
                              ts.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword)
                            )
                          ),
                          ts.createNull()
                        ]),
                        ts.createNull()
                      )
                    ],
                    ts.NodeFlags.AwaitContext | ts.NodeFlags.Let
                  )
                ),
                ts.createVariableStatement(
                  undefined,
                  ts.createVariableDeclarationList(
                    [
                      ts.createVariableDeclaration(
                        ts.createIdentifier('promise'),
                        undefined,
                        ts.createNew(
                          ts.createIdentifier('Promise'),
                          [ts.createTypeReferenceNode(ts.createIdentifier(`${role}_End`),undefined)],
                          [
                            ts.createArrowFunction(
                              undefined,undefined,
                              [ts.createParameter(undefined,undefined,undefined,ts.createIdentifier('resolve'),undefined,undefined,undefined)],
                              undefined,
                              ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                              ts.createBinary(ts.createIdentifier('resolver'),ts.createToken(ts.SyntaxKind.FirstAssignment),ts.createIdentifier('resolve'))
                            )
                          ]
                        )
                      )
                    ],
                    ts.NodeFlags.AwaitContext | ts.NodeFlags.Let
                  )
                ),
                ts.createReturn(ts.createIdentifier('promise'))
              ]
*/              
              , true)
   );
   return computationLogic;
}

function getStartupFileRole(role:string,messages:Set<string>,port:number):string{
   let returnCode:string = printer.printNode( ts.EmitHint.Unspecified, getLocalApiImport(role), resultFile ) + ts.sys.newLine;
   returnCode += printer.printNode( ts.EmitHint.Unspecified, getMessagesImport(messages), resultFile ) + ts.sys.newLine;

   returnCode += ts.sys.newLine;
   returnCode += printer.printNode( ts.EmitHint.Unspecified, getStartComputationLogic(role), resultFile ) + ts.sys.newLine;
   returnCode += ts.sys.newLine;

   const startMethod = ts.createFunctionDeclaration( undefined
   , [ ts.createModifier(ts.SyntaxKind.AsyncKeyword)]
   , undefined
   , ts.createIdentifier('start')
   , undefined,[],undefined,
    ts.createBlock(
      [ ts.createExpressionStatement(
          ts.createAwait( ts.createCall(ts.createIdentifier('executeProtocol'), undefined, [ts.createIdentifier(computationLogicProcedureName),ts.createStringLiteral('localhost'),ts.createNumericLiteral(`${port}`)]) )
        ) ], true )
   );

   returnCode += printer.printNode(ts.EmitHint.Unspecified, startMethod, resultFile) + ts.sys.newLine;
   returnCode += ts.sys.newLine;
   returnCode += printer.printNode(ts.EmitHint.Unspecified, ts.createExpressionStatement(ts.createCall(ts.createIdentifier('start'), undefined, [])), resultFile);

   return returnCode;
}

export {getStartupFileRole}

