import {Fred_Start,Fred_End,executeProtocol} from './Fred';
import {ADD,BYE,RES} from './Message';

async function protocol(s1:Fred_Start):Promise<Fred_End> {
   for(let i=0;i<13;i++) {
      const add = new ADD(Math.floor(Math.random() * 8),Math.floor(Math.random() * 8));
      console.log(`add with values of ${add.value1}  ${add.value2}`);
      const s2 = await s1.sendADD(add);
      s1 = await s2.recv();
      console.log(`message ${s1.messageType} received from ${s1.messageFrom} has value of ${(<RES>s1.message).sum}`);
   }
   const bye=new BYE();
   const done=s1.sendBYE(bye);
   return new Promise( resolve => resolve( done ) );
}

async function start(){
   await executeProtocol(protocol,'localhost',30003);
}

start();
