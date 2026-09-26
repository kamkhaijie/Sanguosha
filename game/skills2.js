/* Sanguosha — general skills, part 2 (031–060) */
(function (G) {
'use strict';
const SGS = G.SGS; const S = SGS.SKILLS; const CAT = SGS.CAT;
const A = () => SGS.AI; const { red, black, enemy, friend } = SGS.H; const ask = SGS.askSkill; const perPoint = SGS.perPoint;
const typeOf = c => SGS.type(c);

// ===== 031 Ma Su =====
S['散谣'] = { active: {
  usable: (g, p) => !(p.phaseData.sanyaoHp && p.phaseData.sanyaoHand),
  cards: { min: 1, max: 1, zones: 'he' }, targets: { min: 1, max: 1, filter: (g, p, t) => sanyaoOpts(g, p, t).length > 0 },
  ai: (g, p) => { const ts = g.alive().filter(t => sanyaoOpts(g, p, t).length && enemy(g, p, t)); if (!ts.length) return null; const cs = A().junk(g, p, 'he', 1); return cs.length ? { cards: cs, targets: [ts.sort((a, b) => a.hp - b.hp)[0]] } : null; },
  async run(g, p, { cards, targets: [t] }) {
    let ops = sanyaoOpts(g, p, t); let op = ops[0];
    if (ops.length > 1) op = await g.choose(p, ops.map(o => ({ id: o, label: o === 'hp' ? 'As the highest-HP character' : 'As the character with most hand cards' })), 'Spread Rumors 散谣', { purpose: 'sanyao', ai: () => ops[0] });
    p.phaseData[op === 'hp' ? 'sanyaoHp' : 'sanyaoHand'] = true; p.used['散谣'] = 0;
    await g.discardCards(p, cards); await g.damage({ source: p, target: t, amount: 1, via: '散谣' });
  } } };
function sanyaoOpts(g, p, t) {
  const al = g.alive(); const r = [];
  if (!p.phaseData.sanyaoHp && t.hp === Math.max(...al.map(q => q.hp))) r.push('hp');
  if (!p.phaseData.sanyaoHand && t.hand.length === Math.max(...al.map(q => q.hand.length))) r.push('hand');
  return r;
}
S['制蛮'] = { on: { async damageCausing(g, o, ev) {
  if (ev.source !== o || ev.target === o || ev.prevented) return; const t = ev.target;
  if (!await ask(g, o, '制蛮', `Prevent the damage to ${t.label} and take one of their cards instead?`, () => friend(g, o, t) || (t.hp > ev.amount + 1 && t.countCards('ej') && !t.judgeArea.length === false))) return;
  ev.prevented = true; ev.silentPrevent = true; g.log(`${o.label} uses Subdue the Man 制蛮: damage prevented.`);
  if (t.countCards('hej')) { const c = await g.chooseCardFrom(o, t, 'hej', 'Subdue the Man: take a card', { purpose: friend(g, o, t) ? 'helpFriend' : 'steal' }); if (c) await g.gain(o, [c], { from: t }); }
} } };
// ===== 032 Hua Tuo =====
S['急救'] = { viewAs: { names: ['peach'], modes: ['use'], zones: 'he', filter: (g, p, c) => red(c), when: (g, p) => g.current !== p } };
S['青囊'] = { active: { once: true, cards: { min: 1, max: 1, zones: 'h' }, targets: { min: 1, max: 1, filter: (g, p, t) => t.wounded },
  ai: (g, p) => { const t = g.alive().filter(q => q.wounded && friend(g, p, q)).sort((a, b) => a.hp - b.hp)[0]; if (!t) return null; const cs = A().junk(g, p, 'h', 1); return cs.length ? { cards: cs, targets: [t] } : null; },
  async run(g, p, { cards, targets: [t] }) { await g.discardCards(p, cards); await g.recover(t, 1, p); } } };
// ===== 033 Lü Bu =====
S['无双'] = { info: { en: 'Unrivaled', zh: '无双' }, mod: { doubleDodge: (g, o, user) => user === o } };
// ===== 034 Gao Shun =====
S['陷阵'] = { active: { once: true, usable: (g, p) => p.hand.length > 0, cards: { min: 0, max: 0 }, targets: { min: 1, max: 1, filter: (g, p, t) => t !== p && t.hand.length > 0 },
  ai: (g, p) => { const hi = p.hand.filter(c => c.rank >= 11); if (!hi.length) return null; const t = g.others(p).filter(q => enemy(g, p, q) && q.hand.length).sort((a, b) => a.hp - b.hp)[0]; return t ? { targets: [t] } : null; },
  async run(g, p, { targets: [t] }) {
    const r = await g.pindian(p, t, '陷阵'); if (!r) return;
    if (r.win) { p.turn.xianzhen = t; g.log(`Break Formation 陷阵: this turn ${p.label} ignores distance, Strike limits and armour against ${t.label}.`, { explain: true }); }
    else { p.turn.noSlash = true; p.turn.slashExempt = true; g.log(`${p.label} can't use Strikes this turn.`, { explain: true }); }
  } },
  mod: {
    noDistance: (g, o, u, card, t) => u === o && o.turn.xianzhen === t,
    slashUnlimitedVs: (g, o, u, t) => u === o && o.turn.xianzhen === t,
    blockCard: (g, o, p, card, mode) => p === o && o.turn.noSlash && card.key === 'slash' && mode === 'use',
  },
  on: {
    async targetChosen(g, o, ev) { if (ev.user === o && o.turn.xianzhen === ev.target) ev.use.ignoreArmor.add(ev.target); },
    async cardUsed(g, o, ev) { const t = o.turn && o.turn.xianzhen; if (ev.user !== o || !t || !t.alive || ev.response || ev.targets.length !== 1 || ev.targets[0] === t) return; if (!(ev.card.key === 'slash' || SGS.isNormalTrick(ev.card)) || ['nullify'].includes(ev.card.key)) return; if (g.prohibited(o, ev.card, t)) return; if (await ask(g, o, '陷阵', `Also target ${t.label}?`, () => enemy(g, o, t))) { ev.targets.push(t); g.log(`${t.label} is added as an extra target.`); } } } };
S['禁酒'] = { transform: (g, p, c) => c.key === 'wine' && p.hand.includes(c) ? 'slash' : null };
// ===== 035 Hua Xiong =====
S['耀武'] = { on: { async damaged(g, o, ev) {
  const s = ev.source; if (ev.target !== o || !s || !s.alive || !ev.card || ev.card.key !== 'slash' || !red(ev.card)) return;
  g.log(`Show Off Force 耀武: ${s.label} hit ${o.label} with a red Strike, so ${SGS.they(s).they} get${SGS.they(s).s} a reward.`, { explain: true });
  const op = s.wounded ? await g.choose(s, [{ id: 'h', label: 'Recover 1 HP' }, { id: 'd', label: 'Draw 1 card' }], 'Show Off Force 耀武', { purpose: 'yaowu', ai: () => s.hp <= 2 ? 'h' : 'd' }) : 'd';
  if (op === 'h') await g.recover(s, 1, s); else await g.draw(s, 1);
} } };
// ===== 036 Fa Zheng =====
S['恩怨'] = { on: {
  async damaged(g, o, ev) { const s = ev.source; if (ev.target !== o || !s || s === o) return; await perPoint(ev, async () => {
    if (!s.alive || !await ask(g, o, '恩怨', `Make ${s.label} give you a hand card or lose 1 HP?`, () => !friend(g, o, s))) return false;
    let gave = false;
    if (s.hand.length) { const cs = await g.chooseCards(s, { min: 1, max: 1, zones: 'h', optional: true, prompt: `Grudge 恩怨: give ${o.label} a hand card, or lose 1 HP.`, purpose: 'giveToEnemy', ai: () => s.hp <= 1 || s.hand.length > 2 ? A().junk(g, s, 'h', 1) : null }); if (cs && cs.length) { await g.give(s, o, cs); gave = true; } }
    if (!gave) await g.loseHp(s, 1);
  }); },
  async gained(g, o, ev) { if (ev.player === o && ev.from && ev.from !== o && ev.from.alive && ev.cards.length >= 2) { if (await ask(g, o, '恩怨', `Gratitude: let ${ev.from.label} draw 1 card?`, () => friend(g, o, ev.from))) await g.draw(ev.from, 1); } } } };
S['眩惑'] = { on: { async drawPhase(g, o, ev) {
  if (ev.player !== o || ev.skipDraw) return;
  const t = await g.choosePlayers(o, { min: 1, max: 1, optional: true, filter: q => q !== o, prompt: 'Dazzle 眩惑: instead of drawing, have another character draw 2, then they Strike your chosen victim or give you 2 cards.', purpose: '眩惑', ai: cs => { const f = cs.filter(q => friend(g, o, q) && g.others(q).some(v => enemy(g, o, v) && g.inRange(q, v))); return f.length ? [f[0]] : []; } });
  if (!t || !t.length) return; ev.skipDraw = true; const q = t[0];
  await g.draw(q, 2, { reason: '眩惑' });
  const victims = g.alive().filter(v => v !== q && g.inRange(q, v) && !g.prohibited(q, g.virtual('slash', []), v));
  let did = false;
  if (victims.length) {
    const v = (await g.choosePlayers(o, { min: 1, max: 1, filter: x => victims.includes(x), prompt: `Dazzle: choose who ${q.label} must Strike`, purpose: 'victim', ai: cs => [cs.filter(x => enemy(g, o, x)).sort((a, b) => a.hp - b.hp)[0] || cs[0]] }))[0];
    const r = await g.respond(q, { names: ['slash'], use: true, reason: 'borrow', asUse: true, victim: v, prompt: `Dazzle: Strike ${v.label}, or let ${o.label} take 2 of your cards.`, aiHelp: !friend(g, q, v) });
    if (r) { did = true; await g.useCard(q, r.card, [v], { noCount: true }); }
  }
  if (!did && q.alive && q.countCards('he')) { for (let i = 0; i < 2 && q.countCards('he'); i++) { const c = await g.chooseCardFrom(o, q, 'he', 'Dazzle: take a card', { purpose: 'steal' }); if (c) await g.gain(o, [c], { from: q }); } }
} } };
// ===== 037 Chen Gong =====
S['明策'] = { active: { once: true, cards: { min: 1, max: 1, zones: 'he', filter: (g, p, c) => c.key === 'slash' || CAT[c.key].type === 'equip' }, targets: { min: 1, max: 1, filter: (g, p, t) => t !== p },
  ai: (g, p) => { const c = p.cards('he').filter(c => c.key === 'slash' || CAT[c.key].type === 'equip').sort((a, b) => A().cardValue(g, p, a) - A().cardValue(g, p, b))[0]; const t = g.others(p).filter(q => friend(g, p, q))[0]; return c && t ? { cards: [c], targets: [t] } : null; },
  async run(g, p, { cards, targets: [t] }) {
    await g.give(p, t, cards);
    const victims = g.alive().filter(v => v !== t && g.inRange(t, v) && !g.prohibited(t, g.virtual('slash', []), v));
    let v = null;
    if (victims.length) v = (await g.choosePlayers(p, { min: 1, max: 1, filter: x => victims.includes(x), prompt: `Brilliant Plan: choose a victim for ${t.label}'s Strike`, purpose: 'victim', ai: cs => [cs.filter(x => enemy(g, p, x)).sort((a, b) => a.hp - b.hp)[0] || cs[0]] }))[0];
    const op = v ? await g.choose(t, [{ id: 'draw', label: 'Draw 1 card' }, { id: 'slash', label: `Strike ${v.label}` }], 'Brilliant Plan 明策', { purpose: 'mingce', ai: () => enemy(g, t, v) ? 'slash' : 'draw' }) : 'draw';
    if (op === 'slash' && v) await g.useCard(t, g.virtual('slash', []), [v], { noCount: true });
    else await g.draw(t, 1);
  } } };
S['智迟'] = { on: { async becomeTarget(g, o, ev) { if (ev.target === o && g.current !== o && (o.damagedThisTurn || 0) > 0 && (ev.card.key === 'slash' || SGS.isNormalTrick(ev.card))) { ev.use.noEffect.add(o); g.log(`Slow Wit 智迟: ${o.label} was already hurt this turn, so the card has no effect on them.`, { explain: true }); } } } };
// ===== 038 Zhang Chunhua =====
S['绝情'] = { on: { async damageCausing(g, o, ev) { if (ev.source === o && !ev.prevented) { ev.toHpLoss = true; g.log('Heartless 绝情: the damage becomes HP loss.', { explain: true }); } } } };
async function shangshi(g, o) { if (!o.alive || o.dying) return; const x = o.lostHp; if (o.hand.length < x) { if (await ask(g, o, '伤逝', `Draw up to ${x} hand cards?`, () => true)) await g.draw(o, x - o.hand.length, { reason: '伤逝' }); } }
S['伤逝'] = { on: {
  async cardsLost(g, o, ev) { if (ev.player === o && ev.hand.length) await shangshi(g, o); },
  async damaged(g, o, ev) { if (ev.target === o) await shangshi(g, o); },
  async hpLost(g, o, ev) { if (ev.player === o) await shangshi(g, o); } } };
// ===== 039 Diaochan =====
S['离间'] = { active: { once: true, cards: { min: 1, max: 1, zones: 'he' }, targets: { min: 2, max: 2, filter: (g, p, t, sel) => t.gender === 'male' && t !== p && (sel.length === 0 || !g.prohibited(sel[0], g.virtual('duel', []), t)) },
  ai: (g, p) => A().lijianAI(g, p),
  async run(g, p, { cards, targets: [a, b] }) { await g.discardCards(p, cards); if (a.alive && b.alive) await g.useCard(a, g.virtual('duel', [], { lijian: true }), [b]); } } };
S['闭月'] = { on: { async phaseStart(g, o, ev) { if (ev.player === o && ev.phase === 'end') { if (await ask(g, o, '闭月', 'Draw 1 card?', () => true)) await g.draw(o, 1, { reason: '闭月' }); } } } };
// ===== 040 Yuan Shu =====
S['妄尊'] = { on: { async phaseStart(g, o, ev) { const l = ev.player; if (ev.phase !== 'start' || l.role !== 'lord' || l === o) return; if (await ask(g, o, '妄尊', `Draw 1 card? (The Lord's hand limit is −1 this turn.)`, () => true)) { await g.draw(o, 1, { reason: '妄尊' }); l.turn.maxHandAdd = (l.turn.maxHandAdd || 0) - 1; } } } };
S['同疾'] = { mod: { prohibit: (g, o, u, card, t) => card.key === 'slash' && u && u !== o && t !== o && o.hand.length > o.hp && g.inRange(u, o) } };
// ===== 041 Yu Jin =====
S['镇军'] = { on: { async phaseStart(g, o, ev) {
  if (ev.player !== o || ev.phase !== 'start') return;
  const t = await g.choosePlayers(o, { min: 1, max: 1, optional: true, filter: q => q.countCards('he') > 0, prompt: 'Garrison 镇军: discard X cards from a character (X = their hand count − HP, at least 1).', purpose: '镇军', ai: cs => { const e = cs.filter(q => enemy(g, o, q) && q.hand.length - q.hp >= 1).sort((a, b) => (b.hand.length - b.hp) - (a.hand.length - a.hp)); return e.length ? [e[0]] : []; } });
  if (!t || !t.length) return; const q = t[0]; const x = Math.max(1, q.hand.length - q.hp);
  const got = []; for (let i = 0; i < x && q.countCards('he'); i++) { const c = await g.chooseCardFrom(o, q, 'he', `Garrison: discard ${x} of ${q.label}'s cards (${i + 1}/${x})`, { purpose: 'dismantle' }); if (!c) break; got.push(c); await g.discardCards(q, [c], { by: o }); }
  const k = got.filter(c => CAT[c.key].type !== 'equip').length; if (!k || !q.alive) return;
  const canDisc = o.countCards('he') >= k;
  const op = canDisc ? await g.choose(o, [{ id: 'me', label: `You discard ${k} card(s)` }, { id: 'them', label: `${q.label} draws ${k}` }], 'Garrison 镇军', { purpose: 'zhenjun', ai: () => friend(g, o, q) ? 'them' : (o.countCards('he') > k + 2 ? 'me' : 'them') }) : 'them';
  if (op === 'me') { const cs = await g.chooseCards(o, { min: k, max: k, zones: 'he', prompt: `Discard ${k} card(s)`, purpose: 'discard' }); await g.discardCards(o, cs); } else await g.draw(q, k);
} } };
// ===== 042 Cao Zhi =====
S['落英'] = { on: { async toDiscardPile(g, o, ev) {
  if (!ev.owner || ev.owner === o || !(ev.reason === 'discard' || ev.reason === 'judge')) return;
  const clubs = ev.cards.filter(c => c.suit === 'club' && g.discard.includes(c)); if (!clubs.length) return;
  const r = clubs.length === 1 ? (await ask(g, o, '落英', `Take ${SGS.cardName(clubs[0])}?`, () => true) ? clubs : null) : await g.ask(o, { type: 'pickList', cards: clubs, min: 0, max: clubs.length, prompt: 'Fallen Petals 落英: take any of these ♣ cards', purpose: 'gainBest', ai: () => clubs });
  if (r && r.length) { g.log(`${o.label} uses ${g.skillLabel('落英')}.`, { kind: 'skill', who: o }); await g.gain(o, r, { reason: '落英' }); }
} } };
S['酒诗'] = { viewAs: { names: ['wine'], min: 0, max: 0, when: (g, p) => !p.faceDown, build: (g, p) => g.virtual('wine', [], { color: 'none' }), async onUse(g, p) { const dying = p.dying || p.hp <= 0; await g.flip(p); p.flags.jiushiFlip = !dying; if (dying) g.log('Wine Poetry 酒诗 was used to survive dying, so Cao Zhi cannot flip back up after damage this time.', { explain: true }); } },
  on: {
    async damaged(g, o, ev) { if (ev.target === o && o.faceDown && o.alive && o.flags.jiushiFlip) { if (await ask(g, o, '酒诗', 'Flip back face up?', () => true)) { o.flags.jiushiFlip = false; await g.flip(o); } } },
    async flipped(g, o, ev) { if (ev.player === o && ev.faceUp) o.flags.jiushiFlip = false; } } };
// ===== 043 Wu Guotai =====
S['甘露'] = { active: { once: true, cards: { min: 0, max: 0 }, targets: { min: 2, max: 2, filter: (g, p, t, sel) => sel.length === 0 ? true : Math.abs(sel[0].equips().length - t.equips().length) <= p.lostHp && (sel[0].equips().length + t.equips().length > 0) },
  ai: (g, p) => A().ganluAI(g, p),
  async run(g, p, { targets: [a, b] }) {
    const ea = a.equips(), eb = b.equips();
    await g.moveCards(ea.concat(eb), { to: 'processing' }, { reason: 'swap' });
    for (const c of eb) { g.processing.splice(g.processing.indexOf(c), 1); a.equip[CAT[c.key].sub] = c; }
    for (const c of ea) { g.processing.splice(g.processing.indexOf(c), 1); b.equip[CAT[c.key].sub] = c; }
    g.log(`${a.label} and ${b.label} swap equipment.`); g.update();
  } } };
S['补益'] = { on: { async enterDying(g, o, ev) {
  const t = ev.player; if (!t.hand.length || !o.alive) return;
  if (!await ask(g, o, '补益', `Reveal one of ${t.label}'s hand cards — if it isn't basic, they discard it and recover 1 HP?`, () => friend(g, o, t))) return;
  const c = await g.chooseCardFrom(o, t, 'h', 'Aid: reveal a card', { purpose: 'reveal' }); g.log(`Revealed: ${SGS.cardName(c)}.`);
  if (SGS.type(c) !== 'basic') { await g.discardCards(t, [c]); await g.recover(t, 1, o); }
} } };
// ===== 044 Xu Sheng =====
S['破军'] = { on: {
  async targetChosen(g, o, ev) {
    const t = ev.target; if (ev.user !== o || ev.card.key !== 'slash' || g.phase !== 'play' || g.current !== o || !t.countCards('he') || t.hp <= 0) return;
    if (!await ask(g, o, '破军', `Set aside up to ${t.hp} of ${t.label}'s cards until the end of the turn?`, () => enemy(g, o, t))) return;
    for (let i = 0; i < t.hp && t.countCards('he'); i++) {
      if (i > 0 && !await g.confirm(o, `Break Army: set aside another card? (${i}/${t.hp})`, { purpose: '破军more', ai: () => true })) break;
      const c = await g.chooseCardFrom(o, t, 'he', 'Break Army: choose a card to set aside', { purpose: 'dismantle' }); if (!c) break;
      await g.moveCards([c], { to: 'pile', player: t, pile: 'pojun' }, { reason: 'move' });
    }
    g.log(`${o.label} sets aside ${(t.piles.pojun || []).length} of ${t.label}'s cards.`);
  },
  async afterTurn(g, o, ev) { for (const q of g.players) if (q.piles.pojun && q.piles.pojun.length) { const cs = q.piles.pojun.splice(0); if (q.alive) { q.hand.push(...cs); g.log(`${q.label} takes back ${cs.length} set-aside card(s).`); } else g.discard.push(...cs); g.update(); } } } };
// ===== 045 Ling Tong =====
async function xuanfeng(g, o) {
  if (!g.others(o).some(q => q.countCards('he'))) return;
  if (!await ask(g, o, '旋风', 'Discard up to 2 cards in total from 1–2 other characters?', () => g.others(o).some(q => enemy(g, o, q) && q.countCards('he')))) return;
  for (let i = 0; i < 2; i++) {
    const t = await g.choosePlayers(o, { min: 1, max: 1, optional: i > 0, filter: q => q !== o && q.countCards('he') > 0, prompt: `Whirlwind: choose a character to discard a card from (${i + 1}/2)`, purpose: 'xuanfeng', ai: cs => { const e = cs.filter(q => enemy(g, o, q)).sort((a, b) => b.equips().length - a.equips().length); return e.length ? [e[0]] : []; } });
    if (!t || !t.length) break; const c = await g.chooseCardFrom(o, t[0], 'he', 'Whirlwind: discard a card', { purpose: 'dismantle' }); if (c) await g.discardCards(t[0], [c], { by: o });
  }
}
S['旋风'] = { on: {
  async phaseEnd(g, o, ev) { if (ev.player === o && ev.phase === 'discard' && (o.phaseData.handDiscarded || 0) >= 2) await xuanfeng(g, o); },
  async cardsLost(g, o, ev) { if (ev.player === o && ev.equip.length && o.alive) await xuanfeng(g, o); } } };
// ===== 046 Xun You =====
S['奇策'] = { viewAs: { names: ['dismantle', 'steal', 'duel', 'barbarian', 'arrows', 'peachgarden', 'harvest', 'borrow', 'exnihilo', 'fireattack', 'chain'], modes: ['use'], min: 1, max: 99, zones: 'h',
  when: (g, p, ctx) => g.current === p && g.phase === 'play' && !p.phaseData.qice && ctx.mode === 'use' && p.hand.length > 0,
  valid: (g, p, cards) => cards.length === p.hand.length,
  build: (g, p, cards, name) => g.virtual(name, cards),
  async onUse(g, p) { p.phaseData.qice = true; } } };
S['智愚'] = { on: { async damaged(g, o, ev) {
  if (ev.target !== o) return; if (!await ask(g, o, '智愚', 'Draw 1 and reveal your hand — if all one colour, the damage source discards a hand card.', () => true)) return;
  await g.draw(o, 1, { reason: '智愚' }); if (!o.hand.length) return; g.log(`${o.label} reveals: ${o.hand.map(SGS.cardName).join(', ')}.`);
  const cols = new Set(o.hand.map(SGS.color)); const s = ev.source;
  if (cols.size === 1 && s && s.alive && s.hand.length) { const cs = await g.chooseCards(s, { min: 1, max: 1, zones: 'h', prompt: 'Wise Fool 智愚: discard a hand card', purpose: 'discard' }); await g.discardCards(s, cs); }
} } };
// ===== 047 Cao Zhang =====
S['将驰'] = { on: { async phaseEnd(g, o, ev) {
  if (ev.player !== o || ev.phase !== 'draw') return;
  const ops = [{ id: 'draw', label: 'Draw 1 (no Strikes this turn)' }]; if (o.countCards('he')) ops.push({ id: 'disc', label: 'Discard 1 (+1 Strike, no distance limit)' }); ops.push({ id: 'no', label: 'Do nothing' });
  const op = await g.choose(o, ops, 'Swift General 将驰', { purpose: '将驰', ai: () => A().jiangchiAI(g, o) });
  if (op === 'draw') { await g.draw(o, 1); o.turn.noSlash2 = true; o.turn.slashExempt = true; }
  else if (op === 'disc') { const cs = await g.chooseCards(o, { min: 1, max: 1, zones: 'he', prompt: 'Discard 1 card', purpose: 'discard' }); await g.discardCards(o, cs); o.turn.extraSlash = (o.turn.extraSlash || 0) + 1; o.turn.jiangchi = true; }
} }, mod: {
  blockCard: (g, o, p, card) => p === o && o.turn.noSlash2 && card.key === 'slash',
  noDistance: (g, o, u, card) => u === o && o.turn.jiangchi && card.key === 'slash' } };
// ===== 048 Bu Lianshi =====
S['安恤'] = { active: { once: true, cards: { min: 0, max: 0 }, targets: { min: 2, max: 2, filter: (g, p, t, sel) => t !== p && (sel.length === 0 || sel[0].hand.length !== t.hand.length) },
  ai: (g, p) => { const os = g.others(p); for (const a of os) for (const b of os) if (a !== b && friend(g, p, a) && !friend(g, p, b) && a.hand.length < b.hand.length) return { targets: [a, b] }; return null; },
  async run(g, p, { targets: [a, b] }) {
    const [lo, hi] = a.hand.length < b.hand.length ? [a, b] : [b, a]; if (!hi.hand.length) return;
    const c = await g.chooseCardFrom(lo, hi, 'h', `Pacify: take a hand card from ${hi.label}`, { purpose: 'steal' }); await g.gain(lo, [c], { from: hi }); g.log(`${lo.label} takes and reveals ${SGS.cardName(c)}.`);
    if (c.suit !== 'spade') await g.draw(p, 1);
  } } };
S['追忆'] = { on: { async death(g, o, ev) {
  if (ev.player !== o) return;
  const t = await g.choosePlayers(o, { min: 1, max: 1, optional: true, allowDead: true, filter: q => q !== o && q !== ev.killer, prompt: 'Remembrance 追忆: another character draws 3 and recovers 1 HP.', purpose: '追忆', ai: cs => cs.filter(q => friend(g, o, q)).slice(0, 1) });
  if (t && t.length) { await g.draw(t[0], 3); await g.recover(t[0], 1, null); }
} } };
// ===== 049 Cheng Pu =====
S['疠火'] = { toFire: true, on: {
  async cardUsed(g, o, ev) { if (ev.user !== o || ev.card.key !== 'slash' || ev.card.nature !== 'fire' || ev.response || ev.targets.length !== 1) return; const c = g.alive().filter(t => !ev.targets.includes(t) && g.slashTargetOk(o, ev.card, t)); if (!c.length) return; const t = await g.choosePlayers(o, { min: 1, max: 1, optional: true, filter: q => c.includes(q), prompt: 'Pestilent Fire 疠火: add an extra target to this Fire Strike?', purpose: 'extraTarget', ai: cs => cs.filter(q => enemy(g, o, q)).slice(0, 1) }); if (t && t.length) { ev.targets.push(t[0]); g.log(`${t[0].label} is added as a target.`); } },
  async cardFinished(g, o, ev) { if (ev.user === o && ev.card.fireVia === '疠火' && ev.damaged.length && o.alive) { g.log('Pestilent Fire 疠火: the converted Strike dealt damage, so Cheng Pu loses 1 HP.', { explain: true }); await g.loseHp(o, 1); } } } };
S['醇醪'] = { on: { async phaseStart(g, o, ev) {
  if (ev.player !== o || ev.phase !== 'end' || (o.piles.chun || []).length) return; const sl = o.hand.filter(c => c.key === 'slash'); if (!sl.length) return;
  const cs = await g.chooseCards(o, { min: 1, max: sl.length, zones: 'h', filter: c => c.key === 'slash', optional: true, prompt: 'Mellow Wine 醇醪: place Strikes on your card as "Chun" 醇?', purpose: '醇醪', ai: () => sl.slice(0, Math.max(0, sl.length - 1)) });
  if (cs && cs.length) { await g.moveCards(cs, { to: 'pile', player: o, pile: 'chun' }, { reason: 'move' }); g.log(`${o.label} stores ${cs.length} Chun.`); }
} }, rescue: { can: (g, o, p) => (o.piles.chun || []).length > 0, async run(g, o, p) { const c = o.piles.chun.pop(); g.discard.push(c); g.log(`${o.label} removes a Chun 醇: ${p.label} is treated as using Wine.`); g.update(); await g.recover(p, 1, o); } } };
// ===== 050 Han Dang =====
S['弓骑'] = { active: { once: true, cards: { min: 1, max: 1, zones: 'he' }, targets: { min: 0, max: 0 },
  ai: (g, p) => { if (!p.hand.some(c => g.asCard(p, c).key === 'slash')) return null; const e = g.others(p).filter(q => enemy(g, p, q)); if (e.every(q => g.inRange(p, q))) return null; const cs = A().junk(g, p, 'he', 1); return cs.length ? { cards: cs } : null; },
  async run(g, p, { cards }) { const eq = CAT[cards[0].key].type === 'equip'; await g.discardCards(p, cards); p.turn.gongqi = true; g.log(`Mounted Archery 弓骑: everyone is in ${p.label}'s attack range this turn.`, { explain: true });
    if (eq) { const t = await g.choosePlayers(p, { min: 1, max: 1, optional: true, filter: q => q !== p && q.countCards('he'), prompt: 'Mounted Archery: discard a card from another character?', purpose: 'dismantleTarget', ai: cs => cs.filter(q => enemy(g, p, q)).slice(0, 1) }); if (t && t.length) { const c = await g.chooseCardFrom(p, t[0], 'he', 'discard', { purpose: 'dismantle' }); if (c) await g.discardCards(t[0], [c], { by: p }); } } } },
  mod: { inRange: (g, o, a, b) => a === o && g.current === o && o.turn.gongqi } };
S['解烦'] = { limited: true, active: { cards: { min: 0, max: 0 }, targets: { min: 1, max: 1, filter: () => true },
  ai: (g, p) => { const f = g.alive().filter(q => friend(g, p, q)).map(q => ({ q, n: g.alive().filter(x => x !== q && g.inRange(x, q)).length })).sort((a, b) => b.n - a.n)[0]; return f && f.n >= 3 && g.round >= 2 ? { targets: [f.q] } : null; },
  async run(g, p, { targets: [t] }) {
    for (const q of g.order(p)) { if (q === t || !g.inRange(q, t) || !t.alive) continue;
      const ws = q.cards('he').filter(c => CAT[c.key].sub === 'weapon'); let done = false;
      if (ws.length) { const op = await g.choose(q, [{ id: 'w', label: 'Discard a weapon' }, { id: 'd', label: `${t.label} draws 1` }], 'Relieve Troubles 解烦', { purpose: 'jiefan', ai: () => friend(g, q, t) ? 'd' : 'w' }); if (op === 'w') { const cs = ws.length === 1 ? ws : await g.chooseCards(q, { min: 1, max: 1, zones: 'he', filter: c => ws.includes(c), prompt: 'Discard a weapon', purpose: 'discard' }); await g.discardCards(q, cs); done = true; } }
      if (!done) await g.draw(t, 1); }
  } } };
// ===== 051 Zhong Hui =====
S['权计'] = { mod: { maxHand: (g, o, p, m) => p === o ? m + (o.piles.quan || []).length : m }, on: { async damaged(g, o, ev) { if (ev.target !== o) return; await perPoint(ev, async () => {
  if (!await ask(g, o, '权计', 'Draw 1, then place a hand card as "Quan" 权?', () => true)) return false;
  await g.draw(o, 1); if (!o.hand.length) return; const cs = await g.chooseCards(o, { min: 1, max: 1, zones: 'h', prompt: 'Scheming: place a hand card as Quan 权', purpose: 'discard' });
  await g.moveCards(cs, { to: 'pile', player: o, pile: 'quan' }, { reason: 'move' }); g.log(`${o.label} now has ${o.piles.quan.length} Quan.`);
}); } } };
S['自立'] = { awaken: true, on: { async phaseStart(g, o, ev) {
  if (ev.player !== o || ev.phase !== 'start' || o.flags.zili || (o.piles.quan || []).length <= 2) return;
  o.flags.zili = true; g.log(`${o.label} awakens: Self-Proclaimed 自立!`, { kind: 'skill' });
  const op = o.wounded ? await g.choose(o, [{ id: 'h', label: 'Recover 1 HP' }, { id: 'd', label: 'Draw 2 cards' }], 'Self-Proclaimed 自立', { purpose: 'zili', ai: () => o.hp <= 2 ? 'h' : 'd' }) : 'd';
  if (op === 'h') await g.recover(o, 1, o); else await g.draw(o, 2);
  await g.loseMaxHp(o, 1); if (o.alive) g.addSkill(o, '排异');
} } };
S['排异'] = { info: { en: 'Exclusion', zh: '排异', ten: 'Once per play phase, remove 1 Quan: a character draws 2; then if they have more hand cards than you, you deal 1 damage to them.' },
  active: { once: true, usable: (g, p) => (p.piles.quan || []).length > 0, cards: { min: 0, max: 0 }, targets: { min: 1, max: 1, filter: () => true },
    ai: (g, p) => { const e = g.others(p).filter(q => enemy(g, p, q) && q.hand.length + 2 > p.hand.length).sort((a, b) => a.hp - b.hp)[0]; if (e) return { targets: [e] }; return p.hand.length < 3 ? { targets: [p] } : null; },
    async run(g, p, { targets: [t] }) { const c = p.piles.quan.pop(); g.discard.push(c); g.update(); await g.draw(t, 2); if (t !== p && t.hand.length > p.hand.length) await g.damage({ source: p, target: t, amount: 1, via: '排异' }); } } };
// ===== 052 Wang Yi =====
S['贞烈'] = { on: { async targetConfirmed(g, o, ev) {
  if (ev.target !== o || ev.user === o || !(ev.card.key === 'slash' || SGS.isNormalTrick(ev.card)) || ev.use.noEffect.has(o) || o.hp <= 0) return;
  const harmful = ['slash', 'duel', 'dismantle', 'steal', 'barbarian', 'arrows', 'fireattack', 'borrow'].includes(ev.card.key);
  if (!await ask(g, o, '贞烈', `Lose 1 HP so that ${SGS.cardName(ev.card)} has no effect on you, then discard a card of ${ev.user.label}?`, () => harmful && o.hp >= 2 && enemy(g, o, ev.user) && (ev.card.key !== 'slash' || !o.hand.some(c => g.asCard(o, c).key === 'dodge')))) return;
  await g.loseHp(o, 1); if (!o.alive) return; ev.use.noEffect.add(o);
  if (ev.user.alive && ev.user.countCards('he')) { const c = await g.chooseCardFrom(o, ev.user, 'he', 'Chaste Martyr: discard a card', { purpose: 'dismantle' }); if (c) await g.discardCards(ev.user, [c], { by: o }); }
} } };
S['秘计'] = { on: { async phaseStart(g, o, ev) {
  if (ev.player !== o || ev.phase !== 'end' || o.lostHp <= 0) return; const x = o.lostHp;
  if (!await ask(g, o, '秘计', `Draw ${x} card(s), then you may give up to ${x} hand cards to others?`, () => true)) return;
  await g.draw(o, x);
  let left = x;
  while (left > 0 && o.hand.length) {
    const cs = await g.chooseCards(o, { min: 1, max: left, zones: 'h', optional: true, prompt: `Secret Plan: choose up to ${left} card(s) to give away`, purpose: 'giveAway', ai: () => A().mijiGive(g, o, left) });
    if (!cs || !cs.length) break;
    const t = await g.choosePlayers(o, { min: 1, max: 1, filter: q => q !== o, prompt: 'Give them to whom?', purpose: 'giveTo', ai: cands => [A().giveTarget(g, o, cs[0], cands.filter(q => q !== o))] });
    if (!t || !t.length) break; await g.give(o, t[0], cs); left -= cs.length;
  }
} } };
// ===== 053 Li Ru =====
S['灭计'] = { active: { once: true, cards: { min: 1, max: 1, zones: 'h', filter: (g, p, c) => black(c) && SGS.isTrick(c) }, targets: { min: 1, max: 1, filter: (g, p, t) => t !== p && t.hand.length > 0 },
  ai: (g, p) => { const c = p.hand.filter(c => black(c) && SGS.isTrick(c)).sort((a, b) => A().cardValue(g, p, a) - A().cardValue(g, p, b))[0]; const t = g.others(p).filter(q => enemy(g, p, q) && q.hand.length).sort((a, b) => b.hand.length - a.hand.length)[0]; return c && t ? { cards: [c], targets: [t] } : null; },
  async run(g, p, { cards, targets: [t] }) {
    g.detach(cards[0]); g.deck.unshift(cards[0]); g.log(`${p.label} places ${SGS.cardName(cards[0])} on top of the deck.`); await g.trigger('cardsLost', { player: p, hand: cards, equip: [], reason: 'move' }); g.update();
    const tricks = t.cards('he').filter(c => SGS.isTrick(c)); const non = t.cards('he').filter(c => !SGS.isTrick(c));
    let op = tricks.length ? 'trick' : 'two'; if (tricks.length && non.length >= 1) op = await g.choose(t, [{ id: 'trick', label: 'Discard 1 trick card' }, { id: 'two', label: 'Discard 2 non-trick cards' }], 'Annihilation Plot 灭计', { purpose: 'mieji', ai: () => tricks.length ? 'trick' : 'two' });
    if (op === 'trick') { const cs = await g.chooseCards(t, { min: 1, max: 1, zones: 'he', filter: c => SGS.isTrick(c), prompt: 'Discard a trick card', purpose: 'discard' }); await g.discardCards(t, cs); }
    else for (let i = 0; i < 2; i++) { const c2 = t.cards('he').filter(c => !SGS.isTrick(c)); if (!c2.length) break; const cs = await g.chooseCards(t, { min: 1, max: 1, zones: 'he', filter: c => !SGS.isTrick(c), prompt: 'Discard a non-trick card', purpose: 'discard' }); await g.discardCards(t, cs); }
  } } };
S['绝策'] = { on: { async phaseStart(g, o, ev) {
  if (ev.player !== o || ev.phase !== 'end') return; const c = g.others(o).filter(q => q.hand.length === 0); if (!c.length) return;
  const t = await g.choosePlayers(o, { min: 1, max: 1, optional: true, filter: q => c.includes(q), prompt: 'Ruthless Stratagem 绝策: deal 1 damage to a character with no hand cards?', purpose: '绝策', ai: cs => cs.filter(q => enemy(g, o, q)).sort((a, b) => a.hp - b.hp).slice(0, 1) });
  if (t && t.length) await g.damage({ source: o, target: t[0], amount: 1, via: '绝策' });
} } };
S['焚城'] = { limited: true, active: { cards: { min: 0, max: 0 }, targets: { min: 0, max: 0 },
  ai: (g, p) => { const e = g.others(p).filter(q => enemy(g, p, q)); return e.length >= 2 && e.filter(q => q.countCards('he') <= 2).length >= 2 ? {} : null; },
  async run(g, p) {
    let x = 0;
    for (const q of g.order(p)) { if (q === p || !q.alive) continue; const need = x + 1; let did = 0;
      if (q.countCards('he') >= need) { const cs = await g.chooseCards(q, { min: need, max: q.countCards('he'), zones: 'he', optional: true, prompt: `Burn the City 焚城: discard at least ${need} card(s), or take 2 fire damage.`, purpose: 'fencheng', need, ai: () => (q.hp <= 2 || q.countCards('he') - need >= 1) ? A().junk(g, q, 'he', need, true) : null }); if (cs && cs.length >= need) { await g.discardCards(q, cs); did = cs.length; } }
      if (!did) await g.damage({ source: p, target: q, amount: 2, nature: 'fire', via: '焚城' });
      x = did; }
  } } };
// ===== 054 Guan Xing & Zhang Bao =====
S['父魂'] = { viewAs: { names: ['slash'], min: 2, max: 2, zones: 'h' }, on: { async damageDealt(g, o, ev) { if (ev.source === o && ev.card && ev.card.viaSkill === '父魂' && g.current === o && g.phase === 'play' && !o.tempSkills.includes('武圣')) { g.addTempSkill(o, '武圣'); g.addTempSkill(o, '咆哮'); g.log(`Father's Spirit 父魂: ${o.label} gains Saint of War 武圣 and Roar 咆哮 this turn!`, { explain: true }); } } } };
// ===== 055 Ma Dai =====
S['潜袭'] = { on: { async phaseStart(g, o, ev) {
  if (ev.player !== o || ev.phase !== 'start') return;
  if (!await ask(g, o, '潜袭', 'Draw 1, then discard 1 — a character at distance 1 can\'t use cards of that colour this turn.', () => g.others(o).some(q => enemy(g, o, q) && g.distance(o, q) <= 1))) return;
  await g.draw(o, 1); const cs = await g.chooseCards(o, { min: 1, max: 1, zones: 'he', prompt: 'Stealth Raid: discard a card', purpose: 'discard' }); if (!cs.length) return;
  const col = SGS.color(cs[0]); await g.discardCards(o, cs);
  const t = await g.choosePlayers(o, { min: 1, max: 1, optional: true, filter: q => q !== o && g.distance(o, q) === 1, prompt: `Choose a character at distance 1: they can't use/play ${col} hand cards this turn.`, purpose: 'qianxi', ai: cs2 => cs2.filter(q => enemy(g, o, q)).slice(0, 1) });
  if (t && t.length) { t[0].turnFlags.qianxi = col; g.log(`${t[0].label} can't use or play ${col} hand cards this turn.`, { explain: true }); }
} }, mod: { blockCard: (g, o, p, card) => { const col = p.turnFlags && p.turnFlags.qianxi; if (!col) return false; const real = g.realCards(card); return real.some(c => SGS.color(c) === col && p.hand.includes(c)); } } };
// ===== 056 Yu Fan =====
S['纵玄'] = { on: { async toDiscardPile(g, o, ev) {
  if (ev.owner !== o || ev.reason !== 'discard') return; const cs = ev.cards.filter(c => g.discard.includes(c)); if (!cs.length) return;
  const r = await g.ask(o, { type: 'pickList', cards: cs, min: 0, max: cs.length, prompt: 'Unbridled Mystery 纵玄: put any of your discarded cards on top of the deck (first chosen = top).', purpose: '纵玄', ai: () => cs.filter(c => A().cardValue(g, o, c) >= 5).slice(0, 1) });
  if (!r || !r.length) return; for (const c of r.slice().reverse()) { g.detach(c); g.deck.unshift(c); } g.log(`${o.label} puts ${r.length} card(s) on top of the deck.`); g.update();
} } };
S['直言'] = { on: { async phaseStart(g, o, ev) {
  if (ev.player !== o || ev.phase !== 'end') return;
  const t = await g.choosePlayers(o, { min: 1, max: 1, optional: true, prompt: 'Blunt Words 直言: a character draws 1 and reveals it; an equipment card is equipped and they recover 1 HP.', purpose: '直言', ai: cs => [cs.filter(q => friend(g, o, q)).sort((a, b) => a.hp - b.hp)[0] || o] });
  if (!t || !t.length) return; const q = t[0]; const [c] = await g.draw(q, 1); if (!c) return; g.log(`${q.label} reveals ${SGS.cardName(c)}.`);
  if (CAT[c.key].type === 'equip' && q.hand.includes(c)) { await g.useCard(q, c, [q]); await g.recover(q, 1, o); }
} } };
// ===== 057 Pan Zhang & Ma Zhong =====
S['夺刀'] = { on: { async damaged(g, o, ev) {
  const s = ev.source; if (ev.target !== o || !s || s === o || !s.alive || !ev.card || ev.card.key !== 'slash' || !s.equip.weapon || !o.countCards('he')) return;
  const cs = await g.chooseCards(o, { min: 1, max: 1, zones: 'he', optional: true, prompt: `Seize Blade 夺刀: discard a card to take ${s.label}'s ${SGS.cardName(s.equip.weapon)}?`, purpose: '夺刀', ai: () => A().junk(g, o, 'he', 1) });
  if (cs && cs.length) { await g.discardCards(o, cs); if (s.equip.weapon) await g.gain(o, [s.equip.weapon], { from: s }); }
} } };
S['暗箭'] = { on: { async damageCausing(g, o, ev) { if (ev.source === o && ev.via === 'slash' && !g.inRange(ev.target, o)) { ev.amount++; g.log(`Hidden Arrow 暗箭: ${o.label} is outside ${ev.target.label}'s range — damage +1.`, { explain: true }); } } } };
// ===== 058 Empress Fu =====
S['惴恐'] = { on: { async phaseStart(g, o, ev) {
  const c = ev.player; if (ev.phase !== 'start' || c === o || !o.wounded || !o.hand.length || !c.hand.length) return;
  if (!await ask(g, o, '惴恐', `Point-fight ${c.label}? Win: this turn they can only target themselves. Lose: their distance to you is 1.`, () => enemy(g, o, c) && o.hand.some(x => x.rank >= 11))) return;
  const r = await g.pindian(o, c, '惴恐'); if (!r) return;
  if (r.win) { c.turnFlags.zhuikongWin = true; g.log(`${c.label} can only use cards on themselves this turn.`, { explain: true }); } else { c.turnFlags.zhuikongLose = o; }
} }, mod: {
  prohibit: (g, o, u, card, t) => !!(u && u.turnFlags && u.turnFlags.zhuikongWin && t !== u),
  distanceOne: (g, o, a, b) => !!(a.turnFlags && a.turnFlags.zhuikongLose === b && b === o) } };
S['求援'] = { on: { async becomeTarget(g, o, ev) {
  if (ev.target !== o || ev.card.key !== 'slash') return;
  const t = await g.choosePlayers(o, { min: 1, max: 1, optional: true, filter: q => q !== o && q !== ev.user, prompt: 'Plead for Rescue 求援: choose someone who must give you a Dodge or also become a target.', purpose: '求援', ai: cs => { const e = cs.filter(q => enemy(g, o, q) && !g.prohibited(ev.user, ev.card, q)); const f = cs.filter(q => friend(g, o, q) && q.hand.length >= 2); return e.length ? [e[0]] : f.length ? [f[0]] : []; } });
  if (!t || !t.length) return; const q = t[0];
  const dodges = q.hand.filter(c => c.key === 'dodge');
  let gave = false;
  if (dodges.length) { const cs = await g.chooseCards(q, { min: 1, max: 1, zones: 'h', filter: c => c.key === 'dodge', optional: true, prompt: `Plead for Rescue: give ${o.label} a Dodge, or become an extra target of the Strike.`, purpose: 'giveDodge', ai: () => friend(g, q, o) ? dodges.slice(0, 1) : null }); if (cs && cs.length) { await g.give(q, o, cs); gave = true; } }
  if (!gave && !ev.use.targets.includes(q) && !g.prohibited(ev.user, ev.card, q)) { ev.use.targets.push(q); g.log(`${q.label} becomes an additional target.`); }
} } };
// ===== 059 Liu Biao =====
S['自守'] = { on: {
  async drawPhase(g, o, ev) { if (ev.player === o && !ev.skipDraw) { const x = g.kingdomsCount(); if (await ask(g, o, '自守', `Draw ${x} extra card(s)? You can't damage others this turn.`, () => A().zishouAI(g, o))) { ev.n += x; o.turn.zishou = true; } } },
  async damageCausing(g, o, ev) { if (ev.source === o && o.turn.zishou && g.current === o && ev.target !== o) { ev.prevented = true; g.log('Self-Defense 自守 prevents Liu Biao from dealing damage this turn.', { explain: true }); } } } };
S['宗室'] = { mod: { maxHand: (g, o, p, m) => p === o ? m + g.kingdomsCount() : m } };
// ===== 060 Liao Hua =====
S['当先'] = { on: { async phaseStart(g, o, ev) { if (ev.player === o && ev.phase === 'start') { ev.extraPlay = true; g.log('Vanguard 当先: Liao Hua takes an extra play phase.', { explain: true }); } } } };
S['伏枥'] = { limited: true, rescue: { can: (g, o, p) => o === p && !!o.marks['limit_伏枥'], async run(g, o) { delete o.marks['limit_伏枥']; const x = g.kingdomsCount(); g.log(`${o.label} uses Aged Steed 伏枥!`, { kind: 'skill' }); o.hp = Math.min(x, o.maxhp); g.log(`${o.label} recovers to ${o.hp} HP.`, { kind: 'heal' }); g.update(); await g.flip(o); } } };
})(typeof window !== 'undefined' ? window : globalThis);
