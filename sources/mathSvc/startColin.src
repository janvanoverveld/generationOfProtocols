import {IColin, Colin_Start, IColin_S2, Colin_End, IColin_S4, IColin_S5, executeProtocol} from './Colin';
import {VAL,ADD,MUL,SUM,PRD,BYE} from './Message';

async function protocol(s1:Colin_Start):Promise<Colin_End> {
   console.log('start colin');
   for(let i=0;i<5;i++) {
      // uitvoeren van een add
      const val1 = new VAL(Math.floor(Math.random() * 8));
      console.log(`Stuur VAL met waarden van ${val1.val}`);
      const s2a = await s1.sendVAL(val1);
      const add=new ADD(Math.floor(Math.random()*8));
      console.log(`Stuur ADD met waarden van ${add.add}`);
      const s4 = await s2a.sendADD(add);
      s1 = await s4.recv();
      console.log(`RES heeft waarde van ${(<SUM>s1.message).sum}`);
      //
      // uitvoeren van een prod
      const val2 = new VAL(Math.floor(Math.random() * 8));
      console.log(`Stuur VAL met waarden van ${val2.val}`);
      const s2b = await s1.sendVAL(val2);
      const mul=new MUL(Math.floor(Math.random()*8));
      console.log(`Stuur MUL met waarden van ${mul.mul}`);
      const s5 = await s2b.sendMUL(mul);
      s1 = await s5.recv();
      console.log(`RES heeft waarde van ${(<PRD>s1.message).prd}`);

   }
   let bye=new BYE();
   let done=s1.sendBYE(bye);
   return new Promise( resolve => resolve( done ) );
}

async function start(){
   await executeProtocol(protocol,'localhost',30003);
}

start();
