/* Sanguosha — AI */
(function (G) {
'use strict';
const SGS = G.SGS; const CAT = SGS.CAT; const S = SGS.SKILLS;
const AI = SGS.AI = {};
const red = c => SGS.color(c) === 'red';

// ---------- role inference ----------
function loy(g, q) { if (q.role === 'lord') return 99; g.aiLoy = g.aiLoy || {}; return g.aiLoy[q.seat] || 0; }
AI.loy = loy;
AI.note = function (g, src, tgt, w) { // w>0 hostile, w<0 friendly
  if (!src || !tgt || src === tgt) return; g.aiLoy = g.aiLoy || {};
  const t = loy(g, tgt); let d = 0;
  if (tgt.role === 'lord') d = -w * 3; else if (t > 1) d = -w * 1.5; else if (t < -1) d = w * 1.5; else return;
  g.aiLoy[src.seat] = Math.max(-12, Math.min(12, (g.aiLoy[src.seat] || 0) + d));
};
SGS.globalOn = SGS.globalOn || {};
const HOSTILE = { slash: 2, duel: 2, dismantle: 1, steal: 1, fireattack: 1.5, indulgence: 2, supply: 1.5, borrow: 1 };
SGS.globalOn.targetChosen = (g, ev) => { const w = HOSTILE[ev.card.key]; if (w && !ev.card.lijian) AI.note(g, ev.user, ev.target, w); };
SGS.globalOn.recovered = (g, ev) => { if (ev.source && ev.source !== ev.player) AI.note(g, ev.source, ev.player, -1.5); };
SGS.globalOn.damageDealt = (g, ev) => { if (ev.source && ev.via && !['slash', 'duel', 'fireattack', 'barbarian', 'arrows', 'lightning'].includes(ev.via)) AI.note(g, ev.source, ev.target, 1); };

AI.isEnemy = function (g, p, q) {
  if (!p || !q || p === q) return false;
  if (p.isHuman && p.aiHintRole == null) { /* human-controlled seat never asks AI except autoplay */ }
  const r = p.role;
  if (r === 'lord' || r === 'loyalist') { if (q.role === 'lord') return false; return loy(g, q) < -1 || (g.alive().length <= 3 && loy(g, q) < 1 && !g.alive().some(x => x !== p && x !== q && x.role !== 'lord' && loy(g, x) < -1)); }
  if (r === 'rebel') { if (q.role === 'lord') return true; return loy(g, q) > 1.5; }
  if (r === 'spy') {
    const al = g.alive(); const rebels = al.filter(x => x.role === 'rebel').length; const loyals = al.filter(x => x.role === 'loyalist').length;
    if (q.role === 'lord') return rebels === 0 && loyals === 0;
    if (rebels === 0) return true; // only loyalists left besides lord
    return loy(g, q) < -1 || (rebels <= 1 && loyals >= 1 && loy(g, q) > 3);
  }
  return false;
};
AI.isFriend = function (g, p, q) {
  if (p === q) return true; if (!p || !q) return false; const r = p.role;
  if (r === 'lord' || r === 'loyalist') return q.role === 'lord' || loy(g, q) > 2;
  if (r === 'rebel') return q.role !== 'lord' && loy(g, q) < -2;
  if (r === 'spy') { const al = g.alive(); if (q.role === 'lord') return al.some(x => x.role === 'rebel'); return false; }
  return false;
};
const enemy = AI.isEnemy, friend = AI.isFriend;

// ---------- card values ----------
AI.cardValue = function (g, p, c) {
  if (!c) return 0; const k = g && p ? (g.asCard(p, c) || c).key : c.key;
  const hasN = n => p.hand.filter(x => (g.asCard(p, x) || x).key === n).length;
  switch (k) {
    case 'peach': return 9 + (p.hp <= 1 ? 3 : 0);
    case 'wine': return p.hp <= 1 ? 8 : 4;
    case 'nullify': return 7;
    case 'dodge': return hasN('dodge') > 1 ? 4 : 6.5;
    case 'slash': return hasN('slash') > 1 ? 3.5 : 5;
    case 'exnihilo': return 7.5;
    case 'indulgence': return 6.5; case 'supply': return 5; case 'lightning': return 1.5;
    case 'dismantle': case 'steal': return 6; case 'duel': return 5; case 'barbarian': case 'arrows': return 5;
    case 'peachgarden': return 3; case 'harvest': return 3; case 'borrow': return 3.5; case 'fireattack': return 3.5; case 'chain': return 2.5;
  }
  const cat = CAT[k];
  if (cat && cat.type === 'equip') {
    if (p.equips().includes(c)) { if (cat.sub === 'armor') return 7; if (cat.sub === 'weapon') return 5; return 5.5; }
    const slot = p.equip[cat.sub]; if (!slot) return 6; return 2;
  }
  return 3;
};
AI.junk = function (g, p, zones = 'h', n, exact, maxV = 4) {
  const cs = p.cards(zones).slice().sort((a, b) => AI.cardValue(g, p, a) - AI.cardValue(g, p, b));
  if (n == null) return cs.filter(c => AI.cardValue(g, p, c) <= maxV && !p.equips().includes(c) || (p.equips().includes(c) && AI.cardValue(g, p, c) <= 2));
  return cs.slice(0, n).length === n ? cs.slice(0, n) : (exact ? cs.slice(0, n) : []);
};
AI.worst = (g, p, cands, n) => cands.slice().sort((a, b) => AI.cardValue(g, p, a) - AI.cardValue(g, p, b)).slice(0, n);

// ---------- helpers used by skills ----------
AI.giveTarget = (g, o, c, cands) => { const f = cands.filter(q => friend(g, o, q)).sort((a, b) => a.hand.length - b.hand.length); return f[0] || (cands.includes(o) ? o : cands[0]); };
AI.rendeAI = (g, p) => { const fr = g.others(p).filter(q => friend(g, p, q)).sort((a, b) => a.hand.length - b.hand.length)[0]; if (!fr) return null; const given = p.phaseData.rende || 0; const over = p.hand.length - p.hp; if (given < 2 && p.wounded && p.hand.length >= 2) return { cards: AI.worst(g, p, p.hand, 2 - given), targets: [fr] }; if (over > 0) return { cards: AI.worst(g, p, p.hand, over), targets: [fr] }; return null; };
AI.bestSlashTarget = (g, p, card) => { const ts = g.alive().filter(t => g.slashTargetOk(p, card, t) && enemy(g, p, t)); return AI.rankSlash(g, p, card, ts)[0] || null; };
AI.rankSlash = (g, p, card, ts) => ts.filter(t => !(t.equip.armor && t.equip.armor.key === 'rattan' && !card.nature && !g.armorIgnored(t))).map(t => {
  let s = 10 - t.hp * 2 - t.hand.length * 0.5; if (t.role === 'lord') s += 2; if (t.equip.armor && t.equip.armor.key === 'eighttrigrams') s -= 2; if (t.equip.armor && t.equip.armor.key === 'silverlion' && (card.wineBonus || p.turn.wineBuff)) s -= 1; if (t.hp <= 1 + (p.turn.wineBuff || 0)) s += 4; if (t.hasSkill('刚烈') || t.hasSkill('反馈') || t.hasSkill('恩怨')) s -= 1.5; if (card.nature === 'fire' && t.equip.armor && t.equip.armor.key === 'rattan') s += 3; return { t, s };
}).sort((a, b) => b.s - a.s).map(x => x.t);
AI.luoyiAI = (g, o) => { const sl = o.hand.filter(c => g.asCard(o, c).key === 'slash').length; return sl >= 1 && g.others(o).some(q => enemy(g, o, q) && g.inRange(o, q)) && o.hand.length >= 2; };
AI.retrialAI = (g, o, ev) => {
  const j = ev.player; const good = ev.good; if (!good) return null; const isGood = good(ev.card);
  const wantGood = friend(g, o, j) ? true : enemy(g, o, j) ? false : null; if (wantGood === null || wantGood === isGood) return null;
  const c = o.hand.filter(x => good(x) === wantGood).sort((a, b) => AI.cardValue(g, o, a) - AI.cardValue(g, o, b))[0];
  return c && AI.cardValue(g, o, c) < 8 ? [c] : null;
};
AI.lijianAI = (g, p) => { const males = g.others(p).filter(q => q.gender === 'male'); const cs = AI.junk(g, p, 'he', 1); if (!cs.length) return null; const e = males.filter(q => enemy(g, p, q)).sort((a, b) => a.hp - b.hp); if (!e.length) return null; const src = males.filter(q => q !== e[0] && !g.prohibited(q, g.virtual('duel', []), e[0])).sort((a, b) => (friend(g, p, b) ? 1 : 0) - (friend(g, p, a) ? 1 : 0) || b.hand.length - a.hand.length)[0]; if (!src || friend(g, p, e[0])) return null; return { cards: cs, targets: [src, e[0]] }; };
AI.ganluAI = (g, p) => { const x = p.lostHp; const os = g.alive(); for (const a of os) if (friend(g, p, a)) for (const b of os) if (a !== b && enemy(g, p, b) && b.equips().length > a.equips().length && b.equips().length - a.equips().length <= x) return { targets: [a, b] }; return null; };
AI.jiangchiAI = (g, o) => { const sl = o.hand.filter(c => g.asCard(o, c).key === 'slash').length; if (sl >= 2 && o.countCards('he') > 2) return 'disc'; if (sl === 0) return 'draw'; return 'no'; };
AI.mijiGive = (g, o, n) => { const f = g.others(o).filter(q => friend(g, o, q)); if (!f.length) return null; return AI.worst(g, o, o.hand, Math.min(n, Math.max(0, o.hand.length - o.hp))); };
AI.zishouAI = (g, o) => !g.others(o).some(q => enemy(g, o, q) && q.hp <= 1) && o.hand.length < 4;
AI.chengxiangAI = (g, o, shown) => { let best = [], bv = -1; for (let m = 1; m < 16; m++) { const sub = shown.filter((c, i) => m & (1 << i)); if (sub.reduce((s, c) => s + c.rank, 0) > 13) continue; const v = sub.reduce((s, c) => s + AI.cardValue(g, o, c) + 1, 0); if (v > bv) { bv = v; best = sub; } } return best; };
AI.fenliAI = (g, o, what) => what === 'discard' ? true : what === 'draw' ? o.hand.length >= 5 : (o.hp >= 4 && !o.hand.some(c => ['slash', 'duel', 'dismantle', 'steal'].includes(g.asCard(o, c).key)));
AI.pindiAI = (g, p) => { const used = p.turn.pindiTargets || new Set(); const types = p.turn.pindiTypes || new Set(); const cs = p.cards('he').filter(c => !types.has(SGS.type(c))).sort((a, b) => AI.cardValue(g, p, a) - AI.cardValue(g, p, b)); if (!cs.length || AI.cardValue(g, p, cs[0]) > 5) return null; const x = (p.turn.pindiN || 0) + 1; const e = g.others(p).filter(q => !used.has(q) && enemy(g, p, q) && q.countCards('he') >= 1)[0]; const f = g.others(p).filter(q => !used.has(q) && friend(g, p, q))[0]; const t = x >= 2 ? (f || e) : (e || f); return t ? { cards: [cs[0]], targets: [t] } : null; };
AI.wantsTarget = (g, o, card, t) => { const k = card.key; if (['peach', 'exnihilo', 'wine'].includes(k)) return friend(g, o, t); if (k === 'chain') return enemy(g, o, t) !== t.chained; return enemy(g, o, t); };
AI.benxiAI = (g, o, ev, picked) => { if (!picked.includes('unstop')) return 'unstop'; if (!picked.includes('draw')) return 'draw'; return 'stop'; };
AI.jigongAI = (g, o) => o.hand.some(c => ['slash', 'duel', 'fireattack', 'barbarian', 'arrows'].includes(g.asCard(o, c).key)) || o.hand.length <= 1;

// ---------- play phase ----------
function harmfulFor(card) { return ['slash', 'duel', 'dismantle', 'steal', 'fireattack', 'indulgence', 'supply', 'lightning', 'barbarian', 'arrows', 'borrow'].includes(card.key); }
AI.harmful = harmfulFor;
function candidates(g, p) { // real + virtual cards usable
  const out = [];
  for (const c of p.hand) out.push({ card: g.asCard(p, c), cost: [c] });
  for (const opt of g.viewAsOptions(p, { mode: 'use', names: null })) {
    const va = opt.spec; const min = va.min != null ? va.min : 1, max = va.max != null ? va.max : 1;
    const zones = va.zones || 'h';
    const pool = p.cards(zones).filter(c => !va.filter || va.filter(g, p, c, []));
    for (const name of opt.names) {
      if (min === 0) { const v = g.buildViewAs(p, opt, [], name); if (v) out.push({ card: v, cost: [], opt }); continue; }
      if (min === 1 && max <= 2) { for (const c of pool) { const v = g.buildViewAs(p, opt, [c], name); if (v) out.push({ card: v, cost: [c], opt }); } continue; }
      if (min === 2 && max === 2) { const two = AI.worst(g, p, pool, 2); if (two.length === 2) { const v = g.buildViewAs(p, opt, two, name); if (v) out.push({ card: v, cost: two, opt, pricey: true }); } continue; }
      if (va.valid) { const all = p.cards(zones).filter(c => !va.filter || va.filter(g, p, c, [])); const v = g.buildViewAs(p, opt, all, name); if (v) out.push({ card: v, cost: all, opt, pricey: true, all: true }); }
    }
  }
  return out;
}
AI.candidates = candidates;
function costOf(g, p, cand) { return cand.cost.reduce((s, c) => s + AI.cardValue(g, p, c), 0) - (cand.cost.length === 1 && !cand.card.virtual ? AI.cardValue(g, p, cand.cost[0]) : 0); }
AI.play = function (g, p) {
  const cands = candidates(g, p).filter(x => g.canUse(p, x.card));
  const hasSlash = cands.some(x => x.card.key === 'slash');
  const E = g.others(p).filter(q => enemy(g, p, q)); const F = g.alive().filter(q => friend(g, p, q));
  const mk = (x, targets) => ({ type: 'card', card: x.card, targets: targets || [] });
  const real = x => !x.card.virtual;
  const byCost = arr => arr.sort((a, b) => costOf(g, p, a) - costOf(g, p, b) || (a.card.virtual ? 1 : 0) - (b.card.virtual ? 1 : 0));
  // 1 equipment
  for (const x of cands) { const cat = CAT[x.card.key]; if (cat.type !== 'equip' || x.card.virtual) continue; const cur = p.equip[cat.sub]; if (!cur) return mk(x); if (cat.sub === 'weapon' && (cat.range > CAT[cur.key].range + 1 || (x.card.key === 'crossbow' && p.hand.filter(c => g.asCard(p, c).key === 'slash').length >= 3)) && p.hand.length > 2) return mk(x); if (cat.sub === 'armor' && cur.key === 'rattan' && x.card.key !== 'rattan') return mk(x); }
  // 2 peach
  const peach = byCost(cands.filter(x => x.card.key === 'peach' && real(x)))[0];
  if (peach && p.wounded && (p.hp <= 2 || p.hand.length > p.hp || p.hp < p.maxhp - 1)) return mk(peach);
  // 3 exnihilo
  const ex = cands.find(x => x.card.key === 'exnihilo' && real(x)); if (ex) return mk(ex);
  // 4 skills
  const sk = AI.pickActive(g, p, 'early'); if (sk) return sk;
  // 5 delayed tricks
  for (const x of byCost(cands.filter(x => x.card.key === 'indulgence'))) { const ts = g.legalTargets(p, x.card).filter(t => enemy(g, p, t)).sort((a, b) => b.hand.length + b.hp - a.hand.length - a.hp); if (ts.length) return mk(x, [ts[0]]); }
  for (const x of byCost(cands.filter(x => x.card.key === 'supply'))) { const ts = g.legalTargets(p, x.card).filter(t => enemy(g, p, t)); if (ts.length) return mk(x, [ts[0]]); }
  // 6 dismantle/steal
  for (const key of ['steal', 'dismantle']) for (const x of byCost(cands.filter(x => x.card.key === key))) {
    const ts = g.legalTargets(p, x.card);
    const fj = ts.find(t => friend(g, p, t) && t.judgeArea.some(c => ['indulgence', 'supply'].includes(c.vkey || c.key)));
    if (fj) return mk(x, [fj]);
    const e = ts.filter(t => enemy(g, p, t) && t.countCards('he')).sort((a, b) => (b.equip.armor ? 2 : 0) + b.equips().length - (a.equip.armor ? 2 : 0) - a.equips().length || a.hp - b.hp);
    if (e.length && (!x.card.virtual || x.cost.length === 0 || AI.cardValue(g, p, x.cost[0]) < 5.5)) return mk(x, [e[0]]);
  }
  // 7 fire attack / chain combos
  const fa = cands.find(x => x.card.key === 'fireattack' && real(x));
  if (fa && p.hand.length >= 4) { const t = g.legalTargets(p, fa.card).filter(t => enemy(g, p, t)).sort((a, b) => a.hp - b.hp)[0]; if (t) return mk(fa, [t]); }
  // 8 AOE
  for (const key of ['barbarian', 'arrows']) { const x = cands.find(y => y.card.key === key && real(y)); if (!x) continue; const others = g.others(p); const eN = others.filter(q => enemy(g, p, q)).length; const fN = others.filter(q => friend(g, p, q)).length; const lordRisk = p.role !== 'lord' && others.some(q => q.role === 'lord' && q.hp <= 1 && friend(g, p, q)); if (eN > fN && !lordRisk) return mk(x); }
  const pg = cands.find(x => x.card.key === 'peachgarden' && real(x)); if (pg) { const fw = F.filter(q => q.wounded).length, ew = E.filter(q => q.wounded).length; if (fw > ew) return mk(pg); }
  const hv = cands.find(x => x.card.key === 'harvest' && real(x)); if (hv && F.length >= E.length) return mk(hv);
  // 9 borrow
  for (const x of cands.filter(y => y.card.key === 'borrow' && real(y))) { for (const t of g.legalTargets(p, x.card)) { const vs = g.alive().filter(v => v !== t && g.inRange(t, v) && enemy(g, p, v)); if ((enemy(g, p, t) || vs.length) && vs.length) return { type: 'card', card: x.card, targets: [t, vs[0]] }; if (enemy(g, p, t)) { const any = g.alive().filter(v => v !== t && g.inRange(t, v)); if (any.length) return { type: 'card', card: x.card, targets: [t, any.find(v => !friend(g, p, v)) || any[0]] }; } } }
  // 10 duel
  const nSlash = p.hand.filter(c => g.asCard(p, c).key === 'slash').length;
  for (const x of byCost(cands.filter(y => y.card.key === 'duel'))) { const ts = g.legalTargets(p, x.card).filter(t => enemy(g, p, t)).sort((a, b) => a.hand.length - b.hand.length || a.hp - b.hp); if (ts.length && (ts[0].hand.length <= nSlash + 1 || ts[0].hp <= 1 || p.hasSkill('无双')) && (!x.all || x.cost.length <= 2)) return mk(x, [ts[0]]); }
  // 11 lightning
  const lt = cands.find(x => x.card.key === 'lightning' && real(x)); if (lt && (p.hasSkill('鬼才') || p.hasSkill('天妒') || g.rnd() < 0.25) && g.canUse(p, lt.card)) return mk(lt);
  // 12 wine + slash
  const slashes = byCost(cands.filter(x => x.card.key === 'slash')).filter(x => !x.pricey || p.hand.length > 3);
  if (slashes.length) {
    for (const x of slashes) {
      const ts = AI.rankSlash(g, p, x.card, g.legalTargets(p, x.card).filter(t => enemy(g, p, t)));
      if (!ts.length) continue;
      const wine = cands.find(y => y.card.key === 'wine' && real(y) && y.cost[0] !== x.cost[0]);
      if (wine && !p.turn.wineUsed && !p.turn.wineBuff && p.hp > 1 && ts[0].hand.length <= 2) return mk(wine);
      const max = (g.targetRules(p, x.card) || {}).max || 1;
      return mk(x, ts.slice(0, Math.max(1, max)));
    }
  }
  // 13 chain: recast
  const ch = cands.find(x => x.card.key === 'chain' && real(x)); if (ch) { const e2 = E.filter(t => !t.chained && !g.prohibited(p, ch.card, t)).slice(0, 2); if (e2.length === 2 && p.hand.some(c => c.nature)) return mk(ch, e2); return mk(ch, []); }
  const sk2 = AI.pickActive(g, p, 'late'); if (sk2) return sk2;
  return { type: 'end' };
};
AI.pickActive = function (g, p, stage) {
  for (const id of p.allSkillIds()) {
    const sk = S[id]; if (!sk.active || !g.activeUsable(p, id)) continue;
    p.aiTried = p.aiTried || {}; const key = g.turnCount + ':' + id; if ((p.aiTried[key] || 0) >= 4) continue;
    let r = null; try { r = sk.active.ai ? sk.active.ai(g, p, stage) : null; } catch (e) { r = null; }
    if (r) { p.aiTried[key] = (p.aiTried[key] || 0) + 1; return { type: 'skill', skill: id, cards: r.cards || [], targets: r.targets || [] }; }
  }
  return null;
};

// ---------- responses ----------
AI.respond = function (g, p, req) {
  const need = req.need; const reason = need.reason;
  let want = true;
  if (reason === 'duel') want = !friend(g, p, need.source) || need.source === p;
  else if (reason === 'rescue') { const d = need.dying; want = d === p || friend(g, p, d); if (p.role === 'spy' && d.role === 'lord' && g.alive().some(x => x.role !== 'lord' && x !== p)) want = true; if (p.role === 'lord' && d !== p && !friend(g, p, d)) want = false; }
  else if (reason === 'nullify') want = AI.wantNullify(g, p, need);
  else if (need.aiHelp !== undefined) want = !!need.aiHelp;
  else if (reason === 'slash' && need.source && friend(g, p, need.source) && p.hp > 2) want = true;
  if (!want) return null;
  // cheapest option
  if (req.specials.length && (need.names.includes('dodge'))) { const e8 = req.specials.find(id => id === 'eq_eighttrigrams'); if (e8) return { special: e8 }; }
  if (reason === 'rescue') { const fu = req.specials.find(id => id === '伏枥'); if (fu && need.dying === p && !req.hand.length) return { special: fu }; }
  const hand = req.hand.slice().sort((a, b) => AI.cardValue(g, p, a) - AI.cardValue(g, p, b));
  if (hand.length) return { card: hand[0] };
  for (const opt of req.viewAs) {
    const va = opt.spec; const min = va.min != null ? va.min : 1; const max = va.max != null ? va.max : 1; const zones = va.zones || 'h';
    const pool = p.cards(zones).filter(c => !va.filter || va.filter(g, p, c, [])).sort((a, b) => AI.cardValue(g, p, a) - AI.cardValue(g, p, b));
    for (const name of opt.names) {
      if (min === 0) { if (g.buildViewAs(p, opt, [], name)) return { viewAs: opt.id, cards: [], name }; continue; }
      for (const c of pool) { if (AI.cardValue(g, p, c) >= 9 && reason !== 'rescue') continue; if (g.buildViewAs(p, opt, [c], name)) return { viewAs: opt.id, cards: [c], name }; }
      if (min >= 2 && max === 2) { const two = pool.slice(0, 2); if (two.length === 2 && g.buildViewAs(p, opt, two, name)) return { viewAs: opt.id, cards: two, name }; }
      if (va.valid && min <= 1 && max >= 99) { const all = p.cards(zones); if (all.length <= 2 && g.buildViewAs(p, opt, all, name)) return { viewAs: opt.id, cards: all, name }; }
    }
  }
  if (req.specials.length) { const sp = req.specials.find(id => id !== '勤王') || (p.countCards('he') > 2 ? req.specials[0] : null); if (sp) return { special: sp }; }
  return null;
};
AI.wantNullify = function (g, p, need) {
  const a = need.against; let base = a; while (base.isNullify) base = base.prev;
  const card = base.card; const t = base.target; const user = base.user;
  if (user === p && !base.delayed) return !!need.nullified && !a.isNullify ? false : (a.isNullify && a.user !== p && need.nullified);
  let wantBlock; // want the base effect blocked?
  if (base.delayed) wantBlock = friend(g, p, t) && (card.key !== 'lightning' || true) && !(card.key === 'lightning' && !friend(g, p, t));
  else if (harmfulFor(card)) wantBlock = friend(g, p, t) && !(card.key === 'slash');
  else if (['exnihilo', 'peachgarden', 'harvest'].includes(card.key)) wantBlock = enemy(g, p, t) && (card.key !== 'peachgarden' || t.hp <= 1);
  else wantBlock = false;
  if (card.key === 'dismantle' || card.key === 'steal') { if (t && t.countCards('he') + t.judgeArea.length <= 0) wantBlock = false; if (friend(g, p, user) && t.judgeArea.length) wantBlock = false; }
  if (card.key === 'barbarian' || card.key === 'arrows') wantBlock = friend(g, p, t) && (t.hp <= 2 || t === p) && !t.hand.some(c => c.key === (card.key === 'barbarian' ? 'slash' : 'dodge'));
  if (!wantBlock && !enemy(g, p, t)) return false;
  const nowBlocked = need.nullified; // state before this nullify
  return wantBlock ? !nowBlocked : (nowBlocked && enemy(g, p, t) === false ? false : (nowBlocked && friend(g, p, user) && harmfulFor(card) && enemy(g, p, t)));
};

// ---------- generic asks ----------
AI.decide = function (g, p, req) {
  if (req.ai) { try { const r = req.ai(req.candidates || req.cards || req.options); if (r !== undefined) { if (req.type === 'players' && Array.isArray(r)) return r.filter(Boolean); return r; } } catch (e) { /* fall through */ } }
  switch (req.type) {
    case 'play': return AI.play(g, p);
    case 'respond': return AI.respond(g, p, req);
    case 'confirm': return true;
    case 'option': return req.options[0].id;
    case 'general': return AI.pickGeneral(g, p, req.choices);
    case 'players': return AI.players(g, p, req);
    case 'cards': return AI.cards(g, p, req);
    case 'pickFrom': return AI.pickFrom(g, p, req);
    case 'pickList': return AI.pickList(g, p, req);
    case 'guanxing': { const cs = req.cards.slice().sort((a, b) => AI.cardValue(g, p, b) - AI.cardValue(g, p, a)); return { top: cs.filter(c => AI.cardValue(g, p, c) >= 5), bottom: cs.filter(c => AI.cardValue(g, p, c) < 5) }; }
    case 'swap': { const a = req.a.slice().sort((x, y) => AI.cardValue(g, p, x) - AI.cardValue(g, p, y)); const b = req.b.slice().sort((x, y) => AI.cardValue(g, p, y) - AI.cardValue(g, p, x)); const A2 = [], B2 = []; for (let i = 0; i < Math.min(a.length, b.length); i++) { if (AI.cardValue(g, p, b[i]) > AI.cardValue(g, p, a[i]) + 1) { A2.push(a[i]); B2.push(b[i]); } } return { a: A2, b: B2 }; }
  }
  return null;
};
const RATING = { g004: 9, g033: 8, g008: 8, g002: 8, g003: 7, g007: 8, g015: 7, g014: 7, g027: 7, g021: 8, g016: 7, g011: 7, g009: 7, g029: 7, g023: 6, g020: 6, g030: 6, g035: 6, g044: 7, g045: 7, g049: 6, g054: 7 };
AI.pickGeneral = (g, p, choices) => choices.slice().sort((a, b) => ((RATING[b.id] || 5) + b.maxhp * 0.3) - ((RATING[a.id] || 5) + a.maxhp * 0.3))[0];
AI.players = function (g, p, req) {
  const c = req.candidates; const pur = req.purpose;
  const enemiesFirst = c.filter(q => enemy(g, p, q)).sort((a, b) => a.hp - b.hp);
  const friendsFirst = c.filter(q => friend(g, p, q)).sort((a, b) => a.hp - b.hp);
  let pick;
  if (/friend|draw|give|heal/i.test(pur || '')) pick = friendsFirst.concat(c.filter(q => !friendsFirst.includes(q) && !enemy(g, p, q)));
  else pick = enemiesFirst;
  if (req.optional && !pick.length) return [];
  const out = pick.slice(0, req.max); for (const q of c) { if (out.length >= req.min) break; if (!out.includes(q)) out.push(q); }
  return out;
};
AI.cards = function (g, p, req) {
  const c = req.candidates.slice(); const pur = req.purpose;
  if (pur === 'pindian') { const s = c.slice().sort((a, b) => b.rank - a.rank); if (req.opponent && friend(g, p, req.opponent) && !req.initiator) return [s[s.length - 1]]; return [s[0].rank >= 10 || req.initiator ? s[0] : s.slice().sort((a, b) => AI.cardValue(g, p, a) - AI.cardValue(g, p, b))[0]]; }
  if (pur === 'fireattackDiscard') { const t = req.target; if (!t || !enemy(g, p, t)) return null; const w = AI.worst(g, p, c, 1); return w.length && AI.cardValue(g, p, w[0]) < 7 ? w : null; }
  if (pur === 'axe') { const t = req.target; if (!enemy(g, p, t)) return null; const w = AI.worst(g, p, c, 2); return w.length === 2 && w.reduce((s, x) => s + AI.cardValue(g, p, x), 0) < 10 ? w : null; }
  if (pur === 'retrial') return AI.retrialAI(g, p, req.judge);
  if (req.optional && /give|twinswords|jiaojin|longyin|duodao|sidi|醇醪|qingxi|junxing|yuce|fencheng/.test(pur || '')) { if (/twinswords|junxing|qingxi|fencheng/.test(pur)) return AI.worst(g, p, c, req.min); return null; }
  if (req.optional) return null;
  const n = req.min;
  return AI.worst(g, p, c, n);
};
AI.pickFrom = function (g, p, req) {
  const t = req.target; const av = req.avail; const pur = req.purpose;
  const fr = friend(g, p, t);
  if (fr || pur === 'helpFriend') { const bad = av.j.find(c => ['indulgence', 'supply', 'lightning'].includes(c.vkey || c.key)); if (bad) return bad; if (av.h.length) return 'hand'; const e = av.e.slice().sort((a, b) => AI.cardValue(g, t, a) - AI.cardValue(g, t, b))[0]; if (e) return e; }
  const order = ['armor', 'weapon', 'minus', 'plus'];
  if (pur === 'steal' && av.h.length && t.hand.length <= 2) return 'hand';
  for (const s of order) { const e = av.e.find(c => CAT[c.key].sub === s); if (e && (s !== 'plus' || !av.h.length)) return e; }
  if (av.h.length) return 'hand';
  return av.e[0] || av.j[0] || null;
};
AI.pickList = function (g, p, req) {
  const sel = (req.selectable || req.cards).slice().sort((a, b) => AI.cardValue(g, p, b) - AI.cardValue(g, p, a));
  if (req.sumMax) return AI.chengxiangAI(g, p, req.cards);
  const n = Math.max(req.min, req.purpose === 'gainBest' ? req.max : req.min || 1);
  return sel.slice(0, Math.min(req.max, Math.max(n, req.min)));
};
AI.io = { ask: async (g, p, req) => AI.decide(g, p, req) };
})(typeof window !== 'undefined' ? window : globalThis);
