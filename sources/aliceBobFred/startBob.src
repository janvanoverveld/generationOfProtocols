import {IBob, Bob_Start, Bob_End,IBob_S2,IBob_S3,IBob_S4,IBob_S5,IBob_S6,IBob_S8,executeProtocol,messages,roles} from './Bob';
import {RES,ADD,BYE} from './Message';

async function protocol(s1:Bob_Start):Promise<Bob_End> {
   let nextState:IBob = await s1.recv();
   while ( true ){
      console.log(`message type ${nextState.messageType} received from ${nextState.messageFrom}, message body is : ${nextState.message.toString()}`);
      switch (nextState.messageFrom + nextState.messageType) {
         case roles.alice + messages.ADD: {
            const s2 = <IBob_S2>nextState;
            const add = <ADD> s2.message;
            const res = new RES( add.value1 + add.value2 );
            console.log(`stuur ${res.name} ${res.sum} naar Alice `);
            s1 = await s2.sendRES(res);
            nextState = await s1.recv();
            break;
         }
         case roles.fred + messages.ADD: {
            const s3 = <IBob_S3>nextState;
            const add = <ADD> s3.message;
            const res = new RES( add.value1 + add.value2 );
            console.log(`stuur ${res.name} ${res.sum} naar fred `);
            s1 = await s3.sendRES(res);
            nextState = await s1.recv();
            break;
         }
         case roles.fred + messages.BYE: {
            const s4 = <IBob_S4>nextState;
            const bye = <BYE> s4.message;
            console.log(`${nextState.messageType} ontvangen van ${nextState.messageFrom}`);
            nextState = await s4.recv();
            break;
         }
         case roles.alice + messages.BYE: {
            let s5 = <IBob_S5>nextState;
            const bye = <BYE> s5.message;
            console.log(`${nextState.messageType} ontvangen van ${nextState.messageFrom}`);
            nextState = await s5.recv();
            break;
         }
         case roles.alice + messages.ADD: {
            const s6 = <IBob_S6>nextState;
            const add = <ADD> s6.message;
            const res = new RES( add.value1 + add.value2 );
            console.log(`stuur ${res.name} ${res.sum} naar Alice `);
            const s4 = await s6.sendRES(res);
            nextState = await s4.recv();
            break;
         }
         case roles.fred + messages.ADD: {
            const s8 = <IBob_S8>nextState;
            const add = <ADD> s8.message;
            const res = new RES( add.value1 + add.value2 );
            console.log(`stuur ${res.name} ${res.sum} naar Fred `);
            const s5 = await s8.sendRES(res);
            nextState = await s5.recv();
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
         }
      }
   }
}

async function start(){
   await executeProtocol(protocol,'localhost',30002);
}

start();