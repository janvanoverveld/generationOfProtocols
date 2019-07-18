import {Parameter,Message,Transition,State,Protocol,RootObject} from './protocolTypeInterface';
import * as ts from "typescript";

function getEnumWithRoles(protocols:Protocol[]):string{
    let enumMembers:ts.EnumMember[]=[];
    protocols.forEach((e)=>{
        enumMembers.push(
            ts.createEnumMember(
                ts.createIdentifier(`${e.role.toLowerCase()}`)
               ,ts.createStringLiteral(`${e.role.charAt(0).toUpperCase()}${e.role.slice(1).toLowerCase()}` ) )
        );
    });
    const resultFile = ts.createSourceFile("dummy.ts","",ts.ScriptTarget.Latest,false,ts.ScriptKind.TS);
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    const rolesEnum:ts.EnumDeclaration=ts.createEnumDeclaration(undefined, undefined, ts.createIdentifier('roles'), enumMembers);
    return printer.printNode( ts.EmitHint.Unspecified, rolesEnum, resultFile );
}

export {getEnumWithRoles}