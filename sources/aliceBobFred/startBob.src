import {IBob, IBob_S1,IBob_S2,IBob_S3,IBob_S4,IBob_S5,IBob_S6,IBob_S7,IBob_Done,executeProtocol} from './Bob';
import {RES} from './Message';

async function protocol(s1:IBob_S1):Promise<IBob_Done> {
   let nextState:IBob = await s1.receive();
   while ( true ){
      console.log(`switching state ${nextState.state}`);
      switch (nextState.state) {
         case "S2": {
            let s2 = <IBob_S2>nextState;
            let add = s2.add;
            let res = new RES( add.value1 + add.value2 );
            console.log(`stuur ${res.name} ${res.sum} naar Alice `);
            s1 = s2.sendRES(res);
            nextState = await s1.receive();
            break;
         }
         case "S3": {
            let s3 = <IBob_S3>nextState;
            let bye = s3.bye;
            console.log(`bye ontvangen van Alice    ${nextState.state}`);
            nextState = await s3.receive();
            break;
         }
         case "S4": {
            let s4 = <IBob_S4>nextState;
            let bye = s4.bye;
            console.log(`bye ontvangen van Fred  ${nextState.state}`);
            nextState = await s4.receive();
            break;
         }
         case "S5": {
            let s5 = <IBob_S5>nextState;
            let add = s5.add;
            let res = new RES( add.value1 + add.value2 );
            console.log(`stuur ${res.name} ${res.sum} naar fred `);
            s1 = s5.sendRES(res);
            nextState = await s1.receive();
            break;
         }
         case "S6": {
            let s6 = <IBob_S6>nextState;
            let add = s6.add;
            let res = new RES( add.value1 + add.value2 );
            console.log(`stuur ${res.name} ${res.sum} naar Alice `);
            let s3 = s6.sendRES(res);
            nextState = await s3.receive();
            break;
         }
         case "S7": {
            let s7 = <IBob_S7>nextState;
            let add = s7.add;
            let res = new RES( add.value1 + add.value2 );
            console.log(`stuur ${res.name} ${res.sum} naar Fred `);
            let s4 = s7.sendRES(res);
            nextState = await s4.receive();
            break;
         }
         case "Done": {
            console.log('in de DONE van Bob');
            let sdone=<IBob_Done>nextState;
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