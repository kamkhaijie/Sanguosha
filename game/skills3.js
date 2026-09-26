/* Sanguosha — general skills, part 3 (061–089) */
(function (G) {
'use strict';
const SGS = G.SGS; const S = SGS.SKILLS; const CAT = SGS.CAT;
const A = () => SGS.AI; const { red, black, enemy, friend } = SGS.H; const ask = SGS.askSkill; const perPoint = SGS.perPoint;

// ===== 061 Zhu Ran =====
S['胆守'] = { active: { usable: (g, p) => p.countCards('he') >= (p.used['胆守'] || 0) + 1, cards: { min: 1, max: 99, zones: 'he' }, targets: { min: 1, max: 1, filter: (g, p, t) => t !== p && g.inRange(p, t) },
  check: (g, p, cards) => cards.length === (p.used['胆守'] || 0) + 1,
  ai: (g, p) => { const x = (p.used['胆守'] || 0) + 1; if (x > 3) return null; const t = g.others(p).filter(q => enemy(g, p, q) && g.inRange(p, q) && (x !== 1 || q.countCards('he'))).sort((a, b) => a.hp - b.hp)[0]; if (!t) return null; const cs = A().junk(g, p, 'he', x); return cs.length === x && (x < 3 || p.hand.length > 4) ? { cards: cs, targets: [t] } : null; },
  async run(g, p, { cards, targets: [t] }) {
    const x = cards.length; await g.discardCards(p, cards); if (!t.alive) return;
    g.log(`Steadfast Guard 胆守 (X=${x}).`);
    if (x === 1) { if (t.countCards('he')) { const c = await g.chooseCardFrom(p, t, 'he', 'Discard one of their cards', { purpose: 'dismantle' }); if (c) await g.discardCards(t, [c], { by: p }); } }
    else if (x === 2) { if (t.countCards('he')) { const cs = await g.chooseCards(t, { min: 1, max: 1, zones: 'he', prompt: `Steadfast Guard: give ${p.label} a card`, purpose: 'giveToEnemy' }); await g.give(t, p, cs); } }
    else if (x === 3) await g.damage({ source: p, target: t, amount: 1, via: '胆守' });
    else { await g.draw(p, 2); await g.draw(t, 2); }
  } } };
// ===== 062 Guo Huai =====
S['精策'] = { on: { async phaseEnd(g, o, ev) { if (ev.player === o && ev.phase === 'play') { const x = o.turn.usedTypes.size; if (x > 0 && await ask(g, o, '精策', `Draw ${x} card(s) (card types used this turn)?`, () => true)) await g.draw(o, x); } } },
  mod: { maxHand: (g, o, p, m) => p === o && g.current === o && o.turn.usedSuits ? m + o.turn.usedSuits.size : m } };
// ===== 063 Ju Shou =====
S['渐营'] = { on: { async cardUsed(g, o, ev) {
  if (ev.user !== o || g.current !== o || g.phase !== 'play') return; const c = ev.card; const last = o.phaseData.lastCard; o.phaseData.lastCard = { suit: c.suit, rank: c.rank };
  if (last && ((c.suit && c.suit === last.suit) || (c.rank && c.rank === last.rank))) { if (await ask(g, o, '渐营', 'Same suit or number as your previous card — draw 1?', () => true)) await g.draw(o, 1); }
} } };
S['矢北'] = { on: { async damaged(g, o, ev) { if (ev.target !== o) return; if ((o.damagedThisTurn || 0) <= 1) { g.log('Northern Loyalty 矢北: first damage this turn — recover 1 HP.', { explain: true }); await g.recover(o, 1, o); } else { g.log('Northern Loyalty 矢北: not the first damage this turn — lose 1 HP.', { explain: true }); await g.loseHp(o, 1); } } } };
// ===== 064 Cao Chong =====
S['称象'] = { on: { async damaged(g, o, ev) {
  if (ev.target !== o) return; if (!await ask(g, o, '称象', 'Reveal the top 4 cards and take any whose numbers total 13 or less?', () => true)) return;
  const shown = g.takeTop(4); g.log(`Weigh the Elephant reveals ${shown.map(SGS.cardName).join(', ')}.`);
  const r = await g.ask(o, { type: 'pickList', cards: shown, min: 0, max: 4, sumMax: 13, prompt: 'Weigh the Elephant 称象: take cards whose numbers sum to 13 or less.', purpose: 'chengxiang', ai: () => A().chengxiangAI(g, o, shown) });
  let take = (r || []).filter(c => shown.includes(c)); let sum = 0; take = take.filter(c => (sum += c.rank) <= 13);
  if (take.length) await g.gain(o, take, { reason: '称象' });
  const rest = shown.filter(c => g.processing.includes(c)); if (rest.length) await g.toDiscard(rest, { reason: 'discard' });
} } };
S['仁心'] = { on: { async damageInflicting(g, o, ev) {
  const t = ev.target; if (t === o || t.hp !== 1 || ev.prevented || !o.alive) return; const eqs = o.cards('he').filter(c => CAT[c.key].type === 'equip'); if (!eqs.length) return;
  if (!await ask(g, o, '仁心', `Discard an equipment card and flip over to prevent the damage to ${t.label}?`, () => friend(g, o, t) && (t.role === 'lord' || !o.faceDown))) return;
  const cs = eqs.length === 1 ? eqs : await g.chooseCards(o, { min: 1, max: 1, zones: 'he', filter: c => eqs.includes(c), prompt: 'Discard an equipment card', purpose: 'discard' });
  await g.discardCards(o, cs); await g.flip(o); ev.prevented = true; ev.silentPrevent = true; g.log(`Benevolent Heart 仁心 prevents the damage to ${t.label}.`, { explain: true });
} } };
// ===== 065 Man Chong =====
S['峻刑'] = { active: { once: true, cards: { min: 1, max: 99, zones: 'h' }, targets: { min: 1, max: 1, filter: (g, p, t) => t !== p },
  ai: (g, p) => { const fd = g.others(p).find(q => friend(g, p, q) && q.faceDown); if (fd) { const cs = A().junk(g, p, 'h', 1); if (cs.length) return { cards: cs, targets: [fd] }; } const e = g.others(p).filter(q => enemy(g, p, q) && !q.faceDown && q.hand.length <= 1)[0]; if (!e) return null; const cs = A().junk(g, p, 'h', 1); return cs.length && p.hand.length >= 3 ? { cards: cs, targets: [e] } : null; },
  async run(g, p, { cards, targets: [t] }) {
    const types = new Set(cards.map(c => SGS.type(c))); await g.discardCards(p, cards); if (!t.alive) return;
    const ok = t.hand.filter(c => !types.has(SGS.type(c)));
    let done = false;
    if (ok.length) { const cs = await g.chooseCards(t, { min: 1, max: 1, zones: 'h', filter: c => ok.includes(c), optional: true, prompt: `Harsh Punishment 峻刑: discard a hand card of a type other than ${[...types].join('/')}, or flip over and draw ${cards.length}.`, purpose: 'junxing', ai: () => t.faceDown ? null : [ok.sort((a, b) => A().cardValue(g, t, a) - A().cardValue(g, t, b))[0]] }); if (cs && cs.length) { await g.discardCards(t, cs); done = true; } }
    if (!done) { await g.flip(t); await g.draw(t, cards.length); }
  } } };
S['御策'] = { on: { async damaged(g, o, ev) {
  const s = ev.source; if (ev.target !== o || !o.hand.length) return;
  const r = await g.chooseCards(o, { min: 1, max: 1, zones: 'h', optional: true, prompt: `Defensive Strategy 御策: reveal a hand card${s && s.alive && s !== o ? `; ${s.label} must discard a hand card of a different type or let you recover 1 HP` : ''}.`, purpose: '御策', ai: () => [o.hand.slice().sort((a, b) => SGS.type(a) === 'basic' ? 1 : -1)[0]] });
  if (!r || !r.length) return; const c = r[0]; g.log(`${o.label} reveals ${SGS.cardName(c)}.`);
  let disc = false;
  if (s && s.alive && s !== o) { const ok = s.hand.filter(x => SGS.type(x) !== SGS.type(c)); if (ok.length) { const cs = await g.chooseCards(s, { min: 1, max: 1, zones: 'h', filter: x => ok.includes(x), optional: true, prompt: `Defensive Strategy: discard a non-${SGS.type(c)} hand card, or ${o.label} recovers 1 HP.`, purpose: 'yuceSrc', ai: () => friend(g, s, o) ? null : [ok[0]] }); if (cs && cs.length) { await g.discardCards(s, cs); disc = true; } } }
  if (!disc) await g.recover(o, 1, o);
} } };
// ===== 066 Zhu Huan =====
S['奋励'] = { on: { async phaseBefore(g, o, ev) {
  if (ev.player !== o || ev.skip) return; const al = g.alive(); let cond = false; let what = '';
  if (ev.phase === 'draw') { cond = o.hand.length >= 1 && o.hand.length === Math.max(...al.map(q => q.hand.length)); what = 'draw'; }
  else if (ev.phase === 'play') { cond = o.hp >= 1 && o.hp === Math.max(...al.map(q => q.hp)); what = 'play'; }
  else if (ev.phase === 'discard') { cond = o.equips().length >= 1 && o.equips().length === Math.max(...al.map(q => q.equips().length)); what = 'discard'; }
  if (!cond) return;
  if (await ask(g, o, '奋励', `Skip your ${what} phase? (Each skipped phase lets Pacify Bandits 平寇 deal 1 damage later.)`, () => A().fenliAI(g, o, what))) ev.skip = true;
} } };
S['平寇'] = { on: { async afterTurn(g, o, ev) {
  if (ev.player !== o || !o.alive) return; const x = o.turn.skipped || 0; if (!x) return;
  const ts = await g.choosePlayers(o, { min: 1, max: x, optional: true, filter: q => q !== o, prompt: `Pacify Bandits 平寇: deal 1 damage to up to ${x} other character(s).`, purpose: '平寇', ai: cs => cs.filter(q => enemy(g, o, q)).sort((a, b) => a.hp - b.hp).slice(0, x) });
  if (ts) for (const t of ts) if (t.alive) await g.damage({ source: o, target: t, amount: 1, via: '平寇' });
} } };
// ===== 067 Lady Cai =====
S['窥听'] = { on: {
  async cardUsed(g, o, ev) { if (ev.user === g.current && (ev.targets || []).some(t => t !== ev.user)) ev.user.turnFlags.targetedOthers = true; },
  async phaseStart(g, o, ev) {
    const c = ev.player; if (ev.phase !== 'end' || c === o || c.turnFlags.targetedOthers) return;
    const ops = [{ id: 'draw', label: 'Draw 1 card' }]; const movable = c.equips().filter(x => !o.equip[CAT[x.key].sub]); if (movable.length) ops.push({ id: 'move', label: `Move one of ${c.label}'s equipment to you` }); ops.push({ id: 'no', label: 'Do nothing' });
    const op = await g.choose(o, ops, `Eavesdrop 窥听 (${c.label} didn't target anyone else this turn)`, { purpose: '窥听', ai: () => movable.length && enemy(g, o, c) ? 'move' : 'draw' });
    if (op === 'draw') await g.draw(o, 1);
    else if (op === 'move') { let e = movable[0]; if (movable.length > 1) { const r = await g.ask(o, { type: 'pickList', cards: movable, min: 1, max: 1, prompt: 'Choose equipment to move', purpose: 'gainBest' }); if (r && r[0]) e = r[0]; } await g.moveCards([e], { to: 'processing' }, { reason: 'move' }); g.processing.splice(g.processing.indexOf(e), 1); o.equip[CAT[e.key].sub] = e; g.log(`${o.label} moves ${SGS.cardName(e)} into their equipment.`); g.update(); }
  } } };
S['献州'] = { limited: true, active: { usable: (g, p) => p.equips().length > 0, cards: { min: 0, max: 0 }, targets: { min: 1, max: 1, filter: (g, p, t) => t !== p },
  ai: (g, p) => { if (p.equips().length < 2 && p.hp > 1) return null; const t = g.others(p).filter(q => friend(g, p, q))[0]; return t ? { targets: [t] } : null; },
  async run(g, p, { targets: [t] }) {
    const eqs = p.equips(); const x = eqs.length; await g.give(p, t, eqs);
    const cands = g.alive().filter(q => q !== t && g.inRange(t, q));
    const op = cands.length ? await g.choose(t, [{ id: 'heal', label: `${p.label} recovers ${x} HP` }, { id: 'dmg', label: `Deal 1 damage to up to ${x} characters in your range` }], 'Offer the Province 献州', { purpose: 'xianzhou', ai: () => friend(g, t, p) && p.wounded ? 'heal' : 'dmg' }) : 'heal';
    if (op === 'heal') await g.recover(p, x, t);
    else { const ts = await g.choosePlayers(t, { min: 1, max: x, filter: q => cands.includes(q), prompt: `Deal 1 damage to up to ${x} characters`, purpose: 'damageMulti', ai: cs => cs.filter(q => enemy(g, t, q)).slice(0, x) }); for (const q of ts || []) if (q.alive) await g.damage({ source: t, target: q, amount: 1, via: '献州' }); }
  } } };
// ===== 068 Liu Feng =====
S['陷嗣'] = { on: { async phaseStart(g, o, ev) {
  if (ev.player !== o || ev.phase !== 'start') return;
  const ts = await g.choosePlayers(o, { min: 1, max: 2, optional: true, filter: q => q.countCards('he') > 0, prompt: 'Entrap the Heir 陷嗣: place 1 card from each of up to 2 characters on your card as "Rebel" 逆.', purpose: '陷嗣', ai: cs => cs.filter(q => enemy(g, o, q)).sort((a, b) => b.countCards('he') - a.countCards('he')).slice(0, 2) });
  if (!ts || !ts.length) return;
  for (const t of ts) { const c = await g.chooseCardFrom(o, t, 'he', 'Entrap the Heir: take a card', { purpose: 'dismantle' }); if (c) await g.moveCards([c], { to: 'pile', player: o, pile: 'ni' }, { reason: 'move' }); }
  g.log(`${o.label} has ${(o.piles.ni || []).length} Rebel 逆 card(s). Others may spend 2 to Strike them.`, { explain: true });
} }, globalViewAs: { names: ['slash'], modes: ['use'], min: 0, max: 0, when: (g, p, ctx, owner) => owner && owner.alive && (owner.piles.ni || []).length >= 2 && g.current === p,
  build: (g, p, cards, name, owner) => g.virtual('slash', [], { color: 'none', onlyTarget: owner }),
  async onUse(g, p, card, owner) { const cs = owner.piles.ni.splice(0, 2); g.discard.push(...cs); g.log(`${p.label} removes 2 Rebel 逆 cards to Strike ${owner.label}.`); g.update(); } } };
// ===== 069 Guan Ping =====
S['龙吟'] = { on: { async cardUsed(g, o, ev) {
  const u = ev.user; if (ev.card.key !== 'slash' || ev.response || g.current !== u || g.phase !== 'play' || !o.countCards('he')) return;
  const cs = await g.chooseCards(o, { min: 1, max: 1, zones: 'he', optional: true, prompt: `Dragon's Roar 龙吟: discard a card so ${u.label}'s Strike doesn't count toward their limit${red(ev.card) ? ' (red Strike: you draw 1)' : ''}?`, purpose: '龙吟', ai: () => friend(g, o, u) && u.hand.some(c => g.asCard(u, c).key === 'slash' && c !== ev.card) ? A().junk(g, o, 'he', 1) : (u === o && red(ev.card) ? A().junk(g, o, 'he', 1) : null) });
  if (!cs || !cs.length) return; await g.discardCards(o, cs); u.turn.slashUsed = Math.max(0, u.turn.slashUsed - 1); if (red(ev.card)) await g.draw(o, 1);
} } };
// ===== 070 Jian Yong =====
S['巧说'] = { on: {
  async phaseStart(g, o, ev) {
    if (ev.player !== o || ev.phase !== 'play' || !o.hand.length) return;
    const t = await g.choosePlayers(o, { min: 1, max: 1, optional: true, filter: q => q !== o && q.hand.length > 0, prompt: 'Clever Persuasion 巧说: point-fight someone? Win: your next basic/trick card may gain or lose a target. Lose: no tricks this turn.', purpose: 'pindianTarget', ai: cs => o.hand.some(c => c.rank >= 11) ? cs.filter(q => enemy(g, o, q)).slice(0, 1) : [] });
    if (!t || !t.length) return; const r = await g.pindian(o, t[0], '巧说'); if (!r) return;
    if (r.win) o.turn.qiaoshui = true; else { o.turn.noTrick = true; g.log(`${o.label} can't use trick cards this turn.`, { explain: true }); }
  },
  async cardUsed(g, o, ev) {
    if (ev.user !== o || !o.turn.qiaoshui || ev.response) return; const k = ev.card.key; if (!(SGS.type(ev.card) === 'basic' || SGS.isNormalTrick(ev.card)) || k === 'nullify') return;
    o.turn.qiaoshui = false;
    const ops = []; const addable = g.alive().filter(t => !ev.targets.includes(t) && !g.prohibited(o, ev.card, t) && addableTarget(g, o, ev.card, t)); if (addable.length) ops.push({ id: 'add', label: 'Add a target' }); if (ev.targets.length > 1) ops.push({ id: 'rm', label: 'Remove a target' }); if (!ops.length) return; ops.push({ id: 'no', label: 'Neither' });
    const op = await g.choose(o, ops, 'Clever Persuasion 巧说', { purpose: 'qiaoshuiOpt', ai: () => ops.some(x => x.id === 'add') && addable.some(t => A().wantsTarget(g, o, ev.card, t)) ? 'add' : (ops.some(x => x.id === 'rm') && ev.targets.some(t => !A().wantsTarget(g, o, ev.card, t)) ? 'rm' : 'no') });
    if (op === 'add') { const t = await g.choosePlayers(o, { min: 1, max: 1, filter: q => addable.includes(q), prompt: 'Add which target?', purpose: 'extraTarget', ai: cs => cs.filter(q => A().wantsTarget(g, o, ev.card, q)).slice(0, 1) }); if (t && t.length) { ev.targets.push(t[0]); g.log(`${t[0].label} is added as a target.`); } }
    else if (op === 'rm') { const t = await g.choosePlayers(o, { min: 1, max: 1, filter: q => ev.targets.includes(q), prompt: 'Remove which target?', purpose: 'removeTarget', ai: cs => cs.filter(q => !A().wantsTarget(g, o, ev.card, q)).slice(0, 1) }); if (t && t.length) { ev.targets.splice(ev.targets.indexOf(t[0]), 1); g.log(`${t[0].label} is removed as a target.`); } }
  } }, mod: { blockCard: (g, o, p, card, mode) => p === o && o.turn.noTrick && SGS.isTrick(card) && mode === 'use' } };
function addableTarget(g, o, card, t) {
  const k = card.key; if (k === 'peach') return t.wounded; if (k === 'slash' || k === 'duel' || k === 'fireattack') return t !== o && (k !== 'fireattack' || t.hand.length); if (k === 'dismantle' || k === 'steal') return t !== o && t.countCards('hej'); if (k === 'exnihilo' || k === 'wine') return true; if (k === 'chain') return true; return false;
}
SGS.addableTarget = addableTarget;
S['纵适'] = { on: { async pindianDone(g, o, ev) {
  if (ev.a !== o && ev.b !== o) return; const won = (ev.a === o && ev.win) || (ev.b === o && !ev.win);
  const mine = ev.a === o ? ev.ca : ev.cb, theirs = ev.a === o ? ev.cb : ev.ca; const c = won ? theirs : mine;
  if (!g.processing.includes(c)) return;
  if (await ask(g, o, '纵适', `Take ${SGS.cardName(c)}?`, () => true)) await g.gain(o, [c], { reason: '纵适' });
} } };
// ===== 071 Gu Yong =====
S['慎行'] = { active: { cards: { min: 2, max: 2, zones: 'he' }, targets: { min: 0, max: 0 },
  ai: (g, p) => { const cs = A().junk(g, p, 'he', 2, false, 3); return cs.length === 2 && p.hand.length > p.hp ? { cards: cs } : null; },
  async run(g, p, { cards }) { await g.discardCards(p, cards); await g.draw(p, 1); } } };
S['秉壹'] = { on: { async toDiscardPile(g, o, ev) {
  if (ev.owner !== o || ev.reason !== 'discard' || !o.hand.length || o.phaseData.bingyi === g.phase + g.turnCount) return;
  const cols = new Set(o.hand.map(SGS.color));
  if (!await ask(g, o, '秉壹', `Reveal your hand? If all one colour, you and up to ${o.hand.length} others each draw 1.`, () => cols.size === 1)) return;
  o.phaseData.bingyi = g.phase + g.turnCount;
  g.log(`${o.label} reveals: ${o.hand.map(SGS.cardName).join(', ')}.`); if (cols.size !== 1) return;
  const ts = await g.choosePlayers(o, { min: 1, max: o.hand.length, optional: true, filter: q => q !== o, prompt: `Upholding Unity: choose up to ${o.hand.length} others to draw 1 with you.`, purpose: 'drawFriends', ai: cs => cs.filter(q => friend(g, o, q)).slice(0, o.hand.length) });
  await g.draw(o, 1); for (const t of ts || []) await g.draw(t, 1);
} } };
// ===== 072 Sun Luban =====
S['谮毁'] = { on: { async cardUsed(g, o, ev) {
  if (ev.user !== o || ev.response || g.current !== o || g.phase !== 'play' || o.phaseData.zenhui || ev.targets.length !== 1) return;
  if (!(ev.card.key === 'slash' || (SGS.isNormalTrick(ev.card) && black(ev.card)))) return; if (ev.card.key === 'nullify') return;
  const cands = g.alive().filter(q => q !== o && !ev.targets.includes(q) && !g.prohibited(o, ev.card, q) && (ev.card.key !== 'slash' || g.slashTargetOk(o, ev.card, q) || true) && SGS.addableTarget(g, o, ev.card, q));
  if (!cands.length) return;
  const t = await g.choosePlayers(o, { min: 1, max: 1, optional: true, filter: q => cands.includes(q), prompt: 'Slander 谮毁: choose someone who must either give you a card and become the user, or become an extra target.', purpose: '谮毁', ai: cs => cs.filter(q => enemy(g, o, q) && A().wantsTarget(g, o, ev.card, q)).slice(0, 1) });
  if (!t || !t.length) return; o.phaseData.zenhui = true; const q = t[0];
  let op = 'target'; if (q.countCards('he')) op = await g.choose(q, [{ id: 'give', label: `Give ${o.label} a card and become the user` }, { id: 'target', label: 'Become an extra target' }], 'Slander 谮毁', { purpose: 'zenhuiOpt', ai: () => friend(g, q, ev.targets[0]) ? 'target' : 'give' });
  if (op === 'give') { const cs = await g.chooseCards(q, { min: 1, max: 1, zones: 'he', prompt: `Give ${o.label} a card`, purpose: 'giveToEnemy' }); await g.give(q, o, cs); ev.user = q; g.log(`${q.label} becomes the user of ${SGS.shortName(ev.card)}.`); }
  else { ev.targets.push(q); g.log(`${q.label} becomes an extra target.`); }
} } };
S['骄矜'] = { on: { async damageInflicting(g, o, ev) {
  if (ev.target !== o || !ev.source || ev.source.gender !== 'male' || ev.prevented) return; const eqs = o.cards('he').filter(c => CAT[c.key].type === 'equip'); if (!eqs.length) return;
  const cs = await g.chooseCards(o, { min: 1, max: 1, zones: 'he', filter: c => eqs.includes(c), optional: true, prompt: `Arrogance 骄矜: discard an equipment card to reduce the damage by 1?`, purpose: 'jiaojin', ai: () => [eqs.sort((a, b) => A().cardValue(g, o, a) - A().cardValue(g, o, b))[0]] });
  if (cs && cs.length) { await g.discardCards(o, cs); ev.amount--; g.log('Arrogance 骄矜: damage −1.'); }
} } };
// ===== 073 Zhang Song =====
S['强识'] = { on: {
  async phaseStart(g, o, ev) {
    if (ev.player !== o || ev.phase !== 'play') return; const c = g.others(o).filter(q => q.hand.length); if (!c.length) return;
    const t = await g.choosePlayers(o, { min: 1, max: 1, optional: true, filter: q => c.includes(q), prompt: 'Photographic Memory 强识: reveal a hand card of another character?', purpose: '强识', ai: cs => [cs.sort((a, b) => b.hand.length - a.hand.length)[0]] });
    if (!t || !t.length) return; const card = await g.chooseCardFrom(o, t[0], 'h', 'reveal', { purpose: 'reveal' }); o.phaseData.qiangzhi = SGS.type(card); g.log(`${t[0].label} reveals ${SGS.cardName(card)} — ${o.label} draws 1 whenever using a ${o.phaseData.qiangzhi} card this phase.`, { explain: true });
  },
  async cardUsed(g, o, ev) { if (ev.user === o && g.current === o && g.phase === 'play' && o.phaseData.qiangzhi && SGS.type(ev.card) === o.phaseData.qiangzhi) { if (await ask(g, o, '强识', 'Draw 1 card?', () => true)) await g.draw(o, 1); } } } };
S['献图'] = { on: {
  async phaseStart(g, o, ev) {
    const c = ev.player; if (ev.phase !== 'play' || c === o) return;
    if (!await ask(g, o, '献图', `Draw 2 then give ${c.label} 2 cards? If they kill nobody this phase, you lose 1 HP.`, () => friend(g, o, c) && o.hp >= 2 && g.others(c).some(q => enemy(g, c, q) && q.hp <= 1))) return;
    await g.draw(o, 2); const cs = await g.chooseCards(o, { min: Math.min(2, o.countCards('he')), max: 2, zones: 'he', prompt: `Present the Map: give ${c.label} 2 cards`, purpose: 'giveFriend' }); await g.give(o, c, cs);
    c.phaseData.xiantuBy = o; c.phaseData.killed = false;
  },
  async death(g, o, ev) { if (ev.killer && ev.killer === g.current && g.phase === 'play') ev.killer.phaseData.killed = true; },
  async phaseEnd(g, o, ev) { const c = ev.player; if (ev.phase === 'play' && c.phaseData.xiantuBy === o && !c.phaseData.killed && o.alive) { g.log('Present the Map 献图: no kill this phase — Zhang Song loses 1 HP.', { explain: true }); await g.loseHp(o, 1); } } } };
// ===== 074 Wu Yi =====
S['奔袭'] = { mod: { distance: (g, o, a, b) => a === o && g.current === o && o.turn.cardsUsed ? -o.turn.cardsUsed : 0 }, on: {
  async cardUsed(g, o, ev) {
    if (ev.user !== o || g.current !== o || ev.response || ev.targets.length !== 1) return; if (!(ev.card.key === 'slash' || SGS.isNormalTrick(ev.card)) || ev.card.key === 'nullify') return;
    if (!g.others(o).every(q => g.distance(o, q) <= 1)) return;
    const ops = [{ id: 'extra', label: 'Gain 1 extra target' }, { id: 'armor', label: 'Ignore the target\'s armour' }, { id: 'unstop', label: 'Cannot be Dodged or Nullified' }, { id: 'draw', label: 'Draw 1 after it deals damage' }];
    g.log(`Swift Raid 奔袭 (locked): everyone is at distance 1 — choose 1–2 bonuses.`, { explain: true });
    const picked = [];
    for (let i = 0; i < 2; i++) { const left = ops.filter(x => !picked.includes(x.id)); if (i > 0) left.push({ id: 'stop', label: 'No more' }); const op = await g.choose(o, left, `Swift Raid 奔袭: choose a bonus (${i + 1}/2)`, { purpose: 'benxi', ai: () => A().benxiAI(g, o, ev, picked) }); if (!op || op === 'stop') break; picked.push(op); }
    const t0 = ev.targets[0];
    for (const op of picked) {
      if (op === 'extra') { const c = g.alive().filter(q => !ev.targets.includes(q) && !g.prohibited(o, ev.card, q) && SGS.addableTarget(g, o, ev.card, q)); if (c.length) { const t = await g.choosePlayers(o, { min: 1, max: 1, filter: q => c.includes(q), prompt: 'Extra target', purpose: 'extraTarget', ai: cs => [cs.find(q => A().wantsTarget(g, o, ev.card, q)) || cs[0]] }); if (t && t.length) ev.targets.push(t[0]); } }
      if (op === 'armor') ev.ignoreArmor.add(t0);
      if (op === 'unstop') { ev.unNullifiable = true; ev.unDodgeable = true; }
      if (op === 'draw') ev.benxiDraw = true;
    }
  },
  async cardFinished(g, o, ev) { if (ev.user === o && ev.benxiDraw && ev.damaged.length) await g.draw(o, 1); } } };
// ===== 075 Zhou Cang =====
S['忠勇'] = { on: { async cardFinished(g, o, ev) {
  if (ev.user !== o || ev.card.key !== 'slash') return;
  const slashCards = g.realCards(ev.card).filter(c => g.processing.includes(c));
  const resp = (ev.responses || []).flatMap(c => g.realCards(c)).filter(c => g.discard.includes(c));
  if (!slashCards.length && !resp.length) return;
  const ops = []; if (slashCards.length) ops.push({ id: 's', label: `Give the Strike (${slashCards.map(SGS.cardName).join(', ')})` }); if (resp.length) ops.push({ id: 'r', label: `Give the Dodge(s) (${resp.map(SGS.cardName).join(', ')})` }); ops.push({ id: 'no', label: 'Do nothing' });
  const op = await g.choose(o, ops, 'Loyal Valor 忠勇', { purpose: '忠勇', ai: () => g.others(o).some(q => friend(g, o, q) && !ev.targets.includes(q)) ? ops[0].id : 'no' });
  if (op === 'no' || !op) return; const cs = op === 's' ? slashCards : resp;
  const t = await g.choosePlayers(o, { min: 1, max: 1, filter: q => q !== o && !ev.targets.includes(q), prompt: 'Give them to whom?', purpose: 'giveFriend', ai: cands => [cands.find(q => friend(g, o, q)) || cands[0]] });
  if (!t || !t.length) return; const q = t[0]; await g.give(o, q, cs);
  if (cs.some(red) && q.alive) {
    const vs = g.alive().filter(v => v !== q && g.inRange(o, v)); if (!vs.length) return;
    const r = await g.respond(q, { names: ['slash'], use: true, reason: 'zhongyong', asUse: true, prompt: `Loyal Valor: you may use a Strike (no distance or count limit) on someone in ${o.label}'s attack range.`, aiHelp: vs.some(v => enemy(g, q, v)) });
    if (r) { const v = (await g.choosePlayers(q, { min: 1, max: 1, filter: x => vs.includes(x), prompt: 'Strike whom?', purpose: 'slashTarget', ai: cands => [cands.filter(x => enemy(g, q, x)).sort((a, b) => a.hp - b.hp)[0] || cands[0]] }))[0]; if (v) await g.useCard(q, r.card, [v], { noCount: true }); else await g.finishCard(r.card, q); }
  }
} } };
// ===== 076 Liu Chen =====
S['战绝'] = { viewAs: { names: ['duel'], modes: ['use'], min: 1, max: 99, zones: 'h', when: (g, p, ctx) => g.current === p && g.phase === 'play' && (p.phaseData.zhanjue || 0) < 2 && p.hand.length > 0, valid: (g, p, cards) => cards.length === p.hand.length },
  on: { async cardFinished(g, o, ev) { if (ev.user !== o || ev.card.viaSkill !== '战绝') return; await g.draw(o, 1, { reason: '战绝' }); o.phaseData.zhanjue = (o.phaseData.zhanjue || 0) + 1; for (const t of ev.damaged) if (t.alive) { await g.draw(t, 1, { reason: '战绝' }); if (t === o) o.phaseData.zhanjue++; } } } };
S['勤王'] = { lord: true,
  respondSpecial: { names: ['slash'], can: (g, p) => p.countCards('he') > 0 && g.others(p).some(q => q.kingdom === 'shu'), async run(g, p, need) {
    const cs = await g.chooseCards(p, { min: 1, max: 1, zones: 'he', optional: true, prompt: 'Rescue the Emperor 勤王: discard a card to call on Shu characters?', purpose: 'discard' }); if (!cs || !cs.length) return null; await g.discardCards(p, cs);
    return SGS.askShuSlash(g, p, { slashOrDodge: 'slash', use: need.use }, 'shu', '勤王', async q => { await g.draw(q, 1); });
  } },
  active: { usable: (g, p) => p.countCards('he') > 0 && g.others(p).some(q => q.kingdom === 'shu') && g.canUse(p, g.virtual('slash', [])), cards: { min: 1, max: 1, zones: 'he' }, targets: { min: 1, max: 1, filter: (g, p, t) => g.slashTargetOk(p, g.virtual('slash', []), t) },
    ai: (g, p) => null,
    async run(g, p, { cards, targets: [t] }) { p.used['勤王'] = 0; await g.discardCards(p, cards); const c = await SGS.askShuSlash(g, p, { slashOrDodge: 'slash', use: true }, 'shu', '勤王', async q => { await g.draw(q, 1); }); if (c) await g.useCard(p, c, [t]); } } };
// ===== 077 Xiahou Shi =====
S['樵拾'] = { on: { async phaseStart(g, o, ev) { const c = ev.player; if (ev.phase !== 'end' || c === o || c.hand.length !== o.hand.length) return; if (await ask(g, o, '樵拾', `You and ${c.label} each draw 1?`, () => !enemy(g, o, c) || o.hand.length < 3)) { await g.draw(o, 1); await g.draw(c, 1); } } } };
S['燕语'] = { active: { cards: { min: 1, max: 1, zones: 'h', filter: (g, p, c) => c.key === 'slash' }, targets: { min: 0, max: 0 },
  ai: (g, p) => { const sl = p.hand.filter(c => c.key === 'slash'); return sl.length && (sl.length > 1 || p.turn.slashUsed >= g.slashLimit(p)) ? { cards: [sl[0]] } : null; },
  async run(g, p, { cards }) { g.log(`${p.label} recasts ${SGS.cardName(cards[0])}.`); await g.moveCards(cards, { to: 'discard' }, { reason: 'recast', owner: p }); await g.draw(p, 1); p.phaseData.yanyu = (p.phaseData.yanyu || 0) + 1; } },
  on: { async phaseEnd(g, o, ev) { if (ev.player !== o || ev.phase !== 'play' || (o.phaseData.yanyu || 0) < 2) return; const t = await g.choosePlayers(o, { min: 1, max: 1, optional: true, filter: q => q.gender === 'male', prompt: "Swallow's Chatter 燕语: a male character draws 2.", purpose: 'drawFriend', ai: cs => cs.filter(q => friend(g, o, q)).slice(0, 1) }); if (t && t.length) await g.draw(t[0], 2); } } };
// ===== 078 Chen Qun =====
S['品第'] = { active: { usable: (g, p) => true, cards: { min: 1, max: 1, zones: 'he', filter: (g, p, c) => !(p.turn.pindiTypes || new Set()).has(SGS.type(c)) }, targets: { min: 1, max: 1, filter: (g, p, t) => t !== p && !(p.turn.pindiTargets || new Set()).has(t) },
  ai: (g, p) => A().pindiAI(g, p),
  async run(g, p, { cards, targets: [t] }) {
    p.turn.pindiTypes = p.turn.pindiTypes || new Set(); p.turn.pindiTargets = p.turn.pindiTargets || new Set();
    p.turn.pindiTypes.add(SGS.type(cards[0])); p.turn.pindiTargets.add(t); p.turn.pindiN = (p.turn.pindiN || 0) + 1; const x = p.turn.pindiN;
    await g.discardCards(p, cards);
    const op = await g.choose(p, [{ id: 'd', label: `${t.label} draws ${x}` }, { id: 'x', label: `${t.label} discards ${x}` }], 'Ranking 品第', { purpose: 'pindiOpt', ai: () => friend(g, p, t) ? 'd' : 'x' });
    if (op === 'd') await g.draw(t, x); else { const n = Math.min(x, t.countCards('he')); if (n) { const cs = await g.chooseCards(t, { min: n, max: n, zones: 'he', prompt: `Ranking: discard ${n}`, purpose: 'discard' }); await g.discardCards(t, cs); } }
    if (t.wounded && !p.chained) await g.setChained(p, true);
  } } };
S['法恩'] = { on: {
  async flipped(g, o, ev) { if (ev.faceUp && ev.player.alive) { if (await ask(g, o, '法恩', `Let ${ev.player.label} draw 1?`, () => friend(g, o, ev.player))) await g.draw(ev.player, 1); } },
  async chainChanged(g, o, ev) { if (ev.chained && ev.player.alive) { if (await ask(g, o, '法恩', `Let ${ev.player.label} draw 1?`, () => friend(g, o, ev.player))) await g.draw(ev.player, 1); } } } };
// ===== 079 Han Hao & Shi Huan =====
S['勇略'] = { on: { async phaseStart(g, o, ev) {
  const t = ev.player; if (ev.phase !== 'judge' || t === o || !t.judgeArea.length || !g.inRange(o, t) || !o.alive) return;
  if (!await ask(g, o, '勇略', `Discard a card from ${t.label}'s judgement area and be treated as Striking them?`, () => friend(g, o, t) ? t.judgeArea.some(c => ['indulgence', 'supply'].includes(c.vkey || c.key)) && t.hp >= 3 : false)) return;
  let c = t.judgeArea[0]; if (t.judgeArea.length > 1) { const r = await g.ask(o, { type: 'pickList', cards: t.judgeArea.slice(), min: 1, max: 1, prompt: 'Discard which?', purpose: 'dismantle' }); if (r && r[0]) c = r[0]; }
  g.detach(c); await g.toDiscard([c], { reason: 'discard', owner: t });
  const ev2 = await g.useCard(o, g.virtual('slash', []), [t], { noCount: true });
  if (!ev2 || !ev2.damaged.length) await g.draw(o, 1);
} } };
S['慎断'] = { on: { async toDiscardPile(g, o, ev) {
  if (ev.owner !== o || ev.reason !== 'discard' || !o.alive) return;
  for (const c of ev.cards.filter(x => black(x) && SGS.type(x) === 'basic')) {
    if (!g.discard.includes(c)) continue; const v = g.virtual('supply', [c]);
    const cands = g.alive().filter(t => t !== o && !t.judgeArea.some(x => (x.vkey || x.key) === 'supply') && !g.prohibited(o, v, t)); if (!cands.length) break;
    const t = await g.choosePlayers(o, { min: 1, max: 1, optional: true, filter: q => cands.includes(q), prompt: `Careful Decision 慎断: use ${SGS.cardName(c)} as Supply Shortage (any distance)?`, purpose: '慎断', ai: cs => cs.filter(q => enemy(g, o, q)).slice(0, 1) });
    if (!t || !t.length) break; await g.useCard(o, Object.assign(v, { subFromAnywhere: true }), [t[0]], { forcedTargets: true });
  }
} } };
// ===== 080 Cao Zhen =====
S['司敌'] = { on: {
  async phaseStart(g, o, ev) {
    const c = ev.player; if (ev.phase !== 'play' || c === o || !o.equips().length) return; const cols = new Set(o.equips().map(SGS.color));
    const ok = o.cards('he').filter(x => SGS.type(x) !== 'basic' && cols.has(SGS.color(x))); if (!ok.length) return;
    const cs = await g.chooseCards(o, { min: 1, max: 1, zones: 'he', filter: x => ok.includes(x), optional: true, prompt: `Watch the Enemy 司敌: discard a non-basic card — ${c.label} can't use/play cards of its colour this phase; if they use no Strike you Strike them.`, purpose: '司敌', ai: () => enemy(g, o, c) && o.countCards('he') >= 3 ? [ok.sort((a, b) => A().cardValue(g, o, a) - A().cardValue(g, o, b))[0]] : null });
    if (!cs || !cs.length) return; const col = SGS.color(cs[0]); await g.discardCards(o, cs); c.turnFlags.sidi = col; c.phaseData.sidiBy = o; c.phaseData.sidiSlash = false;
    g.log(`${c.label} can't use or play ${col} cards this phase.`, { explain: true });
  },
  async cardUsed(g, o, ev) { if (ev.user === g.current && ev.card.key === 'slash' && g.phase === 'play') ev.user.phaseData.sidiSlash = true; },
  async phaseEnd(g, o, ev) { const c = ev.player; if (ev.phase === 'play' && c.phaseData.sidiBy === o) { c.turnFlags.sidi = null; if (!c.phaseData.sidiSlash && c.alive && o.alive && !g.prohibited(o, g.virtual('slash', []), c)) { g.log(`Watch the Enemy: ${c.label} used no Strike this phase, so ${o.label} ${o.isHuman ? 'Strike' : 'Strikes'} ${c.isHuman ? 'you' : c.label}.`, { explain: true }); await g.useCard(o, g.virtual('slash', []), [c], { noCount: true }); } } } },
  mod: { blockCard: (g, o, p, card) => { const col = p.turnFlags && p.turnFlags.sidi; if (!col || g.phase !== 'play' || g.current !== p) return false; return SGS.color(card) === col; } } };
// ===== 081 Zhang Ni =====
S['怃戎'] = { active: { once: true, usable: (g, p) => p.hand.length > 0, cards: { min: 0, max: 0 }, targets: { min: 1, max: 1, filter: (g, p, t) => t !== p && t.hand.length > 0 },
  ai: (g, p) => { const t = g.others(p).filter(q => enemy(g, p, q) && q.hand.length).sort((a, b) => a.hp - b.hp)[0]; return t && p.hand.some(c => c.key === 'slash') ? { targets: [t] } : null; },
  async run(g, p, { targets: [t] }) {
    const a = (await g.chooseCards(p, { min: 1, max: 1, zones: 'h', prompt: `Pacify the Rong: choose a card to reveal (a Strike hurts them if they don't show a Dodge).`, purpose: 'wurongMe', ai: () => [p.hand.find(c => c.key === 'slash') || p.hand[0]] }))[0];
    const b = (await g.chooseCards(t, { min: 1, max: 1, zones: 'h', prompt: `Pacify the Rong (${p.label}): choose a card to reveal (a Dodge protects you).`, purpose: 'wurongThem', ai: () => [t.hand.find(c => c.key === 'dodge') || t.hand.slice().sort((x, y) => A().cardValue(g, t, x) - A().cardValue(g, t, y))[0]] }))[0];
    g.log(`${p.label} reveals ${SGS.cardName(a)}; ${t.label} reveals ${SGS.cardName(b)}.`);
    if (a.key === 'slash' && b.key !== 'dodge') { await g.discardCards(p, [a]); await g.damage({ source: p, target: t, amount: 1, via: '怃戎' }); }
    else if (b.key === 'dodge' && a.key !== 'slash') { await g.discardCards(p, [a]); if (t.countCards('he')) { const c = await g.chooseCardFrom(p, t, 'he', 'take a card', { purpose: 'steal' }); if (c) await g.gain(p, [c], { from: t }); } }
  } } };
S['矢志'] = { transform: (g, p, c) => p.hp === 1 && c.key === 'dodge' && p.hand.includes(c) ? 'slash' : null };
// ===== 082 Cao Xiu =====
S['倾袭'] = { on: { async damageCausing(g, o, ev) {
  if (ev.source !== o || ev.via !== 'slash' || !o.equip.weapon || ev.prevented) return; const t = ev.target; const x = CAT[o.equip.weapon.key].range;
  if (!await ask(g, o, '倾袭', `${t.label} must discard ${x} hand card(s) (and you lose your weapon), or take +1 damage.`, () => enemy(g, o, t))) return;
  let did = false;
  if (t.hand.length >= x) { const cs = await g.chooseCards(t, { min: x, max: x, zones: 'h', optional: true, prompt: `All-out Assault 倾袭: discard ${x} hand card(s) to also discard ${o.label}'s weapon, or take +1 damage.`, purpose: 'qingxi', ai: () => t.hp <= ev.amount + 1 || x <= 1 ? A().junk(g, t, 'h', x, true) : null }); if (cs && cs.length === x) { await g.discardCards(t, cs); if (o.equip.weapon) await g.discardCards(o, [o.equip.weapon], { by: t }); did = true; } }
  if (!did) { ev.amount++; g.log('All-out Assault 倾袭: damage +1.'); }
} } };
S['千驹'] = { mod: { distance: (g, o, a, b) => a === o ? -o.lostHp : 0 } };
// ===== 083 Zhong Yao =====
S['活墨'] = { viewAs: { names: (g, p) => ['slash', 'dodge', 'peach', 'wine'].filter(n => !((p.huomo && p.huomo.turn === g.turnCount) ? p.huomo.names : new Set()).has(n)), modes: ['use'], zones: 'he', filter: (g, p, c) => black(c) && SGS.type(c) !== 'basic',
  build: (g, p, cards, name) => { const v = g.virtual(name, [], { color: 'black' }); v.huomoCard = cards[0]; return v; },
  async onUse(g, p, card) { if (!p.huomo || p.huomo.turn !== g.turnCount) p.huomo = { turn: g.turnCount, names: new Set() }; p.huomo.names.add(card.key); const c = card.huomoCard; if (c) { g.detach(c); g.deck.unshift(c); g.log(`${p.label} places ${SGS.cardName(c)} on top of the deck (Living Ink 活墨).`); await g.trigger('cardsLost', { player: p, hand: [c], equip: [], reason: 'move' }); g.update(); } } } };
S['佐定'] = { on: { async cardUsed(g, o, ev) {
  const u = ev.user; if (u === o || g.current !== u || g.phase !== 'play' || ev.card.suit !== 'spade' || !(ev.targets || []).length || g.phaseDamage) return;
  const t = await g.choosePlayers(o, { min: 1, max: 1, optional: true, filter: q => ev.targets.includes(q), prompt: 'Assist in Settling 佐定: one of the targets draws 1?', purpose: '佐定', ai: cs => cs.filter(q => friend(g, o, q)).slice(0, 1) });
  if (t && t.length) await g.draw(t[0], 1);
} } };
// ===== 084 Cao Rui =====
S['恢拓'] = { on: { async damaged(g, o, ev) {
  if (ev.target !== o) return; const t = await g.choosePlayers(o, { min: 1, max: 1, optional: true, prompt: `Expand Territory 恢拓: a character judges — red: recover 1 HP; black: draw ${ev.amount}.`, purpose: 'drawFriend', ai: cs => [cs.filter(q => friend(g, o, q)).sort((a, b) => a.hp - b.hp)[0] || o] });
  if (!t || !t.length) return; const j = await g.judge(t[0], 'Expand Territory 恢拓'); if (red(j)) await g.recover(t[0], 1, o); else await g.draw(t[0], ev.amount);
} } };
S['明鉴'] = { active: { once: true, usable: (g, p) => p.hand.length > 0, cards: { min: 0, max: 0 }, targets: { min: 1, max: 1, filter: (g, p, t) => t !== p },
  ai: (g, p) => { const t = g.others(p).filter(q => friend(g, p, q)).sort((a, b) => b.hp - a.hp)[0]; return t && p.hand.length >= 3 && p.hp >= 2 ? { targets: [t] } : null; },
  async run(g, p, { targets: [t] }) { await g.give(p, t, p.hand.slice()); t.flags.mingjian = (t.flags.mingjian || 0) + 1; g.log(`Clear Insight 明鉴: on ${t.label}'s next turn, hand limit +1 and one extra Strike.`, { explain: true }); } },
  on: { async phaseStart(g, o, ev) { const c = ev.player; if (ev.phase === 'start' && c.flags.mingjian) { const n = c.flags.mingjian; c.flags.mingjian = 0; c.turn.maxHandAdd = (c.turn.maxHandAdd || 0) + n; c.turn.extraSlash = (c.turn.extraSlash || 0) + n; } } } };
S['兴衰'] = { lord: true, limited: true, on: { async enterDying(g, o, ev) {
  if (ev.player !== o || !o.marks['limit_兴衰'] || !g.others(o).some(q => q.kingdom === 'wei')) return;
  if (!await ask(g, o, '兴衰', 'Ask each Wei character to sacrifice for you?', () => true)) return; delete o.marks['limit_兴衰'];
  const yes = [];
  for (const q of g.order(o)) { if (q === o || q.kingdom !== 'wei') continue; if (await g.confirm(q, `Rise and Fall 兴衰: let ${o.label} recover 1 HP (you then take 1 damage)?`, { purpose: 'xingshuai', ai: () => friend(g, q, o) && q.hp >= 2 })) { yes.push(q); await g.recover(o, 1, q); } }
  for (const q of yes) if (q.alive) await g.damage({ source: null, target: q, amount: 1, via: '兴衰' });
} } };
// ===== 085 Guo Tu & Pang Ji =====
S['急攻'] = { mod: { maxHand: (g, o, p, m) => p === o && o.turn && o.turn.jigong ? (o.turn.jigongDmg || 0) : m }, on: {
  async phaseStart(g, o, ev) { if (ev.player === o && ev.phase === 'play') { if (await ask(g, o, '急攻', 'Draw 2 cards? Your hand limit becomes 0 (+1 per damage you deal this phase).', () => A().jigongAI(g, o))) { await g.draw(o, 2); o.turn.jigong = true; o.turn.jigongDmg = 0; } } },
  async damageDealt(g, o, ev) { if (ev.source === o && o.turn.jigong && g.current === o && g.phase === 'play') o.turn.jigongDmg += ev.amount; } } };
S['饰非'] = { respondSpecial: { names: ['dodge'], can: (g, p) => g.current && g.current.alive, async run(g, p) {
  const c = g.current; await g.draw(c, 1, { reason: '饰非' });
  const mx = Math.max(...g.alive().map(q => q.hand.length)); const top = g.alive().filter(q => q.hand.length === mx);
  if (top.length === 1 && top[0] === c) { g.log(`${c.label} alone has the most hand cards — Gloss Over fails.`); return null; }
  const cands = top.filter(q => q.countCards('he'));
  if (!cands.length) return null;
  const t = (await g.choosePlayers(p, { min: 1, max: 1, filter: q => cands.includes(q), prompt: 'Gloss Over 饰非: discard a card from a character with the most hand cards', purpose: 'dismantleTarget', ai: cs => [cs.find(q => enemy(g, p, q)) || cs[0]] }))[0];
  const card = await g.chooseCardFrom(p, t, 'he', 'discard', { purpose: t === p ? 'discardOwn' : 'dismantle' }); if (card) await g.discardCards(t, [card], { by: p });
  return g.virtual('dodge', [], { color: 'none' });
} } };
// ===== 086 Sun Xiu =====
S['宴诛'] = { active: { once: true, cards: { min: 0, max: 0 }, targets: { min: 1, max: 1, filter: (g, p, t) => t !== p && t.countCards('he') > 0 },
  ai: (g, p) => { const t = g.others(p).filter(q => enemy(g, p, q) && q.countCards('he')).sort((a, b) => b.equips().length - a.equips().length)[0]; return t ? { targets: [t] } : null; },
  async run(g, p, { targets: [t] }) {
    const op = t.equips().length ? await g.choose(t, [{ id: 'd', label: 'Discard 1 card' }, { id: 'e', label: `Give all your equipment to ${p.label}` }], 'Banquet Execution 宴诛', { purpose: 'yanzhu', ai: () => friend(g, t, p) ? 'e' : (t.countCards('he') ? 'd' : 'e') }) : 'd';
    if (op === 'e') { await g.give(t, p, t.equips()); p.flags.yanzhu = true; g.removeSkill(p, '宴诛'); g.log('Promote Learning 兴学 now uses max HP; Banquet Execution is lost.', { explain: true }); }
    else { const cs = await g.chooseCards(t, { min: 1, max: 1, zones: 'he', prompt: 'Discard 1 card', purpose: 'discard' }); await g.discardCards(t, cs); }
  } } };
S['兴学'] = { on: { async phaseStart(g, o, ev) {
  if (ev.player !== o || ev.phase !== 'end') return; const x = o.flags.yanzhu ? o.maxhp : o.hp; if (x <= 0) return;
  const ts = await g.choosePlayers(o, { min: 1, max: x, optional: true, prompt: `Promote Learning 兴学: up to ${x} characters each draw 1, then put a card on top of the deck.`, purpose: 'drawFriends', ai: cs => cs.filter(q => friend(g, o, q)).slice(0, x) });
  for (const t of ts || []) { if (!t.alive) continue; await g.draw(t, 1); if (t.countCards('he')) { const cs = await g.chooseCards(t, { min: 1, max: 1, zones: 'he', prompt: 'Promote Learning: put a card on top of the deck', purpose: 'discard' }); const c = cs[0]; g.detach(c); g.deck.unshift(c); await g.trigger('cardsLost', { player: t, hand: [c], equip: [], reason: 'move' }); g.update(); } }
} } };
S['诏缚'] = { lord: true, limited: true, active: { cards: { min: 0, max: 0 }, targets: { min: 1, max: 2, filter: (g, p, t) => true },
  ai: (g, p) => { const e = g.others(p).filter(q => enemy(g, p, q) && !q.marks.zhaofu).slice(0, 2); return e.length && g.round >= 2 ? { targets: e } : null; },
  async run(g, p, { targets }) { for (const t of targets) { t.marks.zhaofu = 1; t.flags.zhaofuBy = p; } g.log(`${targets.map(t => t.label).join(', ')} are now always in range of ${p.label} and of Wu characters.`, { explain: true }); g.update(); } },
  mod: { inRange: (g, o, a, b) => !!(b.flags.zhaofuBy === o && a !== b && (a === o || a.kingdom === 'wu')) } };
// ===== 087 Zhu Zhi =====
function anguoConds(g, q) { const al = g.alive(); return { hand: q.hand.length === Math.min(...al.map(x => x.hand.length)), hp: q.hp === Math.min(...al.map(x => x.hp)), equip: q.equips().length === Math.min(...al.map(x => x.equips().length)) }; }
async function anguoDo(g, q, which, src) {
  if (which === 'hand') await g.draw(q, 1);
  if (which === 'hp') await g.recover(q, 1, src);
  if (which === 'equip') { const c = g.deck.find(x => CAT[x.key].type === 'equip' && !q.equip[CAT[x.key].sub]) || g.deck.find(x => CAT[x.key].type === 'equip'); if (c) { g.detach(c); q.hand.push(c); await g.useCard(q, c, [q]); } }
}
S['安国'] = { active: { once: true, cards: { min: 0, max: 0 }, targets: { min: 1, max: 1, filter: (g, p, t) => t !== p },
  ai: (g, p) => { const t = g.others(p).filter(q => friend(g, p, q)).sort((a, b) => a.hp - b.hp)[0] || g.others(p).filter(q => !enemy(g, p, q))[0]; return t ? { targets: [t] } : { targets: [g.others(p)[0]] }; },
  async run(g, p, { targets: [t] }) {
    const done = new Set();
    for (const k of ['hand', 'hp', 'equip']) { const c = anguoConds(g, t); if (c[k] && t.alive) { done.add(k); await anguoDo(g, t, k, p); } }
    for (const k of ['hand', 'hp', 'equip']) { if (done.has(k) || !p.alive) continue; const c = anguoConds(g, p); if (c[k]) await anguoDo(g, p, k, p); }
  } } };
// ===== 088 Quan Cong =====
async function yaoming(g, o) {
  if (o.turnFlags.yaoming) return; const lo = g.alive().filter(q => q.hand.length < o.hand.length), hi = g.alive().filter(q => q.hand.length > o.hand.length && q.hand.length);
  if (!lo.length && !hi.length) return;
  const ops = []; if (lo.length) ops.push({ id: 'd', label: 'A character with fewer hand cards draws 1' }); if (hi.length) ops.push({ id: 'x', label: 'Discard a hand card of a character with more hand cards' }); ops.push({ id: 'no', label: 'Do nothing' });
  const op = await g.choose(o, ops, 'Seek Fame 邀名', { purpose: '邀名', ai: () => hi.some(q => enemy(g, o, q)) ? 'x' : lo.some(q => friend(g, o, q)) ? 'd' : 'no' }); if (!op || op === 'no') return;
  o.turnFlags.yaoming = true;
  if (op === 'd') { const t = await g.choosePlayers(o, { min: 1, max: 1, filter: q => lo.includes(q), prompt: 'Who draws 1?', purpose: 'drawFriend', ai: cs => [cs.find(q => friend(g, o, q)) || cs[0]] }); if (t && t.length) await g.draw(t[0], 1); }
  else { const t = await g.choosePlayers(o, { min: 1, max: 1, filter: q => hi.includes(q), prompt: 'Discard a hand card of whom?', purpose: 'dismantleTarget', ai: cs => [cs.find(q => enemy(g, o, q)) || cs[0]] }); if (t && t.length) { const c = await g.chooseCardFrom(o, t[0], 'h', 'discard', { purpose: 'dismantle' }); if (c) await g.discardCards(t[0], [c], { by: o }); } }
}
S['邀名'] = { on: { async damageDealt(g, o, ev) { if (ev.source === o) await yaoming(g, o); }, async damaged(g, o, ev) { if (ev.target === o) await yaoming(g, o); } } };
// ===== 089 Gongsun Yuan =====
S['怀异'] = { active: { once: true, usable: (g, p) => p.hand.length > 0, cards: { min: 0, max: 0 }, targets: { min: 0, max: 0 },
  ai: (g, p) => { const r = p.hand.filter(red).length, b = p.hand.filter(black).length; return r && b && Math.min(r, b) <= 2 && g.others(p).some(q => enemy(g, p, q) && q.countCards('he')) ? {} : null; },
  async run(g, p) {
    g.log(`${p.label} reveals: ${p.hand.map(SGS.cardName).join(', ')}.`); const cols = new Set(p.hand.map(SGS.color)); if (cols.size < 2) return;
    const rN = p.hand.filter(red).length, bN = p.hand.filter(black).length;
    const col = await g.choose(p, [{ id: 'red', label: `Discard all red (${rN})` }, { id: 'black', label: `Discard all black (${bN})` }], 'Harbouring Treason 怀异', { purpose: 'huaiyi', ai: () => { const rv = p.hand.filter(red).reduce((s, c) => s + A().cardValue(g, p, c), 0) / rN, bv = p.hand.filter(black).reduce((s, c) => s + A().cardValue(g, p, c), 0) / bN; return rv < bv ? 'red' : 'black'; } });
    const cs = p.hand.filter(c => SGS.color(c) === col); await g.discardCards(p, cs); const n = cs.length;
    const ts = await g.choosePlayers(p, { min: 1, max: n, optional: true, filter: q => q !== p && q.countCards('he') > 0, prompt: `Take a card from each of up to ${n} characters.`, purpose: 'stealMulti', ai: c2 => c2.filter(q => enemy(g, p, q)).slice(0, p.hp >= 3 ? n : 1) });
    let took = 0; for (const t of ts || []) { const c = await g.chooseCardFrom(p, t, 'he', 'take a card', { purpose: 'steal' }); if (c) { await g.gain(p, [c], { from: t }); took++; } }
    if (took >= 2) await g.loseHp(p, 1);
  } } };
})(typeof window !== 'undefined' ? window : globalThis);
