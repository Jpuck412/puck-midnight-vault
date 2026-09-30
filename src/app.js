(() => {
  'use strict';
  const E = window.VaultEngine;
  const $ = id => document.getElementById(id);
  const KEY = 'puck-midnight-vault:v1';
  const PREFS = 'puck-midnight-vault:prefs:v1';
  const nf = new Intl.NumberFormat('en-US');
  const format = n => nf.format(n);
  const esc = text => String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let state = E.initialState();
  let busy = false;
  let quick = false;
  let sound = false;
  let audio = null;
  let storageOK = true;
  let lastWin = 0;
  let opener = null;
  let animationJobs = [];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (E.validState(saved)) state = saved;
    const prefs = JSON.parse(localStorage.getItem(PREFS));
    quick = prefs?.quick === true;
    sound = prefs?.sound === true;
  } catch { storageOK = false; }
  function persist() {
    try { localStorage.setItem(KEY,JSON.stringify(state)); }
    catch { storageOK=false; }
    $('storage-warning').hidden = storageOK;
    $('balance-caption').textContent = storageOK ? 'Saved on this device' : 'This visit only';
  }
  function savePrefs() { try { localStorage.setItem(PREFS,JSON.stringify({quick,sound})); } catch { /* Preferences are optional. */ } }
  function symbol(id) { return `<svg class="symbol" role="img" aria-label="${E.MAP[id].name}" viewBox="0 0 120 120"><use href="#symbol-${id}"/></svg>`; }
  function cell(id,row) { return `<div class="cell" data-row="${row}">${symbol(id)}</div>`; }
  const initialGrid = [['crown','jade','ruby'],['ruby','seven','bell'],['sapphire','wild','jade'],['jade','seven','crown'],['bell','sapphire','seven']];
  function renderGrid(grid) {
    $('reels').innerHTML=grid.map((col,i)=>`<div class="reel" data-col="${i}"><div class="strip">${col.map(cell).join('')}</div></div>`).join('');
  }
  function updateControls() {
    const bet = state.freeSpins ? state.bonusBet : state.bet;
    $('balance').textContent=format(state.balance);
    $('bet').textContent=format(bet);
    $('win').textContent=format(lastWin);
    $('spin').disabled=busy || (!state.freeSpins && state.balance < state.bet);
    $('bet-down').disabled=busy || !!state.freeSpins || state.bet===E.BETS[0];
    $('bet-up').disabled=busy || !!state.freeSpins || state.bet===E.BETS.at(-1);
    $('session').disabled=busy;
    $('spin-label').textContent=busy?'SPINNING':state.freeSpins?'FREE SPIN':'SPIN';
    $('spin-detail').textContent=busy?'GOOD LUCK':state.freeSpins?`${state.freeSpins} LEFT`:`${format(bet)} CREDITS`;
    $('mode').textContent=state.freeSpins?'VAULT BONUS · 2× WINS':'BASE GAME';
    $('bonus-counter').hidden=!state.freeSpins;
    $('bonus-counter').textContent=`${state.freeSpins} FREE SPINS`;
    document.querySelector('.machine').classList.toggle('bonus-mode',!!state.freeSpins);
    $('sound').setAttribute('aria-pressed',String(sound));
    $('sound').setAttribute('aria-label',sound?'Turn sound off':'Turn sound on');
    $('sound').innerHTML=`♪ <span>Sound ${sound?'on':'off'}</span>`;
    $('turbo').setAttribute('aria-pressed',String(quick));
    $('turbo').innerHTML=`Quick spin <b>${quick?'ON':'OFF'}</b>`;
  }
  function tone(freq,length=0.09,delay=0,volume=.035) {
    if (!sound) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      if(audio.state==='suspended') void audio.resume().catch(()=>{});
      const osc=audio.createOscillator(), gain=audio.createGain();
      const start=audio.currentTime+delay;
      osc.type='sine'; osc.frequency.setValueAtTime(freq,start);
      gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.01);gain.gain.exponentialRampToValueAtTime(.001,start+length);
      osc.connect(gain);gain.connect(audio.destination);osc.start(start);osc.stop(start+length+.01);
      osc.onended=()=>{osc.disconnect();gain.disconnect();};
    } catch { /* Lack of audio support never blocks a spin. */ }
  }
  function setMessage(text,win=false) {$('message').textContent=text;$('result-bar').classList.toggle('win',win);}
  async function animateReels(grid) {
    const current=Array.from(document.querySelectorAll('.reel'));
    const duration=reducedMotion.matches?0:quick?430:1350;
    if(!duration || !Element.prototype.animate) {renderGrid(grid);return;}
    animationJobs=[];
    await Promise.all(current.map(async(reel,col)=>{
      const strip=reel.querySelector('.strip');
      const previous=strip.innerHTML;
      const filler=Array.from({length:18},(_,i)=>E.SYMBOLS[(i*3+col*2)%E.SYMBOLS.length].id);
      strip.innerHTML=previous+filler.map(cell).join('')+grid[col].map(cell).join('');
      const height=reel.getBoundingClientRect().height/3;
      reel.classList.add('moving');
      const job=strip.animate([{transform:'translateY(0)'},{transform:`translateY(${-21*height}px)`}],{duration:duration+col*(quick?70:180),easing:'cubic-bezier(.15,.65,.2,1)',fill:'forwards'});
      animationJobs.push(job);
      try {await job.finished;} catch { /* Visibility changes can end the motion early. */ }
      job.cancel();strip.innerHTML=grid[col].map(cell).join('');reel.classList.remove('moving');tone(180+col*75,.07);
    }));
    animationJobs=[];
  }
  function highlight(result) {
    result.wins.forEach(w=>w.cells.forEach(([col,row])=>document.querySelector(`.reel[data-col="${col}"] .cell[data-row="${row}"]`)?.classList.add('winning')));
    if(result.awardedFreeSpins) document.querySelectorAll('.cell').forEach(el=>{if(el.querySelector('[href="#symbol-scatter"]'))el.classList.add('scatter-hit');});
    const best=result.wins.reduce((a,b)=>!a||b.amount>a.amount?b:a,null);
    if(best) $('payline-overlay').innerHTML=`<polyline points="${E.LINES[best.line-1].slice(0,best.count).map((r,c)=>`${c*100+50},${r*100+50}`).join(' ')}" stroke="#ffe3a0" stroke-opacity=".8" stroke-width="2" fill="none"/>`;
  }
  async function spin() {
    if(busy || $('modal').open) return;
    // Re-read before a spin so a second open tab does not reuse an old balance.
    if(storageOK) {try {const latest=JSON.parse(localStorage.getItem(KEY));if(E.validState(latest))state=latest;}catch{}}
    busy=true;$('payline-overlay').innerHTML='';updateControls();
    let outcome;
    try {
      outcome=E.spin(state);
      // Commit the complete result BEFORE animation. Reloading cannot cancel a loss.
      state=outcome.state;persist();
      tone(120,.13);setMessage(outcome.bonus?'The vault is open. All line wins pay double.':'Reels in motion…');
      await animateReels(outcome.grid);
      lastWin=outcome.result.payout;
      highlight(outcome.result);
      const r=outcome.result;
      const parts=[];
      const net = r.payout - (outcome.bonus ? 0 : outcome.bet);
      if(r.payout) parts.push(`${r.payout>=outcome.bet*20?'BIG WIN · ':''}${format(r.payout)} credits returned · ${net>=0?'+':''}${format(net)} net`);
      if(r.awardedFreeSpins) parts.push('VAULT UNLOCKED! 8 free spins with 2× wins.');
      else if(outcome.bonus && state.freeSpins===0) parts.push('Free spins complete.');
      else if(outcome.bonus) parts.push(`${state.freeSpins} free spins remaining.`);
      if(!parts.length) parts.push('No winning line. Your next spin is a fresh draw.');
      if(!state.freeSpins && state.balance<state.bet) parts.push(state.balance>=E.BETS[0]?'Lower your bet to continue.':'Start a new session for fresh play credits.');
      setMessage(parts.join(' '),net>0 || r.awardedFreeSpins>0);
      if(net>0 || r.awardedFreeSpins) [392,494,587,784].forEach((f,i)=>tone(f,.22,i*.09,.04));
      $('win-caption').textContent=r.payout ? (outcome.bonus?'Includes 2× bonus':'Play credits won') : 'Play credits';
    } catch(error) {
      if(outcome) { renderGrid(outcome.grid);lastWin=outcome.result.payout;setMessage(`Spin settled: ${format(lastWin)} credits won.`,lastWin>0); }
      else setMessage(error.message);
    } finally {busy=false;updateControls();}
  }
  function openModal(title,html) {
    opener=document.activeElement;$('modal-title').textContent=title;$('modal-content').innerHTML=html;$('modal').showModal();
  }
  function closeModal() {$('modal').close();opener?.focus();}
  $('close-modal').addEventListener('click',closeModal);
  $('modal').addEventListener('click',e=>{if(e.target===$('modal')){const r=$('modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});
  $('spin').addEventListener('click',spin);
  window.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!$('modal').open && (e.target===document.body || e.target===$('spin'))){e.preventDefault();void spin();}});
  $('bet-down').addEventListener('click',()=>changeBet(-1));
  $('bet-up').addEventListener('click',()=>changeBet(1));
  function changeBet(direction) {
    if(busy||state.freeSpins)return;
    const index=Math.max(0,Math.min(E.BETS.length-1,E.BETS.indexOf(state.bet)+direction));
    state.bet=E.BETS[index];persist();updateControls();
  }
  $('sound').addEventListener('click',()=>{sound=!sound;savePrefs();updateControls();tone(523,.15);});
  $('turbo').addEventListener('click',()=>{quick=!quick;savePrefs();updateControls();});
  $('rules').addEventListener('click',()=>openModal('Your key to the vault',`<ol><li>Choose your <strong>total bet</strong> with − and +. It is split equally across all 20 paylines.</li><li>Press <strong>SPIN</strong> or the space bar. Match 3, 4, or 5 symbols consecutively from the <strong>leftmost reel</strong> along a payline.</li><li><strong>Wilds</strong> substitute for every paying symbol. They never substitute for scatters. Each line pays its single highest award; different winning lines are added together.</li><li>Land <strong>3 or more vault scatters anywhere</strong> on a paid spin to unlock <strong>8 free spins</strong>. Free spins keep the triggering bet and double all line payouts.</li><li>Free spins do not retrigger, and scatters have no separate credit payout. Press FREE SPIN for each bonus spin.</li></ol><p class="dialog-note">Every symbol is selected independently using your browser’s cryptographic random generator. Past results and your balance do not change the odds. The spinning animation does not change the already-drawn result.</p><p>These are free play credits with no monetary value. Your balance and spin history stay in this browser. New session resets them to 10,000 credits.</p>`));
  $('paytable').addEventListener('click',()=>openModal('The paytable',`<p>Amounts below are multiples of your <strong>line bet</strong> (total bet ÷ 20). A 20-credit total bet means 1 credit per line.</p><table><thead><tr><th>Symbol</th><th>3 matches</th><th>4 matches</th><th>5 matches</th></tr></thead><tbody>${E.SYMBOLS.filter(s=>s.pays).slice().reverse().map(s=>`<tr><td>${symbol(s.id)}${s.name}</td>${s.pays.map(p=>`<td>${format(p)}×</td>`).join('')}</tr>`).join('')}</tbody></table><p class="dialog-note">${symbol('scatter')} 3+ vault scatters anywhere on a paid spin award 8 free spins. Free-spin line wins pay 2×. No scatter cash payout or bonus retrigger.</p><p>Example: 3 jade symbols at a 20-credit total bet pay 6 credits on one line. Credits won are the total payout, not profit after the bet.</p><details><summary>Symbol probabilities</summary><p>Each of the 15 cells is drawn independently. Symbol weights out of ${E.TOTAL_WEIGHT}: ${E.SYMBOLS.map(s=>`${s.name} ${s.weight}`).join(', ')}. The complete game-math calculation is included in the source project. This game is not a certified real-money product.</p></details>`));
  $('lines').addEventListener('click',()=>openModal('20 ways across',`<p>Every spin plays all 20 lines. Match at least 3 consecutive symbols from left to right, starting on reel 1.</p><div class="line-gallery">${E.LINES.map((rows,i)=>`<div class="line-card"><span>LINE ${i+1}</span><svg viewBox="0 0 150 75" aria-label="Line ${i+1}, rows ${rows.map(r=>r+1).join(', ')}">${Array.from({length:15},(_,n)=>`<circle cx="${(n%5)*28+18}" cy="${Math.floor(n/5)*25+12}" r="3" fill="#71887266"/>`).join('')}<polyline points="${rows.map((r,c)=>`${c*28+18},${r*25+12}`).join(' ')}" fill="none" stroke="#e3c484" stroke-width="2.5"/></svg></div>`).join('')}</div>`));
  $('history').addEventListener('click',()=>openModal('Your session',`<div class="session-stats"><div><small>SPINS</small><strong>${format(state.spins)}</strong></div><div><small>BIGGEST WIN</small><strong>${format(state.biggest)}</strong></div><div><small>NET CREDITS</small><strong>${state.returned-state.wagered>=0?'+':''}${format(state.returned-state.wagered)}</strong></div></div>${state.history.length?`<p>Latest ${state.history.length} spins. Paid wagers: ${format(state.wagered)} · Total returned: ${format(state.returned)}.</p><table><thead><tr><th>Spin</th><th>Mode</th><th>Bet</th><th>Payout</th></tr></thead><tbody>${state.history.map(h=>`<tr><td>#${esc(h.number)}</td><td>${h.bonus?'Free · 2×':h.free?'Bonus won':'Base'}</td><td>${h.bonus?'Free':esc(h.bet)}</td><td>${esc(h.payout)}</td></tr>`).join('')}</tbody></table>`:'<p class="empty">Your first spin is waiting.</p>'}`));
  $('session').addEventListener('click',()=>{
    if(busy)return;
    openModal('Start a fresh session?',`<p>This replaces your current balance, spin history, and any remaining free spins with <strong>10,000 new play credits</strong>.</p><button class="primary-action" id="confirm-reset">Start new session</button><button class="secondary-action" id="cancel-reset">Keep playing</button>`);
    $('cancel-reset').addEventListener('click',closeModal);
    $('confirm-reset').addEventListener('click',()=>{state=E.initialState();lastWin=0;persist();renderGrid(initialGrid);$('payline-overlay').innerHTML='';$('win-caption').textContent='Play credits';updateControls();setMessage('A fresh vault. 10,000 play credits.');closeModal();});
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden) animationJobs.forEach(job=>{try{job.finish();}catch{}});});
  window.addEventListener('storage',event=>{if(event.key===KEY && !busy){try{const other=JSON.parse(event.newValue);if(E.validState(other)){state=other;renderGrid(state.lastGrid||initialGrid);lastWin=state.history[0]?.payout||0;$('payline-overlay').innerHTML='';updateControls();setMessage('Session updated from another tab.');}}catch{}}});
  renderGrid(state.lastGrid||initialGrid);lastWin=state.history[0]?.payout||0;persist();updateControls();
  if(state.freeSpins)setMessage(`Your vault bonus is saved. ${state.freeSpins} free spins remain at 2× line wins.`,true);
  else if(state.spins)setMessage('Welcome back. Your session is saved.');
})();
