const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/engine.js');
const noWin = () => [['jade','ruby','sapphire'],['bell','crown','seven'],['sapphire','jade','ruby'],['seven','bell','crown'],['ruby','sapphire','jade']];
test('all weighted ticket boundaries map to the documented distribution',()=>{
  const counts={};for(let t=0;t<E.TOTAL_WEIGHT;t++){const id=E.pick(t);counts[id]=(counts[id]||0)+1;}
  E.SYMBOLS.forEach(s=>assert.equal(counts[s.id],s.weight));
  assert.throws(()=>E.pick(-1));assert.throws(()=>E.pick(E.TOTAL_WEIGHT));
});
test('lines must begin at leftmost reel and require three consecutive matches',()=>{
  assert.equal(E.lineResult(['ruby','jade','jade','jade','jade']),null);
  assert.equal(E.lineResult(['jade','jade','ruby','jade','jade']),null);
  assert.equal(E.lineResult(['jade','jade','jade','ruby','jade']).multiplier,6);
});
test('wild substitution selects the highest single award, including all-wild prefixes',()=>{
  assert.deepEqual(E.lineResult(['wild','jade','wild','jade','jade']),{symbol:'jade',count:5,multiplier:40});
  assert.deepEqual(E.lineResult(['wild','wild','wild','jade','ruby']),{symbol:'wild',count:3,multiplier:50});
  assert.equal(E.lineResult(['wild','wild','wild','wild','wild']).multiplier,1000);
  assert.equal(E.lineResult(['scatter','wild','wild','wild','wild']),null);
});
test('all 20 paylines pay once, using total bet divided by 20',()=>{
  const grid=Array.from({length:5},()=>['jade','jade','jade']);
  const r=E.evaluate(grid,20);assert.equal(r.wins.length,20);assert.equal(r.payout,800);
  assert.equal(E.evaluate(grid,100).payout,4000);
  assert.equal(E.evaluate(grid,20,true).payout,1600);
  assert.equal(new Set(E.LINES.map(JSON.stringify)).size,20);
});
test('three scatters anywhere award eight spins only in base game',()=>{
  const grid=noWin();grid[0][0]='scatter';grid[2][1]='scatter';grid[4][2]='scatter';
  assert.equal(E.evaluate(grid,20).awardedFreeSpins,8);
  assert.equal(E.evaluate(grid,20,true).awardedFreeSpins,0);
  grid[4][2]='jade';assert.equal(E.evaluate(grid,20).awardedFreeSpins,0);
});
test('balance accounting, free-spin lock, no retrigger, and bonus completion',()=>{
  let s=E.initialState();s.bet=100;
  let r=E.spin(s,()=>E.TOTAL_WEIGHT-1);assert.equal(r.state.balance,9900);assert.equal(r.state.freeSpins,8);assert.equal(r.state.bonusBet,100);
  s=r.state;s.bet=20;
  for(let i=0;i<8;i++){r=E.spin(s,()=>E.TOTAL_WEIGHT-1);assert.equal(r.bet,100);assert.equal(r.bonus,true);s=r.state;}
  assert.equal(s.freeSpins,0);assert.equal(s.balance,9900);assert.equal(s.wagered,100);assert.equal(s.spins,9);
});
test('paying free spins double payout without deducting a wager',()=>{
  const s={...E.initialState(),freeSpins:1,bonusBet:40};
  const r=E.spin(s,()=>0);assert.equal(r.result.payout,3200);assert.equal(r.state.balance,13200);assert.equal(r.state.wagered,0);assert.equal(r.state.freeSpins,0);
});
test('insufficient credits and malformed saved games fail without changing state',()=>{
  const s={...E.initialState(),balance:0};assert.throws(()=>E.spin(s));assert.equal(s.spins,0);
  assert.equal(E.validState({...s,freeSpins:-1}),false);
  assert.equal(E.validState({...s,balance:Infinity}),false);
  assert.equal(E.validState({...s,bet:21}),false);
  assert.throws(()=>E.evaluate([],20));
});
test('history is bounded and spins return new state',()=>{
  let s=E.initialState();const original=structuredClone(s);
  for(let i=0;i<30;i++)s=E.spin(s,()=>0).state;
  assert.equal(s.history.length,20);assert.equal(s.history[0].number,30);assert.equal(s.history.at(-1).number,11);
  assert.deepEqual(original,E.initialState());
});
