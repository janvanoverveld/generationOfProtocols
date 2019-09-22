import * as ts from "typescript";

function getEnumWithRoles(roles:string[]):string{
    let enumMembers:ts.EnumMember[]=[];
    roles.forEach((e)=>{
        enumMembers.push(
            ts.createEnumMember(
                ts.createIdentifier(`${e.toLowerCase()}`)
               ,ts.createStringLiteral(`${e.charAt(0).toUpperCase()}${e.slice(1).toLowerCase()}` ) )
        );
    });
    const resultFile = ts.createSourceFile("dummy.ts","",ts.ScriptTarget.Latest,false,ts.ScriptKind.TS);
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    const rolesEnum:ts.EnumDeclaration=ts.createEnumDeclaration(undefined, undefined, ts.createIdentifier('roles'), enumMembers);
    return printer.printNode( ts.EmitHint.Unspecified, rolesEnum, resultFile );
}

export {getEnumWithRoles}