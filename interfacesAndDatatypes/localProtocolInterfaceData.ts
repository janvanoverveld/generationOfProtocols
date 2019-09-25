type objProperty = {
    name: string;
    type?: string;
    from: string;
    optional: boolean;
    readonly: boolean;
    default?: string;
}

type sendMethod = {
    name:string;
    msgName:string;
    msgType:string;
    msgTo:string;
    return:string;
}

type StateInterface = {
    name:string;
    props:objProperty[];
    sendMethods:sendMethod[];
    recvInterfaces:string[];
    inherit?:string;
    stateType:string;
    role:string;
}

export {objProperty,sendMethod,StateInterface}
