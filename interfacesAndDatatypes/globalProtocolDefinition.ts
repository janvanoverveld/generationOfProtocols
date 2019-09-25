interface Transition {
    op:      string;
    message: string;
    role:    string;
    next:    string;
}

interface State {
    name: string;
    type: string;
    transitions?: Transition[];
}

interface LocalProtocolDefinition {
    role: string;
    states: State[];
}

interface GlobalProtocolDefinition {
    roles: string[];
    protocol: LocalProtocolDefinition[];
}

function displayProtocol(proto:GlobalProtocolDefinition){
    console.log(proto.roles);
    for ( let p of proto.protocol  ){
        console.log(`${p.role}`);
        for ( let state of p.states ){
            console.log(`  ${state.name}  ${state.type}`);
            if (state.transitions) state.transitions.forEach( (trans) => console.log(`      ${trans.next} ${trans.op} ${trans.message}`) );
        }
    }
}

export {Transition,State,GlobalProtocolDefinition,LocalProtocolDefinition,displayProtocol}