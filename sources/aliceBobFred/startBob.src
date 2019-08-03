import {IBob, IBob_S1,IBob_S2,IBob_S3,IBob_S4,IBob_S5,IBob_S6,IBob_S7,IBob_S8,executeProtocol} from './Bob';
import {RES} from './Message';

async function protocol(s1:IBob_S1):Promise<IBob_S7> {
   let nextState:IBob = await s1.recv();
   while ( true ){
      console.log(`switching state ${nextState.state}`);
      switch (nextState.state) {
         case "S2": {
            const s2 = <IBob_S2>nextState;
            const add = s2.add;
            const res = new RES( add.value1 + add.value2 );
            console.log(`stuur ${res.name} ${res.sum} naar Alice `);
            s1 = await s2.sendRES(res);
            nextState = await s1.recv();
            break;
         }
         case "S3": {
            const s3 = <IBob_S3>nextState;
            const add = s3.add;
            const res = new RES( add.value1 + add.value2 );
            console.log(`stuur ${res.name} ${res.sum} naar fred `);
            s1 = await s3.sendRES(res);
            nextState = await s1.recv();
            break;
         }
         case "S4": {
            const s4 = <IBob_S4>nextState;
            const bye = s4.bye;
            console.log(`bye ontvangen van Fred  ${nextState.state}`);
            nextState = await s4.recv();
            break;
         }
         case "S5": {
            let s5 = <IBob_S5>nextState;
            let bye = s5.bye;
            console.log(`bye ontvangen van Alice    ${nextState.state}`);
            nextState = await s5.recv();
            break;
         }
         case "S6": {
            const s6 = <IBob_S6>nextState;
            const add = s6.add;
            const res = new RES( add.value1 + add.value2 );
            console.log(`stuur ${res.name} ${res.sum} naar Alice `);
            const s4 = await s6.sendRES(res);
            nextState = await s4.recv();
            break;
         }
         case "S8": {
            const s8 = <IBob_S8>nextState;
            const add = s8.add;
            const res = new RES( add.value1 + add.value2 );
            console.log(`stuur ${res.name} ${res.sum} naar Fred `);
            const s5 = await s8.sendRES(res);
            nextState = await s5.recv();
            break;
         }
         case "S7": {
            console.log('in de DONE van Bob');
            const sdone=<IBob_S7>nextState;
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