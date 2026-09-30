const E = require('../src/engine.js');
// Exact enumeration of every five-symbol line. Linearity of expectation means
// correlated paylines do not affect expected total line payout per total wager.
let lineReturn=0,hitProbability=0;
function enumerate(ids,probability){
  if(ids.length===5){const r=E.lineResult(ids);if(r){lineReturn+=r.multiplier*probability;hitProbability+=probability;}return;}
  for(const s of E.SYMBOLS)enumerate([...ids,s.id],probability*s.weight/E.TOTAL_WEIGHT);
}
enumerate([],1);
const p=E.MAP.scatter.weight/E.TOTAL_WEIGHT;
const trigger=1-(1-p)**15-15*p*(1-p)**14-105*p*p*(1-p)**13;
const totalReturn=lineReturn*(1+trigger*8*2);
console.log(JSON.stringify({model:'Independent weighted cells; 20 fixed lines; 8 free spins at 2x; no retrigger',baseLineReturn:lineReturn,perLineHitProbability:hitProbability,bonusTriggerProbability:trigger,expectedReturnIncludingBonus:totalReturn,notes:'Exact theoretical model, not a certified payout percentage or a promise of session results.'},null,2));
