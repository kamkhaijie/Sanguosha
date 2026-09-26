/* Sanguosha rules engine — card use, responses, card effects, equipment */
(function (G) {
'use strict';
const SGS = G.SGS; const CAT = SGS.CAT; const P = SGS.Game.prototype;
SGS.SKILLS = SGS.SKILLS || {};
const S = SGS.SKILLS;

// ---------- view-as helpers ----------
// viewAs spec: { names:[keys] | fn(game,p,need)->[keys], zones:'h'|'he', min, max, filter(game,p,card,selected), valid(game,p,cards), build(game,p,cards,name)->virtual, when(game,p,mode,need)->bool, modes:['use','play'] }
P.viewAsOptions = function (p, ctx) { // ctx: {mode:'use'|'play', names:[...] | null (any, play phase)}
  const out = [];
  const ids = p.allSkillIds().slice();
  for (const q of this.alive()) if (q !== p) for (const id of q.allSkillIds()) { const sk = S[id]; if (sk && sk.globalViewAs) ids.push(id + '@' + q.seat); }
  for (const full of ids) {
    const [id, ownerSeat] = full.split('@'); const sk = S[id]; if (!sk) continue;
    const va = ownerSeat != null ? sk.globalViewAs : sk.viewAs; if (!va) continue;
    const owner = ownerSeat != null ? this.players[+ownerSeat] : p;
    if (va.modes && !va.modes.includes(ctx.mode)) continue;
    if (va.when && !va.when(this, p, ctx, owner)) continue;
    let names = typeof va.names === 'function' ? va.names(this, p, ctx, owner) : va.names;
    if (ctx.names) names = names.filter(n => ctx.names.includes(n));
    if (!names.length) continue;
    out.push({ id: full, skill: id, owner, spec: va, names });
  }
  return out;
};
P.buildViewAs = function (p, opt, cards, name) {
  const va = opt.spec;
  if (va.valid && !va.valid(this, p, cards, name, opt.owner)) return null;
  const n = va.min != null ? va.min : 1, m = va.max != null ? va.max : 1;
  if (cards.length < n || cards.length > m) return null;
  const v = va.build ? va.build(this, p, cards, name, opt.owner) : this.virtual(name, cards);
  if (!v) return null; v.viaSkill = opt.skill; v.viaOwner = opt.owner; return v;
};

// ---------- responding ----------
P.respondOptions = function (p, need) {
  const mode = need.use ? 'use' : 'play';
  const hand = p.hand.filter(c => { const a = this.asCard(p, c); return need.names.includes(a.key) && !this.cardUseBlocked(p, a, mode) && (!need.filter || need.filter(a)); });
  const va = this.viewAsOptions(p, { mode, names: need.names, need }).filter(o => !need.noViewAs);
  const specials = (need.specials || []).slice();
  for (const id of p.allSkillIds()) { const sk = S[id]; if (sk && sk.respondSpecial && need.names.some(n => sk.respondSpecial.names.includes(n)) && sk.respondSpecial.can(this, p, need) && !(need.excluded || []).includes(id)) specials.push(id); }
  return { hand, va, specials: specials.filter(id => !(need.excluded || []).includes(id)) };
};
P.respond = async function (p, need) {
  if (!p.alive) return null;
  need.excluded = need.excluded || [];
  for (let guard = 0; guard < 8; guard++) {
    const o = this.respondOptions(p, need);
    if (!o.hand.length && !o.va.length && !o.specials.length) return null;
    const r = await this.ask(p, { type: 'respond', need, hand: o.hand, viewAs: o.va, specials: o.specials, prompt: need.prompt });
    if (!r) return null;
    if (r.special) {
      const sk = S[r.special];
      if (need.reason === 'rescue' && sk.rescue) return { special: r.special };
      need.excluded.push(r.special);
      const got = await sk.respondSpecial.run(this, p, need);
      if (got) { return this.finalizeResponse(p, got, need); }
      continue;
    }
    let card = null;
    if (r.viaSkill || r.viewAs) {
      const opt = o.va.find(x => x.id === (r.viewAs || r.viaSkill)); if (!opt) continue;
      const name = r.name || opt.names[0];
      card = this.buildViewAs(p, opt, r.cards || [], name); if (!card) continue;
      if (opt.spec.onUse) { const ok = await opt.spec.onUse(this, p, card, opt.owner, need); if (ok === false) continue; }
    } else if (r.card) {
      if (!o.hand.includes(r.card)) continue;
      card = this.asCard(p, r.card);
    }
    if (!card) return null;
    return this.finalizeResponse(p, card, need);
  }
  return null;
};
P.finalizeResponse = async function (p, card, need) {
  const real = this.realCards(card).filter(c => !this.processing.includes(c));
  if (real.length) await this.moveCards(real, { to: 'processing' }, { reason: need.use ? 'use' : 'play', owner: p });
  if (need.asUse) { this.log(`${p.label} answers with ${SGS.cardName(card)}${card.viaSkill ? ' via ' + this.skillLabel(card.viaSkill) : ''}.`, { kind: 'use', who: p }); return { card }; }
  const mode = need.use ? 'use' : 'play';
  const verb = mode === 'use' ? 'uses' : 'plays';
  if (need.reason !== 'rescue') this.log(`${p.label} ${verb} ${SGS.cardName(card)}${card.viaSkill ? ' via ' + this.skillLabel(card.viaSkill) : ''}.`, { kind: 'use', who: p });
  if (mode === 'use' && need.reason !== 'rescue') { await this.afterRespondCard(p, card, mode); }
  else if (mode === 'play') await this.trigger('cardPlayed', { player: p, card, need });
  return { card };
};
P.afterRespondCard = async function (p, card, mode) {
  this.noteUsed(p, card);
  await this.trigger('cardUsed', { user: p, card, targets: [], response: true }, p);
};
P.noteUsed = function (p, card) {
  if (this.current === p && p.turn) {
    p.turn.usedNames.add(card.key); p.turn.usedTypes.add(SGS.type(card)); if (card.suit) p.turn.usedSuits.add(card.suit); p.turn.cardsUsed++;
  }
};
P.finishCard = async function (card, owner) {
  if (!card) return;
  const real = this.realCards(card).filter(c => this.processing.includes(c));
  if (real.length) await this.toDiscard(real, { reason: 'use', owner });
};
P.sweepProcessing = async function () { if (this.processing.length) { const cs = this.processing.slice(); await this.toDiscard(cs, { reason: 'use' }); } };

// ---------- nullification ----------
P.nullifyWindow = async function (ctx) { // ctx {user, card, target, delayed} -> true if nullified
  if (ctx.unNullifiable) return false;
  let nullified = false; let against = ctx; let depth = 0;
  while (depth++ < 30) {
    let used = null;
    for (const q of this.order(this.current)) {
      const o = this.respondOptions(q, { names: ['nullify'], use: true });
      if (!o.hand.length && !o.va.length && !o.specials.length) continue;
      const res = await this.respond(q, { names: ['nullify'], use: true, reason: 'nullify', against, nullified, prompt: `Use Nullification 无懈可击 against ${SGS.cardName(against.card)}${against.target ? ' on ' + against.target.label : ''}${depth > 1 ? ' (counter-nullify)' : ''}?` });
      if (res) { used = { q, card: res.card }; break; }
    }
    if (!used) break;
    await this.finishCard(used.card, used.q);
    nullified = !nullified;
    against = { user: used.q, card: used.card, target: null, isNullify: true, prev: against };
  }
  return nullified;
};

// ---------- using cards ----------
P.useCardFromHand = async function (p, act) {
  let card = act.card; const targets = act.targets || [];
  // real card from hand -> apply transforms
  if (!card.virtual) {
    if (!p.hand.includes(card) && !p.equips().includes(card)) return;
    card = this.asCard(p, card);
  } else {
    for (const c of card.subcards) if (!p.hand.includes(c) && !p.equips().includes(c) && !(card.subFromAnywhere)) return;
    if (card.viaSkill) { const sk = S[card.viaSkill]; const va = card.viaOwner && card.viaOwner !== p ? sk.globalViewAs : sk.viewAs; if (va && va.onUse) { const ok = await va.onUse(this, p, card, card.viaOwner, { mode: 'use' }); if (ok === false) return; } }
  }
  if (card.key === 'chain' && targets.length === 0) { // recast
    this.log(`${p.label} recasts ${SGS.cardName(card)} 重铸.`, { kind: 'use', who: p });
    await this.moveCards(this.realCards(card), { to: 'discard' }, { reason: 'recast', owner: p });
    await this.draw(p, 1, { reason: 'recast' }); return;
  }
  await this.useCard(p, card, targets, { fromPlay: true });
};
P.useCard = async function (user, card, targets, opts = {}) {
  targets = (targets || []).slice();
  const cat = CAT[card.key]; const real = this.realCards(card);
  // automatic targets
  const rules = this.targetRules(user, card);
  if (rules && rules.auto && !opts.forcedTargets) targets = this.legalTargets(user, card);
  // fan / 疠火 conversion to fire
  if (card.key === 'slash' && !card.nature && opts.fromPlay !== false) {
    const convs = user.allSkillIds().filter(id => S[id].toFire);
    for (const id of convs) { if (await this.confirm(user, `Use ${this.skillLabel(id)} to make this a Fire Strike 火杀?`, { purpose: 'toFire', skill: id })) { card = Object.assign({}, card, { nature: 'fire', fireVia: id }); if (!card.virtual) { card = this.virtual('slash', [real[0]], { nature: 'fire' }); card.fireVia = id; } break; } }
  }
  const tstr = targets.length && !(rules && rules.auto) ? ' → ' + (card.key === 'borrow' ? `${targets[0].label} (victim: ${targets[1] && targets[1].label})` : targets.map(t => t.label).join(', ')) : '';
  this.log(`${user.label} uses ${SGS.cardName(card)}${card.viaSkill ? ' via ' + this.skillLabel(card.viaSkill) : ''}${tstr}.`, { kind: 'use', who: user });
  if (!opts.silentExplain) this.explainCard(user, card, targets);
  // move cards
  if (cat.type === 'equip') {
    this.noteUsed(user, card);
    await this.trigger('cardUsed', { user, card, targets: [user] }, user);
    await this.equipCard(user, real[0]); return;
  }
  if (cat.type === 'delayed') {
    const t = targets[0] || user; const rc = real[0];
    this.noteUsed(user, card);
    await this.moveCards([rc], { to: 'judge', player: t }, { reason: 'use', owner: user });
    if (rc.key !== card.key) rc.vkey = card.key; else delete rc.vkey;
    await this.trigger('cardUsed', { user, card, targets: [t] }, user);
    return;
  }
  if (real.length) await this.moveCards(real.filter(c => !this.processing.includes(c)), { to: 'processing' }, { reason: 'use', owner: user });
  if (card.key === 'slash' && !opts.noCount && this.current === user) { user.turn.slashUsed = (user.turn.slashUsed || 0) + 1; }
  if (card.key === 'slash' && this.current === user) { card.wineBonus = (card.wineBonus || 0) + (user.turn.wineBuff || 0); user.turn.wineBuff = 0; }
  if (card.key === 'wine' && !opts.noCount) user.turn.wineUsed = true;
  this.noteUsed(user, card);
  const ev = { user, card, targets, noEffect: new Set(), noDodge: new Set(), ignoreArmor: new Set(), extraDamage: 0, unNullifiable: false, opts, damaged: [] };
  this.curUse = ev;
  await this.trigger('cardUsed', ev, user);
  if (card.key === 'borrow') { ev.victim = targets[1]; ev.targets = targets = [targets[0]]; }
  // targeting
  for (const t of ev.targets.slice()) {
    if (!t.alive) continue;
    const tev = { user, card, target: t, use: ev };
    await this.trigger('becomeTarget', tev, t);
  }
  for (const t of ev.targets.slice()) { if (!t.alive) continue; await this.trigger('targetChosen', { user, card, target: t, use: ev }, user); }
  for (const t of ev.targets.slice()) { if (!t.alive) continue; await this.trigger('targetConfirmed', { user, card, target: t, use: ev }, t); }
  // resolve
  const eff = SGS.EFFECTS[card.key];
  if (eff) {
    if (eff.whole) await eff.whole(this, ev);
    else for (const t of ev.targets.slice()) {
      if (!t.alive && !eff.deadOk) continue;
      if (!user.alive && eff.needUser) break;
      if (ev.noEffect.has(t)) { this.log(`${SGS.shortName(card)} has no effect on ${t.label}.`); continue; }
      if (this.immune(t, card, ev)) continue;
      if (SGS.isNormalTrick(card) && eff.skipNullify && eff.skipNullify(this, ev, t)) continue;
      if (SGS.isNormalTrick(card)) { const n = await this.nullifyWindow({ user, card, target: t, unNullifiable: ev.unNullifiable }); if (n) { this.log(`${SGS.shortName(card)} on ${t.label} is nullified.`); continue; } }
      this.curArmorIgnore = ev.ignoreArmor;
      try { await eff.each(this, ev, t); } finally { this.curArmorIgnore = null; }
    }
    if (eff.after) await eff.after(this, ev);
  }
  this.curUse = null;
  await this.trigger('cardFinished', ev, user);
  await this.finishCard(card, user);
  return ev;
};
P.immune = function (t, card, ev) {
  const ign = ev && ev.ignoreArmor && ev.ignoreArmor.has(t);
  if (t.equip.armor && t.equip.armor.key === 'rattan' && !ign && !this.armorIgnored(t) && !t.flags.skillsInvalid) {
    if ((card.key === 'slash' && !card.nature) || card.key === 'barbarian' || card.key === 'arrows') { this.log(`Rattan Armour 藤甲 makes ${t.label} immune to ${SGS.shortName(card)}.`, { explain: true }); return true; }
  }
  if (this.modAny('immune', t, card, ev)) return true;
  return false;
};
P.explainCard = function (user, card, targets) {
  const k = card.key; const t = targets[0];
  const X = {
    slash: t && `A Strike 杀 hits unless ${t.label} uses a Dodge 闪.`,
    duel: t && `Duel 决斗: starting with ${t.label}, the two take turns playing Strikes; whoever can't (or won't) takes 1 damage.`,
    barbarian: `Barbarian Invasion 南蛮入侵: every other player must play a Strike or take 1 damage.`,
    arrows: `Arrow Barrage 万箭齐发: every other player must play a Dodge or take 1 damage.`,
    dismantle: t && `Dismantle 过河拆桥: discards one of ${t.label}'s cards (hand, equipment or judgement area).`,
    steal: t && `Steal 顺手牵羊: takes one of ${t.label}'s cards (needs distance 1).`,
    indulgence: t && `Contentment 乐不思蜀: at ${t.label}'s judgement phase, unless the judgement is ♥ ${SGS.they(t).they} skip ${SGS.they(t).their} play phase.`,
    supply: t && `Supply Shortage 兵粮寸断: at ${t.label}'s judgement phase, unless the judgement is ♣ ${SGS.they(t).they} skip ${SGS.they(t).their} draw phase.`,
    lightning: `Lightning 闪电: each judgement phase, ♠2–9 deals 3 thunder damage; otherwise it passes to the next player.`,
    borrow: t && `Borrowed Sword 借刀杀人: ${t.label} must Strike the chosen victim or hand over ${SGS.they(t).their} weapon.`,
    fireattack: t && `Fire Assault 火攻: ${t.label} reveals a hand card; discarding a card of the same suit deals 1 fire damage.`,
    chain: `Iron Chain 铁索连环: chained players pass fire/thunder damage along the chain.`,
    wine: `Wine 酒: the next Strike this turn deals +1 damage (or saves you when dying).`,
  }[k];
  if (X) this.explain(X);
};

// ---------- card effects ----------
const E = SGS.EFFECTS = {};
E.slash = {
  async each(g, ev, t) {
    const { user, card } = ev;
    let need = 1; if (ev.dodgeNeed && ev.dodgeNeed.get(t)) need = ev.dodgeNeed.get(t);
    if (user.alive && g.modAny('doubleDodge', user, card, t)) need = Math.max(need, 2);
    let hit = true;
    if (!ev.noDodge.has(t) && !ev.unDodgeable) {
      let got = 0;
      for (let i = 0; i < need; i++) {
        const r = await g.respond(t, { names: ['dodge'], use: true, reason: 'slash', card, source: user, count: need, idx: i, prompt: `${user.label} Strikes you with ${SGS.cardName(card)}${need > 1 ? ` (needs ${need} Dodges; ${i} so far)` : ''}. Use a Dodge 闪?` });
        if (!r) break; got++;
        (ev.responses = ev.responses || []).push(r.card);
        await g.finishCard(r.card, t);
        await g.trigger('dodged', { player: t, card: r.card, slash: card, user }, t);
      }
      if (got >= need) {
        hit = false;
        const dev = { user, target: t, card, use: ev, force: false };
        await g.trigger('slashDodged', dev, user);
        if (dev.force) hit = true;
        if (!hit) g.log(`${t.label} dodges the Strike.`);
      }
    } else g.log(`${t.label} cannot Dodge this Strike.`);
    if (hit && t.alive) {
      const dmg = 1 + (card.wineBonus || 0) + (ev.extraDamage || 0) + (card.bonus || 0);
      const n = await g.damage({ source: user.alive ? user : null, target: t, amount: dmg, nature: card.nature, card, via: 'slash', use: ev });
      if (n) ev.damaged.push(t);
    }
  }
};
E.dodge = {}; E.nullify = {};
E.peach = { async each(g, ev, t) { await g.recover(t, 1 + (ev.card.bonus || 0), ev.user, { card: ev.card }); } };
E.wine = { async each(g, ev, t) { if (t.dying || t.hp <= 0) await g.recover(t, 1, t); else { t.turn.wineBuff = (t.turn.wineBuff || 0) + 1; g.log(`${t.label} is fortified by Wine — the next Strike deals +1 damage.`); } } };
E.exnihilo = { async each(g, ev, t) { await g.draw(t, 2, { reason: 'Something from Nothing' }); } };
E.dismantle = { async each(g, ev, t) { if (!t.countCards('hej') || !ev.user.alive) return; const c = await g.chooseCardFrom(ev.user, t, 'hej', `Dismantle: choose a card of ${t.label} to discard.`, { purpose: 'dismantle' }); if (c) { g.log(`${ev.user.label} dismantles ${SGS.cardName(c)} from ${t.label}.`); if (t.judgeArea.includes(c)) { g.detach(c); await g.toDiscard([c], { reason: 'discard', owner: t }); } else await g.moveCards([c], { to: 'discard' }, { reason: 'discard', owner: t, by: ev.user }); await g.trigger('discarded', { player: t, cards: [c], by: ev.user }); } } };
E.steal = { async each(g, ev, t) { if (!t.countCards('hej') || !ev.user.alive) return; const c = await g.chooseCardFrom(ev.user, t, 'hej', `Steal: choose a card of ${t.label} to take.`, { purpose: 'steal' }); if (c) { g.log(`${ev.user.label} takes a card from ${t.label}${t.hand.includes(c) ? '' : ': ' + SGS.cardName(c)}.`); await g.gain(ev.user, [c], { from: t, reason: 'steal' }); } } };
E.duel = {
  needUser: true,
  async each(g, ev, t) {
    const { user, card } = ev; let cur = t, other = user; let guard = 0;
    while (guard++ < 60) {
      if (!cur.alive || !other.alive) return;
      const need = g.modAny('doubleDodge', other, card, cur) ? 2 : 1; // 无双 in duel: opponent needs 2 strikes
      let ok = true;
      for (let i = 0; i < need; i++) {
        const r = await g.respond(cur, { names: ['slash'], use: false, reason: 'duel', card, source: other, prompt: `Duel vs ${other.label}: play a Strike 杀${need > 1 ? ` (${i + 1}/${need})` : ''} or take 1 damage.` });
        if (!r) { ok = false; break; }
        await g.finishCard(r.card, cur);
      }
      if (!ok) { const n = await g.damage({ source: other.alive ? other : null, target: cur, amount: 1 + (card.bonus || 0) + (other === user ? (ev.extraDamage || 0) : 0), card, via: 'duel', use: ev }); if (n && other === user) ev.damaged.push(cur); return; }
      [cur, other] = [other, cur];
    }
  }
};
const aoe = (name, resp) => ({
  async each(g, ev, t) {
    const r = await g.respond(t, { names: [resp], use: false, reason: name, card: ev.card, source: ev.user, prompt: `${SGS.shortName(ev.card)}: play a ${resp === 'slash' ? 'Strike 杀' : 'Dodge 闪'} or take 1 damage.` });
    if (r) { await g.finishCard(r.card, t); return; }
    const n = await g.damage({ source: ev.user.alive ? ev.user : null, target: t, amount: 1 + (ev.card.bonus || 0), card: ev.card, via: name, use: ev }); if (n) ev.damaged.push(t);
  }
});
E.barbarian = aoe('barbarian', 'slash'); E.arrows = aoe('arrows', 'dodge');
E.peachgarden = { skipNullify: (g, ev, t) => !t.wounded, async each(g, ev, t) { await g.recover(t, 1, ev.user); } };
E.harvest = {
  async whole(g, ev) {
    const n = ev.targets.length; const shown = g.takeTop(n); g.log(`Bountiful Harvest reveals: ${shown.map(SGS.cardName).join(', ')}.`);
    ev.shown = shown; g.harvestShown = shown; g.update();
    for (const t of ev.targets) {
      if (!t.alive || !shown.some(c => g.processing.includes(c))) continue;
      if (ev.noEffect.has(t)) continue;
      const nul = await g.nullifyWindow({ user: ev.user, card: ev.card, target: t }); if (nul) { g.log(`Bountiful Harvest on ${t.label} is nullified.`); continue; }
      const left = shown.filter(c => g.processing.includes(c));
      const pick = await g.ask(t, { type: 'pickList', cards: left, min: 1, max: 1, prompt: 'Bountiful Harvest 五谷丰登: take one card.', purpose: 'harvest' });
      const c = (pick && pick[0]) || left[0];
      g.log(`${t.label} takes ${SGS.cardName(c)}.`); await g.gain(t, [c], { reason: 'harvest' });
    }
    g.harvestShown = null;
    const rest = shown.filter(c => g.processing.includes(c)); if (rest.length) await g.toDiscard(rest, { reason: 'use' });
  }
};
E.borrow = {
  async each(g, ev, t) {
    const v = ev.victim; if (!t.equip.weapon) return;
    let did = false;
    if (v && v.alive && g.inRange(t, v)) {
      const r = await g.respond(t, { names: ['slash'], use: true, reason: 'borrow', asUse: true, card: ev.card, victim: v, source: ev.user, filterTarget: v, prompt: `Borrowed Sword: Strike ${v.label}, or give your weapon to ${ev.user.label}.` });
      if (r) { did = true; await g.useCard(t, r.card, [v], { fromPlay: false, noCount: true, silentExplain: true }); }
    }
    if (!did && t.equip.weapon && ev.user.alive) { g.log(`${t.label} hands their weapon to ${ev.user.label}.`); await g.gain(ev.user, [t.equip.weapon], { from: t, reason: 'borrow' }); }
  }
};
E.fireattack = {
  async each(g, ev, t) {
    if (!t.hand.length || !ev.user.alive) return;
    const shown = (await g.chooseCards(t, { min: 1, max: 1, zones: 'h', prompt: 'Fire Assault: reveal one of your hand cards.', purpose: 'fireattackShow', source: ev.user }))[0];
    g.log(`${t.label} reveals ${SGS.cardName(shown)}.`);
    const cs = await g.chooseCards(ev.user, { min: 1, max: 1, zones: 'h', filter: c => c.suit === shown.suit, optional: true, prompt: `Fire Assault: discard a ${SGS.SUIT_SYM[shown.suit]} card to deal 1 fire damage to ${t.label}?`, purpose: 'fireattackDiscard', target: t });
    if (cs && cs.length) { await g.discardCards(ev.user, cs, { reason: 'fireattack' }); const n = await g.damage({ source: ev.user, target: t, amount: 1 + (ev.card.bonus || 0), nature: 'fire', card: ev.card, via: 'fireattack', use: ev }); if (n) ev.damaged.push(t); }
  }
};
E.chain = { async each(g, ev, t) { await g.setChained(t, !t.chained); } };

// ---------- equipment skills ----------
S.eq_crossbow = { info: { en: 'Zhuge Crossbow', zh: '诸葛连弩' }, mod: { unlimitedSlash: (g, o, p) => o === p } };
S.eq_twinswords = { info: { en: 'Twin Swords', zh: '雌雄双股剑' }, on: { async targetChosen(g, o, ev) {
  if (ev.user !== o || ev.card.key !== 'slash' || ev.target.gender === o.gender) return;
  if (!await g.confirm(o, `Twin Swords 雌雄双股剑: make ${ev.target.label} discard a hand card or let you draw 1?`, { purpose: 'twinswords', target: ev.target })) return;
  const t = ev.target; let done = false;
  if (t.hand.length) { const cs = await g.chooseCards(t, { min: 1, max: 1, zones: 'h', optional: true, prompt: `Twin Swords: discard a hand card, or let ${o.label} draw 1.`, purpose: 'twinswordsVictim', source: o }); if (cs && cs.length) { await g.discardCards(t, cs); done = true; } }
  if (!done) await g.draw(o, 1, { reason: 'Twin Swords' });
} } };
S.eq_gudingblade = { info: { en: 'Ancient Blade', zh: '古锭刀' }, on: { async damageCausing(g, o, ev) { if (ev.source === o && ev.via === 'slash' && ev.card && ev.card.key === 'slash' && ev.target.hand.length === 0) { ev.amount++; g.log(`Ancient Blade 古锭刀: ${ev.target.label} has no hand cards, damage +1.`, { explain: true }); } } } };
S.eq_icesword = { info: { en: 'Ice Sword', zh: '寒冰剑' }, on: { async damageCausing(g, o, ev) {
  if (ev.source !== o || ev.via !== 'slash' || ev.prevented) return; const t = ev.target; if (!t.countCards('he')) return;
  if (!await g.confirm(o, `Ice Sword 寒冰剑: prevent this damage and instead discard two of ${t.label}'s cards?`, { purpose: 'icesword', target: t })) return;
  ev.prevented = true; ev.silentPrevent = true; g.log(`${o.label} uses Ice Sword: the damage is prevented.`);
  for (let i = 0; i < 2 && t.countCards('he'); i++) { const c = await g.chooseCardFrom(o, t, 'he', 'Ice Sword: discard a card', { purpose: 'dismantle' }); if (c) await g.discardCards(t, [c], { by: o }); }
} } };
S.eq_dragonblade = { info: { en: 'Green Dragon Blade', zh: '青龙偃月刀' }, on: { async slashDodged(g, o, ev) { if (ev.user === o && g.current === o) { o.turn.slashUsed = Math.max(0, o.turn.slashUsed - 1); g.log(`Green Dragon Blade 青龙偃月刀: the dodged Strike doesn't count toward ${o.label}'s limit.`, { explain: true }); } } } };
S.eq_serpentspear = { info: { en: 'Serpent Spear', zh: '丈八蛇矛' }, viewAs: { names: ['slash'], min: 2, max: 2, zones: 'h', filter: (g, p, c) => p.hand.includes(c) } };
S.eq_axe = { info: { en: 'Stone Axe', zh: '贯石斧' }, on: { async slashDodged(g, o, ev) {
  if (ev.user !== o || !ev.target.alive) return; const cands = o.cards('he').filter(c => c !== o.equip.weapon); if (cands.length < 2) return;
  const cs = await g.chooseCards(o, { min: 2, max: 2, zones: 'he', filter: c => c !== o.equip.weapon, optional: true, prompt: 'Stone Axe 贯石斧: discard 2 cards to make the Strike hit anyway?', purpose: 'axe', target: ev.target });
  if (cs && cs.length === 2) { await g.discardCards(o, cs); ev.force = true; g.log(`Stone Axe forces the Strike through!`, { explain: true }); }
} } };
S.eq_fan = { info: { en: 'Vermilion Fan', zh: '朱雀羽扇' }, toFire: true };
S.eq_kirinbow = { info: { en: 'Kirin Bow', zh: '麒麟弓' }, on: { async damageCausing(g, o, ev) {
  if (ev.source !== o || ev.via !== 'slash' || ev.prevented) return; const t = ev.target; const horses = [t.equip.plus, t.equip.minus].filter(Boolean); if (!horses.length) return;
  if (!await g.confirm(o, `Kirin Bow 麒麟弓: discard one of ${t.label}'s horses?`, { purpose: 'kirinbow', target: t })) return;
  let h = horses[0]; if (horses.length > 1) { const r = await g.ask(o, { type: 'pickList', cards: horses, min: 1, max: 1, prompt: 'Choose a horse to discard', purpose: 'dismantle' }); if (r && r[0]) h = r[0]; }
  await g.discardCards(t, [h], { by: o });
} } };
S.eq_eighttrigrams = { info: { en: 'Eight Trigrams', zh: '八卦阵' }, respondSpecial: { names: ['dodge'], can: (g, p, need) => true, async run(g, p, need) {
  g.log(`${p.label} tries Eight Trigrams 八卦阵 — judgement: red counts as a Dodge.`, { explain: true });
  const j = await g.judge(p, 'Eight Trigrams 八卦阵', c => SGS.color(c) === 'red');
  if (SGS.color(j) === 'red') return g.virtual('dodge', [], { color: 'none', viaSkill: 'eq_eighttrigrams' });
  g.log('The judgement is black — no Dodge.'); return null;
} } };
S.eq_rattan = { info: { en: 'Rattan Armour', zh: '藤甲' }, on: { async damageInflicting(g, o, ev) { if (ev.target === o && ev.nature === 'fire') { ev.amount++; g.log(`Rattan Armour 藤甲 burns: fire damage +1.`, { explain: true }); } } } };
S.eq_silverlion = { info: { en: 'Silver Lion', zh: '白银狮子' }, on: { async damageInflicting(g, o, ev) { if (ev.target === o && ev.amount > 1) { ev.amount = 1; g.log(`Silver Lion 白银狮子 reduces the damage to 1.`, { explain: true }); } } } };
})(typeof window !== 'undefined' ? window : globalThis);
