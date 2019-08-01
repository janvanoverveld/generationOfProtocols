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
export type objProperty = {
    name: string;
    type?: string;
    optional: boolean;
    readonly: boolean;
    default?: string;
}

export type objMethod = {
    name:string;
    props:objProperty[];
    return:string[];
    promise:boolean;
}

export interface StateInterface{
    name:string;
    props:objProperty[];
    methods:objMethod[];
    inherit?:string;
}

//
//
// types for generating code CLASSES
//
export type objToReceiveMessages = {
    message:string;
    from:string;
    nextState:string;
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

export interface StateClass {
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
