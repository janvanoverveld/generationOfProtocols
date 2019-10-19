export function getSumOfDivisors(numberToCheck:number):number{
   let   sumDivisors = 0;
   const halfOfNumberToCheck = Math.ceil(numberToCheck/2);
   for ( let i=halfOfNumberToCheck; i>0; i-- ){
      if ( numberToCheck%i === 0 ){
         sumDivisors += i;
         if ( sumDivisors > numberToCheck ) break;
      }
   }
   return sumDivisors;
}
