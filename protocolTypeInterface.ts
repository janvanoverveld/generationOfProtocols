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
// types for generating code
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