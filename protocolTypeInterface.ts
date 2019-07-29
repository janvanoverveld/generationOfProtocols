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