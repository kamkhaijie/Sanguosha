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
  async pause(g, kind, data) { if (g !== UI.g || !window.FX || !FX.anim) return; const f = Math.max(0.3, Math.min(1.6, UI.speed / 700)); await sleep((kind === 'judge' ? 1100 : 900) * f); },
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
function statusEls(p) {
  const s = h('div', { class: 'status' }); if (p.chained) s.append(h('span', { title: 'Chained 横置' }, '⛓')); if (p.faceDown) s.append(h('span', { title: 'Face down 背面' }, '⤵ face down')); return s;
}
function marksEl(p) {
  const e = h('div', { class: 'marks' }); const names = { fury: 'Fury 暴怒', ren: 'Patience 忍', nightmare: 'Nightmare 梦魇', gale: 'Gale 狂风', fog: 'Fog 大雾', zhaofu: 'Bound 诏缚' };
  for (const k in p.marks) { if (k.startsWith('limit_')) { const info = SGS.skillInfo(k.slice(6)); e.append(tipOn(h('span', {}, `◆ ${info ? info.en : k.slice(6)} ready`), () => `<p>Limited skill ${esc(info ? info.en + ' ' + info.zh : '')} has not been used yet.</p>`)); continue; } e.append(h('span', {}, `${names[k] || k} ×${p.marks[k]}`)); }
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
  const por = h('div', { class: 'portrait', style: `background-image:url('${IMG + (p.general ? p.general.img : 'action/card_back.jpg')}')` });
  if (p.general) por.append(h('div', { class: 'kd ' + p.kingdom }, KNAME[p.kingdom]));
  por.append(roleBadge(p), statusEls(p), h('div', { class: 'handcnt', title: 'Hand cards' }, '🂠 ' + p.hand.length));
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
  $('#stat').textContent = SGS.fixYou(`Round ${g.round} · Deck ${g.deck.length}` + (g.current ? ` · ${g.current.label}'s turn${g.phase ? ' — ' + (PHASE[g.phase] || g.phase) : ''}` : ''));
  const opp = $('#opponents'); opp.innerHTML = '';
  const n = g.players.length; const me = UI.me;
  for (let i = 1; i < n; i++) opp.append(seatEl(g.players[(me.seat + i) % n]));
  // center
  const played = $('#played'); played.innerHTML = '';
  const show = g.processing.slice(-6);
  if (g.harvestShown) for (const c of g.harvestShown) if (!show.includes(c) && g.processing.includes(c)) show.push(c);
  if (show.length) for (const c of show) played.append(h('div', { class: 'pc' }, cardEl(c), h('div', { class: 'who' }, 'in play')));
  else for (const c of g.discard.slice(-4)) { const e = cardEl(c, { size: 'small' }); e.style.opacity = .75; played.append(h('div', { class: 'pc' }, e, h('div', { class: 'who' }, 'discarded'))); }
  $('#deckinfo').textContent = `Deck ${g.deck.length}`;
  drawMe(); drawPrompt(); drawHand();
}
function drawMe() {
  const g = UI.g, p = UI.me; const mc = $('#mecard'); mc.innerHTML = ''; mc.setAttribute('data-seat', p.seat);
  mc.className = (g.current === p ? 'current' : '') + (p.alive ? '' : ' dead');
  const st = seatTargetState(p); if (st) mc.classList.add(st);
  const por = h('div', { class: 'portrait', style: `background-image:url('${IMG + (p.general ? p.general.img : 'action/card_back.jpg')}')` });
  if (p.general) { por.append(h('div', { class: 'kd ' + p.kingdom, style: 'position:absolute;left:4px;top:4px;font-size:12px;padding:1px 6px;border-radius:5px;color:#fff;font-weight:700' }, KNAME[p.kingdom])); tipOn(por, () => genTipHtml(p.general, p)); }
  por.append(h('div', { class: 'role ' + p.role, style: 'position:absolute;right:4px;top:4px;font-size:11px;padding:1px 6px;border-radius:5px' }, SGS.ROLE_NAME[p.role]));
  if (g.current === p && g.phase) por.append(h('div', { class: 'phase', style: 'top:auto;bottom:0' }, PHASE[g.phase]));
  por.append(statusEls(p));
  mc.append(por);
  const r = UI.req; const eqSel = r && ((r.type === 'cards' && r.candidates.some(c => p.equips().includes(c))) || (UI.sel && (UI.sel.mode === 'viewas' || UI.sel.mode === 'active'))) ? c => isSelectableCard(c) : null;
  mc.append(h('div', { class: 'body' }, h('div', { class: 'nm', style: 'font-weight:600' }, `You — ${p.general ? p.general.en : ''} `, h('span', { class: 'zh', style: 'color:#f0cf7c' }, p.general ? p.general.zh : '')), hpEl(p), eqEl(p, eqSel), judgeEl(p), marksEl(p), p.general ? h('div', { class: 'dist' }, `Attack range ${g.attackRange(p)} · Hand limit ${g.maxHand(p)}`) : null));
  mc.onclick = () => seatClick(p);
  // skills bar
  const sk = $('#skills'); sk.innerHTML = '';
  for (const { id, info } of genSkills(p)) {
    const s = S[id]; const btn = h('button', {}, `${info.en} ${info.zh}`);
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
  const box = h('div', {}); const filt = h('select', {}, h('option', { value: '' }, 'All kingdoms'), ...['wei', 'shu', 'wu', 'qun', 'god'].map(k => h('option', { value: k }, KNAME[k])));
  const grid = h('div', { class: 'ref' });
  const fill = () => { grid.innerHTML = ''; for (const gen of D.generals) { if (taken.has(gen.id) || (filt.value && gen.kingdom !== filt.value)) continue; const it = h('div', { class: 'it', style: 'cursor:pointer', onclick: () => UI.resolve(gen.id) }, h('img', { src: IMG + gen.img, style: 'width:80px;border-radius:6px' }), h('div', {}, h('b', {}, `${gen.en} `, h('span', { class: 'zh' }, gen.zh)), h('p', {}, `${KNAME[gen.kingdom]} · ${gen.maxhp} HP`), ...gen.skills.map(s => h('p', {}, h('b', { style: 'color:#9fc3ff' }, s.en + ' ' + s.zh + ': '), s.ten)))); grid.append(it); } };
  filt.onchange = fill; fill(); box.append(filt, grid);
  modal('Choose any general', box, [btn('Back', () => pickGeneralModal(r))], { width: '1000px' });
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
<h3>4. A turn 回合 — six phases, starting with the Lord, then counter-clockwise</h3>
<ol><li><b>Start</b> — some skills trigger.</li><li><b>Judgement 判定</b> — resolve delayed tricks in front of you (last placed first). A judgement flips the top card of the deck.</li><li><b>Draw 摸牌</b> — draw 2 cards.</li><li><b>Play 出牌</b> — use any number of cards, but only <b>one Strike 杀 per turn</b>, and no two delayed tricks of the same name in one judgement area.</li><li><b>Discard 弃牌</b> — your hand limit = your current HP; discard down to it.</li><li><b>End</b> — some skills trigger.</li></ol>
<h3>5. Distance 距离 & attack range 攻击范围</h3>
<p>Distance = the fewest seats between two players going either way round (dead players don't count). −1 horses reduce your distance to others; +1 horses increase others' distance to you. You can only Strike someone whose distance ≤ your attack range (1 without a weapon; otherwise the weapon's number). <b>Steal</b> and <b>Supply Shortage</b> always need distance 1, regardless of weapons. The app shows each opponent's distance and whether they are in your range.</p>
<h3>6. Dying 濒死 & death</h3>
<p>At 0 HP you are dying. Starting with the current player and going round, anyone may play a <b>Peach 桃</b> to restore you 1 HP; you may also use <b>Wine 酒</b> on yourself. If you're still at ≤0, you die and reveal your role. Whoever kills a Rebel draws 3 cards. If the Lord kills a Loyalist, the Lord discards all their cards.</p>
<h3>7. Card types</h3>
<ul><li><b>Basic 基本牌</b>: Strike 杀 (fire 火 / thunder 雷 variants), Dodge 闪, Peach 桃, Wine 酒.</li><li><b>Tricks 锦囊</b>: take effect immediately; any player may cancel one with Nullification 无懈可击 (which can itself be nullified).</li><li><b>Delayed tricks 延时锦囊</b>: placed in a judgement area and resolved in that player's judgement phase (Contentment, Supply Shortage, Lightning).</li><li><b>Equipment 装备</b>: one weapon, one armour, one −1 horse, one +1 horse. A new one replaces the old.</li></ul>
<h3>8. Iron Chain 铁索连环 & elemental damage</h3>
<p>Chained characters are turned sideways. When a chained character takes fire or thunder damage, their chain resets and every other chained character takes the same elemental damage too.</p>
<h3>9. Using this app</h3>
<ul><li>Hover over any card, general, equipment or skill to read its English + Chinese text.</li><li>In your play phase click a card, then click a highlighted target, then <b>Use</b>. Skill buttons sit above your hand.</li><li>When you must respond (e.g. to a Strike) the prompt bar tells you what's needed; click a matching card then confirm, or <b>Pass</b>.</li><li>💡 <b>Hint</b> suggests a move. Green log lines explain rules as they happen.</li></ul></div>`;
}
function showRules(back) { modal('How to play 三国杀 — rules in English', h('div', { html: rulesHtml() }), [btn(back ? 'Back' : 'Close', () => back ? back() : closeModal(), 'primary')], { dismiss: !back, width: '860px' }); }
function showCardRef() {
  const seen = new Map(); for (const c of D.cards) { const k = cardZh(c); if (!seen.has(k)) seen.set(k, { c, n: 0 }); seen.get(k).n++; }
  const grid = h('div', { class: 'ref' });
  for (const [zh, { c, n }] of seen) { const t = D.cardtext[zh] || {}; grid.append(h('div', { class: 'it' }, h('img', { src: IMG + c.img, style: 'width:80px;border-radius:6px' }), h('div', {}, h('b', {}, `${SGS.shortName(c)} `, h('span', { class: 'zh' }, zh)), h('p', { style: 'color:#b9ab91' }, `${n} in deck`), h('p', {}, t.en || ''), h('p', { class: 'zh', style: 'color:#8a7d67' }, t.zh || '')))); }
  modal('Card reference 卡牌', grid, [btn('Close', closeModal, 'primary')], { dismiss: true, width: '1000px' });
}
function showGenerals() {
  const box = h('div', {}); const filt = h('select', {}, h('option', { value: '' }, 'All kingdoms'), ...['wei', 'shu', 'wu', 'qun', 'god'].map(k => h('option', { value: k }, KNAME[k]))); const grid = h('div', { class: 'ref' });
  const fill = () => { grid.innerHTML = ''; for (const gen of D.generals) { if (filt.value && gen.kingdom !== filt.value) continue; grid.append(h('div', { class: 'it' }, h('img', { src: IMG + gen.img, style: 'width:80px;border-radius:6px' }), h('div', {}, h('b', {}, `${gen.en} `, h('span', { class: 'zh' }, gen.zh)), h('p', {}, `${KNAME[gen.kingdom]} · ${gen.maxhp} HP · ${gen.gender}`), ...gen.skills.map(s => h('p', {}, h('b', { style: 'color:#9fc3ff' }, `${s.en} ${s.zh}`), h('span', { html: skillTypeTag(s) }), ': ' + s.ten))))); } };
  filt.onchange = fill; fill(); box.append(filt, grid);
  modal('Generals 武将 (89)', box, [btn('Close', closeModal, 'primary')], { dismiss: true, width: '1000px' });
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
  g.on((type, e) => { if (window.FX) { if (type === 'event') FX.event(g, e.name, e.ev); if (type === 'log') FX.log(g, e); } if (type === 'log') logEntry(e); if (type === 'update') render(); if (type === 'over') { render(); showOver(e); } });
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
