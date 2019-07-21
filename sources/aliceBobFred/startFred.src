import {IFred_S1,IFred_Done,executeProtocol} from './Fred';
import {ADD,BYE} from './Message';

async function protocol(s1:IFred_S1):Promise<IFred_Done> {
   console.log('start fred');
   for(let i=0;i<13;i++) {
      let add = new ADD(Math.floor(Math.random() * 8),Math.floor(Math.random() * 8));
      //let add = new ADD(13,17);
      console.log(`add met waarden van ${add.value1}  ${add.value2}`);
      let s2 = s1.sendADD(add);
      s1 = await s2.receive();
      if (s1.res) console.log(`RES heeft waarde van ${s1.res.sum}`);
   }
   let bye=new BYE();
   let done=s1.sendBYE(bye);
   return new Promise( resolve => resolve( done ) );
}

async function start(){
   await executeProtocol(protocol,'localhost',30003);
}

start();