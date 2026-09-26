/* Sanguosha rules engine — core */
(function (G) {
'use strict';
const SGS = G.SGS = G.SGS || {};
const DATA = G.SGS_DATA || (typeof require !== 'undefined' ? require('./data.js') : null);
SGS.DATA = DATA;

// ---------- card catalogue ----------
const CAT = {
  slash: { type: 'basic', en: 'Strike', zh: '杀' }, dodge: { type: 'basic', en: 'Dodge', zh: '闪' },
  peach: { type: 'basic', en: 'Peach', zh: '桃' }, wine: { type: 'basic', en: 'Wine', zh: '酒' },
  dismantle: { type: 'trick', en: 'Dismantle', zh: '过河拆桥' }, steal: { type: 'trick', en: 'Steal', zh: '顺手牵羊' },
  duel: { type: 'trick', en: 'Duel', zh: '决斗' }, barbarian: { type: 'trick', en: 'Barbarian Invasion', zh: '南蛮入侵' },
  arrows: { type: 'trick', en: 'Arrow Barrage', zh: '万箭齐发' }, peachgarden: { type: 'trick', en: 'Peach Garden Oath', zh: '桃园结义' },
  harvest: { type: 'trick', en: 'Bountiful Harvest', zh: '五谷丰登' }, borrow: { type: 'trick', en: 'Borrowed Sword', zh: '借刀杀人' },
  exnihilo: { type: 'trick', en: 'Something from Nothing', zh: '无中生有' }, nullify: { type: 'trick', en: 'Nullification', zh: '无懈可击' },
  fireattack: { type: 'trick', en: 'Fire Assault', zh: '火攻' }, chain: { type: 'trick', en: 'Iron Chain', zh: '铁索连环' },
  lightning: { type: 'delayed', en: 'Lightning', zh: '闪电' }, indulgence: { type: 'delayed', en: 'Contentment', zh: '乐不思蜀' },
  supply: { type: 'delayed', en: 'Supply Shortage', zh: '兵粮寸断' },
  crossbow: { type: 'equip', sub: 'weapon', range: 1, en: 'Zhuge Crossbow', zh: '诸葛连弩' },
  twinswords: { type: 'equip', sub: 'weapon', range: 2, en: 'Twin Swords', zh: '雌雄双股剑' },
  gudingblade: { type: 'equip', sub: 'weapon', range: 2, en: 'Ancient Blade', zh: '古锭刀' },
  icesword: { type: 'equip', sub: 'weapon', range: 2, en: 'Ice Sword', zh: '寒冰剑' },
  dragonblade: { type: 'equip', sub: 'weapon', range: 3, en: 'Green Dragon Blade', zh: '青龙偃月刀' },
  serpentspear: { type: 'equip', sub: 'weapon', range: 3, en: 'Serpent Spear', zh: '丈八蛇矛' },
  axe: { type: 'equip', sub: 'weapon', range: 3, en: 'Stone Axe', zh: '贯石斧' },
  fan: { type: 'equip', sub: 'weapon', range: 4, en: 'Vermilion Fan', zh: '朱雀羽扇' },
  kirinbow: { type: 'equip', sub: 'weapon', range: 5, en: 'Kirin Bow', zh: '麒麟弓' },
  eighttrigrams: { type: 'equip', sub: 'armor', en: 'Eight Trigrams', zh: '八卦阵' },
  rattan: { type: 'equip', sub: 'armor', en: 'Rattan Armour', zh: '藤甲' },
  silverlion: { type: 'equip', sub: 'armor', en: 'Silver Lion', zh: '白银狮子' },
  chitu: { type: 'equip', sub: 'minus', en: 'Red Hare (−1)', zh: '赤兔' }, dawan: { type: 'equip', sub: 'minus', en: 'Dawan (−1)', zh: '大宛' },
  dilu: { type: 'equip', sub: 'plus', en: 'Dilu (+1)', zh: '的卢' }, zhuahuang: { type: 'equip', sub: 'plus', en: 'Zhuahuang Feidian (+1)', zh: '爪黄飞电' },
  hualiu: { type: 'equip', sub: 'plus', en: 'Hualiu (+1)', zh: '骅骝' },
};
SGS.CAT = CAT;
const SUIT_SYM = { spade: '♠', heart: '♥', club: '♣', diamond: '♦' };
const RANK_STR = r => ({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' })[r] || String(r || '');
SGS.SUIT_SYM = SUIT_SYM; SGS.RANK_STR = RANK_STR;
const isRed = s => s === 'heart' || s === 'diamond';
SGS.color = c => c ? (c.suit ? (isRed(c.suit) ? 'red' : 'black') : (c.color || 'none')) : 'none';
SGS.type = c => CAT[c.key].type === 'delayed' ? 'trick' : CAT[c.key].type; // basic | trick | equip
SGS.isTrick = c => CAT[c.key].type === 'trick' || CAT[c.key].type === 'delayed';
SGS.isNormalTrick = c => CAT[c.key].type === 'trick';
SGS.cardName = c => {
  if (!c) return '?';
  let n = CAT[c.key].en; let z = CAT[c.key].zh;
  if (c.key === 'slash' && c.nature === 'fire') { n = 'Fire Strike'; z = '火杀'; }
  if (c.key === 'slash' && c.nature === 'thunder') { n = 'Thunder Strike'; z = '雷杀'; }
  const tag = c.suit ? ` ${SUIT_SYM[c.suit]}${RANK_STR(c.rank)}` : (c.virtual && c.color && c.color !== 'none' ? ` (${c.color})` : '');
  return `${n} ${z}${tag}`;
};
SGS.shortName = c => {
  if (!c) return '?';
  if (c.key === 'slash' && c.nature === 'fire') return 'Fire Strike';
  if (c.key === 'slash' && c.nature === 'thunder') return 'Thunder Strike';
  return CAT[c.key].en;
};

SGS.they = p => p && p.isHuman ? { they: 'you', their: 'your', them: 'you', s: '' } : { they: 'they', their: 'their', them: 'them', s: '' };
SGS.fixYou = function (s) {
  if (!s || s.indexOf('You') < 0) return s;
  const prot = []; s = s.replace(/Xun You/g, m => { prot.push(m); return '\u0002' + (prot.length - 1) + '\u0003'; });
  if (s.indexOf('You') >= 0) {
    s = s.replace(/\bYou's\b/g, 'Your');
    // "You" as an object (after prepositions, arrows, list commas, some verbs) -> plain "you", never conjugated
    s = s.replace(/((?:\b(?:on|to|from|with|by|at|of|for|against|than|as|into|and|fights|Strikes|attacks|targets|saves|helps)\s)|(?:→\s?)|(?:,\s)|(?:[\u4e00-\u9fff]\s))You\b(?!r)/g, (m, pre) => pre + '\u0001');
    s = s.replace(/\bYou is\b/g, 'You are').replace(/\bYou has\b/g, 'You have').replace(/\bYou was\b/g, 'You were');
    s = s.replace(/\bYou ([a-z]+)\b/g, (m, w) => { if (['are', 'have', 'were', 'can', 'cannot', 'may', 'must', 'will', 'do', 'did', 'could', 'should', 'would'].includes(w)) return m; let v = w; const IRR = { dies: 'die', lies: 'lie', ties: 'tie', does: 'do', goes: 'go' }; if (IRR[w]) v = IRR[w]; else if (/[^aeiou]ies$/.test(w)) v = w.slice(0, -3) + 'y'; else if (/(sses|shes|ches|xes|zes)$/.test(w)) v = w.slice(0, -2); else if (/[^s]s$/.test(w)) v = w.slice(0, -1); return 'You ' + v; });
    s = s.replace(/([a-z,:;(] )You(r?)\b/g, (m, pre, r) => pre + 'you' + r);
    s = s.replace(/\u0001/g, 'you');
    if (/^[^a-zA-Z]*You\b/.test(s)) s = s.replace(/\btheir\b/g, 'your').replace(/\bthemselves\b/g, 'yourself');
  }
  return s.replace(/\u0002(\d+)\u0003/g, (m, i) => prot[+i]);
};
class GameOver extends Error { constructor(winner) { super('gameover'); this.winner = winner; } }
SGS.GameOver = GameOver;

function shuffle(a, rnd) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
SGS.shuffle = shuffle;
function mulberry(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const ROLE_TABLE = { 2: ['lord', 'rebel'], 3: ['lord', 'rebel', 'spy'], 4: ['lord', 'loyalist', 'rebel', 'spy'], 5: ['lord', 'loyalist', 'rebel', 'rebel', 'spy'],
  6: ['lord', 'loyalist', 'rebel', 'rebel', 'rebel', 'spy'], 7: ['lord', 'loyalist', 'loyalist', 'rebel', 'rebel', 'rebel', 'spy'],
  8: ['lord', 'loyalist', 'loyalist', 'rebel', 'rebel', 'rebel', 'rebel', 'spy'] };
SGS.ROLE_TABLE = ROLE_TABLE;
SGS.ROLE_NAME = { lord: 'Lord 主公', loyalist: 'Loyalist 忠臣', rebel: 'Rebel 反贼', spy: 'Spy 内奸' };
SGS.KINGDOM_NAME = { wei: 'Wei 魏', shu: 'Shu 蜀', wu: 'Wu 吴', qun: 'Qun 群', god: 'God 神' };

// ---------- Player ----------
class Player {
  constructor(game, seat) {
    this.game = game; this.seat = seat; this.hand = []; this.equip = { weapon: null, armor: null, plus: null, minus: null };
    this.judgeArea = []; this.alive = true; this.faceDown = false; this.chained = false; this.marks = {}; this.piles = {};
    this.skills = []; this.tempSkills = []; this.turn = {}; this.phaseData = {}; this.flags = {}; this.dying = false; this.used = {};
  }
  get name() { return this.general ? `${this.general.en} ${this.general.zh}` : `Seat ${this.seat + 1}`; }
  get label() { return (this.isHuman ? 'You' : this.general ? this.general.en : 'Seat ' + (this.seat + 1)); }
  get kingdom() { return this.chosenKingdom || (this.general && this.general.kingdom); }
  get gender() { return this.general ? this.general.gender : 'male'; }
  get wounded() { return this.hp < this.maxhp; }
  get lostHp() { return Math.max(0, this.maxhp - this.hp); }
  equips() { return ['weapon', 'armor', 'minus', 'plus'].map(k => this.equip[k]).filter(Boolean); }
  cards(zones = 'he') { let r = []; if (zones.includes('h')) r = r.concat(this.hand); if (zones.includes('e')) r = r.concat(this.equips()); if (zones.includes('j')) r = r.concat(this.judgeArea); return r; }
  countCards(z = 'he') { return this.cards(z).length; }
  hasSkill(id) { return this.alive && this.allSkillIds().includes(id); }
  allSkillIds() {
    let s = this.skills.concat(this.tempSkills);
    if (this.flags.skillsInvalid) s = [];
    const w = this.equip.weapon, a = this.equip.armor;
    if (w) s = s.concat(['eq_' + w.key]);
    if (a && !this.game.armorIgnored(this)) s = s.concat(['eq_' + a.key]);
    return s.filter(id => { const sk = SGS.SKILLS[id]; if (!sk) return false; if (sk.lord && this.role !== 'lord') return false; return true; });
  }
  isLord() { return this.role === 'lord'; }
  mark(n) { return this.marks[n] || 0; }
  addMark(n, k = 1) { this.marks[n] = (this.marks[n] || 0) + k; if (this.marks[n] <= 0) delete this.marks[n]; this.game.update(); }
}
SGS.Player = Player;

// ---------- Game ----------
class Game {
  constructor(opts) {
    this.opts = opts; this.rnd = opts.seed != null ? mulberry(opts.seed) : Math.random;
    this.io = opts.io; this.players = []; this.deck = []; this.discard = []; this.processing = []; this.logs = [];
    this.round = 0; this.current = null; this.phase = null; this.turnCount = 0; this.extraTurns = [];
    this.listeners = []; this.cardById = {}; this.over = false; this.stepCount = 0;
  }
  on(fn) { this.listeners.push(fn); }
  update() { for (const f of this.listeners) f('update'); }
  log(en, opts = {}) { en = SGS.fixYou(en); const e = { en, kind: opts.kind || 'info', who: opts.who, turn: this.turnCount, explain: opts.explain }; this.logs.push(e); if (this.logs.length > 3000) this.logs.shift(); for (const f of this.listeners) f('log', e); }
  explain(text) { this.log(text, { kind: 'explain' }); }
  alive() { return this.players.filter(p => p.alive); }
  others(p) { return this.alive().filter(q => q !== p); }
  // players in turn order starting from `from` (inclusive)
  order(from) { from = from || this.current || this.players[0]; const n = this.players.length; const r = []; for (let i = 0; i < n; i++) { const q = this.players[(from.seat + i) % n]; if (q.alive) r.push(q); } return r; }
  next(p) { const n = this.players.length; for (let i = 1; i <= n; i++) { const q = this.players[(p.seat + i) % n]; if (q.alive) return q; } return p; }
  prev(p) { const n = this.players.length; for (let i = 1; i <= n; i++) { const q = this.players[(p.seat - i + 2 * n) % n]; if (q.alive) return q; } return p; }
  lord() { return this.players.find(p => p.role === 'lord'); }
  kingdomsCount() { return new Set(this.alive().map(p => p.kingdom)).size; }
  skill(id) { return SGS.SKILLS[id]; }
  step() { if (++this.stepCount > 400000) throw new Error('step limit'); }

  // ----- ask -----
  async ask(p, req) {
    this.step();
    if (!p.alive && !req.allowDead) return req.default !== undefined ? req.default : null;
    req.player = p; this.update();
    const r = await this.io.ask(this, p, req);
    if (req.purpose && SGS.SKILLS[req.purpose] && SGS.skillInfo(req.purpose) && p.allSkillIds().includes(req.purpose)) {
      const pos = r === true || (Array.isArray(r) && r.length > 0) || (typeof r === 'string' && !['no', 'none', 'stop'].includes(r)) || (typeof r === 'number') || (r && typeof r === 'object' && !Array.isArray(r) && (r.a ? r.a.length : true));
      if (pos && req.type !== 'confirm' || r === true) this.log(`${p.label} uses ${this.skillLabel(req.purpose)}.`, { kind: 'skill', who: p });
    }
    return r;
  }
  async confirm(p, prompt, ctx = {}) { return !!(await this.ask(p, Object.assign({ type: 'confirm', prompt }, ctx))); }
  async choose(p, options, prompt, ctx = {}) { // options: [{id,label}]
    if (!options.length) return null;
    const r = await this.ask(p, Object.assign({ type: 'option', options, prompt }, ctx));
    return r == null ? (ctx.optional ? null : options[0].id) : r;
  }
  async choosePlayers(p, { min = 1, max = 1, filter = () => true, prompt, purpose, optional = false, ...ctx }) {
    const cands = this.alive().filter(q => filter(q));
    if (cands.length < min) return null;
    const r = await this.ask(p, Object.assign({ type: 'players', min, max, candidates: cands, prompt, purpose, optional }, ctx));
    if (!r || !r.length) { if (optional) return null; return cands.slice(0, min); }
    return r;
  }
  async chooseCards(p, { min = 1, max = 1, zones = 'h', filter = () => true, prompt, purpose, optional = false, from, ...ctx }) {
    const owner = from || p;
    const cands = owner.cards(zones).filter(c => filter(c));
    if (cands.length < min || (max === 0)) return optional ? null : [];
    const r = await this.ask(p, Object.assign({ type: 'cards', min, max, candidates: cands, prompt, purpose, optional, zones }, ctx));
    if (!r) { if (optional) return null; return cands.slice(0, min); }
    return r;
  }
  // choose a card from target's areas (hand hidden). returns card
  async chooseCardFrom(p, target, zones = 'hej', prompt, ctx = {}) {
    const avail = { h: target.hand.slice(), e: zones.includes('e') ? target.equips() : [], j: zones.includes('j') ? target.judgeArea.slice() : [] };
    if (!zones.includes('h')) avail.h = [];
    if (!avail.h.length && !avail.e.length && !avail.j.length) return null;
    const r = await this.ask(p, Object.assign({ type: 'pickFrom', target, avail, prompt, handVisible: ctx.handVisible || false }, ctx));
    if (r === 'hand' || (r == null && avail.h.length)) return avail.h[Math.floor(this.rnd() * avail.h.length)];
    if (r && r.id != null) return r;
    return avail.e[0] || avail.j[0] || avail.h[0];
  }

  // ----- setup -----
  async setup() {
    const o = this.opts; const n = o.numPlayers;
    DATA.cards.forEach(c => { const card = Object.assign({}, c); this.cardById[card.id] = card; this.deck.push(card); });
    shuffle(this.deck, this.rnd);
    const roles = shuffle(ROLE_TABLE[n].slice(), this.rnd);
    if (o.humanRole && o.humanSeat != null) { const i = roles.indexOf(o.humanRole); if (i >= 0) { [roles[0], roles[i]] = [roles[i], roles[0]]; } }
    for (let i = 0; i < n; i++) { const p = new Player(this, i); p.role = roles[i]; p.isHuman = (o.humanSeat === i); this.players.push(p); }
    // lord goes first; rotate so that seat numbering stays but current = lord
    const lord = this.lord();
    this.log(`Roles dealt. The Lord 主公 is seat ${lord.seat + 1}${lord.isHuman ? ' (you)' : ''}.`, { kind: 'sys' });
    // general selection
    let pool = shuffle(DATA.generals.slice(), this.rnd);
    if (o.generalPool) pool = pool.filter(g => o.generalPool.includes(g.id));
    const take = (k, f = () => true) => { const r = []; for (let i = 0; i < pool.length && r.length < k; i++) if (f(pool[i])) { r.push(pool[i]); pool.splice(i, 1); i--; } return r; };
    const lordGens = pool.filter(g => g.skills.some(s => s.type.includes('lord')));
    let lordChoices = shuffle(lordGens.slice(), this.rnd).slice(0, 3); pool = pool.filter(g => !lordChoices.includes(g));
    lordChoices = lordChoices.concat(take(2));
    if (o.forceGenerals && o.forceGenerals[lord.seat]) lordChoices = [DATA.generals.find(g => g.id === o.forceGenerals[lord.seat])];
    const lg = await this.pickGeneral(lord, lordChoices);
    pool = pool.concat(lordChoices.filter(g => g !== lg)); pool = shuffle(pool.filter(g => g.id !== lg.id), this.rnd);
    this.assignGeneral(lord, lg);
    for (const p of this.order(lord)) {
      if (p === lord) continue;
      let ch = take(o.choices || 3);
      if (o.forceGenerals && o.forceGenerals[p.seat]) ch = [DATA.generals.find(g => g.id === o.forceGenerals[p.seat])];
      const g = await this.pickGeneral(p, ch);
      pool = pool.concat(ch.filter(x => x !== g)).filter(x => x.id !== g.id);
      this.assignGeneral(p, g);
    }
    for (const p of this.players) {
      if (p.general.kingdom === 'god') {
        const k = await this.choose(p, ['wei', 'shu', 'wu', 'qun'].map(id => ({ id, label: SGS.KINGDOM_NAME[id] })), 'God general: choose your kingdom', { purpose: 'godKingdom' });
        p.chosenKingdom = k;
      }
    }
    for (const p of this.players) {
      p.maxhp = p.general.maxhp + (p.role === 'lord' && n > 4 ? 1 : 0); p.hp = Math.min(p.general.hp + (p.role === 'lord' && n > 4 ? 1 : 0), p.maxhp);
      this.log(`${p.label}${p.isHuman ? '' : ` (seat ${p.seat + 1})`} is ${p.general.en} ${p.general.zh} — ${SGS.KINGDOM_NAME[p.kingdom]}, ${p.maxhp} HP.`, { kind: 'sys' });
    }
    this.current = lord;
    for (const p of this.order(lord)) await this.trigger('gameStart', { player: p }, p);
    for (const p of this.order(lord)) await this.draw(p, 4, { reason: 'initial', silent: true });
    this.log('Everyone draws 4 starting cards. The Lord takes the first turn.', { kind: 'sys' });
  }
  async pickGeneral(p, choices) {
    if (choices.length === 1) return choices[0];
    const r = await this.ask(p, { type: 'general', choices, prompt: p.role === 'lord' ? 'You are the Lord 主公. Choose your general.' : 'Choose your general.', lordGeneral: this.lord().general });
    return choices.find(g => g === r || g.id === r) || (this.opts.freePick && p.isHuman && DATA.generals.find(g => g.id === r)) || choices[0];
  }
  assignGeneral(p, g) {
    p.general = g; p.skills = g.skills.map(s => s.id).filter(id => SGS.SKILLS[id]);
    for (const id of p.skills) { const sk = SGS.SKILLS[id]; if (sk.limited) p.marks['limit_' + id] = 1; }
    this.update();
  }

  // ----- main loop -----
  async run() {
    try {
      await this.setup();
      while (true) {
        await this.takeTurn(this.current, false);
        while (this.extraTurns.length) { const q = this.extraTurns.shift(); if (q.alive) await this.takeTurn(q, true); }
        this.current = this.next(this.current);
      }
    } catch (e) {
      if (e instanceof GameOver) { this.over = true; this.winner = e.winner; this.update(); for (const f of this.listeners) f('over', e.winner); return e.winner; }
      throw e;
    }
  }
  async takeTurn(p, extra) {
    this.current = p; this.turnCount++; if (p === this.lord() && !extra) this.round++;
    for (const q of this.players) { q.turnFlags = {}; }
    p.turn = { slashUsed: 0, wineUsed: false, wineBuff: 0, usedNames: new Set(), usedTypes: new Set(), usedSuits: new Set(), killed: false, skipped: 0, damagedTurn: false, cardsUsed: 0 };
    for (const q of this.players) q.damagedThisTurn = 0;
    this.log(`— ${p.label}'s turn${extra ? ' (extra turn)' : ''} —`, { kind: 'turn', who: p });
    if (p.faceDown) {
      this.log(`${p.label} ${p.isHuman ? 'are' : 'is'} face down 翻面, so ${SGS.they(p).they} flip${SGS.they(p).s} face up and skip this turn.`, { explain: true });
      await this.flip(p); await this.afterTurn(p); return;
    }
    let phases = ['start', 'judge', 'draw', 'play', 'discard', 'end'];
    p.turn.phases = phases;
    for (let i = 0; i < phases.length; i++) {
      if (!p.alive) break;
      const ph = phases[i]; this.phase = ph;
      const ev = { player: p, phase: ph, skip: false };
      if (p.turn['skip_' + ph]) ev.skip = true;
      if (!ev.skip) await this.trigger('phaseBefore', ev, p);
      if (ev.skip) { if (ph !== 'start' && ph !== 'end') { p.turn.skipped++; this.log(`${p.label} skips the ${ph} phase.`); } continue; }
      if (!p.alive) break;
      await this.runPhase(p, ph, ev);
      if (ph === 'start' && ev.extraPlay) phases.splice(i + 1, 0, 'play');
    }
    this.phase = null;
    await this.afterTurn(p);
  }
  async afterTurn(p) {
    await this.trigger('afterTurn', { player: p });
    if (this.turnCleanup) { for (const f of this.turnCleanup) f(); this.turnCleanup = null; }
    await this.sweepProcessing();
    for (const q of this.players) { q.tempSkills = q.tempSkills.filter(id => !(q.tempUntil && q.tempUntil[id] === 'turn')); }
    if (p.alive) { p.turn.wineBuff = 0; }
    this.update();
  }
  async runPhase(p, ph, ev) {
    p.phaseData = { discarded: 0, handDiscarded: 0, dealtDamage: 0 }; this.phaseDamage = false;
    await this.trigger('phaseStart', ev, p);
    if (!p.alive) return;
    if (ph === 'judge') await this.judgePhase(p);
    else if (ph === 'draw') {
      const dev = { player: p, n: 2, skipDraw: false };
      await this.trigger('drawPhase', dev, p);
      if (!dev.skipDraw && dev.n > 0 && p.alive) await this.draw(p, dev.n, { reason: 'draw phase' });
    } else if (ph === 'play') await this.playPhase(p);
    else if (ph === 'discard') await this.discardPhase(p);
    if (!p.alive) return;
    await this.trigger('phaseEnd', ev, p);
  }
  async judgePhase(p) {
    while (p.alive && p.judgeArea.length) {
      const card = p.judgeArea[p.judgeArea.length - 1];
      p.judgeArea.pop(); this.processing.push(card); this.update();
      const key = card.vkey || card.key;
      this.log(`${p.label} resolves ${CAT[key].en} ${CAT[key].zh} in ${p.isHuman ? 'your' : 'their'} judgement area.`);
      const nul = await this.nullifyWindow({ user: null, card: Object.assign({}, card, { key }), target: p, delayed: true });
      if (nul) { this.log(`${CAT[key].en} is nullified.`); this.toDiscard([card], { reason: 'use' }); if (key === 'lightning') { this.processing = this.processing.filter(c => c !== card); this.discard = this.discard.filter(c => c !== card); await this.passLightning(p, card); } continue; }
      if (key === 'indulgence') {
        const j = await this.judge(p, 'Contentment 乐不思蜀', c => c.suit === 'heart');
        if (j.suit !== 'heart') { p.turn.skip_play = true; this.log(`Judgement is not ♥ — ${p.label} will skip ${p.isHuman ? 'your' : 'their'} play phase this turn.`, { explain: true }); }
        else this.log(`Judgement is ♥ — Contentment has no effect.`);
        this.toDiscard([card], { reason: 'use' });
      } else if (key === 'supply') {
        const j = await this.judge(p, 'Supply Shortage 兵粮寸断', c => c.suit === 'club');
        if (j.suit !== 'club') { p.turn.skip_draw = true; this.log(`Judgement is not ♣ — ${p.label} will skip ${p.isHuman ? 'your' : 'their'} draw phase this turn (no 2 new cards).`, { explain: true }); }
        else this.log(`Judgement is ♣ — Supply Shortage has no effect.`);
        this.toDiscard([card], { reason: 'use' });
      } else if (key === 'lightning') {
        const j = await this.judge(p, 'Lightning 闪电', c => !(c.suit === 'spade' && c.rank >= 2 && c.rank <= 9));
        if (j.suit === 'spade' && j.rank >= 2 && j.rank <= 9) {
          this.log(`Lightning strikes! ♠2–9 — ${p.label} takes 3 thunder damage.`, { explain: true });
          this.toDiscard([card], { reason: 'use' });
          await this.damage({ source: null, target: p, amount: 3, nature: 'thunder', card, via: 'lightning' });
        } else { this.processing = this.processing.filter(c => c !== card); await this.passLightning(p, card); }
      }
    }
  }
  async passLightning(p, card) {
    let q = this.next(p); let guard = 0;
    while (guard++ < 12) {
      if (!q.judgeArea.some(c => (c.vkey || c.key) === 'lightning') && !this.prohibited(null, Object.assign({}, card, { key: 'lightning' }), q, true)) break;
      q = this.next(q); if (q === p) break;
    }
    this.processing = this.processing.filter(c => c !== card);
    q.judgeArea.push(card); this.log(`Lightning moves on to ${q.label}.`); this.update();
  }
  async playPhase(p) {
    p.phaseData.play = true; p.turn.hadPlay = true;
    p.used = {};
    let guard = 0;
    while (p.alive && !this.over) {
      if (++guard > 400) break;
      const act = await this.ask(p, { type: 'play', prompt: 'Play phase: use a card or skill, or end the phase.' });
      if (!act || act.type === 'end') break;
      if (!p.alive) break;
      try {
        if (act.type === 'card') {
          const chk = this.checkUse(p, act.card, act.targets || []);
          if (!chk.ok) { this.log(`(Illegal: ${chk.why})`, { kind: 'warn' }); if (!p.isHuman) break; continue; }
          await this.useCardFromHand(p, act);
        } else if (act.type === 'skill') {
          const sk = SGS.SKILLS[act.skill];
          if (!sk || !sk.active || !this.activeUsable(p, act.skill)) { if (!p.isHuman) break; continue; }
          const ok = await this.runActive(p, act); if (ok === false && !p.isHuman) break;
        } else break;
      } catch (e) { if (e instanceof GameOver) throw e; console.error(e); this.log('Engine error: ' + e.message, { kind: 'warn' }); if (typeof process !== 'undefined' && process.env && process.env.SGS_STRICT) throw e; }
      this.update();
    }
  }
  maxHand(p) {
    let m = p.hp; for (const q of this.alive()) for (const id of q.allSkillIds()) { const f = SGS.SKILLS[id].mod && SGS.SKILLS[id].mod.maxHand; if (f) m = f(this, q, p, m); }
    if (p.turn && p.turn.maxHandSet != null) m = p.turn.maxHandSet;
    if (p.turn && p.turn.maxHandAdd) m += p.turn.maxHandAdd;
    return Math.max(0, m);
  }
  handCountForLimit(p) { let n = p.hand.length; for (const id of p.allSkillIds()) { const f = SGS.SKILLS[id].mod && SGS.SKILLS[id].mod.handExempt; if (f) n -= p.hand.filter(c => f(this, p, c)).length; } if (p.turn && p.turn.slashExempt) n -= p.hand.filter(c => this.asCard(p, c).key === 'slash').length; return Math.max(0, n); }
  async discardPhase(p) {
    const lim = this.maxHand(p); const over = this.handCountForLimit(p) - lim;
    if (over > 0) {
      this.log(`${p.label} has ${p.hand.length} cards but a hand limit of ${lim} (current HP${lim !== p.hp ? ' ± skills' : ''}), so must discard ${over}.`, { explain: true });
      const exemptF = c => !(p.turn.slashExempt && this.asCard(p, c).key === 'slash') && !p.allSkillIds().some(id => SGS.SKILLS[id].mod && SGS.SKILLS[id].mod.handExempt && SGS.SKILLS[id].mod.handExempt(this, p, c));
      const cs = await this.chooseCards(p, { min: over, max: over, zones: 'h', filter: exemptF, prompt: `Discard ${over} card(s) (hand limit ${lim}).`, purpose: 'discardPhase' });
      await this.discardCards(p, cs, { reason: 'discardPhase' });
    }
  }

  // ----- triggers -----
  async trigger(name, ev, start) {
    const order = this.order(start || this.current);
    ev = ev || {};
    if (this.listeners.length) for (const f of this.listeners) { try { f('event', { name, ev }); } catch (e) { /* fx must never break the game */ } }
    if ((name === 'death' || name === 'damagedDead') && ev.player && !ev.player.alive && !order.includes(ev.player)) order.unshift(ev.player);
    if (name === 'damagedDead' && ev.target && !ev.target.alive && !order.includes(ev.target)) order.unshift(ev.target);
    for (const q of order) {
      if (!q.alive && !(name === 'death' && q === ev.player)) continue;
      const ids = q.allSkillIds().slice();
      for (const id of ids) {
        const sk = SGS.SKILLS[id]; if (!sk || !sk.on || !sk.on[name]) continue;
        if (!q.allSkillIds().includes(id) && !(name === 'death' && q === ev.player)) continue;
        if (ev.stop) return ev;
        await sk.on[name](this, q, ev);
      }
    }
    if (SGS.globalOn && SGS.globalOn[name]) { try { SGS.globalOn[name](this, ev); } catch (e) { /* ai bookkeeping */ } }
    return ev;
  }

  // ----- modifiers -----
  modSum(key, ...args) { let v = 0; for (const q of this.alive()) for (const id of q.allSkillIds()) { const m = SGS.SKILLS[id].mod; if (m && m[key]) v += m[key](this, q, ...args) || 0; } return v; }
  modAny(key, ...args) { for (const q of this.alive()) for (const id of q.allSkillIds()) { const m = SGS.SKILLS[id].mod; if (m && m[key] && m[key](this, q, ...args)) return true; } return false; }
  seatDistance(a, b) { if (a === b) return 0; const al = this.alive(); const i = al.indexOf(a), j = al.indexOf(b); const d = Math.abs(i - j); return Math.min(d, al.length - d); }
  distance(a, b) {
    if (a === b) return 0;
    let d = this.seatDistance(a, b);
    if (a.equip.minus) d -= 1; if (b.equip.plus) d += 1;
    d += this.modSum('distance', a, b);
    if (this.modAny('distanceOne', a, b)) return 1;
    return Math.max(1, d);
  }
  attackRange(p) { let r = p.equip.weapon ? CAT[p.equip.weapon.key].range : 1; r += this.modSum('attackRange', p); return Math.max(1, r); }
  inRange(a, b) { if (a === b) return false; if (this.modAny('inRange', a, b)) return true; return this.distance(a, b) <= this.attackRange(a); }
  armorIgnored(p) { return !!(p.flags.armorNull) || (this.curArmorIgnore && this.curArmorIgnore.has(p)); }
  slashLimit(p) { if (this.modAny('unlimitedSlash', p)) return Infinity; return 1 + this.modSum('slashExtra', p) + (p.turn.extraSlash || 0); }

  // card transformation (locked view-as like 武神/禁酒/矢志)
  asCard(p, c) {
    if (!c || c.virtual) return c;
    for (const id of p.allSkillIds()) { const t = SGS.SKILLS[id].transform; if (t) { const k = t(this, p, c); if (k) return this.virtual(k, [c], { from: id, nature: k === 'slash' ? null : undefined }); } }
    return c;
  }
  virtual(key, subcards, extra = {}) {
    const v = { key, virtual: true, subcards: subcards || [], nature: extra.nature || null };
    if (subcards && subcards.length === 1) { v.suit = subcards[0].suit; v.rank = subcards[0].rank; }
    else if (subcards && subcards.length > 1) { const cols = new Set(subcards.map(SGS.color)); v.color = cols.size === 1 ? [...cols][0] : 'none'; const suits = new Set(subcards.map(c => c.suit)); if (suits.size === 1) v.suit = subcards[0].suit; v.rank = 0; }
    else v.color = extra.color || 'none';
    Object.assign(v, extra); if (extra.nature === undefined) v.nature = null;
    return v;
  }
  realCards(card) { return card.virtual ? card.subcards : [card]; }

  // ----- legality -----
  prohibited(user, card, target, silent) { // true if user cannot use card on target
    if (this.modAny('prohibit', user, card, target)) return true;
    return false;
  }
  cardUseBlocked(p, card, mode) { // e.g. 潜袭/司敌 colour bans, 陷阵 lose
    return this.modAny('blockCard', p, card, mode);
  }
  noDistanceLimit(user, card, target) { return this.modAny('noDistance', user, card, target); }
  targetRules(user, card) {
    const k = card.key; const self = [user];
    switch (k) {
      case 'slash': return { min: 1, max: 1 + this.modSum('slashTargets', user, card), filter: t => t !== user && (!card.onlyTarget || t === card.onlyTarget) && (this.inRange(user, t) || this.noDistanceLimit(user, card, t)) };
      case 'peach': return { min: 0, max: 0, auto: () => user.wounded ? self : null };
      case 'wine': return { min: 0, max: 0, auto: () => self };
      case 'dodge': case 'nullify': return null;
      case 'dismantle': return { min: 1, max: 1, filter: t => t !== user && t.countCards('hej') > 0 };
      case 'steal': return { min: 1, max: 1, filter: t => t !== user && t.countCards('hej') > 0 && (this.distance(user, t) <= 1 + this.modSum('trickRange', user) || this.noDistanceLimit(user, card, t)) };
      case 'duel': return { min: 1, max: 1, filter: t => t !== user };
      case 'fireattack': return { min: 1, max: 1, filter: t => t.hand.length > 0 };
      case 'chain': return { min: 1, max: 2, filter: () => true, recast: true };
      case 'borrow': return { min: 1, max: 1, filter: t => t !== user && !!t.equip.weapon, second: true };
      case 'barbarian': case 'arrows': return { min: 0, max: 0, auto: () => this.order(user).filter(q => q !== user) };
      case 'peachgarden': case 'harvest': return { min: 0, max: 0, auto: () => this.order(user) };
      case 'exnihilo': return { min: 0, max: 0, auto: () => self };
      case 'lightning': return { min: 0, max: 0, auto: () => user.judgeArea.some(c => (c.vkey || c.key) === 'lightning') ? null : self };
      case 'indulgence': return { min: 1, max: 1, filter: t => t !== user && !t.judgeArea.some(c => (c.vkey || c.key) === 'indulgence') };
      case 'supply': return { min: 1, max: 1, filter: t => t !== user && !t.judgeArea.some(c => (c.vkey || c.key) === 'supply') && (this.distance(user, t) <= 1 + this.modSum('trickRange', user) || this.noDistanceLimit(user, card, t)) };
      default: if (CAT[k].type === 'equip') return { min: 0, max: 0, auto: () => self };
    }
    return null;
  }
  legalTargets(user, card) {
    const r = this.targetRules(user, card); if (!r) return [];
    if (r.auto) { const t = r.auto(); return (t || []).filter(q => !this.prohibited(user, card, q)); }
    return this.alive().filter(t => r.filter(t) && !this.prohibited(user, card, t));
  }
  canUse(p, card, opts = {}) { // basic check whether card can be used in play phase
    if (!card) return false;
    const k = card.key;
    if (this.cardUseBlocked(p, card, 'use')) return false;
    if (k === 'dodge' || k === 'nullify') return false;
    if (k === 'slash' && p.turn.slashUsed >= this.slashLimit(p) && !opts.ignoreLimit && !this.modAny('slashNoCount', p, card)) {
      // some skills allow unlimited on specific target
      if (!this.alive().some(t => this.modAny('slashUnlimitedVs', p, t))) return false;
    }
    if (k === 'wine' && p.turn.wineUsed) return false;
    if (k === 'peach' && !p.wounded) return false;
    if (k === 'chain') return true; // recast possible
    const r = this.targetRules(p, card); if (!r) return false;
    if (r.auto) return this.legalTargets(p, card).length > 0 || CAT[k].type === 'equip';
    return this.legalTargets(p, card).length > 0;
  }
  checkUse(p, card, targets) {
    if (!this.canUse(p, card)) return { ok: false, why: 'cannot use that card now' };
    const r = this.targetRules(p, card);
    if (card.key === 'chain' && (!targets || targets.length === 0)) return { ok: true, recast: true };
    if (r.auto) return { ok: true };
    const legal = this.legalTargets(p, card);
    const max = r.max + (card.extraTargets || 0);
    const main = card.key === 'borrow' ? targets.slice(0, 1) : targets;
    if (main.length < r.min || main.length > max) return { ok: false, why: 'wrong number of targets' };
    for (const t of main) if (!legal.includes(t) && !(card.key === 'slash' && this.slashTargetOk(p, card, t))) return { ok: false, why: 'illegal target ' + t.label };
    if (card.key === 'slash' && p.turn.slashUsed >= this.slashLimit(p) && !this.modAny('slashNoCount', p, card) && !main.every(t => this.modAny('slashUnlimitedVs', p, t))) return { ok: false, why: 'Strike limit reached' };
    if (card.key === 'borrow') { if (targets.length !== 2) return { ok: false, why: 'Borrowed Sword needs a victim' }; if (!this.inRange(targets[0], targets[1]) || targets[1] === targets[0]) return { ok: false, why: 'victim not in range' }; }
    return { ok: true };
  }
  slashTargetOk(p, card, t) { return t !== p && (!card.onlyTarget || t === card.onlyTarget) && (this.inRange(p, t) || this.noDistanceLimit(p, card, t)) && !this.prohibited(p, card, t); }

  // ----- card zones -----
  owner(card) { for (const p of this.players) { if (p.hand.includes(card) || p.equips().includes(card) || p.judgeArea.includes(card)) return p; } return null; }
  zoneOf(p, card) { if (p.hand.includes(card)) return 'h'; if (p.equips().includes(card)) return 'e'; if (p.judgeArea.includes(card)) return 'j'; for (const k in p.piles) if (p.piles[k].includes(card)) return 'pile:' + k; return null; }
  detach(card) { // remove from wherever it is; returns {owner, zone}
    for (const p of this.players) {
      let i = p.hand.indexOf(card); if (i >= 0) { p.hand.splice(i, 1); return { owner: p, zone: 'h' }; }
      for (const k in p.equip) if (p.equip[k] === card) { p.equip[k] = null; return { owner: p, zone: 'e', slot: k }; }
      i = p.judgeArea.indexOf(card); if (i >= 0) { p.judgeArea.splice(i, 1); return { owner: p, zone: 'j' }; }
      for (const k in p.piles) { i = p.piles[k].indexOf(card); if (i >= 0) { p.piles[k].splice(i, 1); return { owner: p, zone: 'pile' }; } }
    }
    let i = this.processing.indexOf(card); if (i >= 0) { this.processing.splice(i, 1); return { zone: 'processing' }; }
    i = this.discard.indexOf(card); if (i >= 0) { this.discard.splice(i, 1); return { zone: 'discard' }; }
    i = this.deck.indexOf(card); if (i >= 0) { this.deck.splice(i, 1); return { zone: 'deck' }; }
    return { zone: null };
  }
  // move cards, firing loss events. dest: {to:'hand'|'discard'|'deck'|'deckBottom'|'processing'|'pile'|'equip', player, pile}
  async moveCards(cards, dest, info = {}) {
    cards = cards.filter(Boolean); if (!cards.length) return;
    const losses = new Map();
    for (const c of cards) {
      const d = this.detach(c);
      if (d.owner && (d.zone === 'h' || d.zone === 'e')) { if (!losses.has(d.owner)) losses.set(d.owner, { h: [], e: [], slots: [] }); losses.get(d.owner)[d.zone].push(c); if (d.slot) losses.get(d.owner).slots.push(d.slot); }
      if (d.owner && d.zone === 'e' && c.key === 'silverlion' && !info.noSilver) (info._silver = info._silver || []).push(d.owner);
      if (dest.to === 'hand') dest.player.hand.push(c);
      else if (dest.to === 'discard') this.discard.push(c);
      else if (dest.to === 'deck') this.deck.unshift(c);
      else if (dest.to === 'deckBottom') this.deck.push(c);
      else if (dest.to === 'processing') this.processing.push(c);
      else if (dest.to === 'pile') { (dest.player.piles[dest.pile] = dest.player.piles[dest.pile] || []).push(c); }
      else if (dest.to === 'judge') dest.player.judgeArea.push(c);
    }
    this.update();
    for (const [p, l] of losses) {
      await this.trigger('cardsLost', { player: p, hand: l.h, equip: l.e, slots: l.slots, reason: info.reason, dest, by: info.by, info });
    }
    if (info._silver) for (const p of info._silver) if (p.alive && p.wounded) { this.log(`Silver Lion 白银狮子 leaves ${p.label}'s equipment — ${SGS.they(p).they} recover${SGS.they(p).s} 1 HP.`, { explain: true }); await this.recover(p, 1, null); }
    if (dest.to === 'discard' && info.reason !== 'silent') await this.trigger('toDiscardPile', { cards, reason: info.reason, owner: info.owner || (losses.size === 1 ? [...losses.keys()][0] : null), info });
  }
  toDiscard(cards, info = {}) { // sync version for processing-zone cards (no loss events)
    for (const c of cards) { const d = this.detach(c); this.discard.push(c); }
    this.update();
    return this.trigger('toDiscardPile', { cards, reason: info.reason || 'use', owner: info.owner, info });
  }
  async discardCards(p, cards, info = {}) {
    cards = (cards || []).filter(Boolean); if (!cards.length) return;
    this.log(`${p.label} discards ${cards.map(SGS.cardName).join(', ')}.`);
    if (this.phase === 'discard' && this.current === p && info.reason === 'discardPhase') { p.phaseData.handDiscarded = (p.phaseData.handDiscarded || 0) + cards.filter(c => p.hand.includes(c)).length; }
    await this.moveCards(cards, { to: 'discard' }, Object.assign({ reason: 'discard', owner: p, by: info.by || p }, info, { reason: 'discard', sub: info.reason }));
    await this.trigger('discarded', { player: p, cards, by: info.by || p, sub: info.reason });
  }
  async gain(p, cards, info = {}) { // p obtains cards (from anywhere)
    cards = cards.filter(Boolean); if (!cards.length) return;
    const from = info.from;
    await this.moveCards(cards, { to: 'hand', player: p }, Object.assign({ reason: 'gain' }, info));
    await this.trigger('gained', { player: p, cards, from });
  }
  async give(from, to, cards, info = {}) { if (!cards.length) return; this.log(`${from.label} gives ${cards.length} card(s) to ${to.label}.`); await this.gain(to, cards, Object.assign({ from, reason: 'give' }, info)); }
  drawPile() { if (!this.deck.length) this.reshuffle(); if (!this.deck.length) throw new GameOver('draw'); return this.deck.shift(); }
  reshuffle() { if (!this.discard.length) return; this.deck = this.deck.concat(shuffle(this.discard.splice(0), this.rnd)); this.log('The deck is empty — the discard pile is shuffled to form a new deck.', { kind: 'sys' }); }
  peekTop(n) { const r = []; while (this.deck.length < n && this.discard.length) this.reshuffle(); for (let i = 0; i < n && i < this.deck.length; i++) r.push(this.deck[i]); return r; }
  takeTop(n) { const r = []; for (let i = 0; i < n; i++) r.push(this.drawPile()); this.processing.push(...r); return r; }
  async draw(p, n, info = {}) {
    if (!p.alive || n <= 0) return [];
    const cs = []; for (let i = 0; i < n; i++) cs.push(this.drawPile());
    p.hand.push(...cs);
    if (!info.silent) this.log(`${p.label} draws ${n} card${n > 1 ? 's' : ''}${info.reason && info.reason !== 'draw phase' ? ` (${info.reason})` : ''}.`);
    this.update();
    await this.trigger('gained', { player: p, cards: cs, drawn: true });
    return cs;
  }
  async equipCard(p, card, info = {}) {
    const sub = CAT[card.key].sub; const old = p.equip[sub];
    if (old) { this.log(`${p.label} replaces ${SGS.cardName(old)}.`); await this.moveCards([old], { to: 'discard' }, { reason: 'replace', owner: p }); }
    this.detach(card); p.equip[sub] = card; this.log(`${p.label} equips ${SGS.cardName(card)}.`); this.update();
    await this.trigger('equipped', { player: p, card });
  }

  // ----- HP -----
  async recover(p, n, source, info = {}) {
    if (!p.alive || n <= 0) return 0;
    const ev = { player: p, amount: n, source, card: info.card };
    await this.trigger('recovering', ev);
    const real = Math.min(ev.amount, p.maxhp - p.hp); if (real <= 0) return 0;
    p.hp += real; this.log(`${p.label} recovers ${real} HP (${p.hp}/${p.maxhp}).`, { kind: 'heal', who: p }); this.update();
    await this.trigger('recovered', { player: p, amount: real, source });
    return real;
  }
  async loseHp(p, n, info = {}) {
    if (!p.alive || n <= 0) return;
    p.hp -= n; this.log(`${p.label} loses ${n} HP (${p.hp}/${p.maxhp}).`, { kind: 'dmg', who: p }); this.update();
    await this.trigger('hpLost', { player: p, amount: n });
    if (p.hp <= 0) await this.dying(p, { source: info.source || null, lossOnly: true });
  }
  async loseMaxHp(p, n) {
    if (!p.alive) return; p.maxhp -= n; if (p.hp > p.maxhp) p.hp = p.maxhp;
    this.log(`${p.label} loses ${n} max HP (${p.hp}/${p.maxhp}).`, { kind: 'dmg' }); this.update();
    if (p.maxhp <= 0) await this.die(p, { source: null });
  }
  async damage(opts) {
    const ev = Object.assign({ amount: 1, nature: null, source: null, card: null, via: null }, opts);
    const t = ev.target; if (!t || !t.alive) return 0;
    if (ev.source && !ev.source.alive) ev.source = null;
    ev.origAmount = ev.amount;
    if (ev.source) await this.trigger('damageCausing', ev, ev.source); // source side (制蛮, 绝情, 古锭刀...)
    if (ev.prevented || ev.amount <= 0) { if (!ev.silentPrevent) this.log(`Damage to ${t.label} is prevented.`); return 0; }
    if (ev.toHpLoss) { await this.loseHp(t, ev.amount, { source: ev.source }); return 0; }
    ev.chainAmount = ev.amount;
    await this.trigger('damageInflicting', ev, t); // target side (藤甲, 白银狮子, 大雾, 仁心...)
    if (ev.prevented || ev.amount <= 0) { if (!ev.silentPrevent) this.log(`Damage to ${t.label} is prevented.`); return 0; }
    if (!t.alive) return 0;
    const wasChained = t.chained && !!ev.nature;
    t.hp -= ev.amount;
    const nat = ev.nature === 'fire' ? ' fire 火焰' : ev.nature === 'thunder' ? ' thunder 雷电' : '';
    this.log(`${t.label} takes ${ev.amount}${nat} damage${ev.source ? ' from ' + ev.source.label : ''} (${t.hp}/${t.maxhp}).`, { kind: 'dmg', who: t });
    t.damagedThisTurn = (t.damagedThisTurn || 0) + 1; t.tookDamageTurn = this.turnCount;
    if (ev.source && ev.source === this.current) { ev.source.phaseData.dealtDamage = (ev.source.phaseData.dealtDamage || 0) + ev.amount; }
    this.phaseDamage = true;
    if (wasChained) { t.chained = false; this.log(ev.chainPass ? `${t.label} is unchained.` : `${t.label} was chained — the chain breaks and the${nat} damage spreads to other chained characters.`, { explain: !ev.chainPass }); }
    this.update();
    if (t.hp <= 0) await this.dying(t, ev);
    if (ev.source && ev.source.alive) await this.trigger('damageDealt', ev, ev.source);
    if (t.alive) await this.trigger('damaged', ev, t);
    else await this.trigger('damagedDead', ev, t);
    if (wasChained && !ev.chainPass) {
      for (const q of this.order(this.current)) if (q !== t && q.chained && q.alive) {
        await this.damage({ source: ev.source && ev.source.alive ? ev.source : null, target: q, amount: ev.chainAmount, nature: ev.nature, card: ev.card, via: ev.via, chainPass: true });
      }
    }
    return ev.amount;
  }
  async dying(p, ev) {
    if (!p.alive || p.dying) return;
    p.dying = true; this.log(`${p.label} is dying 濒死! Anyone may play a Peach 桃 to save ${SGS.they(p).them}.`, { kind: 'dmg', explain: true });
    const dev = { player: p, cause: ev };
    await this.trigger('enterDying', dev, p);
    for (const q of this.order(this.current)) {
      if (p.hp > 0 || !p.alive) break;
      if (!q.alive) continue;
      if (this.modAny('noRescue', q, p)) continue;
      let tries = 0;
      while (p.hp <= 0 && q.alive && p.alive && tries++ < 20) {
        const r = await this.rescueAsk(q, p);
        if (!r) break;
      }
    }
    p.dying = false;
    if (p.alive && p.hp <= 0) await this.die(p, ev);
    else if (p.alive) await this.trigger('leaveDying', { player: p }, p);
  }
  async rescueAsk(q, p) { // q helps dying p. returns true if something was done
    const names = q === p ? ['peach', 'wine'] : ['peach'];
    const specials = [];
    for (const id of q.allSkillIds()) { const sk = SGS.SKILLS[id]; if (sk.rescue && sk.rescue.can(this, q, p)) specials.push(id); }
    const res = await this.respond(q, { names, use: true, reason: 'rescue', dying: p, specials, prompt: `${p.label} is dying (${p.hp} HP). Use ${q === p ? 'a Peach or Wine' : 'a Peach'} to save them?` });
    if (!res) return false;
    if (res.special) { await SGS.SKILLS[res.special].rescue.run(this, q, p); return true; }
    const card = res.card;
    this.log(`${q.label} uses ${SGS.cardName(card)} on ${p.label}.`, { kind: 'use', who: q });
    await this.afterRespondCard(q, card, 'use');
    const ev = { user: q, card, targets: [p], rescue: true };
    await this.trigger('cardUsed', ev, q);
    await this.recover(p, 1 + (card.bonus || 0), q, { card });
    await this.finishCard(card, q);
    return true;
  }
  async die(p, ev) {
    if (!p.alive) return;
    const killer = ev && ev.source && ev.source !== p ? ev.source : null;
    p.alive = false; p.hp = Math.min(p.hp, 0);
    this.log(`${p.label} dies! ${p.isHuman ? 'Your' : 'Their'} role was ${SGS.ROLE_NAME[p.role]}.`, { kind: 'death', who: p });
    this.update();
    this.checkWin(); // official order: reveal role, check victory first; death skills (e.g. 武魂) only resolve if the game continues
    if (this.io.pause) await this.io.pause(this, 'death', { player: p });
    await this.trigger('death', { player: p, killer }, p);
    // discard everything
    const all = p.cards('hej'); for (const k in p.piles) { all.push(...p.piles[k]); p.piles[k] = []; }
    if (all.length) { for (const c of all) this.detach(c); this.discard.push(...all); await this.trigger('toDiscardPile', { cards: all, reason: 'death', owner: p }); }
    p.marks = {}; p.chained = false;
    this.checkWin();
    if (killer && killer.alive) {
      if (killer.turn && this.current === killer) killer.turn.killed = true;
      if (p.role === 'rebel') { this.log(`${killer.label} killed a Rebel and draws 3 cards as a reward.`, { explain: true }); await this.draw(killer, 3, { reason: 'reward' }); }
      if (p.role === 'loyalist' && killer.role === 'lord') { this.log(`The Lord killed a Loyalist and must discard all their cards as a penalty!`, { explain: true }); await this.discardCards(killer, killer.cards('he'), { reason: 'penalty' }); }
    }
    await this.trigger('afterDeath', { player: p, killer });
    this.update();
  }
  checkWin() {
    const lord = this.lord(); const al = this.alive();
    if (!lord.alive) {
      if (al.length === 1 && al[0].role === 'spy') throw new GameOver('spy');
      throw new GameOver('rebel');
    }
    if (!al.some(p => p.role === 'rebel' || p.role === 'spy')) throw new GameOver('lord');
  }

  // ----- judgement -----
  async judge(p, reason, goodFn, opts = {}) {
    const card = this.drawPile(); this.processing.push(card);
    this.log(`${p.label}'s judgement for ${reason}: ${SGS.cardName(card)}.`, { kind: 'judge' });
    if (!this._judgeTip) { this._judgeTip = true; this.explain('A judgement flips the top card of the deck — only its suit (♠♥♣♦) and number matter, not the card\'s name.'); }
    const ev = { player: p, card, reason, good: goodFn };
    this.update();
    await this.trigger('judgeRetrial', ev);
    ev.final = ev.card;
    await this.trigger('judgeDone', ev, p);
    if (this.io.pause) await this.io.pause(this, 'judge', ev);
    if (this.processing.includes(ev.card)) {
      if (opts.take && opts.take(ev.card) && p.alive) await this.gain(p, [ev.card], { reason: 'judge' });
      else await this.toDiscard([ev.card], { reason: 'judge', owner: p });
    }
    return ev.final;
  }
  async retrial(q, ev, newCard, opts = {}) { // q replaces judge card with newCard (from hand/eq)
    const old = ev.card;
    await this.moveCards([newCard], { to: 'processing' }, { reason: 'retrial', owner: q });
    ev.card = newCard; this.log(`${q.label} replaces the judgement card with ${SGS.cardName(newCard)}.`, { kind: 'judge' });
    if (opts.take) { await this.gain(q, [old], { reason: 'retrial' }); } else { await this.toDiscard([old], { reason: 'judge', owner: ev.player }); }
  }

  // ----- flip / chain -----
  async flip(p) { p.faceDown = !p.faceDown; this.log(`${p.label} flips ${p.faceDown ? 'face down 背面' : 'face up 正面'}.`); this.update(); await this.trigger('flipped', { player: p, faceUp: !p.faceDown }); }
  async setChained(p, v) { if (p.chained === v) return; p.chained = v; this.log(`${p.label} is ${v ? 'chained 横置' : 'unchained 重置'}.`); this.update(); await this.trigger('chainChanged', { player: p, chained: v }); }

  // ----- point fight 拼点 -----
  async pindian(a, b, reason) {
    if (!a.hand.length || !b.hand.length) return null;
    this.log(`${a.label} point-fights 拼点 ${b.label}${reason ? ' (' + reason + ')' : ''}.`);
    const ca = (await this.chooseCards(a, { min: 1, max: 1, zones: 'h', prompt: `Point fight vs ${b.label}: choose a card (higher number wins).`, purpose: 'pindian', opponent: b, initiator: true }))[0];
    const cb = (await this.chooseCards(b, { min: 1, max: 1, zones: 'h', prompt: `Point fight vs ${a.label}: choose a card (higher number wins; ties go to you).`, purpose: 'pindian', opponent: a }))[0];
    await this.moveCards([ca, cb], { to: 'processing' }, { reason: 'pindian' });
    const win = ca.rank > cb.rank;
    this.log(`${a.label} shows ${SGS.cardName(ca)}; ${b.label} shows ${SGS.cardName(cb)}. ${win ? a.label + ' wins' : a.label + ' does not win'}.`, { explain: true });
    const ev = { a, b, ca, cb, win };
    await this.trigger('pindianDone', ev);
    const rest = [ca, cb].filter(c => this.processing.includes(c)); if (rest.length) await this.toDiscard(rest, { reason: 'pindian' });
    return ev;
  }

  // ----- skills -----
  activeUsable(p, id) { const sk = SGS.SKILLS[id]; if (!sk || !sk.active || !p.allSkillIds().includes(id)) return false; if (sk.limited && !p.marks['limit_' + id]) return false; if (sk.active.once && p.used[id]) return false; return sk.active.usable ? !!sk.active.usable(this, p) : true; }
  async runActive(p, act) {
    const sk = SGS.SKILLS[act.skill]; const A = sk.active;
    const cards = act.cards || []; const targets = act.targets || [];
    const cs = A.cards || { min: 0, max: 0 }, ts = A.targets || { min: 0, max: 0 };
    let bad = cards.length < (cs.min || 0) || cards.length > (cs.max == null ? 0 : cs.max) || targets.length < (ts.min || 0) || targets.length > (ts.max == null ? 0 : ts.max);
    const zones = cs.zones || 'h';
    for (let i = 0; i < cards.length && !bad; i++) { const c = cards[i]; if (!p.cards(zones).includes(c) || (cs.filter && !cs.filter(this, p, c, cards.slice(0, i)))) bad = true; }
    for (let i = 0; i < targets.length && !bad; i++) { const t = targets[i]; if (!t.alive || (ts.filter && !ts.filter(this, p, t, targets.slice(0, i), cards))) bad = true; }
    if (A.check && !A.check(this, p, cards, targets, act)) bad = true;
    if (bad) { this.log('(Illegal skill selection)', { kind: 'warn' }); return false; }
    p.used[act.skill] = (p.used[act.skill] || 0) + 1;
    if (sk.limited) { delete p.marks['limit_' + act.skill]; }
    this.log(`${p.label} activates ${this.skillLabel(act.skill)}${targets.length ? ' → ' + targets.map(t => t.label).join(', ') : ''}.`, { kind: 'skill', who: p });
    await A.run(this, p, { cards, targets, act });
  }
  skillLabel(id) { const d = SGS.skillInfo(id); return d ? `【${d.en} ${d.zh}】` : id; }
  addTempSkill(p, id, until = 'turn') { if (!p.tempSkills.includes(id) && !p.skills.includes(id)) { p.tempSkills.push(id); p.tempUntil = p.tempUntil || {}; p.tempUntil[id] = until; } }
  addSkill(p, id) { if (!p.skills.includes(id)) p.skills.push(id); const sk = SGS.SKILLS[id]; if (sk && sk.limited && p.marks['limit_' + id] == null) p.marks['limit_' + id] = 1; this.update(); }
  removeSkill(p, id) { p.skills = p.skills.filter(x => x !== id); this.update(); }
}
SGS.Game = Game;

SGS.skillInfo = function (id) {
  if (!SGS._skillIndex) { SGS._skillIndex = {}; for (const g of DATA.generals) for (const s of g.skills) SGS._skillIndex[s.id] = s; }
  if (SGS._skillIndex[id]) return SGS._skillIndex[id];
  const sk = SGS.SKILLS[id]; if (sk && sk.info) return sk.info;
  return null;
};
})(typeof window !== 'undefined' ? window : globalThis);
