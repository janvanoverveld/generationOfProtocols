import {StateInterface,objProperty,sendMethod} from '../includedCustomLibraries/localProtocolInterfaceData';
import {capitalize,printCode} from '../includedCustomLibraries/sharedFunctions';
import {cAbstractState, idRoles, idMsgs, idPropReadOnly, idMsgFrom, idMsgType, idMsg, cReceive, idPromise} from './variousLocalProtocolObjects';
import * as ts from "typescript";

function getInterfacesAsText(interfaces:StateInterface[]):string{
    let returnText=ts.sys.newLine;
    for ( const inf of interfaces ){
        let subInterfaces:string|undefined=undefined;
        let tsTypeElements:ts.TypeElement[]=[];
        // adding message properties to the abstract interface
        if (inf.stateType === cAbstractState ) {
            /*
            tsTypeElements.push(
               ts.createPropertySignature( undefined, idMsgFrom, undefined, ts.createTypeReferenceNode(idRoles, undefined), undefined )
            );
            tsTypeElements.push(
               ts.createPropertySignature( undefined, idMsgType, undefined, ts.createTypeReferenceNode(idMsgs, undefined), undefined )
            );
            tsTypeElements.push(
               ts.createPropertySignature( undefined, idMsg, ts.createToken(ts.SyntaxKind.QuestionToken), ts.createTypeReferenceNode(ts.createIdentifier('Message'), undefined), undefined )
            );
            */
        }
        if ( inf.props && inf.props.length === 1 ) {
            const msgFrom = ts.createTypeReferenceNode(ts.createQualifiedName(idRoles,ts.createIdentifier(inf.props[0].from.toLowerCase())),undefined);
            const msgType = ts.createTypeReferenceNode(ts.createQualifiedName(idMsgs,ts.createIdentifier(inf.props[0].name.toUpperCase())),undefined);
            const msgRetType = ts.createTypeReferenceNode(ts.createIdentifier(inf.props[0].name.toUpperCase()), undefined);
            tsTypeElements.push(
                ts.createPropertySignature( idPropReadOnly, idMsgFrom, undefined, msgFrom, undefined )
             );
             tsTypeElements.push(
                ts.createPropertySignature( idPropReadOnly, idMsgType, undefined, msgType, undefined)
             );
             const optionalParameter=inf.props[0].optional?ts.createToken(ts.SyntaxKind.QuestionToken):undefined;
             tsTypeElements.push(
                ts.createPropertySignature( undefined, idMsg, optionalParameter, msgRetType, undefined )
             );
        }
        if ( inf.props && inf.props.length > 1 ) {
            let interfaceNumber=0;
            for ( const intProperty of inf.props ){
                interfaceNumber++;
                const intName = ts.createIdentifier(`${inf.name}_${interfaceNumber}`);
                const intExtends = [ ts.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [ ts.createExpressionWithTypeArguments( undefined, ts.createIdentifier(inf.name) ) ]) ];

                const tsTypeEleSubInterface:ts.TypeElement[]=[];
                tsTypeEleSubInterface.push(
                    ts.createPropertySignature(idPropReadOnly,idMsgFrom,undefined,ts.createTypeReferenceNode(ts.createQualifiedName(idRoles,ts.createIdentifier( intProperty.from.toLowerCase())),undefined),undefined)
                );
                tsTypeEleSubInterface.push(
                    ts.createPropertySignature(idPropReadOnly,idMsgType,undefined,ts.createTypeReferenceNode(ts.createQualifiedName(idMsgs,ts.createIdentifier(intProperty.name.toUpperCase())),undefined),undefined)
                );
                tsTypeEleSubInterface.push(
                    ts.createPropertySignature(undefined,idMsg,undefined,ts.createTypeReferenceNode(ts.createIdentifier(intProperty.name.toUpperCase()), undefined),undefined)
                );

                const subInterfaceTxt = printCode(ts.createInterfaceDeclaration(undefined,undefined,intName,undefined,intExtends,tsTypeEleSubInterface )) + ts.sys.newLine + ts.sys.newLine;
                if (!subInterfaces) {
                    subInterfaces = subInterfaceTxt ;
                } else {
                    subInterfaces += subInterfaceTxt;
                }
            }
        }

        for ( const sendMeth of inf.sendMethods ){
            const methParameters:ts.ParameterDeclaration[] = [];
            const methParType=ts.createTypeReferenceNode(ts.createIdentifier(sendMeth.msgType),undefined);
            methParameters.push(ts.createParameter(undefined,undefined,undefined,ts.createIdentifier(sendMeth.msgName),undefined,methParType,undefined));
            let metReturnType:ts.TypeNode=ts.createTypeReferenceNode(ts.createIdentifier(sendMeth.return), undefined);
            metReturnType = ts.createTypeReferenceNode(idPromise, [metReturnType]);
            const interfaceMethod = ts.createMethodSignature( undefined, methParameters, metReturnType, ts.createIdentifier(sendMeth.name), undefined);
            tsTypeElements.push(interfaceMethod);
        }

        // create recv interface method
        if ( inf.recvInterfaces.length > 0 ) {
            const recvMethodReturnTypes:ts.TypeNode[]=[];
//            for ( const recvState of new Set(inf.recvInterfaces) ){
            for ( const recvState of inf.recvInterfaces ){    
               recvMethodReturnTypes.push(ts.createTypeReferenceNode(ts.createIdentifier(recvState), undefined));
            }
            let metReturnType:ts.TypeNode=ts.createUnionTypeNode(recvMethodReturnTypes);
            metReturnType = ts.createTypeReferenceNode(idPromise, [metReturnType]);
            const interfaceMethod = ts.createMethodSignature( undefined, [], metReturnType, ts.createIdentifier(cReceive), undefined);
            tsTypeElements.push(interfaceMethod);
        }

        const inheritFromSuperInterfaces = inf.inherit?[ts.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [ts.createExpressionWithTypeArguments(undefined,ts.createIdentifier(inf.inherit))])]:undefined;
        const tsInterface = ts.createInterfaceDeclaration(undefined,undefined,ts.createIdentifier(inf.name),undefined,inheritFromSuperInterfaces, tsTypeElements );
        returnText += printCode(tsInterface) + ts.sys.newLine + ts.sys.newLine;
        if ( subInterfaces ){
            returnText += subInterfaces;
        }
    }
    return returnText;
}

export {getInterfacesAsText}
