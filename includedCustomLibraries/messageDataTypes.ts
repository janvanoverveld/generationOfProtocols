
type message = {
    name:string;
    from:string;
}

type receivedMessagesInState=Map<string,message[]>;

export {message,receivedMessagesInState}
