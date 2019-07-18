export interface Parameter {
    name: string;
    type: string;
}

export interface Message {
    name: string;
    parameters: Parameter[];
}

export interface Transition {
    flow: string;
    message: string;
    destination: string;
    role:string;
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
    messages: Message[];
    roles: string[];
    protocol: Protocol[];
}
