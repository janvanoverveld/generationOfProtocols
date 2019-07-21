import {IAlice_S1,IAlice_Done,executeProtocol} from './Alice';
import {ADD,BYE} from './Message';

async function sleep(ms:number) {
   return new Promise((resolve) => setTimeout(resolve, ms));
}

async function protocol(s1:IAlice_S1):Promise<IAlice_Done> {
   //await sleep(1000);
   for(let i=0;i<7;i++) {
      let add = new ADD(Math.floor(Math.random() * 8),Math.floor(Math.random() * 8));
      //let add = new ADD(3,3);
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
   await executeProtocol(protocol,'localhost',30001);
}

start();