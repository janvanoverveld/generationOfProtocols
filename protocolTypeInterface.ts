export interface Transition {
    op:      string;
    message: string;
    role:    string;
    next:    string;
}

export interface State {
    name: string;
    type: string;
    transitions?: Transition[];
}

export interface Protocol {
    role: string;
    states: State[];
}

export interface RootObject {
    roles: string[];
    protocol: Protocol[];
}

//
//
//
// types for generating code INTERFACES
//
export type sendMethod = {
    name:string;
    msgName:string;
    msgType:string;
    msgTo:string;
    return:string;
}

export type objProperty = {
    name: string;
    type?: string;
    from: string;
    optional: boolean;
    readonly: boolean;
    default?: string;
}

export type StateInterface = {
    name:string;
    props:objProperty[];
    sendMethods:sendMethod[];
    recvInterfaces:string[];
    inherit?:string;
    stateType:string;
    role:string;
}

//
//
// types for generating code CLASSES
//
export type objToReceiveMessages = {
    message:string;
    from:string;
    nextStateClass:string;
    nextStateInterface:string;
    positionNumberNextClassProps:number;
    totalCountOfNextClassProps:number;
}

export type objReceiveMethod = {
    name:string;
    messages:objToReceiveMessages[];
}

export type objSendMethod = {
    name:string;
    msg:string
    nextStateInterface:string;
    nextStateClass:string;
    from:string;
    to:string;
}

export type StateClass = {
    name:string;
    stateType:string;
    role:string;
    extends:string;
    implements:string;
    regularProps:objProperty[];
    constructorProps:objProperty[];
    sendMethods:objSendMethod[];
    receiveMethod?:objReceiveMethod;
}

//
// type for messages
export type message = {
    name:string;
    from:string;
}

export type receivedMessagesInState=Map<string,message[]>;
