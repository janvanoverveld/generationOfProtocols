import {objProperty} from './localProtocolInterfaceData';

type objToReceiveMessages = {
    message:string;
    from:string;
    nextStateClass:string;
    nextStateInterface:string;
    positionNumberNextClassProps:number;
    totalCountOfNextClassProps:number;
}

type objReceiveMethod = {
    name:string;
    messages:objToReceiveMessages[];
}

type objSendMethod = {
    name:string;
    msg:string
    nextStateInterface:string;
    nextStateClass:string;
    from:string;
    to:string;
}

type StateClass = {
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

export {objToReceiveMessages,objReceiveMethod,objSendMethod,StateClass}