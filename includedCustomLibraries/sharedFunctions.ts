import * as fs from 'fs';
import * as ts from "typescript";

const capitalize = (s:string) => s.charAt(0).toUpperCase() + s.slice(1);

const readFile:(path:string)=>Promise<string> = (p) => new Promise( (resolve, reject) => fs.readFile( p, 'utf8', (err, data) => { if (err) reject(err); else resolve(data); } ) );
const writeFile:(path:string,data:string)=>Promise<void> = (p,d) => new Promise( (resolve, reject) => fs.writeFile(p, d, 'utf8', (err) => { if (err) reject(err); else resolve(); }) );

const resultFile = ts.createSourceFile("dummy.ts","",ts.ScriptTarget.Latest,false,ts.ScriptKind.TS);
const printer    = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
const printCode  = (node:ts.Node) => printer.printNode( ts.EmitHint.Unspecified, node, resultFile );

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

export {capitalize,readFile,writeFile, printCode, getEnumWithRoles}