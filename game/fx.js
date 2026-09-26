/* Sanguosha — sound & animation effects (no external files; sounds are synthesized) */
(function () {
'use strict';
const IMG = () => window.SGS_IMG_BASE || '../cropped/';
const FX = window.FX = { sound: true, anim: true, vol: 0.55 };
try { const s = JSON.parse(localStorage.getItem('sgs_fx') || '{}'); if (s.sound === false) FX.sound = false; if (s.anim === false) FX.anim = false; } catch (e) { /* storage unavailable */ }
const save = () => { try { localStorage.setItem('sgs_fx', JSON.stringify({ sound: FX.sound, anim: FX.anim })); } catch (e) { /* ignore */ } };

// ================= SOUND (Web Audio synthesis) =================
let ctx = null, master = null, noiseBuf = null;
function ac() {
  if (!FX.sound) return null;
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = FX.vol; master.connect(ctx.destination); const n = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; } catch (e) { return null; } }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
document.addEventListener('pointerdown', () => { if (FX.sound) ac(); }, { once: false, passive: true });
function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function tone(freq, dur, { type = 'sine', gain = 0.3, attack = 0.005, at = 0, slideTo = null, filter = null } = {}) {
  const c = ac(); if (!c) return; const t = c.currentTime + at;
  const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  const g = c.createGain(); env(g, t, attack, gain, dur);
  let node = o; if (filter) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filter; o.connect(f); node = f; }
  node.connect(g); g.connect(master); o.start(t); o.stop(t + attack + dur + 0.05);
}
function noise(dur, { gain = 0.3, at = 0, type = 'bandpass', freq = 1500, freqTo = null, q = 1, attack = 0.005 } = {}) {
  const c = ac(); if (!c) return; const t = c.currentTime + at;
  const s = c.createBufferSource(); s.buffer = noiseBuf; const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); if (freqTo) f.frequency.exponentialRampToValueAtTime(freqTo, t + dur); f.Q.value = q;
  const g = c.createGain(); env(g, t, attack, gain, dur); s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + attack + dur + 0.05);
}
const SND = FX.snd = {
  flick() { noise(0.05, { gain: 0.25, freq: 3000, q: 0.8 }); },
  swish() { noise(0.28, { gain: 0.5, freq: 4500, freqTo: 600, q: 1.2, attack: 0.02 }); },
  clang() { tone(820, 0.45, { type: 'triangle', gain: 0.22 }); tone(1230, 0.35, { type: 'sine', gain: 0.12 }); tone(2030, 0.2, { gain: 0.06 }); noise(0.05, { gain: 0.2, freq: 5000 }); },
  thud() { tone(140, 0.28, { gain: 0.6, slideTo: 45 }); noise(0.12, { gain: 0.35, type: 'lowpass', freq: 600 }); },
  fire() { noise(0.7, { gain: 0.45, type: 'lowpass', freq: 400, freqTo: 3000, attack: 0.08 }); for (let i = 0; i < 7; i++) noise(0.03, { gain: 0.25, freq: 2500 + Math.random() * 2000, at: 0.05 + Math.random() * 0.6 }); },
  thunder() { noise(0.9, { gain: 0.7, type: 'lowpass', freq: 4000, freqTo: 150, attack: 0.002 }); tone(60, 0.8, { gain: 0.4, slideTo: 35 }); },
  chime() { tone(880, 0.9, { gain: 0.18 }); tone(1320, 0.7, { gain: 0.12, at: 0.08 }); tone(1760, 0.6, { gain: 0.08, at: 0.16 }); },
  glug() { for (let i = 0; i < 3; i++) tone(300 + i * 60, 0.12, { gain: 0.2, at: i * 0.1, slideTo: 500 + i * 80 }); },
  drumroll() { for (let i = 0; i < 14; i++) noise(0.06, { gain: 0.1 + i * 0.025, type: 'lowpass', freq: 900, at: i * 0.05 }); tone(110, 0.3, { gain: 0.45, at: 0.72, slideTo: 60 }); },
  gong() { [110, 176, 231, 297].forEach((f, i) => tone(f, 2.4 - i * 0.3, { gain: 0.22 / (i + 1), attack: 0.01 })); noise(0.3, { gain: 0.15, type: 'lowpass', freq: 800 }); },
  horn() { tone(147, 0.9, { type: 'sawtooth', gain: 0.18, attack: 0.08, filter: 900 }); tone(220, 0.9, { type: 'sawtooth', gain: 0.12, attack: 0.1, filter: 900, at: 0.05 }); },
  volley() { for (let i = 0; i < 6; i++) noise(0.18, { gain: 0.3, freq: 5000, freqTo: 1500, q: 2, at: i * 0.07 }); },
  skill() { [660, 880, 1175, 1568].forEach((f, i) => tone(f, 0.35, { type: 'triangle', gain: 0.09, at: i * 0.06 })); },
  equip() { tone(600, 0.15, { type: 'square', gain: 0.05, filter: 2000 }); noise(0.06, { gain: 0.2, freq: 4000 }); },
  chain() { for (let i = 0; i < 3; i++) { tone(1400 + i * 200, 0.12, { type: 'triangle', gain: 0.08, at: i * 0.07 }); noise(0.03, { gain: 0.15, freq: 6000, at: i * 0.07 }); } },
  turn() { tone(523, 0.25, { gain: 0.1 }); tone(784, 0.35, { gain: 0.08, at: 0.1 }); },
  lose() { tone(300, 0.4, { gain: 0.15, slideTo: 180 }); },
};
function soundForCard(c) {
  const k = c.key;
  if (k === 'slash') return c.nature === 'fire' ? SND.fire : c.nature === 'thunder' ? SND.thunder : SND.swish;
  if (k === 'dodge') return SND.clang;
  if (k === 'peach') return SND.flick;
  if (k === 'wine') return SND.glug;
  if (k === 'barbarian') return SND.horn;
  if (k === 'arrows') return SND.volley;
  if (k === 'duel') return () => { SND.clang(); SND.swish(); };
  if (k === 'chain') return SND.chain;
  if (k === 'fireattack') return SND.fire;
  if (k === 'lightning') return SND.thunder;
  if (window.SGS.CAT[k].type === 'equip') return SND.equip;
  return SND.flick;
}

// ================= ANIMATION =================
const layer = () => { let l = document.getElementById('fxlayer'); if (!l) { l = document.createElement('div'); l.id = 'fxlayer'; document.body.append(l); } return l; };
const seatEl = p => p && document.querySelector(`[data-seat="${p.seat}"]`);
const rectOf = el => el ? el.getBoundingClientRect() : null;
const center = r => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
function tableCenter() { const el = document.getElementById('played') || document.getElementById('center'); const r = rectOf(el); return r ? center(r) : { x: innerWidth / 2, y: innerHeight / 2 }; }
function cardNode(c) {
  const real = c.virtual ? (c.subcards[0] || c.huomoCard) : c; const d = document.createElement('div'); d.className = 'fx-card';
  if (real && real.img) { const i = document.createElement('img'); i.src = IMG() + real.img; d.append(i); }
  else { d.classList.add('txt'); d.textContent = window.SGS.CAT[c.key].zh; }
  if (c.virtual && (!real || real.key !== c.key)) { const t = document.createElement('div'); t.className = 'fx-vtag'; t.textContent = window.SGS.shortName(c); d.append(t); }
  return d;
}
function fly(c, from, to, dur = 520) {
  if (!FX.anim) return; const fr = rectOf(seatEl(from)); if (!fr) return;
  const a = center(fr), b = to ? (rectOf(seatEl(to)) ? center(rectOf(seatEl(to))) : tableCenter()) : tableCenter();
  const n = cardNode(c); layer().append(n);
  const anim = n.animate([{ transform: `translate(${a.x - 40}px,${a.y - 60}px) scale(.55) rotate(-8deg)`, opacity: 0.2 }, { transform: `translate(${(a.x + b.x) / 2 - 40}px,${Math.min(a.y, b.y) - 90}px) scale(1.05) rotate(3deg)`, opacity: 1, offset: 0.55 }, { transform: `translate(${b.x - 40}px,${b.y - 60}px) scale(.9) rotate(0)`, opacity: 1 }], { duration: dur, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' });
  anim.onfinish = () => { n.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 350, fill: 'forwards' }).onfinish = () => n.remove(); };
}
function aim(from, targets, color = '#e0643f') {
  if (!FX.anim || !targets || !targets.length) return; const fr = rectOf(seatEl(from)); if (!fr) return; const a = center(fr);
  const svgNS = 'http://www.w3.org/2000/svg'; const svg = document.createElementNS(svgNS, 'svg'); svg.setAttribute('class', 'fx-aim'); svg.setAttribute('width', innerWidth); svg.setAttribute('height', innerHeight);
  for (const t of targets) { if (t === from) continue; const tr = rectOf(seatEl(t)); if (!tr) continue; const b = center(tr); const l = document.createElementNS(svgNS, 'line'); l.setAttribute('x1', a.x); l.setAttribute('y1', a.y); l.setAttribute('x2', b.x); l.setAttribute('y2', b.y); l.setAttribute('stroke', color); l.setAttribute('stroke-width', '4'); l.setAttribute('stroke-linecap', 'round'); l.setAttribute('stroke-dasharray', '10 8'); svg.append(l); const ci = document.createElementNS(svgNS, 'circle'); ci.setAttribute('cx', b.x); ci.setAttribute('cy', b.y); ci.setAttribute('r', '26'); ci.setAttribute('fill', 'none'); ci.setAttribute('stroke', color); ci.setAttribute('stroke-width', '3'); svg.append(ci); }
  layer().append(svg); svg.animate([{ opacity: 0 }, { opacity: 0.95, offset: 0.2 }, { opacity: 0.95, offset: 0.7 }, { opacity: 0 }], { duration: 1100, fill: 'forwards' }).onfinish = () => svg.remove();
}
function floatText(p, text, cls) {
  if (!FX.anim) return; const r = rectOf(seatEl(p)); if (!r) return; const c = center(r);
  const d = document.createElement('div'); d.className = 'fx-float ' + cls; d.textContent = text; d.style.left = c.x + 'px'; d.style.top = (c.y - 10) + 'px'; layer().append(d);
  d.animate([{ transform: 'translate(-50%,0) scale(.6)', opacity: 0 }, { transform: 'translate(-50%,-30px) scale(1.25)', opacity: 1, offset: 0.25 }, { transform: 'translate(-50%,-80px) scale(1)', opacity: 0 }], { duration: 1300, easing: 'ease-out', fill: 'forwards' }).onfinish = () => d.remove();
}
function hit(p, nature) {
  if (!FX.anim) return; const el = seatEl(p); if (!el) return;
  el.animate([{ transform: 'translate(0)' }, { transform: 'translate(-7px,2px)' }, { transform: 'translate(6px,-2px)' }, { transform: 'translate(-4px,1px)' }, { transform: 'translate(0)' }], { duration: 380 });
  const r = rectOf(el); const f = document.createElement('div'); f.className = 'fx-flash ' + (nature || 'normal'); Object.assign(f.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' }); layer().append(f);
  f.animate([{ opacity: 0.85 }, { opacity: 0 }], { duration: nature === 'thunder' ? 700 : 550, fill: 'forwards' }).onfinish = () => f.remove();
  if (nature === 'thunder') { const s = document.createElement('div'); s.className = 'fx-screenflash'; layer().append(s); s.animate([{ opacity: 0.55 }, { opacity: 0 }], { duration: 350, fill: 'forwards' }).onfinish = () => s.remove(); }
}
function heal(p) { if (!FX.anim) return; const el = seatEl(p); if (!el) return; el.animate([{ boxShadow: '0 0 0 0 rgba(120,210,110,0)' }, { boxShadow: '0 0 0 10px rgba(120,210,110,.55)' }, { boxShadow: '0 0 0 0 rgba(120,210,110,0)' }], { duration: 800 }); }
function banner(text, sub, cls = '') {
  if (!FX.anim) return; const b = document.createElement('div'); b.className = 'fx-banner ' + cls; b.innerHTML = `<div class="t">${text}</div>${sub ? `<div class="s">${sub}</div>` : ''}`; layer().append(b);
  b.animate([{ transform: 'translate(-60%,-50%) skewX(-12deg)', opacity: 0 }, { transform: 'translate(-50%,-50%) skewX(-6deg)', opacity: 1, offset: 0.18 }, { transform: 'translate(-50%,-50%) skewX(-6deg)', opacity: 1, offset: 0.78 }, { transform: 'translate(-40%,-50%) skewX(-12deg)', opacity: 0 }], { duration: 1500, easing: 'ease-out', fill: 'forwards' }).onfinish = () => b.remove();
}
function judgeShow(ev) {
  if (!FX.anim) return; const c = ev.final || ev.card; if (!c) return;
  const good = ev.good ? ev.good(c) : null;
  const w = document.createElement('div'); w.className = 'fx-judge';
  w.innerHTML = `<div class="lbl">⚖ ${window.SGS.fixYou(ev.player.label + "'s judgement")} — ${ev.reason || ''}</div><div class="flip"><div class="face back"><img src="${IMG()}action/card_back.jpg"></div><div class="face front"><img src="${IMG() + c.img}"></div></div>` + (good === null ? '' : `<div class="stamp ${good ? 'ok' : 'bad'}">${good ? '✓ Good for ' + (ev.player.isHuman ? 'you' : ev.player.label) : '✗ Bad for ' + (ev.player.isHuman ? 'you' : ev.player.label)}</div>`);
  layer().append(w);
  const flip = w.querySelector('.flip'); flip.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(180deg)' }], { duration: 500, delay: 250, easing: 'ease-in-out', fill: 'forwards' });
  const st = w.querySelector('.stamp'); if (st) st.animate([{ transform: 'scale(2.2) rotate(-12deg)', opacity: 0 }, { transform: 'scale(1) rotate(-8deg)', opacity: 1 }], { duration: 260, delay: 780, easing: 'ease-out', fill: 'both' });
  w.animate([{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }], { duration: Math.max(1200, 1600 * Math.min(1.4, (window.UI ? UI.speed : 700) / 700)), fill: 'forwards' }).onfinish = () => w.remove();
}

// ================= ACTION CAPTIONS (always on) =================
const L = p => p ? (p.isHuman ? 'You' : p.label) : '?'; const Lo = p => p ? (p.isHuman ? 'you' : p.label) : '?';
function effectText(ev) {
  const c = ev.card, k = c.key, t = (ev.targets || [])[0], T = t ? L(t) : '';
  const tn = t && t.isHuman ? 'your' : (T + "'s");
  switch (k) {
    case 'slash': return ev.response ? 'played in response' : `${T} must Dodge 闪 or take ${1 + (c.wineBonus || 0)}${c.nature === 'fire' ? ' fire' : c.nature === 'thunder' ? ' thunder' : ''} damage`;
    case 'dodge': return 'dodges — cancels the Strike';
    case 'peach': return ev.rescue ? `saves ${T} from dying (+1 HP)` : 'heals 1 HP';
    case 'wine': return ev.response ? 'drinks to survive (+1 HP)' : 'next Strike this turn deals +1 damage';
    case 'dismantle': return `discards one of ${tn} cards (hand, equipment or judgement area)`;
    case 'steal': return `takes one of ${tn} cards`;
    case 'duel': return `${T} and ${Lo(ev.user)} trade Strikes — first to stop takes 1 damage`;
    case 'barbarian': return 'everyone else must play a Strike 杀 or take 1 damage';
    case 'arrows': return 'everyone else must play a Dodge 闪 or take 1 damage';
    case 'peachgarden': return 'every wounded player heals 1 HP';
    case 'harvest': return 'reveals cards — each player takes one in turn';
    case 'borrow': return `${T} must Strike ${Lo(ev.targets[1])} or hand ${t && t.isHuman ? 'your' : 'their'} weapon to ${Lo(ev.user)}`;
    case 'exnihilo': return 'draws 2 cards';
    case 'nullify': return 'cancels the trick being played';
    case 'fireattack': return `${T} ${t && t.isHuman ? 'reveal' : 'reveals'} a hand card; a matching-suit discard deals 1 fire damage`;
    case 'chain': return (ev.targets || []).length ? 'chains / unchains — fire & thunder damage spreads along chains' : 'recast for a new card';
    case 'lightning': return 'placed on self — each turn ♠2–9 strikes for 3 thunder damage, otherwise it moves on';
    case 'indulgence': return t && t.isHuman ? 'unless you judge ♥, you skip your next play phase' : `unless ${T} judges ♥, they skip their next play phase`;
    case 'supply': return t && t.isHuman ? 'unless you judge ♣, you skip your next draw phase' : `unless ${T} judges ♣, they skip their next draw phase`;
  }
  const cat = window.SGS.CAT[k]; if (cat && cat.type === 'equip') return `equips it (${cat.sub === 'weapon' ? 'weapon, range ' + cat.range : cat.sub === 'armor' ? 'armour' : cat.sub === 'minus' ? 'horse: −1 distance to others' : 'horse: +1 distance from others'})`;
  return '';
}
function caption(g, ev) {
  const box = document.getElementById('captions'); if (!box) return;
  const c = ev.card; const real = c.virtual ? (c.subcards[0] || c.huomoCard) : c;
  const ts = (ev.targets || []).filter(t => t !== ev.user); const auto = ['barbarian', 'arrows', 'peachgarden', 'harvest'].includes(c.key);
  const who = `<b>${L(ev.user)}</b>`; const zh = c.key === 'slash' && c.nature === 'fire' ? '火杀' : c.key === 'slash' && c.nature === 'thunder' ? '雷杀' : window.SGS.CAT[c.key].zh; const name = `<span class="cn">${window.SGS.shortName(c)} ${zh}</span>`;
  const tgt = (!auto && ts.length && c.key !== 'borrow') ? ` ➜ <b>${ts.map(Lo).join(', ')}</b>` : '';
  const via = c.viaSkill ? ` <span class="via">via ${g.skillLabel(c.viaSkill)}</span>` : '';
  const row = document.createElement('div'); row.className = 'cap' + (ev.user && ev.user.isHuman ? ' mine' : '') + (ts.some(t => t.isHuman) ? ' atme' : '');
  row.innerHTML = (real && real.img ? `<img src="${IMG() + real.img}">` : `<div class="noimg">${window.SGS.CAT[c.key].zh}</div>`) + `<div class="tx"><div>${who} ${ev.response ? (ev.user.isHuman ? 'respond with' : 'responds with') : (ev.user.isHuman ? 'use' : 'uses')} ${name}${via}${tgt}</div><div class="ef">${effectText(ev)}</div></div>`;
  box.prepend(row); while (box.children.length > 3) box.lastChild.remove();
  [...box.children].forEach((r, i) => r.classList.toggle('old', i > 0));
  const hold = Math.max(2500, 4500 * Math.min(1.5, (window.UI ? UI.speed : 700) / 700));
  setTimeout(() => { row.classList.add('fade'); setTimeout(() => row.remove(), 600); }, hold);
}
FX.caption = caption;

// ================= EVENT MAPPING =================
FX.event = function (g, name, ev) {
  if (!g || g !== (window.UI && UI.g)) return;
  try {
    switch (name) {
      case 'cardUsed': {
        const c = ev.card; if (!c || !ev.user) return;
        if (!ev.response || ['dodge', 'nullify', 'peach', 'wine'].includes(c.key) || ev.rescue) caption(g, ev); if (ev.rescue) { fly(c, ev.user, ev.targets && ev.targets[0]); SND.flick(); return; }
        fly(c, ev.user, null); const s = soundForCard(c); if (s) s();
        const ts = (ev.targets || []).filter(t => t !== ev.user); if (ts.length && ts.length <= 3) setTimeout(() => aim(ev.user, ts, c.key === 'slash' ? '#e0643f' : '#d9b25f'), 250);
        break;
      }
      case 'cardPlayed': if (ev.card && ev.player) { fly(ev.card, ev.player, null); const s = soundForCard(ev.card); if (s) s(); } break;
      case 'damaged': case 'damagedDead': { const t = ev.target; if (!t) return; hit(t, ev.nature); floatText(t, `−${ev.amount}`, 'dmg ' + (ev.nature || '')); (ev.nature === 'fire' ? SND.fire : ev.nature === 'thunder' ? SND.thunder : SND.thud)(); if (ev.nature !== null && ev.nature) setTimeout(SND.thud, 120); break; }
      case 'hpLost': floatText(ev.player, `−${ev.amount}`, 'loss'); SND.lose(); break;
      case 'recovered': heal(ev.player); floatText(ev.player, `+${ev.amount}`, 'heal'); SND.chime(); break;
      case 'judgeDone': judgeShow(ev); SND.drumroll(); break;
      case 'chainChanged': SND.chain(); break;
      case 'phaseStart': if (ev.phase === 'start' && ev.player && ev.player.isHuman) SND.turn(); break;
    }
  } catch (e) { /* never break the game */ }
};
FX.log = function (g, e) {
  if (!g || g !== (window.UI && UI.g)) return;
  if (e.kind === 'death' && e.who) { SND.gong(); banner(`☠ ${e.who.label} falls`, `Role revealed: ${window.SGS.ROLE_NAME[e.who.role]}`, 'death'); return; }
  if (e.kind !== 'skill') return;
  const m = /【([^】]+)】/.exec(e.en); if (!m) return;
  const who = e.who ? e.who.label : '';
  banner(`【${m[1]}】`, who, 'skill'); SND.skill();
};

// ================= SETTINGS WIRING =================
window.addEventListener('DOMContentLoaded', () => {
  const s = document.getElementById('fxSound'), a = document.getElementById('fxAnim');
  if (s) { s.checked = FX.sound; s.onchange = () => { FX.sound = s.checked; if (FX.sound) { ac(); SND.chime(); } save(); }; }
  if (a) { a.checked = FX.anim; a.onchange = () => { FX.anim = a.checked; save(); }; }
});
})();
