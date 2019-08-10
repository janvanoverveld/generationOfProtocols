import {IBob, Bob_Start, Bob_End,IBob_S2,IBob_S3,IBob_S4,IBob_S5,IBob_S6, IBob_S8,executeProtocol,messages,roles} from './Bob';
import {RES,ADD,BYE} from './Message';

async function protocol(s1:Bob_Start):Promise<Bob_End> {
   const starter = await s1.recv();
   let messageType=starter.messageType;
   let messageFrom=starter.messageFrom;
   let message=starter.message;
   let nextState:IBob = starter;
   while ( true ){
      console.log(`message type ${messageType} received from ${messageFrom}, message body is : ${message}`);
      switch (messageFrom + messageType) {
         case roles.alice + messages.ADD: {
            const s2 = <IBob_S2>nextState;
            const add = s2.message;
            const res = new RES( add.value1 + add.value2 );
            console.log(`stuur ${res.name} ${res.sum} naar Alice `);
            const tmpState1 = await s2.sendRES(res);
            const tmpState2 = await tmpState1.recv();
            messageType = tmpState2.messageType;
            messageFrom = tmpState2.messageFrom;
            message     = tmpState2.message;
            nextState   = tmpState2;
            break;
         }
         case roles.fred + messages.ADD: {
            const s3 = <IBob_S3>nextState;
            const add = <ADD> s3.message;
            const res = new RES( add.value1 + add.value2 );
            console.log(`stuur ${res.name} ${res.sum} naar fred `);
            const tmpState1 = await s3.sendRES(res);
            const tmpState2 = await tmpState1.recv();
            messageType = tmpState2.messageType;
            messageFrom = tmpState2.messageFrom;
            message     = tmpState2.message;
            nextState   = tmpState2;
            break;
         }
         case roles.fred + messages.BYE: {
            const s4 = <IBob_S4>nextState;
            console.log(`${s4.messageType} ontvangen van ${s4.messageFrom}`);
            const tmpState1 = await s4.recv();
            messageType = tmpState1.messageType;
            messageFrom = tmpState1.messageFrom;
            message     = tmpState1.message;
            nextState   = tmpState1;
            break;
         }
         case roles.alice + messages.BYE: {
            let s5 = <IBob_S5>nextState;
            console.log(`${s5.messageType} ontvangen van ${s5.messageFrom}`);
            const tmpState1 = await s5.recv();
            messageType = tmpState1.messageType;
            messageFrom = tmpState1.messageFrom;
            message     = tmpState1.message;
            nextState   = tmpState1;
            break;
         }
         case roles.alice + messages.ADD: {
            const s6 = <IBob_S6>nextState;
            const add = s6.message;
            const res = new RES( add.value1 + add.value2 );
            console.log(`stuur ${res.name} ${res.sum} naar Alice `);
            const tmpState1 = await s6.sendRES(res);
            const tmpState2 = await tmpState1.recv();
            messageType = tmpState2.messageType;
            messageFrom = tmpState2.messageFrom;
            message     = tmpState2.message;
            nextState   = tmpState2;
            break;
         }
         case roles.fred + messages.ADD: {
            const s8 = <IBob_S8>nextState;
            const add = <ADD> s8.message;
            const res = new RES( add.value1 + add.value2 );
            console.log(`stuur ${res.name} ${res.sum} naar Fred `);
            const tmpState1 = await s8.sendRES(res);
            const tmpState2 = await tmpState1.recv();
            messageType = tmpState2.messageType;
            messageFrom = tmpState2.messageFrom;
            message     = tmpState2.message;
            nextState   = tmpState2;
            break;
         }
         case roles.alice + messages.BYE: {
            console.log('in de DONE van Bob');
            const sdone=<Bob_End>nextState;
            return new Promise(
               resolve => resolve(sdone)
            );
         }
         case roles.fred + messages.BYE: {
            console.log('in de DONE van Bob');
            const sdone=<Bob_End>nextState;
            return new Promise(
               resolve => resolve(sdone)
            );
         }
         default: {
            console.log(`how is this possible!!`);
         }
      }
   }
}

async function start(){
   await executeProtocol(protocol,'localhost',30002);
}

start();