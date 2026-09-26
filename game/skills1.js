/* Sanguosha — general skills, part 1 (God generals + classic standard set) */
(function (G) {
'use strict';
const SGS = G.SGS; const S = SGS.SKILLS; const CAT = SGS.CAT;
const A = () => SGS.AI;
const red = c => SGS.color(c) === 'red', black = c => SGS.color(c) === 'black';
const enemy = (g, p, q) => A().isEnemy(g, p, q), friend = (g, p, q) => A().isFriend(g, p, q);
SGS.H = { red, black, enemy, friend };
const ask = (g, o, id, prompt, ai, extra = {}) => g.confirm(o, `${g.skillLabel(id)} ${prompt}`, Object.assign({ purpose: id, ai }, extra));
SGS.askSkill = ask;
async function perPoint(ev, fn) { for (let i = 0; i < ev.amount; i++) { if (!ev.target.alive) break; const r = await fn(i); if (r === false) break; } }
SGS.perPoint = perPoint;

// ===== 001 God Cao Cao =====
S['归心'] = { on: { async damaged(g, o, ev) { if (ev.target !== o) return; await perPoint(ev, async () => {
  const others = g.others(o).filter(q => q.countCards('hej'));
  if (!others.length) return false;
  if (!await ask(g, o, '归心', `Take 1 card from each other character, then flip over?`, () => others.length >= 2 || o.faceDown)) return false;
  for (const q of g.order(o)) if (q !== o && q.countCards('hej')) { const c = await g.chooseCardFrom(o, q, 'hej', `Return to Heart: take a card from ${q.label}`, { purpose: 'steal' }); if (c) await g.gain(o, [c], { from: q }); }
  await g.flip(o);
}); } } };
S['飞影'] = { mod: { distance: (g, o, a, b) => b === o ? 1 : 0 } };
// ===== 002 God Guan Yu =====
S['武神'] = { transform: (g, p, c) => c.suit === 'heart' && p.hand.includes(c) ? 'slash' : null, mod: { noDistance: (g, o, u, card) => u === o && card.key === 'slash' && card.suit === 'heart' } };
S['武魂'] = { on: {
  async damaged(g, o, ev) { if (ev.target === o && ev.source && ev.source !== o && ev.source.alive) { ev.source.addMark('nightmare', ev.amount); g.log(`${g.skillLabel('武魂')}: ${ev.source.label} gains ${ev.amount} Nightmare 梦魇 token(s).`); } },
  async death(g, o, ev) {
    if (ev.player !== o) return; const al = g.alive(); const mx = Math.max(0, ...al.map(q => q.mark('nightmare'))); if (mx <= 0) return;
    const c = al.filter(q => q.mark('nightmare') === mx);
    const t = (await g.choosePlayers(o, { min: 1, max: 1, filter: q => c.includes(q), prompt: 'War Soul 武魂: choose the character with the most Nightmare tokens', purpose: '武魂', allowDead: true, ai: cs => cs.filter(q => enemy(g, o, q))[0] || cs[0] }))[0];
    if (!t) return;
    const j = await g.judge(t, 'War Soul 武魂', x => x.key === 'peach' || x.key === 'peachgarden');
    if (j.key !== 'peach' && j.key !== 'peachgarden') { g.log(`War Soul claims ${t.label}!`, { explain: true }); await g.die(t, { source: null }); }
  } } };
// ===== 003 God Lü Meng =====
S['涉猎'] = { on: { async drawPhase(g, o, ev) {
  if (g.current !== o || ev.player !== o || ev.skipDraw) return;
  if (!await ask(g, o, '涉猎', 'Reveal the top 5 cards and take one of each suit instead of drawing?', () => true)) return;
  ev.skipDraw = true; const shown = g.takeTop(5); g.log(`Dabbling reveals ${shown.map(SGS.cardName).join(', ')}.`);
  for (const s of ['spade', 'heart', 'club', 'diamond']) {
    const of = shown.filter(c => c.suit === s && g.processing.includes(c)); if (!of.length) continue;
    let pick = of[0]; if (of.length > 1) { const r = await g.ask(o, { type: 'pickList', cards: of, min: 1, max: 1, prompt: `Dabbling: take one ${SGS.SUIT_SYM[s]} card`, purpose: 'gainBest' }); if (r && r[0]) pick = r[0]; }
    await g.gain(o, [pick], { reason: '涉猎' });
  }
  const rest = shown.filter(c => g.processing.includes(c)); if (rest.length) await g.toDiscard(rest, { reason: 'discard' });
} } };
S['攻心'] = { active: { once: true, targets: { min: 1, max: 1, filter: (g, p, t) => t !== p && t.hand.length > 0 }, cards: { min: 0, max: 0 },
  ai: (g, p) => { const t = g.others(p).filter(q => enemy(g, p, q) && q.hand.length >= 2).sort((a, b) => b.hand.length - a.hand.length)[0]; return t ? { targets: [t] } : null; },
  async run(g, p, { targets: [t] }) {
    const hearts = t.hand.filter(c => c.suit === 'heart');
    const r = await g.ask(p, { type: 'pickList', cards: t.hand.slice(), selectable: hearts, min: 0, max: 1, prompt: `Mind Assault: ${t.label}'s hand. Choose a ♥ card (optional).`, purpose: 'gongxin', target: t, ai: () => hearts.length ? [hearts.sort((a, b) => A().cardValue(g, t, b) - A().cardValue(g, t, a))[0]] : [] });
    const c = r && r[0]; if (!c || !hearts.includes(c)) return;
    const op = await g.choose(p, [{ id: 'd', label: 'Discard it' }, { id: 't', label: 'Put it on top of the deck' }], 'Mind Assault 攻心', { purpose: 'gongxinOpt', ai: () => 'd' });
    if (op === 't') { g.detach(c); g.deck.unshift(c); g.log(`${p.label} puts one of ${t.label}'s cards on top of the deck.`); await g.trigger('cardsLost', { player: t, hand: [c], equip: [], reason: 'move' }); g.update(); }
    else await g.discardCards(t, [c], { by: p });
  } } };
// ===== 004 God Lü Bu =====
S['狂暴'] = { on: {
  async gameStart(g, o, ev) { if (ev.player === o) { o.addMark('fury', 2); g.log(`${g.skillLabel('狂暴')}: ${o.label} gains 2 Fury 暴怒 tokens.`); } },
  async damageDealt(g, o, ev) { if (ev.source === o) o.addMark('fury', ev.amount); },
  async damaged(g, o, ev) { if (ev.target === o) o.addMark('fury', ev.amount); } } };
S['无谋'] = { on: { async cardUsed(g, o, ev) {
  if (ev.user !== o || !SGS.isNormalTrick(ev.card)) return;
  if (o.mark('fury') > 0) { const op = await g.choose(o, [{ id: 'm', label: 'Remove 1 Fury token' }, { id: 'h', label: 'Lose 1 HP' }], 'Reckless 无谋: pay for using a trick', { purpose: '无谋', ai: () => (o.hp > 3 && o.mark('fury') < 6) ? 'h' : 'm' }); if (op === 'm') { o.addMark('fury', -1); return; } }
  g.log(`${g.skillLabel('无谋')}: ${o.label} loses 1 HP for using a trick.`); await g.loseHp(o, 1);
} } };
S['无前'] = { active: { usable: (g, p) => p.mark('fury') >= 2 && !p.tempSkills.includes('无双'), targets: { min: 1, max: 1, filter: (g, p, t) => t !== p }, cards: { min: 0, max: 0 },
  ai: (g, p) => { if (p.mark('fury') < 2 || !p.hand.some(c => g.asCard(p, c).key === 'slash' || c.key === 'duel')) return null; const t = g.others(p).filter(q => enemy(g, p, q) && g.inRange(p, q)).sort((a, b) => a.hp - b.hp)[0]; return t ? { targets: [t] } : null; },
  async run(g, p, { targets: [t] }) { p.addMark('fury', -2); g.addTempSkill(p, '无双'); t.flags.armorNull = true; (g.turnCleanup = g.turnCleanup || []).push(() => { t.flags.armorNull = false; }); g.log(`${p.label} gains Unrivaled 无双 and ignores ${t.label}'s armour this turn.`); } } };
S['神愤'] = { active: { once: true, usable: (g, p) => p.mark('fury') >= 6, cards: { min: 0, max: 0 }, targets: { min: 0, max: 0 },
  ai: (g, p) => { const others = g.others(p); const e = others.filter(q => enemy(g, p, q)).length; return e * 2 > others.length ? {} : null; },
  async run(g, p) {
    p.addMark('fury', -6); const others = g.order(p).filter(q => q !== p);
    for (const q of others) if (q.alive) await g.damage({ source: p, target: q, amount: 1, via: '神愤' });
    for (const q of others) if (q.alive && q.equips().length) await g.discardCards(q, q.equips());
    for (const q of others) if (q.alive && q.hand.length) { const n = Math.min(4, q.hand.length); const cs = await g.chooseCards(q, { min: n, max: n, zones: 'h', prompt: `Divine Wrath: discard ${n} hand cards`, purpose: 'discard' }); await g.discardCards(q, cs); }
    if (p.alive) await g.flip(p);
  } } };
// ===== 005 God Zhuge Liang =====
async function starSwap(g, o) {
  const stars = o.piles.stars || []; if (!stars.length || !o.hand.length) return;
  const r = await g.ask(o, { type: 'swap', a: o.hand.slice(), b: stars.slice(), aLabel: 'Hand', bLabel: 'Stars 星', prompt: 'Seven Stars 七星: swap any number of hand cards with Stars (equal numbers).', purpose: 'stars' });
  if (!r || !r.a || !r.b || r.a.length !== r.b.length || !r.a.length) return;
  for (const c of r.a) { const i = o.hand.indexOf(c); if (i >= 0) o.hand.splice(i, 1); }
  for (const c of r.b) { const i = o.piles.stars.indexOf(c); if (i >= 0) o.piles.stars.splice(i, 1); }
  o.hand.push(...r.b); o.piles.stars.push(...r.a); g.log(`${o.label} swaps ${r.a.length} card(s) with Stars.`); g.update();
}
S['七星'] = { on: {
  async gameStart(g, o, ev) { if (ev.player !== o) return; const cs = []; for (let i = 0; i < 7; i++) cs.push(g.drawPile()); o.piles.stars = cs; g.log(`${g.skillLabel('七星')}: ${o.label} places 7 cards face down as Stars 星.`); g.update(); },
  async phaseEnd(g, o, ev) { if (ev.player === o && ev.phase === 'draw') await starSwap(g, o); },
  async phaseStart(g, o, ev) { if (ev.player === o && ev.phase === 'start') { for (const q of g.players) { if (q.flags.galeBy === o) { delete q.flags.galeBy; delete q.marks.gale; } if (q.flags.fogBy === o) { delete q.flags.fogBy; delete q.marks.fog; } } g.update(); } }
}, afterSetup: starSwap };
S['狂风'] = { on: {
  async phaseStart(g, o, ev) {
    if (ev.player !== o || ev.phase !== 'end' || !(o.piles.stars || []).length) return;
    const t = await g.choosePlayers(o, { min: 1, max: 1, optional: true, prompt: 'Gale 狂风: remove 1 Star — that character takes +1 fire damage until your next turn.', purpose: '狂风', ai: cs => (g.alive().some(q => q.equip.weapon && q.equip.weapon.key === 'fan' || q.hand.length > 3) ? cs.filter(q => enemy(g, o, q)).sort((a, b) => a.hp - b.hp).slice(0, 1) : []) });
    if (!t || !t.length) return; const c = o.piles.stars.pop(); await g.toDiscard([c]); t[0].flags.galeBy = o; t[0].marks.gale = 1; g.log(`${t[0].label} is marked by Gale 狂风.`); g.update();
  },
  async damageInflicting(g, o, ev) { if (ev.target.flags.galeBy === o && ev.nature === 'fire') { ev.amount++; g.log('Gale 狂风: fire damage +1.'); } } } };
S['大雾'] = { on: {
  async phaseStart(g, o, ev) {
    if (ev.player !== o || ev.phase !== 'end' || !(o.piles.stars || []).length) return;
    const n = o.piles.stars.length;
    const ts = await g.choosePlayers(o, { min: 1, max: n, optional: true, prompt: `Great Fog 大雾: remove Stars to shield that many characters from non-thunder damage until your next turn.`, purpose: '大雾', ai: cs => cs.filter(q => friend(g, o, q) && q.hp <= 2).slice(0, Math.max(0, n - 1)) });
    if (!ts || !ts.length) return;
    for (const t of ts) { const c = o.piles.stars.pop(); await g.toDiscard([c]); t.flags.fogBy = o; t.marks.fog = 1; }
    g.log(`${ts.map(t => t.label).join(', ')} are shrouded by Great Fog 大雾.`); g.update();
  },
  async damageInflicting(g, o, ev) { if (ev.target.flags.fogBy === o && ev.nature !== 'thunder') { ev.prevented = true; g.log('Great Fog 大雾 prevents the damage.', { explain: true }); } } } };
// ===== 006 God Zhou Yu =====
S['琴音'] = { on: { async phaseEnd(g, o, ev) {
  if (ev.player !== o || ev.phase !== 'discard' || (o.phaseData.handDiscarded || 0) < 2) return;
  const fr = g.alive().filter(q => friend(g, o, q)).length, en = g.alive().length - fr;
  const op = await g.choose(o, [{ id: 'lose', label: 'Everyone loses 1 HP' }, { id: 'heal', label: 'Everyone recovers 1 HP' }, { id: 'no', label: 'Do nothing' }], 'Zither Melody 琴音', { purpose: '琴音', ai: () => en > fr ? 'lose' : fr > en ? 'heal' : 'no' });
  if (op === 'lose') for (const q of g.order(o)) await g.loseHp(q, 1); else if (op === 'heal') for (const q of g.order(o)) await g.recover(q, 1, o);
} } };
S['业炎'] = { limited: true, active: {
  cards: { min: 0, max: 4, zones: 'h', filter: (g, p, c, sel) => !sel.some(x => x.suit === c.suit) },
  targets: { min: 1, max: 3, filter: (g, p, t) => true },
  check: (g, p, cards, targets) => (cards.length === 0 && targets.length >= 1 && targets.length <= 3) || (cards.length === 4 && new Set(cards.map(c => c.suit)).size === 4 && targets.length >= 1 && targets.length <= 2),
  ai: (g, p) => { const en = g.others(p).filter(q => enemy(g, p, q)).sort((a, b) => a.hp - b.hp); if (!en.length) return null; const kill = en.filter(q => q.hp <= 1); if (kill.length || en.length >= 3 || g.round > 3) return { targets: en.slice(0, 3) }; return null; },
  async run(g, p, { cards, targets }) {
    if (cards.length === 4) {
      await g.discardCards(p, cards); await g.loseHp(p, 3); if (!p.alive) return;
      let left = 3; const dist = new Map();
      if (targets.length === 1) dist.set(targets[0], 3);
      else { const n0 = await g.choose(p, [1, 2].map(k => ({ id: k, label: `${targets[0].label}: ${k}, ${targets[1].label}: ${3 - k}` })), 'Karmic Flames: distribute 3 fire damage', { purpose: 'yeyanDist', ai: () => targets[0].hp <= targets[1].hp ? 2 : 1 }); dist.set(targets[0], n0); dist.set(targets[1], 3 - n0); }
      for (const [t, n] of dist) if (t.alive) await g.damage({ source: p, target: t, amount: n, nature: 'fire', via: '业炎' });
    } else for (const t of targets) if (t.alive) await g.damage({ source: p, target: t, amount: 1, nature: 'fire', via: '业炎' });
  } } };
// ===== 007 God Sima Yi =====
S['忍戒'] = { on: {
  async damaged(g, o, ev) { if (ev.target === o) { o.addMark('ren', ev.amount); g.log(`${g.skillLabel('忍戒')}: ${o.label} gains ${ev.amount} Patience 忍.`); } },
  async discarded(g, o, ev) { if (ev.player === o && g.current === o && g.phase === 'discard' && ev.sub === 'discardPhase') o.addMark('ren', ev.cards.length); } } };
S['拜印'] = { awaken: true, on: { async phaseStart(g, o, ev) {
  if (ev.player !== o || ev.phase !== 'start' || o.flags.baiyin || o.mark('ren') <= 3) return;
  o.flags.baiyin = true; g.log(`${o.label} awakens: Seal Accepted 拜印!`, { kind: 'skill' }); await g.loseMaxHp(o, 1); if (o.alive) { g.addSkill(o, '极略'); g.addSkill(o, '极略制衡'); g.addSkill(o, '极略完杀'); }
} } };
S['极略'] = { info: { en: 'Ultimate Strategy', zh: '极略' }, on: {
  async judgeRetrial(g, o, ev) { if (o.mark('ren') < 1 || !o.hand.length) return; await guicaiRetrial(g, o, ev, () => o.addMark('ren', -1), '极略'); },
  async damaged(g, o, ev) { if (ev.target !== o || o.mark('ren') < 1) return; const t = await g.choosePlayers(o, { min: 1, max: 1, optional: true, filter: q => q !== o, prompt: 'Ultimate Strategy → Exile 放逐: remove 1 Patience; a character draws X (your lost HP) and flips over.', purpose: 'fangzhu', ai: cs => pickFangzhu(g, o, cs) }); if (t && t.length) { o.addMark('ren', -1); await g.draw(t[0], o.lostHp); await g.flip(t[0]); } },
  async cardUsed(g, o, ev) { if (ev.user !== o || !SGS.isTrick(ev.card) || ev.card.virtual || o.mark('ren') < 1) return; if (await ask(g, o, '极略', 'Remove 1 Patience to use Wisdom 集智 (draw 1)?', () => o.mark('ren') > 2)) { o.addMark('ren', -1); await g.draw(o, 1); } } } };
function pickFangzhu(g, o, cs) {
  const x = o.lostHp; const fr = cs.filter(q => friend(g, o, q) && q.faceDown); if (fr.length) return [fr[0]];
  if (x <= 1) { const en = cs.filter(q => enemy(g, o, q) && !q.faceDown); return en.length ? [en.sort((a, b) => b.hand.length - a.hand.length)[0]] : []; }
  const fr2 = cs.filter(q => friend(g, o, q) && !q.faceDown && x >= 3); if (fr2.length) return [fr2[0]];
  const en = cs.filter(q => enemy(g, o, q) && !q.faceDown); return en.length && x <= 2 ? [en[0]] : [];
}
S['极略制衡'] = { info: { en: 'Ultimate Strategy: Balance', zh: '极略·制衡' }, active: { once: true, usable: (g, p) => p.mark('ren') >= 1, cards: { min: 1, max: 99, zones: 'he' }, targets: { min: 0, max: 0 },
  ai: (g, p) => { const bad = A().junk(g, p, 'he'); return bad.length >= 2 && p.mark('ren') >= 2 ? { cards: bad } : null; },
  async run(g, p, { cards }) { p.addMark('ren', -1); await g.discardCards(p, cards); await g.draw(p, cards.length); } } };
S['极略完杀'] = { info: { en: 'Ultimate Strategy: Complete Kill', zh: '极略·完杀' }, active: { once: true, usable: (g, p) => p.mark('ren') >= 1 && !p.tempSkills.includes('完杀'), cards: { min: 0, max: 0 }, targets: { min: 0, max: 0 },
  ai: (g, p) => g.others(p).some(q => enemy(g, p, q) && q.hp <= 1 && g.inRange(p, q)) && p.mark('ren') >= 2 ? {} : null,
  async run(g, p) { p.addMark('ren', -1); g.addTempSkill(p, '完杀'); g.log(`${p.label} gains Complete Kill 完杀 this turn: only the dying character may use Peaches on themselves.`, { explain: true }); } } };
S['完杀'] = { info: { en: 'Complete Kill', zh: '完杀' }, mod: { noRescue: (g, o, q, dying) => g.current === o && q !== o && q !== dying } };
S['连破'] = { on: {
  async death(g, o, ev) { if (ev.killer === o) o.flags.lianpoTurn = g.turnCount; },
  async afterTurn(g, o, ev) { if (o.flags.lianpoTurn === g.turnCount && o.alive) { o.flags.lianpoTurn = -1; if (await ask(g, o, '连破', 'You killed someone this turn. Take an extra turn?', () => true)) g.extraTurns.push(o); } } } };
// ===== 008 God Zhao Yun =====
S['绝境'] = { mod: { maxHand: (g, o, p, m) => p === o ? m + 2 : m }, on: {
  async enterDying(g, o, ev) { if (ev.player === o) await g.draw(o, 1, { reason: '绝境' }); },
  async leaveDying(g, o, ev) { if (ev.player === o) await g.draw(o, 1, { reason: '绝境' }); } } };
const LH = { heart: 'peach', diamond: 'slash', spade: 'nullify', club: 'dodge' };
S['龙魂'] = { viewAs: { names: ['peach', 'slash', 'nullify', 'dodge'], min: 1, max: 2, zones: 'he',
  filter: (g, p, c, sel) => !sel.length || sel[0].suit === c.suit,
  valid: (g, p, cards, name) => cards.length >= 1 && cards.every(c => c.suit === cards[0].suit) && LH[cards[0].suit] === name,
  build(g, p, cards, name) { const v = g.virtual(name, cards, { nature: name === 'slash' ? 'fire' : null }); if (cards.length === 2 && red(cards[0])) v.bonus = 1; if (cards.length === 2 && black(cards[0])) v.longhunBlack = true; return v; },
  async onUse(g, p, card) { if (card.longhunBlack) { const cur = g.current; if (cur && cur.alive && cur.countCards('he')) { const c = await g.chooseCardFrom(p, cur, 'he', 'Dragon Soul: discard a card of the current-turn character', { purpose: 'dismantle' }); if (c) await g.discardCards(cur, [c], { by: p }); } } } } };
// ===== 009 Liu Bei =====
S['仁德'] = { active: { cards: { min: 1, max: 99, zones: 'h' }, targets: { min: 1, max: 1, filter: (g, p, t) => t !== p },
  ai: (g, p) => A().rendeAI(g, p),
  async run(g, p, { cards, targets: [t] }) { const before = p.phaseData.rende || 0; await g.give(p, t, cards, { reason: '仁德' }); p.phaseData.rende = before + cards.length; if (before < 2 && p.phaseData.rende >= 2) { g.log('Benevolence 仁德: after giving 2 cards, recover 1 HP.', { explain: true }); await g.recover(p, 1, p); } } } };
async function askShuSlash(g, o, need, kingdom, lordSkill, onHelp) {
  for (const q of g.order(o)) {
    if (q === o || q.kingdom !== kingdom || !q.alive) continue;
    const r = await g.respond(q, { names: [need.slashOrDodge], use: need.use, reason: lordSkill, onBehalf: o, asUse: true, prompt: `${o.label} asks for help (${g.skillLabel(lordSkill)}): ${need.use ? 'use' : 'play'} a ${need.slashOrDodge === 'slash' ? 'Strike 杀' : 'Dodge 闪'} on their behalf?`, aiHelp: friend(g, q, o) });
    if (r) { g.log(`${q.label} answers ${o.label}'s ${g.skillLabel(lordSkill)}.`, { kind: 'skill', who: q }); if (onHelp) await onHelp(q); return r.card; }
  }
  return null;
}
SGS.askShuSlash = askShuSlash;
S['激将'] = { lord: true,
  respondSpecial: { names: ['slash'], can: (g, p) => g.others(p).some(q => q.kingdom === 'shu'), async run(g, p, need) { return askShuSlash(g, p, { slashOrDodge: 'slash', use: need.use }, 'shu', '激将'); } },
  active: { usable: (g, p) => g.others(p).some(q => q.kingdom === 'shu') && g.canUse(p, g.virtual('slash', [])), cards: { min: 0, max: 0 }, targets: { min: 1, max: 1, filter: (g, p, t) => g.slashTargetOk(p, g.virtual('slash', []), t) },
    ai: (g, p) => { if (p.hand.some(c => g.asCard(p, c).key === 'slash')) return null; if (!g.others(p).some(q => q.kingdom === 'shu' && friend(g, q, p) && q.hand.length >= 2)) return null; const t = A().bestSlashTarget(g, p, g.virtual('slash', [])); return t ? { targets: [t] } : null; },
    async run(g, p, { targets: [t] }) { p.used['激将'] = 0; const c = await askShuSlash(g, p, { slashOrDodge: 'slash', use: true }, 'shu', '激将'); if (c) await g.useCard(p, c, [t]); else g.log('Nobody answers the call.'); } } };
// ===== 010 Guan Yu =====
S['武圣'] = { viewAs: { names: ['slash'], zones: 'he', filter: (g, p, c) => red(c) } };
// ===== 011 Sun Quan =====
S['制衡'] = { active: { once: true, cards: { min: 1, max: 99, zones: 'he' }, targets: { min: 0, max: 0 },
  ai: (g, p) => { const bad = A().junk(g, p, 'he'); return bad.length ? { cards: bad } : null; },
  async run(g, p, { cards }) { await g.discardCards(p, cards); await g.draw(p, cards.length, { reason: '制衡' }); } } };
S['救援'] = { lord: true, on: { async recovering(g, o, ev) { if (ev.player === o && ev.card && ev.card.key === 'peach' && ev.source && ev.source !== o && ev.source.kingdom === 'wu') { ev.amount++; g.log('Rescue 救援: the Wu Peach heals +1.', { explain: true }); } } } };
// ===== 012 Gan Ning =====
S['奇袭'] = { viewAs: { names: ['dismantle'], modes: ['use'], zones: 'he', filter: (g, p, c) => black(c) } };
// ===== 013 Huang Yueying =====
S['集智'] = { on: { async cardUsed(g, o, ev) { if (ev.user === o && SGS.isNormalTrick(ev.card) && !ev.card.virtual) { if (await ask(g, o, '集智', 'Draw 1 card?', () => true)) await g.draw(o, 1, { reason: '集智' }); } } } };
S['奇才'] = { mod: { noDistance: (g, o, u, card) => u === o && SGS.isTrick(card) } };
// ===== 014 Zhao Yun =====
S['龙胆'] = { viewAs: { names: ['slash', 'dodge'], zones: 'h', filter: (g, p, c) => { const k = g.asCard(p, c).key; return k === 'slash' || k === 'dodge'; }, valid: (g, p, cards, name) => cards.length === 1 && g.asCard(p, cards[0]).key === (name === 'slash' ? 'dodge' : 'slash') } };
// ===== 015 Zhang Fei =====
S['咆哮'] = { mod: { unlimitedSlash: (g, o, p) => o === p } };
// ===== 016 Zhou Yu =====
S['英姿'] = { on: { async drawPhase(g, o, ev) { if (ev.player === o && !ev.skipDraw) { if (await ask(g, o, '英姿', 'Draw 1 extra card?', () => true)) ev.n++; } } } };
S['反间'] = { active: { once: true, usable: (g, p) => p.hand.length > 0, cards: { min: 0, max: 0 }, targets: { min: 1, max: 1, filter: (g, p, t) => t !== p },
  ai: (g, p) => { if (p.hand.length < 1) return null; const t = g.others(p).filter(q => enemy(g, p, q)).sort((a, b) => a.hp - b.hp)[0]; return t ? { targets: [t] } : null; },
  async run(g, p, { targets: [t] }) {
    const suit = await g.choose(t, ['spade', 'heart', 'club', 'diamond'].map(s => ({ id: s, label: SGS.SUIT_SYM[s] + ' ' + s })), `Sow Discord 反间: declare a suit. You then take one of ${p.label}'s hand cards; if its suit differs you take 1 damage.`, { purpose: 'fanjianSuit', ai: () => { const cnt = {}; p.hand.forEach(c => cnt[c.suit] = (cnt[c.suit] || 0) + 1); return Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0] || 'heart'; } });
    g.log(`${t.label} declares ${SGS.SUIT_SYM[suit]}.`);
    if (!p.hand.length) return; const c = await g.chooseCardFrom(t, p, 'h', `Take one of ${p.label}'s hand cards`, { purpose: 'steal' });
    await g.gain(t, [c], { from: p }); g.log(`${t.label} takes and reveals ${SGS.cardName(c)}.`);
    if (c.suit !== suit) await g.damage({ source: p, target: t, amount: 1, via: '反间' });
  } } };
// ===== 017 Huang Gai =====
S['苦肉'] = { active: { usable: (g, p) => p.hp > 0, cards: { min: 0, max: 0 }, targets: { min: 0, max: 0 },
  ai: (g, p) => (p.hp >= 3 || (p.hp >= 2 && p.hand.some(c => c.key === 'peach' || c.key === 'wine')) || p.hand.filter(c => c.key === 'peach').length >= 1) && p.hp > 1 ? {} : null,
  async run(g, p) { await g.loseHp(p, 1); if (p.alive) await g.draw(p, 2, { reason: '苦肉' }); } } };
// ===== 018 Lü Meng =====
S['克己'] = { on: {
  async cardUsed(g, o, ev) { if (ev.user === o && ev.card.key === 'slash' && g.current === o && g.phase === 'play') o.turn.slashInPlay = true; },
  async cardPlayed(g, o, ev) { if (ev.player === o && ev.card.key === 'slash' && g.current === o && g.phase === 'play') o.turn.slashInPlay = true; },
  async phaseBefore(g, o, ev) { if (ev.player === o && ev.phase === 'discard' && (!o.turn.hadPlay || !o.turn.slashInPlay) && g.handCountForLimit(o) > g.maxHand(o)) { if (await ask(g, o, '克己', 'You used no Strike this turn — skip your discard phase?', () => true)) ev.skip = true; } } } };
// ===== 019 Ma Chao =====
S['马术'] = { mod: { distance: (g, o, a, b) => a === o ? -1 : 0 } };
S['铁骑'] = { on: { async targetChosen(g, o, ev) {
  if (ev.user !== o || ev.card.key !== 'slash') return;
  if (!await ask(g, o, '铁骑', `Judge: if red, ${ev.target.label} cannot Dodge this Strike.`, () => enemy(g, o, ev.target))) return;
  const j = await g.judge(o, 'Iron Cavalry 铁骑', red); if (red(j)) { ev.use.noDodge.add(ev.target); g.log(`Red! ${ev.target.label} cannot Dodge.`, { explain: true }); }
} } };
// ===== 020 Zhuge Liang =====
S['观星'] = { on: { async phaseStart(g, o, ev) {
  if (ev.player !== o || ev.phase !== 'start') return;
  if (!await ask(g, o, '观星', 'Look at the top cards of the deck and rearrange them?', () => true)) return;
  const x = Math.min(5, g.alive().length); const cs = g.peekTop(x);
  const r = await g.ask(o, { type: 'guanxing', cards: cs.slice(), prompt: `Stargazing 观星: arrange the top ${x} cards. Cards on "Top" are drawn first; the rest go to the bottom.`, purpose: 'guanxing' });
  const top = (r && r.top) || cs, bottom = (r && r.bottom) || [];
  for (const c of cs) g.deck.splice(g.deck.indexOf(c), 1);
  g.deck.unshift(...top); g.deck.push(...bottom); g.log(`${o.label} puts ${top.length} on top and ${bottom.length} on the bottom.`); g.update();
} } };
S['空城'] = { mod: { prohibit: (g, o, u, card, t) => t === o && o.hand.length === 0 && (card.key === 'slash' || card.key === 'duel') } };
// ===== 021 Guo Jia =====
S['天妒'] = { on: { async judgeDone(g, o, ev) { if (ev.player === o && g.processing.includes(ev.card)) { if (await ask(g, o, '天妒', `Take the judgement card ${SGS.cardName(ev.card)}?`, () => true)) await g.gain(o, [ev.card], { reason: '天妒' }); } } } };
S['遗计'] = { on: { async damaged(g, o, ev) { if (ev.target !== o) return; await perPoint(ev, async () => {
  if (!await ask(g, o, '遗计', 'Look at the top 2 cards and give them out?', () => true)) return false;
  const cs = g.takeTop(2);
  for (const c of cs) {
    const t = (await g.choosePlayers(o, { min: 1, max: 1, prompt: `Bequeathed Strategy 遗计: give ${SGS.cardName(c)} to whom?`, purpose: 'yiji', card: c, ai: cands => [A().giveTarget(g, o, c, cands)] }))[0] || o;
    await g.gain(t, [c], { reason: '遗计', from: o });
  }
}); } } };
// ===== 022 Zhang Liao =====
S['突袭'] = { on: { async drawPhase(g, o, ev) {
  if (ev.player !== o || ev.skipDraw) return; const c = g.others(o).filter(q => q.hand.length);
  if (!c.length) return;
  const ts = await g.choosePlayers(o, { min: 1, max: 2, optional: true, filter: q => q !== o && q.hand.length > 0, prompt: 'Surprise Attack 突袭: instead of drawing, take a hand card from 1–2 other characters.', purpose: '突袭', ai: cs => { const e = cs.filter(q => enemy(g, o, q)).sort((a, b) => b.hand.length - a.hand.length); return e.length >= 2 ? e.slice(0, 2) : []; } });
  if (!ts || !ts.length) return; ev.skipDraw = true;
  for (const t of ts) if (t.hand.length) { const c = await g.chooseCardFrom(o, t, 'h', 'take a card', { purpose: 'steal' }); await g.gain(o, [c], { from: t }); g.log(`${o.label} takes a card from ${t.label}.`); }
} } };
// ===== 023 Lu Xun =====
S['谦逊'] = { mod: { prohibit: (g, o, u, card, t) => t === o && (card.key === 'steal' || card.key === 'indulgence') } };
S['连营'] = { on: { async cardsLost(g, o, ev) { if (ev.player === o && ev.hand.length && o.hand.length === 0 && o.alive) { if (await ask(g, o, '连营', 'You have no hand cards — draw 1?', () => true)) await g.draw(o, 1, { reason: '连营' }); } } } };
// ===== 024 Sun Shangxiang =====
S['结姻'] = { active: { once: true, cards: { min: 2, max: 2, zones: 'h' }, targets: { min: 1, max: 1, filter: (g, p, t) => t.gender === 'male' && t.wounded && t !== p },
  ai: (g, p) => { const t = g.others(p).filter(q => q.gender === 'male' && q.wounded && friend(g, p, q))[0]; if (!t || (!p.wounded && p.hand.length < 4)) return null; const cs = A().junk(g, p, 'h', 2); return cs.length === 2 ? { cards: cs, targets: [t] } : null; },
  async run(g, p, { cards, targets: [t] }) { await g.discardCards(p, cards); await g.recover(p, 1, p); await g.recover(t, 1, p); } } };
S['枭姬'] = { on: { async cardsLost(g, o, ev) { if (ev.player !== o) return; for (const c of ev.equip) { if (!o.alive) break; if (await ask(g, o, '枭姬', `You lost ${SGS.cardName(c)} from your equipment — draw 2?`, () => true)) await g.draw(o, 2, { reason: '枭姬' }); } } } };
// ===== 025 Cao Cao =====
S['奸雄'] = { on: { async damaged(g, o, ev) { if (ev.target !== o || !ev.card) return; const cs = g.realCards(ev.card).filter(c => g.processing.includes(c) || g.discard.includes(c)); if (!cs.length) return; if (await ask(g, o, '奸雄', `Take ${cs.map(SGS.cardName).join(', ')}?`, () => true)) await g.gain(o, cs, { reason: '奸雄' }); } } };
S['护驾'] = { lord: true, respondSpecial: { names: ['dodge'], can: (g, p) => g.others(p).some(q => q.kingdom === 'wei'), async run(g, p, need) { return askShuSlash(g, p, { slashOrDodge: 'dodge', use: need.use }, 'wei', '护驾'); } } };
// ===== 026 Xu Chu =====
S['裸衣'] = { on: {
  async drawPhase(g, o, ev) { if (ev.player === o && !ev.skipDraw && ev.n > 0) { if (await ask(g, o, '裸衣', 'Draw 1 fewer card; your Strikes and Duels deal +1 damage this turn?', () => A().luoyiAI(g, o))) { ev.n--; o.turn.luoyi = true; } } },
  async damageCausing(g, o, ev) { if (ev.source === o && o.turn.luoyi && g.current === o && ev.card && (ev.card.key === 'slash' || ev.card.key === 'duel')) { ev.amount++; g.log('Bare-Chested 裸衣: +1 damage.', { explain: true }); } } } };
// ===== 027 Sima Yi =====
async function guicaiRetrial(g, o, ev, pay, id) {
  const r = await g.chooseCards(o, { min: 1, max: 1, zones: 'h', optional: true, prompt: `${g.skillLabel(id)}: replace ${ev.player.label}'s judgement card ${SGS.cardName(ev.card)} (${ev.reason}) with a hand card?`, purpose: 'retrial', judge: ev, ai: () => A().retrialAI(g, o, ev) });
  if (!r || !r.length) return; if (pay) pay();
  g.log(`${o.label} uses ${g.skillLabel(id === '极略' ? '极略' : '鬼才')}.`, { kind: 'skill', who: o });
  await g.retrial(o, ev, r[0]);
}
SGS.guicaiRetrial = guicaiRetrial;
S['鬼才'] = { on: { async judgeRetrial(g, o, ev) { if (o.hand.length) await guicaiRetrial(g, o, ev, null, '鬼才'); } } };
S['反馈'] = { on: { async damaged(g, o, ev) { const s = ev.source; if (ev.target !== o || !s || s === o || !s.alive || !s.countCards('he')) return; if (await ask(g, o, '反馈', `Take a card from ${s.label}?`, () => !friend(g, o, s))) { const c = await g.chooseCardFrom(o, s, 'he', 'Feedback: take a card', { purpose: 'steal' }); if (c) await g.gain(o, [c], { from: s }); } } } };
// ===== 028 Zhen Ji =====
S['洛神'] = { on: { async phaseStart(g, o, ev) {
  if (ev.player !== o || ev.phase !== 'start') return;
  for (let i = 0; i < 30; i++) {
    if (!o.alive || !await ask(g, o, '洛神', 'Perform a judgement — if black, keep it and you may repeat.', () => true)) return;
    const j = await g.judge(o, 'Goddess Luo 洛神', black, { take: black });
    if (!black(j)) return;
  }
} } };
S['倾国'] = { viewAs: { names: ['dodge'], zones: 'h', filter: (g, p, c) => black(c) } };
// ===== 029 Da Qiao =====
S['国色'] = { viewAs: { names: ['indulgence'], modes: ['use'], zones: 'he', filter: (g, p, c) => c.suit === 'diamond' } };
S['流离'] = { on: { async becomeTarget(g, o, ev) {
  if (ev.target !== o || ev.card.key !== 'slash' || !o.countCards('he')) return;
  const cands = g.alive().filter(q => q !== o && q !== ev.user && g.inRange(o, q) && !ev.use.targets.includes(q) && !g.prohibited(ev.user, ev.card, q));
  if (!cands.length) return;
  const t = await g.choosePlayers(o, { min: 1, max: 1, optional: true, filter: q => cands.includes(q), prompt: `Displacement 流离: discard a card to redirect ${ev.user.label}'s Strike to someone in your attack range?`, purpose: '流离', ai: cs => { const e = cs.filter(q => enemy(g, o, q)).sort((a, b) => a.hp - b.hp); return e.length && (o.hp <= 2 || !o.hand.some(c => g.asCard(o, c).key === 'dodge')) ? [e[0]] : []; } });
  if (!t || !t.length) return;
  const cs = await g.chooseCards(o, { min: 1, max: 1, zones: 'he', prompt: 'Displacement: discard a card', purpose: 'discard' }); await g.discardCards(o, cs);
  const i = ev.use.targets.indexOf(o); ev.use.targets[i] = t[0]; ev.target = t[0]; g.log(`${o.label} redirects the Strike to ${t[0].label}!`, { explain: true });
  await g.trigger('becomeTarget', { user: ev.user, card: ev.card, target: t[0], use: ev.use }, t[0]);
} } };
// ===== 030 Xiahou Dun =====
S['刚烈'] = { on: { async damaged(g, o, ev) {
  const s = ev.source; if (ev.target !== o || !s || !s.alive || s === o) return;
  if (!await ask(g, o, '刚烈', `Judge against ${s.label}: if not ♥, they discard 2 hand cards or take 1 damage.`, () => !friend(g, o, s))) return;
  const j = await g.judge(o, 'Unyielding 刚烈', c => c.suit !== 'heart'); if (j.suit === 'heart' || !s.alive) return;
  let ok = false;
  if (s.hand.length >= 2) { const op = await g.choose(s, [{ id: 'd', label: 'Discard 2 hand cards' }, { id: 't', label: 'Take 1 damage' }], `Unyielding 刚烈 (${o.label})`, { purpose: 'ganglie', ai: () => (s.hp <= 1 || s.hand.length >= 4) ? 'd' : 't' }); if (op === 'd') { const cs = await g.chooseCards(s, { min: 2, max: 2, zones: 'h', prompt: 'Discard 2 hand cards', purpose: 'discard' }); await g.discardCards(s, cs); ok = true; } }
  if (!ok) await g.damage({ source: o, target: s, amount: 1, via: '刚烈' });
} } };
})(typeof window !== 'undefined' ? window : globalThis);
