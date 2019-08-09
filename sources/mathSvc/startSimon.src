import {ISimon, Simon_Start, ISimon_S2, Simon_End, ISimon_S4, ISimon_S5, executeProtocol, messages} from './Simon';
import {VAL,ADD,MUL,SUM,PRD,BYE} from './Message';

async function protocol(s1:Simon_Start):Promise<Simon_End> {
   let nextState:ISimon = await s1.recv();
   while ( true ){
      console.log(`message ${nextState.messageType} received from ${nextState.messageFrom}  :  ${nextState.message}`);
      switch (nextState.messageType) {
         case messages.NOMESSAGE: {
            s1 = <Simon_Start>nextState;
            console.log(`waiting for nextstate in S1`);
            nextState = await s1.recv();
            break;
         }
         case messages.VAL: {
            const s2 = <ISimon_S2>nextState;
            const val = (<VAL>s2.message).val;
            //console.log(`waiting for nextstate in S2`);
            const nextActionState=await s2.recv();
            if (nextActionState.messageType === messages.ADD){
               nextState = await (<ISimon_S4>nextActionState).sendSUM(new SUM((<ADD>nextActionState.message).add+val));
               console.log(`SUM sended`);
               break;
            }
            if (nextActionState.messageType === messages.MUL){
               nextState = await (<ISimon_S5>nextActionState).sendPRD(new PRD((<MUL>nextActionState.message).mul*val));
               console.log(`PRD sended`);
               break;
            }
         }
         case messages.BYE: {
            console.log('in de DONE van Simon');
            let sdone=<Simon_End>nextState;
            return new Promise(
               resolve => resolve(sdone)
            );
         }
      }
   }
}

async function start(){
   await executeProtocol(protocol,'localhost',30002);
}

start();