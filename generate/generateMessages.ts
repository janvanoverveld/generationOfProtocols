import * as ts from "typescript";

const resultFile = ts.createSourceFile("dummy.ts","",ts.ScriptTarget.Latest,false,ts.ScriptKind.TS);
const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });


function getImports():string{
   const importDeclr:ts.ImportDeclaration =
   ts.createImportDeclaration(undefined, undefined,
        ts.createImportClause(
          undefined,
          ts.createNamedImports([
            ts.createImportSpecifier(undefined,ts.createIdentifier('connectedRoles')),
            ts.createImportSpecifier(undefined, ts.createIdentifier('roles'))
          ])
        ),
        ts.createStringLiteral('./globalObjects')
      );
   return printer.printNode( ts.EmitHint.Unspecified, importDeclr, resultFile );
}

function getMessageAbstractClass():string{
   const messageAbstractClass:ts.ClassDeclaration =
    ts.createClassDeclaration(
        undefined,
        [ts.createModifier(ts.SyntaxKind.ExportKeyword),ts.createModifier(ts.SyntaxKind.AbstractKeyword)],
        ts.createIdentifier('Message'),
        undefined,undefined,
        [
          ts.createProperty(
            undefined,
            [ts.createModifier(ts.SyntaxKind.PublicKeyword)],
            ts.createIdentifier('from'),
            undefined,
            ts.createTypeReferenceNode(ts.createIdentifier('roles'), undefined),
            ts.createPropertyAccess(ts.createIdentifier('roles'),ts.createIdentifier('mediator'))
          ),
          ts.createConstructor(undefined,undefined,
            [
              ts.createParameter(
                undefined,
                [ts.createModifier(ts.SyntaxKind.PublicKeyword)],
                undefined,
                ts.createIdentifier('name'),
                undefined,
                ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                undefined
              )
            ],
            ts.createBlock([], true)
          ),
          ts.createSemicolonClassElement()
        ]
      );
      return printer.printNode( ts.EmitHint.Unspecified, messageAbstractClass, resultFile );
}

function getRoleMessageClass():string {
    const roleMessageClass:ts.ClassDeclaration =
    ts.createClassDeclaration(
        undefined,
        [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
        ts.createIdentifier('ROLEMESSAGE'),
        undefined,
        [ts.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [ts.createExpressionWithTypeArguments(undefined,ts.createIdentifier('Message'))])],
        [
          ts.createProperty(
            undefined,
            [ts.createModifier(ts.SyntaxKind.PublicKeyword)],
            ts.createIdentifier('host'),
            undefined,
            ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
            undefined
          ),
          ts.createProperty(
            undefined,
            [ts.createModifier(ts.SyntaxKind.PublicKeyword)],
            ts.createIdentifier('port'),
            undefined,
            ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
            undefined
          ),
          ts.createConstructor(
            undefined,
            undefined,
            [
              ts.createParameter(
                undefined,
                [ts.createModifier(ts.SyntaxKind.PublicKeyword)],
                undefined,
                ts.createIdentifier('roleName'),
                undefined,
                ts.createTypeReferenceNode(ts.createIdentifier('roles'), undefined),
                undefined
              )
            ],
            ts.createBlock(
              [
                ts.createExpressionStatement(
                  ts.createCall(ts.createSuper(), undefined, [
                    ts.createPropertyAccess(
                      ts.createIdentifier('ROLEMESSAGE'),
                      ts.createIdentifier('name')
                    )
                  ])
                ),
                ts.createExpressionStatement(
                  ts.createBinary(
                    ts.createPropertyAccess(
                      ts.createThis(),
                      ts.createIdentifier('host')
                    ),
                    ts.createToken(ts.SyntaxKind.FirstAssignment),
                    ts.createPropertyAccess(
                      ts.createCall(
                        ts.createPropertyAccess(
                          ts.createIdentifier('connectedRoles'),
                          ts.createIdentifier('getInfo')
                        ),
                        undefined,
                        [ts.createIdentifier('roleName')]
                      ),
                      ts.createIdentifier('host')
                    )
                  )
                ),
                ts.createExpressionStatement(
                  ts.createBinary(
                    ts.createPropertyAccess(
                      ts.createThis(),
                      ts.createIdentifier('port')
                    ),
                    ts.createToken(ts.SyntaxKind.FirstAssignment),
                    ts.createPropertyAccess(
                      ts.createCall(
                        ts.createPropertyAccess(
                          ts.createIdentifier('connectedRoles'),
                          ts.createIdentifier('getInfo')
                        ),
                        undefined,
                        [ts.createIdentifier('roleName')]
                      ),
                      ts.createIdentifier('port')
                    )
                  )
                )
              ],
              true
            )
          )
        ]
      );
   return printer.printNode( ts.EmitHint.Unspecified, roleMessageClass, resultFile );
}

function getMessageClass(msg:string):string{
   const messageClass:ts.ClassDeclaration =
    ts.createClassDeclaration(
        undefined,
        [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
        ts.createIdentifier(msg),
        undefined,
        [
          ts.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [
            ts.createExpressionWithTypeArguments(
              undefined,
              ts.createIdentifier('Message')
            )
          ])
        ],
        [
          ts.createConstructor(
            undefined,
            undefined,
            [],
            ts.createBlock(
              [
                ts.createExpressionStatement(
                  ts.createCall(ts.createSuper(), undefined, [
                    ts.createPropertyAccess(
                      ts.createIdentifier(msg),
                      ts.createIdentifier('name')
                    )
                  ])
                )
              ],
              true
            )
          )
        ]
      );
   return printer.printNode( ts.EmitHint.Unspecified, messageClass, resultFile );
}

export function generateMessages(messages:Set<string>):string {
   let messageTypescriptCode:string = getImports()    + ts.sys.newLine;
   messageTypescriptCode += getMessageAbstractClass() + ts.sys.newLine;
   messageTypescriptCode += getRoleMessageClass()     + ts.sys.newLine;
   messages.forEach( m => messageTypescriptCode += getMessageClass(m) + ts.sys.newLine );
   return messageTypescriptCode;
}
