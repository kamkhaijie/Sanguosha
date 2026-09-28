/* Sanguosha — browser UI */
(function () {
'use strict';
const SGS = window.SGS, D = window.SGS_DATA, CAT = SGS.CAT, S = SGS.SKILLS;
const IMG = window.SGS_IMG_BASE || '../cropped/';
const $ = s => document.querySelector(s);
const h = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const k in attrs) { if (k === 'class') e.className = attrs[k]; else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]); else if (k === 'html') e.innerHTML = attrs[k]; else if (attrs[k] != null) e.setAttribute(k, attrs[k]); } for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(c)); return e; };
const UI = window.UI = { g: null, me: null, req: null, resolve: null, sel: null, speed: 700, showRoles: false, explain: true, tab: 'log', recent: [] };

// ---------- text helpers ----------
const cardZh = c => c.key === 'slash' && c.nature === 'fire' ? '火杀' : c.key === 'slash' && c.nature === 'thunder' ? '雷杀' : CAT[c.key].zh;
function cardText(c) { const t = D.cardtext[cardZh(c)] || D.cardtext[CAT[c.key].zh]; return t || { en: '', zh: '' }; }
function genSkills(p) { const ids = p.skills.concat(p.tempSkills); return ids.map(id => ({ id, info: SGS.skillInfo(id) })).filter(x => x.info); }
const esc = s => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
const KNAME = SGS.KINGDOM_NAME;
function skillTypeTag(info) { const t = info.type || []; const tags = []; if (t.includes('locked')) tags.push('Locked 锁定技'); if (t.includes('limited')) tags.push('Limited 限定技'); if (t.includes('awaken')) tags.push('Awakening 觉醒技'); if (t.includes('lord')) tags.push('Lord 主公技'); return tags.length ? ` <span style="color:#d9b25f">[${tags.join(', ')}]</span>` : ''; }

// ---------- tooltip ----------
const tip = () => $('#tip');
function showTip(ev, html) { const t = tip(); t.innerHTML = html; t.classList.toggle('long', html.length > 1400); t.style.display = 'block'; moveTip(ev); }
function moveTip(ev) { const t = tip(); const w = t.offsetWidth, hh = t.offsetHeight; let x = ev.clientX + 16, y = ev.clientY + 12; if (x + w > innerWidth - 8) x = ev.clientX - w - 16; if (y + hh > innerHeight - 8) y = innerHeight - hh - 8; t.style.left = Math.max(4, x) + 'px'; t.style.top = Math.max(4, y) + 'px'; }
function hideTip() { tip().style.display = 'none'; }
const MOBILE = !!window.SGS_MOBILE;
// General decorations: God shimmer, female rose-gold glow (+ petals in browse/pick screens), Lord crown badge.
// Wraps any <img> of a general's card in a span (works for modals, tooltips, pickers).
const GOD_IMGS = D.generals.filter(g => g.kingdom === 'god').map(g => g.img);
const FEM_IMGS = D.generals.filter(g => g.gender === 'female').map(g => g.img);
const LORD_IMGS = D.generals.filter(g => g.skills.some(s => (s.type || []).includes('lord'))).map(g => g.img);
const CROWN_SVG = '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M3 18h18l-1.6-10-4.9 4.2L12 5l-2.5 7.2L4.6 8z" fill="#f3c95a" stroke="#7a5412" stroke-width="1.2" stroke-linejoin="round"/><rect x="3" y="19" width="18" height="2.4" rx="1" fill="#f3c95a"/></svg>';
const isGenImg = (src, list) => list.some(g => src.endsWith(g));
function godify(node) {
  const imgs = node.tagName === 'IMG' ? [node] : (node.querySelectorAll ? node.querySelectorAll('img') : []);
  for (const im of imgs) {
    const src = im.getAttribute('src') || ''; const god = isGenImg(src, GOD_IMGS), fem = isGenImg(src, FEM_IMGS), lord = isGenImg(src, LORD_IMGS);
    if (!god && !fem && !lord) continue;
    if (im.parentNode && im.parentNode.classList && im.parentNode.classList.contains('gdeco')) continue;
    if (im.closest('#zoom, .card, .fx-card, #captions')) continue;
    const browse = !!im.closest('.genpick, .ref');
    const w = document.createElement('span'); w.className = 'gdeco' + (god ? ' godshine' : '') + (fem ? ' femme' : '');
    im.parentNode.insertBefore(w, im); w.append(im);
    if (fem && browse) { const d = (Math.random() * 9).toFixed(2); for (let i = 0; i < 3; i++) { const pt = document.createElement('i'); pt.className = 'petal p' + i; pt.style.animationDelay = `${-d + i * 1.3}s`; w.append(pt); } }
    if (lord && (browse || im.closest('#tip'))) { const c = document.createElement('span'); c.className = 'crown'; c.title = 'Lord general 主公武将 — has a Lord skill'; c.innerHTML = CROWN_SVG; w.append(c); }
  }
}
// Limited-skill lamps: lit while unused; goes out (with a wisp of smoke) once used.
UI.lampOut = {};
function lampEl(p, id) {
  const lit = !!p.marks['limit_' + id]; const key = p.seat + ':' + id; const e = h('span', { class: 'lamp' + (lit ? '' : ' out') }, h('i', { class: 'flame' }));
  if (lit) { UI.lampOut[key] = 0; return e; }
  if (UI.lampOut[key] === 0) UI.lampOut[key] = Date.now();
  const t = UI.lampOut[key]; if (t && Date.now() - t < 2600) { const sm = h('i', { class: 'smoke' }); sm.style.animationDelay = `${-(Date.now() - t) / 1000}s`; e.append(sm); }
  return e;
}
const limitedIds = p => p.skills.concat(p.tempSkills).filter(id => S[id] && S[id].limited);
new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) godify(n); }).observe(document.documentElement, { childList: true, subtree: true });
function showSheet(html) { const t = tip(); t.innerHTML = html + '<div class="sheet-close">Tap anywhere to close</div>'; t.classList.add('sheet'); t.classList.toggle('long', html.length > 1400); t.style.display = 'block'; t.style.left = ''; t.style.top = ''; UI.sheetOpen = true; }
function tipOn(el, fn) {
  if (!MOBILE) { el.addEventListener('mouseenter', e => showTip(e, fn())); el.addEventListener('mousemove', moveTip); el.addEventListener('mouseleave', hideTip); return el; }
  // phone: press and hold (~0.45s) to read; a normal tap still selects
  let timer = null, fired = false, sx = 0, sy = 0;
  el.addEventListener('pointerdown', e => { fired = false; sx = e.clientX; sy = e.clientY; clearTimeout(timer); timer = setTimeout(() => { fired = true; if (navigator.vibrate) try { navigator.vibrate(15); } catch (x) {} showSheet(fn()); }, 450); });
  const cancel = () => clearTimeout(timer);
  el.addEventListener('pointerup', cancel); el.addEventListener('pointercancel', cancel); el.addEventListener('pointerleave', cancel);
  el.addEventListener('pointermove', e => { if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 12) cancel(); });
  el.addEventListener('click', e => { if (fired) { e.stopPropagation(); e.preventDefault(); fired = false; } }, true);
  el.addEventListener('contextmenu', e => e.preventDefault());
  return el;
}
if (MOBILE) document.addEventListener('pointerdown', () => { if (UI.sheetOpen) { UI.sheetOpen = false; setTimeout(() => { const t = tip(); t.style.display = 'none'; t.classList.remove('sheet'); }, 0); } }, true);
function cardTipHtml(c) {
  const real = c.virtual ? (c.subcards[0] || c.huomoCard) : c; const t = cardText(c); const img = real ? `<img src="${IMG + real.img}" onerror="this.style.display='none'">` : '';
  const cat = CAT[c.key]; const typ = cat.type === 'equip' ? `Equipment — ${cat.sub}${cat.range ? ', attack range ' + cat.range : ''}` : cat.type === 'delayed' ? 'Delayed trick 延时锦囊' : cat.type === 'trick' ? 'Trick 锦囊' : 'Basic 基本牌';
  const via = c.virtual ? `<p style="color:#d9b25f">Used as ${esc(SGS.shortName(c))}${c.viaSkill ? ' via ' + esc(UI.g.skillLabel(c.viaSkill)) : ''}${c.subcards.length ? ' (from ' + c.subcards.map(SGS.cardName).join(', ') + ')' : ''}</p>` : '';
  return `<div class="row">${img}<div><h4>${esc(SGS.cardName(c))}</h4><p style="color:#b9ab91">${typ}</p>${via}<p>${esc(t.en)}</p>${t.zh ? `<p class="zh">${esc(t.zh)}</p>` : ''}</div></div>`;
}
function genTipHtml(gen, p) {
  const sk = (p ? genSkills(p).map(x => x.info) : gen.skills);
  const extra = p ? `<p>${KNAME[p.kingdom]} · ${p.hp}/${p.maxhp} HP · ${p.gender}${p.faceDown ? ' · face down 背面' : ''}${p.chained ? ' · chained 横置' : ''}</p>` : `<p>${KNAME[gen.kingdom]} · ${gen.maxhp} HP · ${gen.gender}</p>`;
  return `<div class="row"><img src="${IMG + gen.img}" onerror="this.style.display='none'"><div><h4>${esc(gen.en)} <span class="zh">${esc(gen.zh)}</span></h4>${extra}${sk.map(s => `<div class="sk"><b>${esc(s.en)} ${esc(s.zh)}</b>${skillTypeTag(s)}<p>${esc(s.ten || s.en)}</p>${s.tzh ? `<p class="zh">${esc(s.tzh)}</p>` : ''}</div>`).join('')}</div></div>`;
}

// ---------- card element ----------
function cardEl(c, opts = {}) {
  const real = c.virtual ? (c.subcards[0] || null) : c;
  const el = h('div', { class: 'card' + (opts.size ? ' ' + opts.size : '') });
  if (real && real.img) { const im = h('img', { src: IMG + real.img, alt: SGS.cardName(real), draggable: 'false' }); im.onerror = () => { im.remove(); el.append(h('div', { class: 'fallback' }, h('b', {}, CAT[real.key].zh), h('div', {}, SGS.cardName(real)))); }; el.append(im); }
  else el.append(h('div', { class: 'fallback' }, h('b', { class: 'zh', style: 'font-size:22px' }, cardZh(c)), h('div', {}, SGS.shortName(c))));
  if (c.virtual && (c.subcards.length !== 1 || c.subcards[0].key !== c.key)) el.append(h('div', { class: 'vtag' }, 'as ' + SGS.shortName(c)));
  if (opts.back) { el.innerHTML = ''; el.append(h('img', { src: IMG + 'action/card_back.jpg' })); return el; }
  tipOn(el, () => cardTipHtml(c));
  return el;
}

// ---------- IO ----------
UI.io = {
  async pause(g, kind, data) {
    if (g !== UI.g || !window.FX || !FX.anim) return; const f = Math.max(0.3, Math.min(1.6, UI.speed / 700));
    if (kind === 'judge' && FX.judgeHold) { const tapOnly = MOBILE && data && data.player === UI.me && !UI.autoHuman; await FX.judgeHold(Math.max(1400, 3000 * f), tapOnly); return; }
    await sleep(900 * f);
  },
  async ask(g, p, req) {
    if (g !== UI.g) return new Promise(() => {}); // stale game
    if (!UI.me) UI.me = g.players.find(x => x.isHuman) || g.players[0];
    if (!p.isHuman) {
      const d = req.type === 'play' ? UI.speed : req.type === 'respond' ? UI.speed * 0.5 : req.type === 'general' ? 0 : UI.speed * 0.25;
      if (d > 0) await sleep(d);
      if (g !== UI.g) return new Promise(() => {});
      return SGS.AI.decide(g, p, req);
    }
    // auto-skip trivially empty prompts
    return new Promise(res => { UI.req = req; UI.resolve = v => { UI.req = null; UI.resolve = null; UI.sel = null; closeModal(); render(); res(v); }; UI.sel = newSel(); if (!UI.autoHuman) openFor(req); render(); if (UI.autoHuman) autoAnswer(req); });
  }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
function autoAnswer(req) { setTimeout(() => { if (UI.req !== req || !UI.resolve) return; let v; try { v = SGS.AI.decide(UI.g, UI.me, req); } catch (e) { console.error(e); v = null; } UI.resolve(v); }, req.type === 'general' ? 0 : Math.max(30, UI.speed * 0.6)); }
UI.setAuto = on => { UI.autoHuman = on; if (on && UI.req) { closeModal(); autoAnswer(UI.req); } else if (!on && UI.req) openFor(UI.req); };
function newSel() { return { mode: null, card: null, vcard: null, opt: null, name: null, cards: [], targets: [], active: null }; }

// ---------- rendering ----------
let raf = 0;
function render() { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; try { draw(); } catch (e) { console.error(e); } }); }
UI.render = render;
function hpEl(p) { if (!p.maxhp) return h('div', { class: 'hp' }, h('span', { style: 'font-size:11px;color:#8a7d67' }, 'choosing general…')); const r = p.hp / p.maxhp; const e = h('div', { class: 'hp' + (r <= 0.34 ? ' low' : r <= 0.67 ? ' mid' : '') }); for (let i = 0; i < p.maxhp; i++) e.append(h('i', { class: i < p.hp ? 'on' : '' })); e.append(h('span', { style: 'font-size:11px;color:#b9ab91;margin-left:3px' }, `${Math.max(0, p.hp)}/${p.maxhp}`)); return e; }
function eqEl(p, selectable) {
  const e = h('div', { class: 'eq' });
  for (const [slot, lab] of [['weapon', '⚔'], ['armor', '🛡'], ['minus', '−1🐎'], ['plus', '+1🐎']]) {
    const c = p.equip[slot]; if (!c) continue;
    const d = h('div', {}, lab + ' ', h('b', {}, CAT[c.key].en.replace(/ \(.*\)/, '')), ' ', h('span', { class: 'zh' }, CAT[c.key].zh), CAT[c.key].range ? ` (${CAT[c.key].range})` : '');
    tipOn(d, () => cardTipHtml(c));
    if (selectable && selectable(c)) { d.classList.add('selectable'); if (UI.sel && UI.sel.cards.includes(c)) d.classList.add('sel'); d.onclick = e2 => { e2.stopPropagation(); cardClick(c); }; }
    e.append(d);
  }
  return e;
}
// Status at a glance: delayed-trick badges (threatened), skip stamps (hit this turn), chained ring, face-down veil.
const DELAY_INFO = {
  indulgence: { ico: '🏮', cls: 'b-indul', en: 'Contentment 乐不思蜀', tip: 'At the start of their turn a judgement is flipped: ♥ heart = escape; anything else = they <b>skip their play phase</b> (can still draw, but can\'t use cards).' },
  supply: { ico: '🍚', cls: 'b-supply', en: 'Supply Shortage 兵粮寸断', tip: 'At the start of their turn a judgement is flipped: ♣ club = escape; anything else = they <b>skip their draw phase</b> (no 2 new cards).' },
  lightning: { ico: '⚡', cls: 'b-light', en: 'Lightning 闪电', tip: 'At the start of their turn a judgement is flipped: ♠2–9 = <b>3 thunder damage</b> (≈15% chance); otherwise Lightning moves on to the next player.' }
};
function statusEls(p) {
  const s = h('div', { class: 'status' });
  for (const c of p.judgeArea.slice().reverse()) { const k = c.vkey || c.key; const d = DELAY_INFO[k]; if (!d) continue; s.append(tipOn(h('span', { class: 'dbadge ' + d.cls }, d.ico), () => `<h4>${d.ico} ${d.en}</h4><p>${esc(p.label)} ${p.isHuman ? 'have' : 'has'} this waiting in ${p.isHuman ? 'your' : 'their'} judgement area.</p><p>${d.tip}</p><p style="color:#b9ab91">Can be removed before then by Dismantle or Steal, or cancelled with Nullification.</p>`)); }
  if (p.chained) s.append(tipOn(h('span', { class: 'dbadge b-chain' }, '⛓'), () => '<h4>⛓ Chained 横置</h4><p>If this character takes fire or thunder damage, every other chained character takes the same damage too (then the chain resets).</p>'));
  return s;
}
function portraitFx(p, por, el) {
  if (!p.general) return;
  const k = p.judgeArea.map(c => c.vkey || c.key);
  if (k.includes('indulgence')) por.append(h('div', { class: 'veil v-indul' }));
  if (k.includes('supply')) por.append(h('div', { class: 'veil v-supply' }));
  if (k.includes('lightning')) el.classList.add('has-light');
  if (p.chained) el.classList.add('chained');
  if (p.faceDown) { por.append(h('div', { class: 'veil v-down', style: `background-image:url('${IMG}action/card_back.jpg')` }, h('span', {}, 'Face down 翻面'))); }
  const g = UI.g;
  if (g.current === p && p.alive) {
    const st = []; if (p.turn.skip_play) st.push('Skips play 出牌'); if (p.turn.skip_draw) st.push('Skips draw 摸牌'); if (p.turn.skip_judge) st.push('Skips judgement');
    if (st.length) por.append(h('div', { class: 'skipstamp' }, ...st.map(t => h('div', {}, t))));
  }
}
function marksEl(p) {
  const e = h('div', { class: 'marks' }); const names = { fury: 'Fury 暴怒', ren: 'Patience 忍', nightmare: 'Nightmare 梦魇', gale: 'Gale 狂风', fog: 'Fog 大雾', zhaofu: 'Bound 诏缚' };
  for (const id of limitedIds(p)) { const info = SGS.skillInfo(id); const lit = !!p.marks['limit_' + id]; e.append(tipOn(h('span', { class: 'lim' + (lit ? '' : ' spent') }, lampEl(p, id), `${info ? info.en : id} ${lit ? 'ready' : 'used'}`), () => `<p>Limited skill 限定技 <b>${esc(info ? info.en + ' ' + info.zh : '')}</b> — once per game. ${lit ? 'The lamp is lit: not used yet.' : 'The lamp is out: already used.'}</p>`)); }
  for (const k in p.marks) { if (k.startsWith('limit_')) continue; e.append(h('span', {}, `${names[k] || k} ×${p.marks[k]}`)); }
  const pn = { stars: 'Stars 星', quan: 'Quan 权', chun: 'Chun 醇', ni: 'Rebel 逆', pojun: 'Set aside' };
  for (const k in p.piles) if (p.piles[k].length) { const sp = h('span', {}, `${pn[k] || k} ×${p.piles[k].length}`); if (p === UI.me || k === 'ni' || k === 'chun') tipOn(sp, () => `<p>${p.piles[k].map(SGS.cardName).join('<br>')}</p>`); e.append(sp); }
  return e;
}
function judgeEl(p) { const e = h('div', { class: 'judge' }); for (const c of p.judgeArea) { const k = c.vkey || c.key; e.append(tipOn(h('span', {}, `⚖ ${CAT[k].en} ${CAT[k].zh}`), () => cardTipHtml(c.vkey ? Object.assign({}, UI.g.virtual(k, [c])) : c))); } return e; }
function roleBadge(p) { const g = UI.g; const show = p === UI.me || p.role === 'lord' || !p.alive || UI.showRoles || g.over; return h('div', { class: 'role ' + (show ? p.role : '') }, show ? SGS.ROLE_NAME[p.role] : '? role'); }
function seatTargetState(p) {
  const s = UI.sel, r = UI.req; if (!r) return '';
  const cand = targetCandidates(); if (!cand) return '';
  if (s && s.targets.includes(p)) return 'targeted';
  if (cand.includes(p)) return 'targetable'; return '';
}
function seatEl(p) {
  const g = UI.g; const cur = g.current === p;
  const el = h('div', { 'data-seat': p.seat, class: 'seat' + (cur ? ' current' : '') + (p.alive ? '' : ' dead') + (p.dying ? ' dying' : '') });
  const st = seatTargetState(p); if (st) el.classList.add(st);
  const por = h('div', { class: 'portrait' + (p.general && p.general.kingdom === 'god' ? ' god' : '') + (p.general && p.general.gender === 'female' ? ' female' : ''), style: `background-image:url('${IMG + (p.general ? p.general.img : 'action/card_back.jpg')}')` });
  if (p.general) por.append(h('div', { class: 'kd ' + p.kingdom }, KNAME[p.kingdom]));
  por.append(roleBadge(p), statusEls(p), h('div', { class: 'handcnt', title: 'Hand cards' }, '🂠 ' + p.hand.length));
  portraitFx(p, por, el);
  if (cur && g.phase) por.append(h('div', { class: 'phase' }, PHASE[g.phase] || g.phase));
  if (p.general) tipOn(por, () => genTipHtml(p.general, p));
  el.append(por);
  const body = h('div', { class: 'body' }, h('div', { class: 'nm' }, `${p.seat + 1}. ${p.general ? p.general.en : '…'}`, h('span', { class: 'zh' }, p.general ? p.general.zh : '')), hpEl(p), eqEl(p), judgeEl(p), marksEl(p));
  if (UI.me && p.alive && UI.me.alive && p !== UI.me && p.general && UI.me.general) {
    const d = g.distance(UI.me, p); const inR = g.inRange(UI.me, p);
    body.append(MOBILE ? h('div', { class: 'dist' }, `dist ${d} `, h('span', { class: inR ? 'in' : 'out' }, inR ? '✓ in range' : '✗ out')) : h('div', { class: 'dist' }, `distance ${d} · `, h('span', { class: inR ? 'in' : 'out' }, inR ? 'in your range ✓' : 'out of range')));
  }
  el.append(body);
  el.onclick = () => seatClick(p);
  return el;
}
const PHASE = { start: 'Start 开始', judge: 'Judgement 判定', draw: 'Draw 摸牌', play: 'Play 出牌', discard: 'Discard 弃牌', end: 'End 结束' };
function draw() {
  const g = UI.g; if (!g) return;
  const lh = g.players.find(q => q.alive && q.judgeArea.some(c => (c.vkey || c.key) === 'lightning'));
  $('#stat').textContent = SGS.fixYou(`Round ${g.round} · Deck ${g.deck.length}` + (lh ? ` · ⚡ Lightning: ${lh.label}` : '') + (g.current ? ` · ${g.current.label}'s turn${g.phase ? ' — ' + (PHASE[g.phase] || g.phase) : ''}` : ''));
  const opp = $('#opponents'); opp.innerHTML = '';
  const n = g.players.length; const me = UI.me;
  for (let i = 1; i < n; i++) opp.append(seatEl(g.players[(me.seat + i) % n]));
  // center
  const played = $('#played'); played.innerHTML = '';
  const show = g.processing.slice(-6);
  if (g.harvestShown) for (const c of g.harvestShown) if (!show.includes(c) && g.processing.includes(c)) show.push(c);
  if (show.length) for (const c of show) played.append(h('div', { class: 'pc' }, cardEl(c), h('div', { class: 'who' }, 'in play')));
  else { const lj = UI.lastJudge && g.discard.includes(UI.lastJudge.card) ? UI.lastJudge : null;
    for (const c of g.discard.slice(-4)) { if (lj && c === lj.card) continue; const e = cardEl(c, { size: 'small' }); e.style.opacity = .75; played.append(h('div', { class: 'pc' }, e, h('div', { class: 'who' }, 'discarded'))); }
    if (lj) { const e = cardEl(lj.card, { size: 'small' }); e.classList.add('judged', lj.good === true ? 'ok' : lj.good === false ? 'bad' : 'nt'); played.append(h('div', { class: 'pc' }, e, h('div', { class: 'who jd ' + (lj.good === true ? 'ok' : lj.good === false ? 'bad' : '') }, `⚖ judgement ${lj.good === true ? '✓' : lj.good === false ? '✗' : ''}`))); } }
  $('#deckinfo').textContent = `Deck ${g.deck.length}`;
  drawMe(); drawPrompt(); drawHand();
}
function drawMe() {
  const g = UI.g, p = UI.me; const mc = $('#mecard'); mc.innerHTML = ''; mc.setAttribute('data-seat', p.seat);
  mc.className = (g.current === p ? 'current' : '') + (p.alive ? '' : ' dead');
  const st = seatTargetState(p); if (st) mc.classList.add(st);
  const por = h('div', { class: 'portrait' + (p.general && p.general.kingdom === 'god' ? ' god' : '') + (p.general && p.general.gender === 'female' ? ' female' : ''), style: `background-image:url('${IMG + (p.general ? p.general.img : 'action/card_back.jpg')}')` });
  if (p.general) { por.append(h('div', { class: 'kd ' + p.kingdom, style: 'position:absolute;left:4px;top:4px;font-size:12px;padding:1px 6px;border-radius:5px;color:#fff;font-weight:700' }, KNAME[p.kingdom])); tipOn(por, () => genTipHtml(p.general, p)); }
  por.append(h('div', { class: 'role ' + p.role, style: 'position:absolute;right:4px;top:4px;font-size:11px;padding:1px 6px;border-radius:5px' }, SGS.ROLE_NAME[p.role]));
  if (g.current === p && g.phase) por.append(h('div', { class: 'phase', style: 'top:auto;bottom:0' }, PHASE[g.phase]));
  por.append(statusEls(p)); portraitFx(p, por, mc);
  mc.append(por);
  const r = UI.req; const eqSel = r && ((r.type === 'cards' && r.candidates.some(c => p.equips().includes(c))) || (UI.sel && (UI.sel.mode === 'viewas' || UI.sel.mode === 'active'))) ? c => isSelectableCard(c) : null;
  mc.append(h('div', { class: 'body' }, h('div', { class: 'nm', style: 'font-weight:600' }, `You — ${p.general ? p.general.en : ''} `, h('span', { class: 'zh', style: 'color:#f0cf7c' }, p.general ? p.general.zh : '')), hpEl(p), eqEl(p, eqSel), judgeEl(p), marksEl(p), p.general && p.maxhp ? h('div', { class: 'dist' }, `Attack range ${g.attackRange(p)} · Hand limit ${g.maxHand(p)}`) : null));
  mc.onclick = () => seatClick(p);
  // skills bar
  const sk = $('#skills'); sk.innerHTML = '';
  for (const { id, info } of genSkills(p)) {
    const s = S[id]; const btn = h('button', {}, s && s.limited ? lampEl(p, id) : null, `${info.en} ${info.zh}`); if (s && s.limited && !p.marks['limit_' + id]) btn.classList.add('spent');
    tipOn(btn, () => `<h4>${esc(info.en)} <span class="zh">${esc(info.zh)}</span></h4>${skillTypeTag(info)}<p>${esc(info.ten || '')}</p><p class="zh">${esc(info.tzh || '')}</p>`);
    const usable = skillButtonUsable(id);
    if (usable) { btn.onclick = () => skillClick(id); if (UI.sel && (UI.sel.active === id || (UI.sel.opt && UI.sel.opt.skill === id))) btn.classList.add('on'); }
    else { btn.classList.add('locked'); }
    sk.append(btn);
  }
  for (const e of p.equips()) { const id = 'eq_' + e.key; if (S[id] && (S[id].viewAs) && skillButtonUsable(id)) { const btn = h('button', {}, `⚔ ${CAT[e.key].en}`); btn.onclick = () => skillClick(id); if (UI.sel && UI.sel.opt && UI.sel.opt.skill === id) btn.classList.add('on'); sk.append(btn); } }
  // global view-as (e.g. 陷嗣)
  const r2 = UI.req; if (r2 && (r2.type === 'play' || r2.type === 'respond')) for (const opt of currentViewAs()) if (opt.id.includes('@')) { const info = SGS.skillInfo(opt.skill); const btn = h('button', {}, `${info.en} ${info.zh} (${opt.owner.label})`); btn.onclick = () => skillClick(opt.id); if (UI.sel && UI.sel.opt && UI.sel.opt.id === opt.id) btn.classList.add('on'); sk.append(btn); }
}
function currentViewAs() {
  const r = UI.req, g = UI.g, p = UI.me; if (!r) return [];
  if (r.type === 'respond') return r.viewAs;
  if (r.type === 'play') return g.viewAsOptions(p, { mode: 'use', names: null });
  return [];
}
function skillButtonUsable(id) {
  const r = UI.req, g = UI.g, p = UI.me; if (!r) return false;
  if (r.type === 'play') { if (S[id] && S[id].active && g.activeUsable(p, id)) return true; if (currentViewAs().some(o => o.id === id)) return true; return false; }
  if (r.type === 'respond') return r.viewAs.some(o => o.id === id) || r.specials.includes(id);
  return false;
}
function drawHand() {
  const hd = $('#hand'); hd.innerHTML = ''; const p = UI.me;
  const sorted = p.hand.slice().sort((a, b) => (CAT[a.key].type > CAT[b.key].type ? 1 : -1) || a.key.localeCompare(b.key) || a.rank - b.rank);
  for (const c of sorted) {
    const el = cardEl(c); const s = isSelectableCard(c);
    if (s) { el.classList.add('selectable'); el.onclick = () => cardClick(c); } else if (UI.req && UI.req.type !== 'play') el.classList.add('disabled');
    if (UI.sel && (UI.sel.cards.includes(c) || UI.sel.card === c)) el.classList.add('selected');
    if (UI.hintCard === c) el.classList.add('hint');
    const a = UI.g.asCard(p, c); if (a !== c) el.append(h('div', { class: 'vtag' }, 'counts as ' + SGS.shortName(a)));
    hd.append(el);
  }
  if (!p.hand.length) hd.append(h('div', { style: 'color:#8a7d67;padding:20px' }, 'No hand cards.'));
}

// ---------- selection logic ----------
function isSelectableCard(c) {
  const r = UI.req, s = UI.sel, g = UI.g, p = UI.me; if (!r || !s) return false;
  if (s.mode === 'viewas') { const va = s.opt.spec; const zones = va.zones || 'h'; if (!p.cards(zones).includes(c)) return false; if (s.cards.includes(c)) return true; const max = va.max != null ? va.max : 1; if (s.cards.length >= max) return false; return !va.filter || va.filter(g, p, c, s.cards); }
  if (s.mode === 'active') { const A = S[s.active].active; const cs = A.cards || { max: 0 }; const zones = cs.zones || 'h'; if (!p.cards(zones).includes(c)) return false; if (s.cards.includes(c)) return true; if (s.cards.length >= (cs.max || 0)) return false; return !cs.filter || cs.filter(g, p, c, s.cards); }
  if (r.type === 'play') return p.hand.includes(c);
  if (r.type === 'respond') return r.hand.includes(c);
  if (r.type === 'cards') return r.candidates.includes(c);
  return false;
}
function cardClick(c) {
  const r = UI.req, s = UI.sel; if (!r || !isSelectableCard(c)) return; UI.hintCard = null; UI.hintText = null;
  if (s.mode === 'viewas' || s.mode === 'active') { toggle(s.cards, c); s.vcard = null; s.name = null; s.targets = []; buildVirtual(); render(); return; }
  if (r.type === 'play') { if (s.card === c) { UI.sel = newSel(); render(); return; } UI.sel = newSel(); UI.sel.mode = 'card'; UI.sel.card = c; UI.sel.vcard = UI.g.asCard(UI.me, c); autoTargets(); render(); return; }
  if (r.type === 'respond') { if (s.card === c) s.card = null; else { UI.sel = newSel(); UI.sel.card = c; } render(); return; }
  if (r.type === 'cards') { if (s.cards.includes(c)) toggle(s.cards, c); else { if (s.cards.length >= r.max) { if (r.max === 1) s.cards = []; else return; } s.cards.push(c); } render(); return; }
}
function toggle(a, x) { const i = a.indexOf(x); if (i >= 0) a.splice(i, 1); else a.push(x); }
function buildVirtual() {
  const s = UI.sel, g = UI.g, p = UI.me; if (s.mode !== 'viewas') return;
  const names = s.opt.names.filter(n => g.buildViewAs(p, s.opt, s.cards, n) && (UI.req.type !== 'play' || g.canUse(p, g.buildViewAs(p, s.opt, s.cards, n))));
  s.validNames = names;
  if (s.name && !names.includes(s.name)) s.name = null;
  if (!s.name && names.length === 1) s.name = names[0];
  s.vcard = s.name ? g.buildViewAs(p, s.opt, s.cards, s.name) : null;
  if (s.vcard) autoTargets();
}
function autoTargets() { const s = UI.sel; s.targets = []; }
function targetCandidates() {
  const r = UI.req, s = UI.sel, g = UI.g, p = UI.me; if (!r) return null;
  if (r.type === 'players') return r.candidates;
  if (!s) return null;
  if (r.type === 'play') {
    if (s.mode === 'active') { const A = S[s.active].active; const ts = A.targets || { max: 0 }; if (!ts.max) return null; if (s.targets.length >= ts.max) return s.targets.slice(); return g.alive().filter(t => s.targets.includes(t) || !ts.filter || ts.filter(g, p, t, s.targets, s.cards)); }
    const v = s.vcard; if (!v) return null;
    const rules = g.targetRules(p, v); if (!rules || rules.auto) return null;
    if (v.key === 'borrow') { if (s.targets.length === 0) return g.legalTargets(p, v); if (s.targets.length === 1) return g.alive().filter(t => t !== s.targets[0] && g.inRange(s.targets[0], t)).concat(s.targets); return s.targets.slice(); }
    const legal = v.key === 'slash' ? g.alive().filter(t => g.slashTargetOk(p, v, t)) : g.legalTargets(p, v);
    return legal;
  }
  return null;
}
function seatClick(p) {
  const r = UI.req, s = UI.sel; if (!r) return; const cand = targetCandidates(); if (!cand || !cand.includes(p)) return;
  if (r.type === 'players') { if (s.targets.includes(p)) toggle(s.targets, p); else { if (s.targets.length >= r.max) { if (r.max === 1) s.targets = []; else return; } s.targets.push(p); } render(); return; }
  if (s.targets.includes(p)) { toggle(s.targets, p); render(); return; }
  let max = 1;
  if (s.mode === 'active') max = (S[s.active].active.targets || {}).max || 0;
  else if (s.vcard) { const rules = UI.g.targetRules(UI.me, s.vcard); max = s.vcard.key === 'borrow' ? 2 : (rules.max || 1); }
  if (s.targets.length >= max) { if (max === 1) s.targets = []; else return; }
  s.targets.push(p); render();
}
function skillClick(id) {
  const r = UI.req, g = UI.g, p = UI.me; if (!r) return; UI.hintCard = null; UI.hintText = null;
  if (r.type === 'respond' && r.specials.includes(id)) { UI.resolve({ special: id }); return; }
  const opt = currentViewAs().find(o => o.id === id);
  if (opt) {
    if (UI.sel && UI.sel.opt && UI.sel.opt.id === id) { UI.sel = newSel(); render(); return; }
    UI.sel = newSel(); UI.sel.mode = 'viewas'; UI.sel.opt = opt; buildVirtual(); render(); return;
  }
  if (r.type === 'play' && S[id] && S[id].active && g.activeUsable(p, id)) {
    if (UI.sel && UI.sel.active === id) { UI.sel = newSel(); render(); return; }
    UI.sel = newSel(); UI.sel.mode = 'active'; UI.sel.active = id; render(); return;
  }
}

// ---------- prompt bar ----------
function btn(label, fn, cls = '', dis = false) { const b = h('button', { class: cls }, label); b.onclick = fn; if (dis) b.disabled = true; return b; }
function drawPrompt() {
  const pr = $('#prompt'); pr.innerHTML = ''; pr.classList.remove('attn');
  const r = UI.req, s = UI.sel, g = UI.g, p = UI.me;
  if (g.over) { pr.append(h('div', { class: 'msg' }, h('b', {}, 'Game over. '), winnerText(g.winner))); return; }
  if (!r) { pr.append(h('div', { class: 'msg', style: 'color:#b9ab91' }, g.current ? SGS.fixYou(`${g.current.label} is acting…`) : 'Setting up…')); return; }
  pr.classList.add('attn');
  const msg = h('div', { class: 'msg' });
  if (r.type === 'play') {
    if (s.mode === 'active') {
      const A = S[s.active].active; const info = SGS.skillInfo(s.active); const cs = A.cards || { min: 0, max: 0 }, ts = A.targets || { min: 0, max: 0 };
      msg.append(h('b', {}, `${info.en} ${info.zh}: `), `select ${cs.max ? `${cs.min}${cs.max !== cs.min ? '–' + (cs.max > 20 ? 'any' : cs.max) : ''} card(s)` : ''}${cs.max && ts.max ? ' and ' : ''}${ts.max ? `${ts.min}${ts.max !== ts.min ? '–' + ts.max : ''} target(s)` : ''}${!cs.max && !ts.max ? 'press Confirm' : ''}.`);
      const okc = s.cards.length >= (cs.min || 0) && s.cards.length <= (cs.max || 0) && s.targets.length >= (ts.min || 0) && s.targets.length <= (ts.max || 0) && (!A.check || A.check(g, p, s.cards, s.targets));
      pr.append(msg, btn('Confirm', () => UI.resolve({ type: 'skill', skill: s.active, cards: s.cards, targets: s.targets }), 'primary', !okc), btn('Cancel', () => { UI.sel = newSel(); render(); }));
    } else if (s.mode === 'viewas' || s.mode === 'card') {
      const v = s.vcard;
      if (s.mode === 'viewas' && !v) {
        const info = SGS.skillInfo(s.opt.skill) || { en: s.opt.skill, zh: '' }; msg.append(h('b', {}, `${info.en} ${info.zh}: `), 'choose the card(s) to convert.');
        pr.append(msg);
        if (s.validNames && s.validNames.length > 1) for (const n of s.validNames) pr.append(btn('as ' + CAT[n].en + ' ' + CAT[n].zh, () => { s.name = n; s.vcard = g.buildViewAs(p, s.opt, s.cards, n); render(); }));
        pr.append(btn('Cancel', () => { UI.sel = newSel(); render(); }));
      } else {
        const can = g.canUse(p, v); const rules = g.targetRules(p, v);
        let hint = '';
        if (!can) hint = cantUseReason(v);
        else if (rules && rules.auto) hint = 'Press Use.';
        else if (v.key === 'borrow') hint = s.targets.length === 0 ? 'Choose a character who has a weapon.' : 'Now choose the victim they must Strike.';
        else if (v.key === 'chain') hint = 'Choose 1–2 characters to chain/unchain, or Recast to discard it and draw 1.';
        else hint = `Choose ${rules.max > 1 ? 'up to ' + rules.max + ' targets' : 'a target'} (highlighted).`;
        msg.append(h('b', {}, SGS.cardName(v) + ': '), hint); pr.append(msg);
        const chk = can ? g.checkUse(p, v, s.targets) : { ok: false };
        const ok = can && (rules && rules.auto ? true : chk.ok);
        if (v.key === 'chain' && can) pr.append(btn('Recast 重铸', () => UI.resolve({ type: 'card', card: s.mode === 'card' ? s.card : v, targets: [] })));
        pr.append(btn(v.key === 'chain' ? 'Use on targets' : 'Use', () => UI.resolve({ type: 'card', card: s.mode === 'card' ? s.card : v, targets: s.targets }), 'primary', !ok || (v.key === 'chain' && !s.targets.length)), btn('Cancel', () => { UI.sel = newSel(); render(); }));
      }
    } else {
      msg.append(h('b', {}, 'Your play phase. '), MOBILE ? 'Tap a card or skill · hold to read it. ' : 'Click a card to use it, or a skill button. ', UI.hintText ? h('span', { style: 'color:#7fd3ff' }, ' 💡 ' + UI.hintText) : '');
      pr.append(msg, btn('💡 Hint', () => giveHint()), btn('End phase', () => UI.resolve({ type: 'end' }), 'primary'));
    }
    return;
  }
  if (r.type === 'respond') {
    msg.append(h('b', {}, 'Respond: '), r.prompt || 'Respond?');
    const needNames = r.need.names.map(n => CAT[n].en + ' ' + CAT[n].zh).join(' / ');
    pr.append(msg);
    if (s.mode === 'viewas') {
      const v = s.vcard; pr.append(btn(v ? `Use ${SGS.shortName(v)}` : 'Select cards…', () => UI.resolve({ viewAs: s.opt.id, cards: s.cards, name: s.name }), 'primary', !v));
      if (s.validNames && s.validNames.length > 1) for (const n of s.validNames) pr.append(btn('as ' + CAT[n].en, () => { s.name = n; s.vcard = g.buildViewAs(p, s.opt, s.cards, n); render(); }));
    } else pr.append(btn(s.card ? `Use ${SGS.cardName(g.asCard(p, s.card))}` : `Select a ${needNames}`, () => UI.resolve({ card: s.card }), 'primary', !s.card));
    for (const id of r.specials) { const info = SGS.skillInfo(id) || { en: id, zh: '' }; pr.append(btn(`${info.en} ${info.zh}`, () => UI.resolve({ special: id }))); }
    pr.append(btn('Pass (don\'t respond)', () => UI.resolve(null), 'danger'));
    return;
  }
  if (r.type === 'confirm') { msg.append(r.prompt); pr.append(msg, btn('Yes', () => UI.resolve(true), 'primary'), btn('No', () => UI.resolve(false))); return; }
  if (r.type === 'option') { msg.append(r.prompt || 'Choose:'); pr.append(msg); for (const o of r.options) pr.append(btn(o.label, () => UI.resolve(o.id), 'primary')); if (r.optional) pr.append(btn('Cancel', () => UI.resolve(null))); return; }
  if (r.type === 'players') { msg.append(r.prompt || 'Choose characters', h('span', { style: 'color:#b9ab91' }, ` (${r.min}${r.max !== r.min ? '–' + r.max : ''}; ${MOBILE ? 'tap' : 'click'} seats)`)); const ok = s.targets.length >= r.min && s.targets.length <= r.max; pr.append(msg, btn('Confirm', () => UI.resolve(s.targets), 'primary', !ok)); if (r.optional) pr.append(btn('Skip', () => UI.resolve(null))); return; }
  if (r.type === 'cards') { msg.append(r.prompt || 'Choose cards', h('span', { style: 'color:#b9ab91' }, ` (${r.min}${r.max !== r.min ? '–' + (r.max > 20 ? 'any' : r.max) : ''})`)); const ok = s.cards.length >= r.min && s.cards.length <= r.max && s.cards.length > 0 || (r.min === 0 && s.cards.length === 0 && !r.optional); pr.append(msg, btn('Confirm', () => UI.resolve(s.cards), 'primary', !ok)); if (r.optional) pr.append(btn('Skip', () => UI.resolve(null))); return; }
  msg.append(r.prompt || 'Make a choice in the window.'); pr.append(msg, btn('Open', () => openFor(r)));
}
function cantUseReason(v) {
  const g = UI.g, p = UI.me; const k = v.key;
  if (k === 'dodge') return 'Dodge 闪 is only used in response to a Strike.';
  if (k === 'nullify') return 'Nullification 无懈可击 is only used in response to a trick.';
  if (k === 'slash' && p.turn.slashUsed >= g.slashLimit(p)) return 'You already used your one Strike this turn.';
  if (k === 'slash') return 'No one is within your attack range (or Strikes are blocked).';
  if (k === 'peach') return 'You are at full HP.';
  if (k === 'wine') return 'Wine 酒 can only be used once per turn.';
  if (k === 'steal' || k === 'supply') return 'Needs a target at distance 1.';
  if (g.cardUseBlocked(p, v, 'use')) return 'A skill effect prevents you from using this card now.';
  return 'No legal target right now.';
}
function winnerText(w) { return { lord: 'The Lord and Loyalists win! 主公和忠臣胜利', rebel: 'The Rebels win! 反贼胜利', spy: 'The Spy wins! 内奸胜利', draw: 'Draw — the deck ran out.' }[w] || w; }
function giveHint() {
  const g = UI.g, p = UI.me; let a; try { a = SGS.AI.play(g, p); } catch (e) { a = null; }
  if (!a || a.type === 'end') { UI.hintText = 'Nothing clearly useful left — consider ending your play phase (mind your hand limit).'; render(); return; }
  if (a.type === 'skill') { const info = SGS.skillInfo(a.skill); UI.hintText = `Try your skill ${info.en} ${info.zh}${a.targets.length ? ' on ' + a.targets.map(t => t.label).join(', ') : ''}.`; }
  else { const c = a.card; UI.hintCard = c.virtual ? c.subcards[0] : c; const via = c.virtual && c.viaSkill ? ' (via ' + UI.g.skillLabel(c.viaSkill) + ')' : '';
    if (c.key === 'borrow' && a.targets.length === 2) UI.hintText = `Use ${SGS.cardName(c)}${via}: make ${a.targets[0].label} (who has a weapon) Strike ${a.targets[1].label} — or else hand the weapon to you. Click ${a.targets[0].label} first, then ${a.targets[1].label}.`;
    else UI.hintText = `Use ${SGS.cardName(c)}${a.targets.length ? ' on ' + a.targets.map(t => t.label).join(', ') : ''}${via}.`; }
  render();
}

// ---------- modals ----------
function closeModal() { const m = $('#modal'); if (m) m.remove(); }
function modal(title, body, actions = [], opts = {}) { closeModal(); const box = h('div', { class: 'box', style: opts.width ? `width:${opts.width}` : '' }, h('h2', {}, title), body, actions.length ? h('div', { class: 'actions' }, actions) : null); const m = h('div', { class: 'modal', id: 'modal' }, box); if (opts.dismiss) m.onclick = e => { if (e.target === m) closeModal(); }; document.body.append(m); return box; }
function openFor(r) {
  if (!r) return;
  if (r.type === 'general') return pickGeneralModal(r);
  if (r.type === 'pickFrom') return pickFromModal(r);
  if (r.type === 'pickList') return pickListModal(r);
  if (r.type === 'guanxing') return guanxingModal(r);
  if (r.type === 'swap') return swapModal(r);
}
function pickGeneralModal(r) {
  const row = h('div', { class: 'row' });
  const mk = gen => { const el = h('div', { class: 'genpick', onclick: () => UI.resolve(gen.id) }, h('img', { src: IMG + gen.img }), h('div', { class: 't' }, h('div', { style: 'font-weight:700;font-size:13px' }, `${gen.en} `, h('span', { class: 'zh' }, gen.zh), ` · ${KNAME[gen.kingdom]} · ${gen.maxhp} HP`), ...gen.skills.map(s => h('div', { style: 'margin-top:4px' }, h('b', {}, `${s.en} ${s.zh}`), h('span', { html: skillTypeTag(s) }), h('div', {}, s.ten))))); return el; };
  r.choices.forEach(gen => row.append(mk(gen)));
  const lordInfo = r.lordGeneral && UI.me.role !== 'lord' ? h('p', {}, `The Lord is ${r.lordGeneral.en} ${r.lordGeneral.zh}. Your role: `, h('b', {}, SGS.ROLE_NAME[UI.me.role])) : h('p', {}, 'Your role: ', h('b', {}, SGS.ROLE_NAME[UI.me.role]), UI.me.role === 'lord' ? ' — lord-generals have a special Lord skill 主公技.' : '');
  const acts = [];
  if (UI.g.opts.freePick) acts.push(btn('Browse all 89 generals…', () => browseAll(r)));
  modal(r.prompt, h('div', {}, lordInfo, row), acts);
}
function browseAll(r) {
  const taken = new Set(UI.g.players.filter(p => p.general).map(p => p.general.id));
  const grid = h('div', { class: 'ref' });
  const fb = genFilterBar(() => fill());
  const fill = () => { grid.innerHTML = ''; const list = fb.apply(D.generals.filter(g => !taken.has(g.id))); for (const gen of list) grid.append(genCard(gen, () => UI.resolve(gen.id))); if (!list.length) grid.append(h('p', { style: 'color:#b9ab91' }, 'No generals match these filters.')); };
  fill();
  modal('Choose any general — click one', h('div', {}, fb.bar, grid), [btn('Back', () => pickGeneralModal(r))], { width: '1000px' });
}
function pickFromModal(r) {
  const t = r.target; const body = h('div', {});
  if (r.avail.h.length) body.append(h('h3', {}, `Hand (${r.avail.h.length}) — hidden, picked at random`), h('div', { class: 'row' }, ...r.avail.h.map(() => { const e = cardEl({ key: 'dodge' }, { back: true, size: 'small' }); e.style.cursor = 'pointer'; e.onclick = () => UI.resolve('hand'); return e; })));
  if (r.avail.e.length) body.append(h('h3', {}, 'Equipment'), h('div', { class: 'row' }, ...r.avail.e.map(c => { const e = cardEl(c, { size: 'small' }); e.style.cursor = 'pointer'; e.onclick = () => UI.resolve(c); return e; })));
  if (r.avail.j.length) body.append(h('h3', {}, 'Judgement area'), h('div', { class: 'row' }, ...r.avail.j.map(c => { const e = cardEl(c, { size: 'small' }); e.style.cursor = 'pointer'; e.onclick = () => UI.resolve(c); return e; })));
  modal(r.prompt || `Choose a card from ${t.label}`, body);
}
function pickListModal(r) {
  const sel = []; const selectable = r.selectable || r.cards; const body = h('div', {}); const row = h('div', { class: 'row' }); const info = h('p', {});
  const ok = btn('Confirm', () => UI.resolve(sel.slice()), 'primary');
  const upd = () => { const sum = sel.reduce((a, c) => a + c.rank, 0); ok.disabled = sel.length < r.min || sel.length > r.max || (r.sumMax && sum > r.sumMax); info.textContent = `Selected ${sel.length}${r.max > 1 ? ' (max ' + r.max + ')' : ''}${r.sumMax ? ` · total number ${sum} / ${r.sumMax}` : ''}`; };
  for (const c of r.cards) { const e = cardEl(c); if (selectable.includes(c)) { e.classList.add('selectable'); e.onclick = () => { if (sel.includes(c)) toggle(sel, c); else { if (sel.length >= r.max) { if (r.max === 1) sel.length = 0; else return; } sel.push(c); } e.classList.toggle('selected', sel.includes(c)); row.querySelectorAll('.card').forEach((el, i) => el.classList.toggle('selected', sel.includes(r.cards[i]))); upd(); }; } else e.classList.add('disabled'); row.append(e); }
  body.append(row, info); upd();
  modal(r.prompt || 'Choose cards', body, [ok].concat(r.min === 0 ? [btn('None', () => UI.resolve([]))] : []));
}
function guanxingModal(r) {
  const top = r.cards.slice(), bottom = [];
  const body = h('div', {}); const tRow = h('div', { class: 'gx' }), bRow = h('div', { class: 'gx' });
  const redraw = () => { tRow.innerHTML = ''; bRow.innerHTML = ''; top.forEach((c, i) => { const e = cardEl(c, { size: 'small' }); e.style.cursor = 'pointer'; e.title = 'click: move to bottom; shift-click: move left'; e.onclick = ev => { if (ev.shiftKey && i > 0) { [top[i - 1], top[i]] = [top[i], top[i - 1]]; } else { top.splice(i, 1); bottom.push(c); } redraw(); }; tRow.append(e); }); bottom.forEach((c, i) => { const e = cardEl(c, { size: 'small' }); e.style.cursor = 'pointer'; e.onclick = () => { bottom.splice(i, 1); top.push(c); redraw(); }; bRow.append(e); }); };
  body.append(h('p', {}, 'Click a card to move it between Top and Bottom. Shift-click a Top card to move it earlier. The leftmost Top card is drawn first.'), h('h3', {}, 'Top of deck 牌堆顶 (left = next draw)'), tRow, h('h3', {}, 'Bottom of deck 牌堆底'), bRow);
  redraw(); modal(r.prompt, body, [btn('Done', () => UI.resolve({ top, bottom }), 'primary')]);
}
function swapModal(r) {
  const A = [], B = []; const body = h('div', {}); const aRow = h('div', { class: 'row' }), bRow = h('div', { class: 'row' }); const ok = btn('Swap', () => UI.resolve({ a: A.slice(), b: B.slice() }), 'primary');
  const mk = (list, sel, row) => { row.innerHTML = ''; list.forEach(c => { const e = cardEl(c, { size: 'small' }); e.classList.add('selectable'); if (sel.includes(c)) e.classList.add('selected'); e.onclick = () => { toggle(sel, c); mk(list, sel, row); ok.disabled = A.length !== B.length || !A.length; }; row.append(e); }); };
  mk(r.a, A, aRow); mk(r.b, B, bRow); ok.disabled = true;
  body.append(h('p', {}, 'Select the same number of cards from each row to swap them.'), h('h3', {}, r.aLabel), aRow, h('h3', {}, r.bLabel), bRow);
  modal(r.prompt, body, [ok, btn('No swap', () => UI.resolve(null))]);
}

// ---------- log ----------
function logEntry(e) {
  const box = $('#log'); if (!box) return;
  const d = h('div', { class: e.kind }, e.en); box.append(d);
  if (box.children.length > 1500) box.firstChild.remove();
  if (box.scrollHeight - box.scrollTop - box.clientHeight < 200) box.scrollTop = box.scrollHeight;
}

// ---------- help / reference ----------
function rulesHtml() {
  return `<div class="help">
<h3>1. Goal 游戏目标 — depends on your secret role</h3>
<ul><li><b>Lord 主公</b>: eliminate all Rebels and the Spy.</li><li><b>Loyalist 忠臣</b>: protect the Lord; you win when the Lord wins.</li><li><b>Rebel 反贼</b>: kill the Lord.</li><li><b>Spy 内奸</b>: be the last one alive — the Lord must die last, after everyone else.</li></ul>
<p>The game ends immediately when: the <b>Lord dies</b> (Spy wins only if the Spy is the sole survivor; otherwise Rebels win), or <b>all Rebels and the Spy are dead</b> (Lord + Loyalists win).</p>
<h3>2. Roles by player count 决定身份</h3>
<table><tr><th>Players</th><th>Lord</th><th>Loyalist</th><th>Rebel</th><th>Spy</th></tr><tr><td>4</td><td>1</td><td>1</td><td>1</td><td>1</td></tr><tr><td>5</td><td>1</td><td>1</td><td>2</td><td>1</td></tr><tr><td>6</td><td>1</td><td>1</td><td>3</td><td>1</td></tr><tr><td>7</td><td>1</td><td>2</td><td>3</td><td>1</td></tr><tr><td>8</td><td>1</td><td>2</td><td>4</td><td>1</td></tr></table>
<p>The Lord reveals their role at once; everyone else keeps theirs secret until they die.</p>
<h3>3. Generals 挑选武将 & HP 体力</h3>
<p>The Lord picks from 3 lord-generals + 2 random; others pick 1 of 3. Each general shows a kingdom (Wei 魏, Shu 蜀, Wu 吴, Qun 群, God 神), max HP (magatama ☯ pips) and skills. The Lord gets +1 max HP (not in 4-player games). Your HP can never exceed your max.</p>
<h3>4. Types of generals 武将分类</h3>
<p><b>Kingdom 势力</b> — shown by the colour of the tag on each portrait. Lord skills and some other skills only help characters of the same kingdom.</p>
<table class="stack"><tr><th>Kingdom</th><th>Colour</th><th>Generals</th><th>Notes</th></tr>
<tr><td>Wei 魏</td><td>Blue</td><td>23</td><td>Cao Cao's faction</td></tr>
<tr><td>Wu 吴</td><td>Green</td><td>23</td><td>Sun Quan's faction</td></tr>
<tr><td>Shu 蜀</td><td>Red</td><td>21</td><td>Liu Bei's faction</td></tr>
<tr><td>Qun 群</td><td>Grey</td><td>14</td><td>Independents and warlords (Lü Bu, Diaochan, Hua Tuo…)</td></tr>
<tr><td>God 神</td><td>Gold (shimmers)</td><td>8</td><td>Deified heroes with very strong skills. At the start of the game a God general picks Wei, Shu, Wu or Qun as their kingdom.</td></tr></table>
<p><b>Lord generals 主公武将</b> — the 6 generals with a <b>Lord skill 主公技</b>: Liu Bei 刘备 (Rouse 激将), Cao Cao 曹操 (Escort 护驾), Sun Quan 孙权 (Rescue 救援), Liu Chen 刘谌 (勤王), Cao Rui 曹叡 (兴衰) and Sun Xiu 孙休 (诏缚). A Lord skill only works when that general is played <i>as the Lord</i>, and usually draws on help from characters of the same kingdom — so a Lord surrounded by kinsmen is stronger. The Lord's choice of generals always includes 3 of these. Any other player may still pick a lord general; they just don't get the Lord skill.</p>
<p><b>HP 体力</b> — most generals have 3 or 4. The outliers: God Zhao Yun 2; God Guan Yu and God Lü Bu 5; Hua Xiong 6. More HP means a bigger hand limit and more time to survive; low-HP generals usually compensate with stronger skills.</p>
<table><tr><th>Max HP</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th></tr><tr><td>Generals</td><td>1</td><td>42</td><td>43</td><td>2</td><td>1</td></tr></table>
<p><b>Gender 性别</b> — 76 male, 13 female. It matters for Twin Swords 雌雄双股剑 (triggers on the opposite gender) and skills such as Marriage 结姻 (heal a wounded male), Sow Discord 离间 (two males Duel) and Sun Luban's 骄矜 (reduce damage from males).</p>
<p><b>Skill types 技能类型</b> — each skill's text begins with its type:</p>
<table class="stack"><tr><th>Type</th><th>Meaning</th><th>Examples</th></tr>
<tr><td>Normal</td><td>Optional; use it when its condition is met ("you may…"). Some are once per turn.</td><td>Most skills</td></tr>
<tr><td>Locked 锁定技</td><td>Always on — you can't choose not to use it.</td><td>Lü Bu's Unrivalled 无双, Horsemanship 马术</td></tr>
<tr><td>Limited 限定技</td><td>Only <b>once per game</b>; a marker shows when it's spent.</td><td>God Zhou Yu 业炎, Li Ru 焚城, Liao Hua 伏枥 (7 generals)</td></tr>
<tr><td>Awakening 觉醒技</td><td>Triggers automatically once a condition is reached; the general then permanently changes (usually −1 max HP, gains a new skill).</td><td>God Sima Yi 拜印, Zhong Hui 自立</td></tr>
<tr><td>Lord 主公技</td><td>Only active while the general is the Lord.</td><td>Liu Bei 激将, Cao Cao 护驾</td></tr></table>
<h3>5. A turn 回合 — six phases, starting with the Lord, then counter-clockwise</h3>
<ol><li><b>Start</b> — some skills trigger.</li><li><b>Judgement 判定</b> — resolve delayed tricks in front of you (last placed first). A judgement flips the top card of the deck.</li><li><b>Draw 摸牌</b> — draw 2 cards.</li><li><b>Play 出牌</b> — use any number of cards, but only <b>one Strike 杀 per turn</b>, and no two delayed tricks of the same name in one judgement area.</li><li><b>Discard 弃牌</b> — your hand limit = your current HP; discard down to it.</li><li><b>End</b> — some skills trigger.</li></ol>
<h3>6. Distance 距离 & attack range 攻击范围</h3>
<p>Distance = the fewest seats between two players going either way round (dead players don't count). −1 horses reduce your distance to others; +1 horses increase others' distance to you. You can only Strike someone whose distance ≤ your attack range (1 without a weapon; otherwise the weapon's number). <b>Steal</b> and <b>Supply Shortage</b> always need distance 1, regardless of weapons. The app shows each opponent's distance and whether they are in your range.</p>
<h3>7. Dying 濒死 & death</h3>
<p>At 0 HP you are dying. Starting with the current player and going round, anyone may play a <b>Peach 桃</b> to restore you 1 HP; you may also use <b>Wine 酒</b> on yourself. If you're still at ≤0, you die and reveal your role. Whoever kills a Rebel draws 3 cards. If the Lord kills a Loyalist, the Lord discards all their cards.</p>
<h3>8. Card types 牌的类别 — the 108-card deck</h3>
<table class="stack"><tr><th>Type</th><th>Count</th><th>Cards</th><th>How it's used</th></tr>
<tr><td><b>Basic 基本牌</b></td><td>57</td><td>Strike 杀 20, Thunder Strike 雷杀 7, Fire Strike 火杀 4, Dodge 闪 15, Peach 桃 8, Wine 酒 3</td><td>Strike: once per turn, target in attack range. Dodge: only as a response. Peach: heal yourself in play, or anyone who is dying. Wine: once per turn, next Strike +1 damage — or heal yourself when dying.</td></tr>
<tr><td><b>Trick 锦囊</b></td><td>28</td><td>Dismantle 过河拆桥 4, Nullification 无懈可击 4, Steal 顺手牵羊 3, Something from Nothing 无中生有 3, Iron Chain 铁索连环 3, Duel 决斗 2, Borrowed Sword 借刀杀人 2, Barbarian Invasion 南蛮入侵 2, Fire Assault 火攻 2, Arrow Barrage 万箭齐发 1, Peach Garden Oath 桃园结义 1, Bountiful Harvest 五谷丰登 1</td><td>Resolve immediately, then go to the discard pile. Any player can cancel one with Nullification.</td></tr>
<tr><td><b>Delayed trick 延时锦囊</b></td><td>6</td><td>Contentment 乐不思蜀 2, Supply Shortage 兵粮寸断 2, Lightning 闪电 2</td><td>Placed in a judgement area; resolved by a judgement at the start of that player's next turn.</td></tr>
<tr><td><b>Equipment 装备牌</b></td><td>17</td><td>9 weapons, 3 armours, 2 −1 horses, 3 +1 horses</td><td>Stays in front of you until replaced, stolen or dismantled.</td></tr></table>
<p><b>When can you use a card?</b> Most cards are played on your own turn in the play phase. <b>Response cards</b> are used on anyone's turn: Dodge (vs Strike / Arrow Barrage), Strike (vs Duel / Barbarian Invasion), Nullification (vs any trick), Peach (for a dying character). <b>Targets</b> differ: single target (Strike, Duel, Steal, Dismantle, Fire Assault…), everyone else (Barbarian Invasion, Arrow Barrage), everyone including you (Peach Garden Oath, Bountiful Harvest), yourself (Something from Nothing, Wine, equipment). <b>Distance limits</b>: Strike needs attack range; Steal and Supply Shortage need distance 1; other tricks have no range limit.</p>
<h3>9. Equipment slots 装备区</h3>
<p>One card per slot; a new card replaces the old one.</p>
<table class="stack"><tr><th>Slot</th><th>Cards</th><th>Effect</th></tr>
<tr><td>Weapon 武器</td><td>Range 1: Zhuge Crossbow 诸葛连弩 · Range 2: Twin Swords 雌雄双股剑, Ancient Blade 古锭刀, Ice Sword 寒冰剑 · Range 3: Green Dragon Blade 青龙偃月刀, Serpent Spear 丈八蛇矛, Stone Axe 贯石斧 · Range 4: Vermilion Fan 朱雀羽扇 · Range 5: Kirin Bow 麒麟弓</td><td>Sets your attack range (no weapon = 1) and adds an effect.</td></tr>
<tr><td>Armour 防具</td><td>Eight Trigrams 八卦阵, Rattan Armour 藤甲, Silver Lion 白银狮子</td><td>Defensive effects.</td></tr>
<tr><td>−1 horse 进攻马</td><td>Red Hare 赤兔, Dawan 大宛</td><td>Your distance to others −1.</td></tr>
<tr><td>+1 horse 防御马</td><td>Dilu 的卢, Zhuahuang Feidian 爪黄飞电, Hualiu 骅骝</td><td>Others' distance to you +1.</td></tr></table>
<h3>10. Suit 花色, colour 颜色 & number 点数</h3>
<p>Every card has a suit and a number (A–K). The deck has exactly 27 of each suit: ♠ spade and ♣ club are <b>black</b>; ♥ heart and ♦ diamond are <b>red</b>. These are ignored for normal play but matter a lot for:</p>
<table><tr><th>What</th><th>You escape / it succeeds if the judgement is…</th></tr>
<tr><td>Contentment 乐不思蜀 (skip your play phase)</td><td>♥ <b>heart</b> — escape</td></tr>
<tr><td>Supply Shortage 兵粮寸断 (skip your draw phase)</td><td>♣ <b>club</b> — escape</td></tr>
<tr><td>Lightning 闪电 (3 thunder damage)</td><td>strikes only on <b>♠2–9</b> (≈15% chance); otherwise it moves to the next player</td></tr>
<tr><td>Eight Trigrams 八卦阵 (free Dodge)</td><td><b>red</b> — counts as a Dodge</td></tr></table>
<ul><li><b>Colour</b> also drives many skills — e.g. Guan Yu uses red cards as Strikes, Gan Ning uses black cards as Dismantle, Da Qiao uses ♦ as Contentment, Zhen Ji uses black cards as Dodge.</li>
<li><b>Number</b> matters in a <b>point fight 拼点</b> (both players reveal a hand card; higher number wins) — used by skills such as Gao Shun 陷阵 and Jian Yong 巧说.</li>
<li>Tip: the judgement card is the top of the deck, so skills that change or predict it (Zhuge Liang 观星, Sima Yi 鬼才) are powerful.</li></ul>
<h3>11. Elemental damage 属性伤害 & Iron Chain 铁索连环</h3>
<p>Damage is <b>normal</b>, <b>fire 火</b> (Fire Strike, Fire Assault, Vermilion Fan) or <b>thunder 雷</b> (Thunder Strike, Lightning). Chained characters are turned sideways. When a chained character takes fire or thunder damage, their chain resets and every other chained character takes the same elemental damage too. Rattan Armour 藤甲 blocks normal Strikes, Barbarian Invasion and Arrow Barrage but takes <b>+1 fire damage</b>.</p>
<h3>12. Using this app</h3>
<ul><li>Hover over any card, general, equipment or skill to read its English + Chinese text.</li><li>In your play phase click a card, then click a highlighted target, then <b>Use</b>. Skill buttons sit above your hand.</li><li>When you must respond (e.g. to a Strike) the prompt bar tells you what's needed; click a matching card then confirm, or <b>Pass</b>.</li><li>💡 <b>Hint</b> suggests a move. Green log lines explain rules as they happen.</li></ul></div>`;
}
function showRules(back) { modal('How to play 三国杀 — rules in English', h('div', { html: rulesHtml() }), [btn(back ? 'Back' : 'Close', () => back ? back() : closeModal(), 'primary')], { dismiss: !back, width: '860px' }); }
// ---------- card reference with filters ----------
const MANEUVER = new Set(['wine', 'chain', 'fireattack', 'supply', 'gudingblade', 'rattan', 'silverlion', 'hualiu']);
const CARD_USE = { response: ['dodge', 'nullify'], aoe: ['barbarian', 'arrows', 'peachgarden', 'harvest'], single: ['slash', 'duel', 'dismantle', 'steal', 'fireattack', 'borrow', 'indulgence', 'supply', 'chain'], self: ['exnihilo', 'lightning', 'wine', 'peach'], dist1: ['steal', 'supply'] };
function cardGroup(c) { const t = CAT[c.key]; if (t.type === 'equip') return t.sub === 'weapon' ? 'weapon' : t.sub === 'armor' ? 'armor' : 'horse'; return t.type === 'delayed' ? 'delayed' : t.type; }
const GROUP_NAME = { basic: 'Basic 基本牌', trick: 'Trick 锦囊', delayed: 'Delayed trick 延时锦囊', weapon: 'Weapon ⚔ 武器', armor: 'Armour 🛡 防具', horse: 'Horse 🐎 坐骑' };
const GROUP_ORDER = ['basic', 'trick', 'delayed', 'weapon', 'armor', 'horse'];
const SUITS = ['spade', 'heart', 'club', 'diamond'];
function suitTag(c) { return h('span', { class: 'stag ' + (c.suit === 'heart' || c.suit === 'diamond' ? 'r' : 'b') }, SGS.SUIT_SYM[c.suit] + SGS.RANK_STR(c.rank)); }
function showCardRef() {
  const DEF = { q: '', groups: [], suits: [], set: '', elem: '', use: '', sort: 'type', view: 'types' };
  let st = Object.assign({}, DEF);
  try { const sv = JSON.parse(localStorage.getItem('sgs_cardfilter') || 'null'); if (sv) st = Object.assign(st, sv); } catch (e) { /* ignore */ }
  const save = () => { try { localStorage.setItem('sgs_cardfilter', JSON.stringify(st)); } catch (e) { /* ignore */ } };
  const bar = h('div', { class: 'gfilter' }), grid = h('div', { class: 'ref' }), count = h('span', { class: 'gcount' });
  const q = h('input', { type: 'search', placeholder: '🔍 Search card name or effect (English or 中文)…', value: st.q }); q.oninput = () => { st.q = q.value; save(); fill(); };
  const chips = h('div', { class: 'gchips' });
  const chip = (label, on, click, cls = '') => { const b = h('button', { class: 'gchip ' + cls + (on ? ' on' : '') }, label); b.onclick = () => { click(); save(); drawChips(); fill(); }; return b; };
  const tog = (arr, v) => arr.includes(v) ? arr.filter(x => x !== v) : arr.concat(v);
  function drawChips() {
    chips.innerHTML = '';
    for (const g of GROUP_ORDER) chips.append(chip(GROUP_NAME[g], st.groups.includes(g), () => { st.groups = tog(st.groups, g); }));
    for (const su of SUITS) chips.append(chip(SGS.SUIT_SYM[su], st.suits.includes(su), () => { st.suits = tog(st.suits, su); }, 'suit ' + (su === 'heart' || su === 'diamond' ? 'r' : 'b')));
  }
  const sel = (key, options) => { const x = h('select', {}, ...options.map(([v, t]) => h('option', { value: v, ...(st[key] === v ? { selected: 'selected' } : {}) }, t))); x.onchange = () => { st[key] = x.value; save(); fill(); }; return x; };
  const selects = h('div', { class: 'gselects' },
    sel('view', [['types', 'View: one per card type (38)'], ['all', 'View: every card (108)']]),
    sel('set', [['', 'Any set'], ['std', 'Standard 标准版'], ['man', 'Maneuvering 军争']]),
    sel('elem', [['', 'Any element'], ['fire', 'Fire 火'], ['thunder', 'Thunder 雷']]),
    sel('use', [['', 'Any use'], ['single', 'Targets one player'], ['aoe', 'Affects everyone'], ['self', 'Used on yourself'], ['response', 'Response only'], ['dist1', 'Needs distance 1']]),
    sel('sort', [['type', 'Sort: by type'], ['name', 'Sort: name A–Z'], ['count', 'Sort: most copies'], ['range', 'Sort: weapon range'], ['suit', 'Sort: suit & number']]));
  const reset = h('button', { class: 'small' }, 'Reset'); reset.onclick = () => { st = Object.assign({}, DEF); save(); q.value = ''; selects.querySelectorAll('select').forEach(x => x.selectedIndex = 0); drawChips(); fill(); };
  drawChips(); bar.append(q, chips, h('div', { class: 'grow' }, selects, reset, count));
  const match = c => {
    const g = cardGroup(c);
    if (st.groups.length && !st.groups.includes(g)) return false;
    if (st.set === 'man' && !(MANEUVER.has(c.key) || c.nature)) return false;
    if (st.set === 'std' && (MANEUVER.has(c.key) || c.nature)) return false;
    if (st.elem && !(c.nature === st.elem || (st.elem === 'fire' && ['fireattack', 'fan', 'rattan'].includes(c.key)) || (st.elem === 'thunder' && c.key === 'lightning'))) return false;
    if (st.use) { const set = st.use === 'self' ? CARD_USE.self.concat(Object.keys(CAT).filter(k => CAT[k].type === 'equip')) : CARD_USE[st.use]; if (!set.includes(c.key)) return false; }
    if (st.q.trim()) { const t = D.cardtext[cardZh(c)] || {}; const hay = [SGS.shortName(c), cardZh(c), CAT[c.key].en, CAT[c.key].zh, t.en, t.zh, t.trad].join(' ').toLowerCase(); if (!hay.includes(st.q.trim().toLowerCase())) return false; }
    return true;
  };
  function fill() {
    grid.innerHTML = '';
    const copies = D.cards.filter(c => match(c) && (!st.suits.length || st.suits.includes(c.suit)));
    const byType = new Map(); for (const c of copies) { const k = cardZh(c); if (!byType.has(k)) byType.set(k, []); byType.get(k).push(c); }
    const total = new Map(); for (const c of D.cards) total.set(cardZh(c), (total.get(cardZh(c)) || 0) + 1);
    const ordType = c => GROUP_ORDER.indexOf(cardGroup(c)) * 100 + Object.keys(CAT).indexOf(c.key) + (c.nature === 'fire' ? .3 : c.nature === 'thunder' ? .6 : 0);
    const suitOrd = c => SUITS.indexOf(c.suit) * 20 + c.rank;
    const sorter = { type: (a, b) => ordType(a) - ordType(b), name: (a, b) => SGS.shortName(a).localeCompare(SGS.shortName(b)), count: (a, b) => (total.get(cardZh(b)) - total.get(cardZh(a))) || ordType(a) - ordType(b), range: (a, b) => ((CAT[b.key].range || 0) - (CAT[a.key].range || 0)) || ordType(a) - ordType(b), suit: (a, b) => suitOrd(a) - suitOrd(b) }[st.sort];
    if (st.view === 'all') {
      const list = copies.slice().sort((a, b) => sorter(a, b) || suitOrd(a) - suitOrd(b));
      const wrap = h('div', { class: 'cardgrid' });
      for (const c of list) { const e = cardEl(c, { size: 'small' }); e.style.cursor = 'zoom-in'; e.onclick = () => { const z = h('div', { id: 'zoom', onclick: () => z.remove() }, h('img', { src: IMG + c.img })); document.body.append(z); }; wrap.append(h('div', { class: 'cg' }, e, suitTag(c))); }
      grid.append(wrap); count.textContent = `Showing ${list.length} of 108 cards`;
    } else {
      const reps = [...byType.values()].map(v => v[0]).sort(sorter);
      for (const c of reps) {
        const zh = cardZh(c), t = D.cardtext[zh] || {}, cp = byType.get(zh).slice().sort((a, b) => suitOrd(a) - suitOrd(b)), cat = CAT[c.key];
        const meta = `${GROUP_NAME[cardGroup(c)]}${cat.range ? ' · range ' + cat.range : ''} · ${MANEUVER.has(c.key) || c.nature ? 'Maneuvering 军争' : 'Standard'} · ${total.get(zh)} in deck`;
        grid.append(h('div', { class: 'it' }, h('img', { src: IMG + c.img, style: 'width:80px;border-radius:6px' }),
          h('div', {}, h('b', {}, `${SGS.shortName(c)} `, h('span', { class: 'zh' }, zh)), h('p', { style: 'color:#b9ab91' }, meta),
            h('div', { class: 'stags' }, ...cp.map(suitTag)), h('p', {}, t.en || ''), h('p', { class: 'zh', style: 'color:#8a7d67' }, t.zh || ''))));
      }
      count.textContent = `Showing ${reps.length} of 38 card types · ${copies.length} cards`;
    }
    if (!grid.children.length || (st.view === 'all' && !copies.length)) grid.append(h('p', { style: 'color:#b9ab91' }, 'No cards match these filters.'));
  }
  fill();
  modal('Cards 卡牌 (108)', h('div', {}, bar, grid), [btn('Close', closeModal, 'primary')], { dismiss: true, width: '1000px' });
}
// ---------- general filters (shared by the Generals browser and the free-pick picker) ----------
const EASY = new Set(['g015', 'g010', 'g014', 'g016', 'g011', 'g013', 'g023', 'g035', 'g033']);
function genFilterBar(onChange, opts = {}) {
  let st = { q: '', kd: [], gender: '', hp: '', lord: false, easy: false, stype: '', sort: 'card' };
  try { const saved = JSON.parse(localStorage.getItem('sgs_genfilter') || 'null'); if (saved && !opts.fresh) st = Object.assign(st, saved); } catch (e) { /* ignore */ }
  const save = () => { try { localStorage.setItem('sgs_genfilter', JSON.stringify(st)); } catch (e) { /* ignore */ } };
  const bar = h('div', { class: 'gfilter' });
  const q = h('input', { type: 'search', placeholder: '🔍 Search name, skill or text (English or 中文)…', value: st.q });
  q.oninput = () => { st.q = q.value; save(); onChange(); };
  const chips = h('div', { class: 'gchips' });
  const chip = (label, on, click, cls = '') => { const b = h('button', { class: 'gchip ' + cls + (on ? ' on' : '') }, label); b.onclick = () => { click(); save(); draw(); onChange(); }; return b; };
  const sel = (label, key, options) => { const s = h('select', { title: label }, ...options.map(([v, t]) => h('option', { value: v, ...(st[key] === v ? { selected: 'selected' } : {}) }, t))); s.onchange = () => { st[key] = s.value; save(); onChange(); }; return s; };
  const selects = h('div', { class: 'gselects' },
    sel('Gender', 'gender', [['', 'Any gender'], ['male', 'Male ♂'], ['female', 'Female ♀']]),
    sel('HP', 'hp', [['', 'Any HP'], ['2', '2 HP'], ['3', '3 HP'], ['4', '4 HP'], ['5', '5+ HP']]),
    sel('Skill type', 'stype', [['', 'Any skill type'], ['locked', 'Has Locked 锁定技'], ['limited', 'Has Limited 限定技'], ['awaken', 'Has Awakening 觉醒技'], ['active', 'Has an active skill'], ['viewas', 'Converts cards (view-as)']]),
    sel('Sort', 'sort', [['card', 'Sort: card order'], ['name', 'Sort: name A–Z'], ['hpd', 'Sort: HP high → low'], ['hpa', 'Sort: HP low → high'], ['kd', 'Sort: kingdom'], ['skills', 'Sort: most skills']]));
  const reset = h('button', { class: 'small' }, 'Reset'); reset.onclick = () => { st = { q: '', kd: [], gender: '', hp: '', lord: false, easy: false, stype: '', sort: 'card' }; save(); q.value = ''; selects.querySelectorAll('select').forEach(x => x.selectedIndex = 0); draw(); onChange(); };
  const count = h('span', { class: 'gcount' });
  function draw() {
    chips.innerHTML = '';
    for (const k of ['wei', 'shu', 'wu', 'qun', 'god']) chips.append(chip(KNAME[k], st.kd.includes(k), () => { st.kd = st.kd.includes(k) ? st.kd.filter(x => x !== k) : st.kd.concat(k); }, 'kd-' + k));
    chips.append(chip('👑 Lord generals', st.lord, () => { st.lord = !st.lord; }));
    chips.append(chip('🌱 Beginner-friendly', st.easy, () => { st.easy = !st.easy; }));
  }
  draw(); bar.append(q, chips, h('div', { class: 'grow' }, selects, reset, count));
  const hasType = (g, t) => g.skills.some(s => (s.type || []).includes(t));
  const KORD = { wei: 0, shu: 1, wu: 2, qun: 3, god: 4 };
  function apply(list) {
    const needle = st.q.trim().toLowerCase();
    let r = list.filter(g => {
      if (st.kd.length && !st.kd.includes(g.kingdom)) return false;
      if (st.gender && g.gender !== st.gender) return false;
      if (st.hp && (st.hp === '5' ? g.maxhp < 5 : g.maxhp !== +st.hp)) return false;
      if (st.lord && !hasType(g, 'lord')) return false;
      if (st.easy && !EASY.has(g.id)) return false;
      if (st.stype && !hasType(g, st.stype)) return false;
      if (needle) { const hay = [g.en, g.zh, ...g.skills.flatMap(s => [s.en, s.zh, s.ten, s.tzh])].join(' ').toLowerCase(); if (!hay.includes(needle)) return false; }
      return true;
    });
    const by = { name: (a, b) => a.en.replace(/^God /, '').localeCompare(b.en.replace(/^God /, '')), hpd: (a, b) => b.maxhp - a.maxhp, hpa: (a, b) => a.maxhp - b.maxhp, kd: (a, b) => KORD[a.kingdom] - KORD[b.kingdom], skills: (a, b) => b.skills.length - a.skills.length }[st.sort];
    if (by) r = r.slice().sort((a, b) => by(a, b) || a.id.localeCompare(b.id));
    count.textContent = `Showing ${r.length} of ${list.length}`;
    return r;
  }
  return { bar, apply };
}
function genCard(gen, onclick) {
  const tags = [];
  if (gen.skills.some(s => (s.type || []).includes('lord'))) tags.push('👑 Lord');
  if (EASY.has(gen.id)) tags.push('🌱 Easy');
  return h('div', { class: 'it', style: onclick ? 'cursor:pointer' : '', onclick: onclick || null },
    h('img', { src: IMG + gen.img, style: 'width:80px;border-radius:6px' }),
    h('div', {}, h('b', {}, `${gen.en} `, h('span', { class: 'zh' }, gen.zh)),
      h('p', {}, h('span', { class: 'kd ' + gen.kingdom, style: 'color:#fff;padding:0 5px;border-radius:4px;font-size:11px' }, KNAME[gen.kingdom]), ` · ${gen.maxhp} HP · ${gen.gender === 'female' ? '♀' : '♂'}${tags.length ? ' · ' + tags.join(' · ') : ''}`),
      ...gen.skills.map(s => h('p', {}, h('b', { style: 'color:#9fc3ff' }, `${s.en} ${s.zh}`), h('span', { html: skillTypeTag(s) }), ': ' + s.ten))));
}
function showGenerals() {
  const grid = h('div', { class: 'ref' });
  const fb = genFilterBar(() => fill());
  const fill = () => { grid.innerHTML = ''; const list = fb.apply(D.generals); for (const gen of list) grid.append(genCard(gen)); if (!list.length) grid.append(h('p', { style: 'color:#b9ab91' }, 'No generals match these filters.')); };
  fill();
  modal('Generals 武将 (89)', h('div', {}, fb.bar, grid), [btn('Close', closeModal, 'primary')], { dismiss: true, width: '1000px' });
}

// ---------- setup / game ----------
function setupScreen() {
  const np = h('select', {}, ...[4, 5, 6, 7, 8].map(n => h('option', { value: n, ...(n === 5 ? { selected: 'selected' } : {}) }, `${n} players`)));
  const role = h('select', {}, h('option', { value: '' }, 'Random'), ...['lord', 'loyalist', 'rebel', 'spy'].map(r => h('option', { value: r }, SGS.ROLE_NAME[r])));
  const pick = h('select', {}, h('option', { value: '3' }, 'Choose from 3 (standard)'), h('option', { value: '5' }, 'Choose from 5'), h('option', { value: 'free' }, 'Choose any general (practice)'));
  const spd = h('select', {}, h('option', { value: '1200' }, 'Slow — easy to follow'), h('option', { value: '700', selected: 'selected' }, 'Normal'), h('option', { value: '300' }, 'Fast'), h('option', { value: '60' }, 'Very fast'));
  const reveal = h('input', { type: 'checkbox' });
  const body = h('div', { class: 'setup' },
    h('p', {}, 'Play Sanguosha against computer opponents, using your own card scans. New to the game? Choose ', h('b', {}, 'Rebel'), ' or ', h('b', {}, 'Loyalist'), ' for your first game — the goals are the simplest.'),
    h('label', {}, 'Number of players'), np, h('label', {}, 'Your role'), role, h('label', {}, 'General selection'), pick, h('label', {}, 'Computer speed'), spd,
    h('label', {}, reveal, ' Show everyone\'s secret roles (learning aid — reduces the bluffing element)'));
  modal('New game 新游戏', body, [btn('Rules', () => showRules(setupScreen)), btn('Start game', () => { closeModal(); startGame({ numPlayers: +np.value, humanRole: role.value || null, choices: pick.value === 'free' ? 3 : +pick.value, freePick: pick.value === 'free', speed: +spd.value, reveal: reveal.checked }); }, 'primary')], { width: '560px' });
}
function startGame(o) {
  UI.speed = o.speed; UI.showRoles = o.reveal; $('#log').innerHTML = ''; hideTip();
  const g = new SGS.Game({ numPlayers: o.numPlayers, humanSeat: 0, humanRole: o.humanRole, choices: o.choices, freePick: o.freePick, io: UI.io, seed: o.seed, forceGenerals: o.forceGenerals });
  UI.g = g; UI.me = null; UI.req = null; UI.sel = null; UI.hintCard = null; UI.hintText = null;
  g.on((type, e) => { if (type === 'event') { if (e.name === 'judgeDone') UI.lastJudge = { card: e.ev.final || e.ev.card, good: e.ev.good ? !!e.ev.good(e.ev.final || e.ev.card) : null, who: e.ev.player }; else if (e.name === 'cardUsed' || e.name === 'phaseStart' && e.ev.phase === 'play') UI.lastJudge = null; } if (window.FX) { if (type === 'event') FX.event(g, e.name, e.ev); if (type === 'log') FX.log(g, e); } if (type === 'log') logEntry(e); if (type === 'update') render(); if (type === 'over') { render(); showOver(e); } });
  // players exist synchronously after the first part of setup; poll
  const wait = setInterval(() => { if (g.players.length) { UI.me = g.players[0]; clearInterval(wait); render(); } }, 20);
  g.run().catch(e => { console.error(e); logEntry({ en: 'Engine error: ' + e.message, kind: 'warn' }); });
}
function showOver(w) {
  const g = UI.g; const me = UI.me; const won = (w === 'lord' && (me.role === 'lord' || me.role === 'loyalist')) || (w === 'rebel' && me.role === 'rebel') || (w === 'spy' && me.role === 'spy');
  const rows = g.players.map(p => h('div', {}, `${p.seat + 1}. ${p.label} — ${p.general.en} ${p.general.zh}: `, h('b', {}, SGS.ROLE_NAME[p.role]), p.alive ? '' : ' (dead)'));
  modal(won ? 'Victory! 胜利' : 'Defeat 失败', h('div', {}, h('p', {}, winnerText(w)), h('p', {}, `You were the ${SGS.ROLE_NAME[me.role]}.`), ...rows), [btn('Review table', closeModal), btn('New game', setupScreen, 'primary')]);
}

UI.startGame = startGame;
// ---------- boot ----------
window.addEventListener('DOMContentLoaded', () => {
  const mb = document.getElementById('menuBtn'), mp = document.getElementById('menuPanel');
  if (mb && mp) { mb.onclick = e => { e.stopPropagation(); mp.classList.toggle('open'); }; mp.addEventListener('click', e => { if (e.target.tagName === 'BUTTON') mp.classList.remove('open'); }); document.addEventListener('click', e => { if (!mp.contains(e.target) && e.target !== mb) mp.classList.remove('open'); }); }
  const lb = document.getElementById('logBtn'); if (lb) lb.onclick = () => { document.getElementById('side').classList.toggle('open'); const lg = $('#log'); lg.scrollTop = lg.scrollHeight; };
  const lc = document.getElementById('logClose'); if (lc) lc.onclick = () => document.getElementById('side').classList.remove('open');
  $('#btnNew').onclick = setupScreen; $('#btnRules').onclick = () => showRules(); $('#btnCards').onclick = showCardRef; $('#btnGens').onclick = showGenerals;
  $('#explainToggle').onchange = e => { $('#log').classList.toggle('noexplain', !e.target.checked); };
  $('#speed').onchange = e => { UI.speed = +e.target.value; };
  $('#autoMe').onchange = e => UI.setAuto(e.target.checked);
  document.addEventListener('click', e => { const im = e.target.closest && e.target.closest('.ref img, .genpick img'); if (!im || (e.target.closest('.genpick') && !e.altKey && !e.target.closest('.ref'))) return; e.stopPropagation(); const z = h('div', { id: 'zoom', onclick: () => z.remove() }, h('img', { src: im.src })); document.body.append(z); }, true);
  $('#pile .deckcard').style.backgroundImage = `url('${IMG}action/card_back.jpg')`;
  setupScreen();
});
})();
