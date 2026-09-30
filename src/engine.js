(function (root, factory) {
  const engine = factory();
  if (typeof module === 'object' && module.exports) module.exports = engine;
  else root.VaultEngine = engine;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const SYMBOLS = [
    { id: 'jade', name: 'Jade', weight: 20, pays: [6, 20, 40] },
    { id: 'ruby', name: 'Ruby', weight: 17, pays: [8, 25, 60] },
    { id: 'sapphire', name: 'Sapphire', weight: 14, pays: [10, 40, 100] },
    { id: 'bell', name: 'Golden bell', weight: 10, pays: [15, 60, 150] },
    { id: 'crown', name: 'Crown', weight: 7, pays: [25, 125, 300] },
    { id: 'seven', name: 'Lucky seven', weight: 4, pays: [40, 200, 600] },
    { id: 'wild', name: 'Wild', weight: 2, pays: [50, 250, 1000] },
    { id: 'scatter', name: 'Vault scatter', weight: 2, pays: null }
  ];
  const LINES = [
    [1,1,1,1,1], [0,0,0,0,0], [2,2,2,2,2], [0,1,2,1,0], [2,1,0,1,2],
    [0,0,1,2,2], [2,2,1,0,0], [1,0,0,0,1], [1,2,2,2,1], [0,1,1,1,0],
    [2,1,1,1,2], [1,0,1,2,1], [1,2,1,0,1], [0,1,0,1,0], [2,1,2,1,2],
    [1,1,0,1,1], [1,1,2,1,1], [0,2,0,2,0], [2,0,2,0,2], [0,2,2,2,0]
  ];
  const BETS = [20,40,60,100,200];
  const TOTAL_WEIGHT = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);
  const MAP = Object.fromEntries(SYMBOLS.map(s => [s.id, s]));
  function secureInt(max) {
    if (!Number.isInteger(max) || max < 1 || max > 0x100000000) throw new Error('Invalid random range');
    if (!globalThis.crypto?.getRandomValues) throw new Error('Secure randomness is unavailable in this browser.');
    const ceiling = Math.floor(0x100000000 / max) * max;
    const bytes = new Uint32Array(1);
    do { globalThis.crypto.getRandomValues(bytes); } while (bytes[0] >= ceiling);
    return bytes[0] % max;
  }
  function pick(ticket) {
    if (!Number.isInteger(ticket) || ticket < 0 || ticket >= TOTAL_WEIGHT) throw new Error('Invalid random ticket');
    for (const s of SYMBOLS) { if (ticket < s.weight) return s.id; ticket -= s.weight; }
  }
  function makeGrid(randomInt = secureInt) {
    return Array.from({length:5}, () => Array.from({length:3}, () => pick(randomInt(TOTAL_WEIGHT))));
  }
  function lineResult(ids) {
    let best = null;
    for (const s of SYMBOLS) {
      if (!s.pays) continue;
      let count = 0;
      for (const id of ids) {
        if (id === s.id || (id === 'wild' && s.id !== 'wild')) count++;
        else break;
      }
      const multiplier = count >= 3 ? s.pays[count - 3] : 0;
      if (multiplier > (best?.multiplier || 0)) best = { symbol:s.id, count, multiplier };
    }
    return best;
  }
  function evaluate(grid, bet, bonus = false) {
    if (!BETS.includes(bet)) throw new Error('Unsupported bet');
    if (!Array.isArray(grid) || grid.length !== 5 || grid.some(col => !Array.isArray(col) || col.length !== 3 || col.some(id => !MAP[id]))) throw new Error('Invalid reel grid');
    const wins = [];
    LINES.forEach((rows, index) => {
      const match = lineResult(rows.map((row, col) => grid[col][row]));
      if (match) wins.push({...match, line:index + 1, amount:match.multiplier * (bet / 20) * (bonus ? 2 : 1), cells:rows.slice(0, match.count).map((row,col)=>[col,row])});
    });
    const scatters = grid.flat().filter(id => id === 'scatter').length;
    return {wins, payout:wins.reduce((sum,w)=>sum+w.amount,0), scatters, awardedFreeSpins:!bonus && scatters >= 3 ? 8 : 0};
  }
  function initialState() { return {version:1,balance:10000,bet:20,freeSpins:0,bonusBet:20,spins:0,wagered:0,returned:0,biggest:0,history:[],lastGrid:null}; }
  function validState(s) {
    return s && s.version === 1 && ['balance','spins','wagered','returned','biggest','freeSpins'].every(k=>Number.isSafeInteger(s[k]) && s[k]>=0) && s.freeSpins <= 8 && BETS.includes(s.bet) && BETS.includes(s.bonusBet) && Array.isArray(s.history) && s.history.length <= 20 && s.history.every(h=>h && Number.isSafeInteger(h.number) && h.number>0 && BETS.includes(h.bet) && typeof h.bonus==='boolean' && Number.isSafeInteger(h.payout) && h.payout>=0 && [0,8].includes(h.free)) && (s.lastGrid === null || (Array.isArray(s.lastGrid) && s.lastGrid.length === 5 && s.lastGrid.every(c=>Array.isArray(c) && c.length === 3 && c.every(id=>typeof id==='string' && Object.hasOwn(MAP,id)))));
  }
  function spin(state, randomInt = secureInt) {
    if (!validState(state)) throw new Error('Invalid saved game');
    const bonus = state.freeSpins > 0;
    const bet = bonus ? state.bonusBet : state.bet;
    if (!bonus && state.balance < bet) throw new Error('Not enough play credits. Lower your bet or start a new session.');
    const grid = makeGrid(randomInt);
    const result = evaluate(grid, bet, bonus);
    const entry = {number:state.spins+1,bet,bonus,payout:result.payout,free:result.awardedFreeSpins};
    const next = {...state,balance:state.balance-(bonus?0:bet)+result.payout,freeSpins:bonus?state.freeSpins-1:result.awardedFreeSpins,bonusBet:bonus?state.bonusBet:bet,spins:state.spins+1,wagered:state.wagered+(bonus?0:bet),returned:state.returned+result.payout,biggest:Math.max(state.biggest,result.payout),history:[entry,...state.history].slice(0,20),lastGrid:grid};
    if (!validState(next)) throw new Error('Session limit reached. Start a new session.');
    return {state:next,grid,result,bet,bonus};
  }
  return {SYMBOLS,LINES,BETS,TOTAL_WEIGHT,MAP,secureInt,pick,makeGrid,lineResult,evaluate,initialState,validState,spin};
});
