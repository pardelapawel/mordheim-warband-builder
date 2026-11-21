// Post-battle sequence (book pp. 32-43): pure rules, no DOM.
// Resolvers return {text, needs, actions}: book text so far, rolls still missing, and action drafts.
import {fighterTemplate, isLeader} from './eligibility.mjs';
import {ADVANCE_THRESHOLDS, racialMaxima} from './progression.mjs';
import {STAT_KEYS, STAT_LABELS, skillChoices} from './model.mjs';
import * as Skills from './skills.mjs';

export function rollDie(sides, rng = Math.random) {
  return Math.min(sides, Math.floor(rng() * sides) + 1);
}

export function isPet(fighter, catalog) {
  return fighterTemplate(fighter, catalog)?.type === 'Zwierzak';
}

const inRange = (value, {min, max}) => value >= min && (max === null || max === undefined || value <= max);
const result = () => ({text: [], needs: [], rolled: [], chosen: [], actions: []});
// Asks for a choice. Once answered it stays in `chosen`, so the dialog can still change it.
function ask(out, choices, spec) {
  const value = choices[spec.key];
  if (spec.options.some(o => !o.disabled && String(o.value) === String(value))) { out.chosen.push(spec); return value; }
  out.choose = spec;
  return undefined;
}

// A valid roll is recorded in `rolled` (the dialog keeps it editable); a missing or out-of-range one stays in `needs`.
function take(out, rolls, need) {
  const value = rolls[need.key], min = need.min || 1;
  if (Number.isInteger(value) && value >= min && value <= need.sides) { out.rolled.push({...need, value}); return value; }
  out.needs.push(need);
  return null;
}

const OLD_WOUND = 'Stara rana';
function oldWoundNote(fighter) {
  const text = fighter.injuries || '';
  const stated = [...text.matchAll(/Stara rana ×(\d+)/g)].map(match => Number(match[1]));
  const count = (stated.length ? Math.max(...stated) : text.split(OLD_WOUND).length - 1) + 1;
  return {kind: 'note', text: `${OLD_WOUND} ×${count}: nie wychodzi na ${count === 1 ? '1' : `1–${count}`}`, replaces: OLD_WOUND};
}

const BLIND = 'Oślepiony na jedno oko';
function injuryActions(templates, fighter) {
  return templates.flatMap(action => {
    if (action.kind === 'remove') return [{kind: 'remove', keepEquipment: false}];
    if (action.kind === 'oldWound') return [oldWoundNote(fighter)];
    if (action.kind === 'blindEye') return (fighter.injuries || '').includes(BLIND)
      ? [{kind: 'remove', keepEquipment: true}]
      : [{kind: 'stat', stat: 'bs', delta: -1}, {kind: 'note', text: BLIND}];
    return [{...action}];
  });
}

export function resolveInjury(fighter, rolls, catalog) {
  const out = result(), table = catalog.aftermath;
  if (isPet(fighter, catalog)) {
    const roll = take(out, rolls, {key: '1', sides: 6, label: 'Zwierzak: k6'});
    if (!roll) return out;
    if (roll <= table.petInjury.deathMax) { out.text.push('Zwierzak ginie.'); out.actions.push({kind: 'remove', keepEquipment: false}); }
    else out.text.push('Zwierzakowi nic się nie stało.');
    return out;
  }
  let step = table.heroInjury, depth = 1;
  while (step) {
    const roll = take(out, rolls, {key: String(depth), sides: step.sides, label: step.label});
    if (!roll) return out;
    const node = step.results.find(entry => inRange(roll, entry))?.node;
    if (!node) return out;
    out.text.push(node.text);
    out.actions.push(...injuryActions(node.actions || [], fighter));
    step = node.next; depth++;
  }
  return out;
}

// --- Experience and advances ---

const statLabel = stat => STAT_LABELS[STAT_KEYS.indexOf(stat)] || stat;

export function battleRating(band, takingPartIds) {
  return band.fighters.filter(f => takingPartIds.has(f.id))
    .reduce((sum, f) => sum + (f.is_large ? 20 : 5) + (Number(f.exp) || 0), 0);
}

export function underdogBonus(ownRating, opponentRating, catalog) {
  if (opponentRating === null || opponentRating === undefined || opponentRating === '') return 0;
  const gap = Number(opponentRating) - Number(ownRating);
  if (!(gap > 0)) return 0;
  return catalog.aftermath.underdog.find(row => inRange(gap, row))?.bonus || 0;
}

export function experienceGain({participated, isLeader, won, kills = 0, warpstone = 0, scenario = 0, underdog = 0, injuryExp = 0}) {
  const parts = [
    ['Udział w bitwie', participated ? 1 : 0],
    ['Zwycięski lider', participated && isLeader && won ? 1 : 0],
    ['Wykluczeni wrogowie', Number(kills) || 0],
    ['Spaczenie z planszy', Number(warpstone) || 0],
    ['Scenariusz', Number(scenario) || 0],
    ['Słabeusze', participated ? Number(underdog) || 0 : 0],
    ['Co go nie zabije…', Number(injuryExp) || 0],
  ].filter(([, value]) => value).map(([label, value]) => ({label, value}));
  return {total: parts.reduce((sum, part) => sum + part.value, 0), parts};
}

export function crossedThresholds(oldExp, newExp) {
  return ADVANCE_THRESHOLDS.filter(t => oldExp < t && t <= newExp);
}

export function advanceSkillChoices(fighter, catalog) {
  const spellList = fighterTemplate(fighter, catalog)?.spell_list;
  return skillChoices(fighter, catalog).filter(skill => !skill.mutation && skill.name !== spellList && !Array.isArray(catalog.spellsByList?.[skill.name]));
}

function belowMax(fighter, stat, maxima, pending) {
  const max = Number(maxima[stat]);
  if (!Number.isFinite(max) || maxima[stat] === '' || maxima[stat] === undefined) return true;
  return (Number(fighter.stats[stat]) || 0) + (pending[stat] || 0) < max;
}

function statChoice(fighter, candidates, maxima, pending, label) {
  const open = candidates.filter(stat => belowMax(fighter, stat, maxima, pending));
  const pool = open.length ? open : STAT_KEYS.filter(stat => belowMax(fighter, stat, maxima, pending));
  return {key: 'stat', label, options: pool.map(value => ({value, label: statLabel(value)}))};
}

const knownSpell = (fighter, name) => fighter.skills.some(entry => Skills.getSkillEntryNames(entry).includes(Skills.normalizeSkillName(name)));

function spellAdvance(fighter, rolls, choices, catalog, out) {
  const template = fighterTemplate(fighter, catalog), list = template.spell_list, spells = catalog.spellsByList[list] || [];
  const pick = key => {
    const roll = take(out, rolls, {key, sides: spells.length || 6, label: `Czar: ${list}`});
    return roll ? spells[roll - 1] : null;
  };
  const add = spell => {
    out.text.push(`Nowy czar: ${spell.name}.`);
    const entry = Skills.selectGroupedSkillOption(Skills.createAddableSkillEntry(list, template, catalog), spell.name, catalog);
    out.actions.push({kind: 'addSkill', entry: {...entry, cost: 0}});
  };
  const first = pick('spell');
  if (!first) return out;
  if (!knownSpell(fighter, first.name)) { add(first); return out; }
  out.text.push(`Ten czar jest już znany: ${first.name}.`);
  const decision = ask(out, choices, {key: 'duplicateSpell', label: 'Powtórzony czar', options: [{value: 'reroll', label: 'Rzuć ponownie'}, {value: 'lower', label: 'Obniż trudność o 1'}]});
  if (!decision) return out;
  if (decision === 'lower') { out.actions.push({kind: 'spellDifficulty', spell: first.name, delta: -1}); return out; }
  const second = pick('spellReroll');
  if (!second) return out;
  // A second repeat lowers that spell's difficulty instead of rolling forever.
  if (knownSpell(fighter, second.name)) out.actions.push({kind: 'spellDifficulty', spell: second.name, delta: -1});
  else add(second);
  return out;
}

function skillAdvance(fighter, choices, catalog, out) {
  const options = advanceSkillChoices(fighter, catalog);
  const name = ask(out, choices, {key: 'skill', label: 'Nowa umiejętność', options: options.map(s => ({value: s.name, label: s.kind === 'group' ? `${s.name} · wybór opcji` : s.name}))});
  const chosen = options.find(skill => skill.name === name);
  if (!chosen) return out;
  let entry = Skills.createAddableSkillEntry(chosen.name, fighterTemplate(fighter, catalog), catalog);
  if (entry.kind === 'group') {
    const groupOptions = Skills.getGroupedSkillOptions(entry, catalog);
    const option = ask(out, choices, {key: 'skillOption', label: chosen.name, options: groupOptions.map(o => ({value: o.name, label: o.name}))});
    if (!option) return out;
    entry = Skills.selectGroupedSkillOption(entry, option, catalog);
  }
  out.text.push(`Nowa umiejętność: ${Skills.formatSkillEntry(entry, catalog)}.`);
  out.actions.push({kind: 'addSkill', entry: {...entry, cost: 0}});
  return out;
}

export function resolveAdvance(fighter, rolls, choices, catalog, pendingStatDeltas = {}) {
  const out = result(), roll = take(out, rolls, {key: '2d6', sides: 12, min: 2, label: 'Rozwój: 2k6'});
  if (!roll) return out;
  const row = catalog.aftermath.advance.results.find(entry => inRange(roll, entry));
  if (!row) return out;
  out.text.push(row.text);
  if (row.type === 'skill') {
    if (fighterTemplate(fighter, catalog)?.spell_list) {
      const learn = ask(out, choices, {key: 'learn', label: 'Umiejętność czy czar?', options: [{value: 'skill', label: 'Umiejętność'}, {value: 'spell', label: 'Czar (losowy)'}]});
      if (!learn) return out;
      if (learn === 'spell') return spellAdvance(fighter, rolls, choices, catalog, out);
    }
    return skillAdvance(fighter, choices, catalog, out);
  }
  const maxima = racialMaxima(fighter, catalog);
  let stat;
  if (row.type === 'choose') {
    const pick = statChoice(fighter, row.pair, maxima, pendingStatDeltas, 'Wybierz charakterystykę');
    stat = ask(out, choices, pick);
    if (!stat) return out;
  } else {
    const pair = take(out, rolls, {key: 'pair', sides: 6, label: `k6: 1–3 ${statLabel(row.pair[0])}, 4–6 ${statLabel(row.pair[1])}`});
    if (!pair) return out;
    const [rolled, other] = pair <= 3 ? row.pair : [...row.pair].reverse();
    if (belowMax(fighter, rolled, maxima, pendingStatDeltas)) stat = rolled;
    else if (belowMax(fighter, other, maxima, pendingStatDeltas)) { stat = other; out.text.push(`${statLabel(rolled)} ma maksimum rasowe — rośnie ${statLabel(other)}.`); }
    else {
      const pick = statChoice(fighter, [], maxima, pendingStatDeltas, `${statLabel(rolled)} i ${statLabel(other)} mają maksimum — wybierz inną`);
      stat = ask(out, choices, pick);
      if (!stat) return out;
    }
  }
  out.actions.push({kind: 'stat', stat, delta: 1});
  return out;
}

// --- Exploration ---

export function explorationDiceCount({heroes = 0, won = false, eyeBonus = 0, adjust = 0}, catalog) {
  const count = heroes + (won ? 1 : 0) + eyeBonus + (Number(adjust) || 0);
  return Math.max(0, Math.min(catalog.aftermath.exploration.maxDice, count));
}

export function groupDice(values) {
  const counts = new Map();
  for (const value of values) if (value) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts].sort(([a], [b]) => a - b).map(([value, size]) => ({value, size}));
}

export function warpstoneFromSum(sum, catalog) {
  if (!(sum > 0)) return 0;
  return catalog.aftermath.warpstoneFromSum.find(row => inRange(sum, row))?.pieces || 0;
}

export function findFor({size, value}, catalog) {
  return catalog.aftermath.exploration.finds.find(f => f.size === size && f.value === value);
}

// Heroes who can take `points` experience without reaching an advance (footnote p. 42).
export function expTargets(heroes, points) {
  return heroes.filter(h => crossedThresholds(Number(h.exp) || 0, (Number(h.exp) || 0) + points).length === 0);
}

const diceText = ({count, sides, times = 1}) => `${count > 1 ? count : ''}k${sides}${times > 1 ? ` × ${times}` : ''}`;
const TREASURY_KEY = {gold: 'gold', shards: 'shards', armour: 'armourFragments'};

// Returns the dice amount, or null after recording the missing roll.
function diceAmount(dice, key, rolls, out, label) {
  if (dice.flat !== undefined) return dice.flat;
  const roll = take(out, rolls, {key, sides: dice.count * dice.sides, min: dice.count, label: `${label}: ${diceText(dice)}`});
  return roll === null ? null : roll * (dice.times || 1);
}

function resolveGains(gains, prefix, rolls, choices, context, catalog, out) {
  gains.forEach((gain, index) => {
    const key = kind => `${prefix}${kind}${index}`;
    if (TREASURY_KEY[gain.kind]) {
      const amount = diceAmount(gain.dice, key('g'), rolls, out, {gold: 'Złote korony', shards: 'Spaczenie', armour: 'Fragmenty pancerza'}[gain.kind]);
      if (amount) out.actions.push({kind: 'treasury', [TREASURY_KEY[gain.kind]]: amount});
    } else if (gain.kind === 'item') {
      const count = gain.dice ? diceAmount(gain.dice, key('g'), rolls, out, gain.text) : 1;
      if (count) out.actions.push({kind: 'storeItem', text: count > 1 ? `${count}× ${gain.text}` : gain.text});
    } else if (gain.kind === 'note') {
      out.actions.push({kind: 'bandNote', text: gain.text});
    } else if (gain.kind === 'artefact') {
      const roll = take(out, rolls, {key: key('a'), sides: 6, label: 'Magiczny artefakt: k6'});
      if (roll) out.actions.push({kind: 'storeItem', text: catalog.aftermath.artefacts[roll - 1]});
    } else if (gain.kind === 'table' || gain.kind === 'check') {
      const roll = take(out, rolls, {key: key('t'), sides: gain.sides, label: gain.label || `k${gain.sides}`});
      if (!roll) return;
      const next = gain.kind === 'table' ? gain.results.find(r => inRange(roll, r))?.gains : roll >= gain.min ? gain.gains : null;
      if (next) resolveGains(next, `${key('t')}.`, rolls, choices, context, catalog, out);
    } else if (gain.kind === 'exp') {
      const points = diceAmount(gain.dice, key('g'), rolls, out, 'Punkty doświadczenia');
      if (!points) return;
      if (gain.target === 'leader') {
        const leader = context.heroes.find(h => h.id === context.leaderId);
        if (leader && expTargets([leader], points).length) out.actions.push({kind: 'exp', fighterId: leader.id, delta: points});
        else out.text.push('Lider nie może teraz otrzymać PD (dałoby to rozwój) — wybierz inną nagrodę.');
        return;
      }
      const eligible = expTargets(context.heroes, 1), split = choices.heroes || {};
      const assigned = Object.entries(split).filter(([, value]) => Number(value) > 0);
      const valid = assigned.reduce((sum, [, value]) => sum + Number(value), 0) === points
        && assigned.every(([id, value]) => expTargets(context.heroes.filter(h => h.id === id), Number(value)).length === 1)
        && (gain.target === 'heroes' || assigned.length === 1);
      const spec = {key: 'heroes', label: `Rozdziel ${points} PD`, total: points, options: eligible.map(h => ({value: h.id, label: h.name}))};
      if (!valid) { out.choose = spec; return; }
      out.chosen.push(spec);
      for (const [fighterId, value] of assigned) out.actions.push({kind: 'exp', fighterId, delta: Number(value)});
    }
  });
}

// Footnote p. 42: exploration may not give experience that would raise a model's level.
function leaderBlocked(option, context) {
  const gain = option.gains.find(g => g.kind === 'exp' && g.target === 'leader');
  if (!gain) return null;
  const leader = context.heroes.find(h => h.id === context.leaderId);
  if (!leader) return 'brak lidera';
  const points = gain.dice?.flat;
  return points && !expTargets([leader], points).length ? 'lider dostałby rozwój' : null;
}

export function resolveFind(find, rolls, choices, context, catalog) {
  const out = result();
  out.text.push(`${find.name}: ${find.text}`);
  let option = find.options[0];
  if (find.options.length > 1) {
    const picked = ask(out, choices, {key: 'option', label: 'Wybierz nagrodę', options: find.options.map((o, i) => {
      const blocked = leaderBlocked(o, context);
      return blocked ? {value: i, label: `${o.label} — niedostępne: ${blocked}`, disabled: true} : {value: i, label: o.label};
    })});
    if (picked === undefined) return out;
    option = find.options[picked];
  }
  resolveGains(option.gains, '', rolls, choices, context, catalog, out);
  return out;
}


// --- Warpstone sale ---

export function warpstoneSalePrice(sold, bandSize, catalog) {
  if (!(sold > 0)) return 0;
  const {bandSizes, rows} = catalog.aftermath.warpstoneSale;
  const column = Math.max(0, bandSizes.findIndex(([min, max]) => bandSize >= min && (max === null || bandSize <= max)));
  return rows[Math.min(sold, rows.length) - 1][column];
}

// Total price for selling 1, 2, … shards (up to `available`) for this band size.
export function warpstonePriceList(bandSize, available, catalog) {
  const count = Math.min(Math.max(0, available), catalog.aftermath.warpstoneSale.rows.length);
  return Array.from({length: count}, (_, i) => warpstoneSalePrice(i + 1, bandSize, catalog));
}

// --- The whole sequence ---

export function newAftermathState(band) {
  const each = value => Object.fromEntries(band.fighters.map(f => [f.id, value]));
  return {setup: {took: each(true), ooa: each(false), won: false, opponentRating: null}, rolls: {}, choices: {}, inputs: {}, dice: [], removed: new Set()};
}

const sourceOf = id => id.slice(0, id.lastIndexOf('#'));

// Re-enable removed actions whose inputs just changed; 'dice' touches every exploration result.
export function clearRemovedFor(state, changedKey) {
  for (const id of [...state.removed]) {
    const source = sourceOf(id);
    const hit = changedKey === 'dice'
      ? source === 'exploration' || source.startsWith('find:') || source === 'sale'
      : changedKey === source || changedKey.startsWith(`${source}/`);
    if (hit) state.removed.delete(id);
  }
}

const scoped = (record, source) => Object.fromEntries(Object.entries(record)
  .filter(([key]) => key.startsWith(`${source}/`)).map(([key, value]) => [key.slice(source.length + 1), value]));

const signed = n => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);

function actionLabel(action, band, catalog) {
  const name = band.fighters.find(f => f.id === action.fighterId)?.customName || '';
  switch (action.kind) {
    case 'remove': return `${name}: usunięty z bandy${action.keepEquipment ? ' (ekwipunek do magazynu)' : ''}`;
    case 'stat': return `${name}: ${statLabel(action.stat)} ${signed(action.delta)}`;
    case 'exp': return `${name}: ${signed(action.delta)} PD`;
    case 'addSkill': return `${name}: ${Skills.formatSkillEntry(action.entry, catalog)}`;
    case 'spellDifficulty': return `${name}: ${action.spell} — trudność ${signed(action.delta)}`;
    case 'note': return `${name}: ${action.text}`;
    case 'treasury': return [
      action.gold && `${signed(action.gold)} zk`,
      action.shards && `${signed(action.shards)} Spaczenia`,
      action.armourFragments && `${signed(action.armourFragments)} fragm. pancerza`,
    ].filter(Boolean).join(', ');
    case 'storeItem': return `Magazyn: ${action.text}`;
    case 'bandNote': return `Notatka: ${action.text}`;
    default: return action.kind;
  }
}

export function buildAftermath(band, catalog, state) {
  const {setup} = state, actions = [];
  const took = band.fighters.filter(f => setup.took[f.id] !== false);
  const tookIds = new Set(took.map(f => f.id));
  const rating = battleRating(band, tookIds);
  const underdog = underdogBonus(rating, setup.opponentRating, catalog);
  const card = (source, step, extra, res, fighterId) => {
    const own = res.actions.map((draft, index) => {
      const action = {...draft, id: `${source}#${index}`, source, step, ...(fighterId && !draft.fighterId && !['treasury', 'storeItem', 'bandNote'].includes(draft.kind) ? {fighterId} : {})};
      return {...action, label: actionLabel(action, band, catalog), removed: state.removed.has(action.id)};
    });
    actions.push(...own);
    return {source, fighterId, ...extra, result: {rolled: [], chosen: [], ...res}, actions: own};
  };
  const keptWhere = test => actions.filter(a => !a.removed && test(a));

  // 1. Injuries
  const injuries = took.filter(f => setup.ooa[f.id]).map(f =>
    card(`injury:${f.id}`, 'injuries', {title: f.customName, pet: isPet(f, catalog)}, resolveInjury(f, scoped(state.rolls, `injury:${f.id}`), catalog), f.id));
  const gone = new Set(keptWhere(a => a.kind === 'remove').map(a => a.fighterId));

  // 2. Experience and advances
  const experience = [];
  for (const f of took.filter(f => !isPet(f, catalog) && !gone.has(f.id))) {
    const source = `exp:${f.id}`, inputs = scoped(state.inputs, source);
    const injuryExp = keptWhere(a => a.step === 'injuries' && a.kind === 'exp' && a.fighterId === f.id).reduce((s, a) => s + a.delta, 0);
    const gain = experienceGain({participated: true, isLeader: isLeader(f, catalog), won: setup.won, kills: inputs.kills, warpstone: inputs.warpstone, scenario: inputs.scenario, underdog, injuryExp});
    const drafts = [];
    // Injury experience is already its own action; this one adds the rest.
    if (gain.total - injuryExp) drafts.push({kind: 'exp', delta: gain.total - injuryExp});
    if (Number(inputs.warpstone) > 0) drafts.push({kind: 'treasury', shards: Number(inputs.warpstone)});
    const expCard = card(source, 'experience', {type: 'exp', title: f.customName, gain}, {text: gain.parts.map(p => `${p.label}: +${p.value}`), needs: [], actions: drafts}, f.id);
    experience.push(expCard);
    const oldExp = Number(f.exp) || 0;
    const newExp = oldExp + keptWhere(a => a.kind === 'exp' && a.fighterId === f.id).reduce((s, a) => s + a.delta, 0);
    const pending = {};
    for (const threshold of crossedThresholds(oldExp, newExp)) {
      const advSource = `advance:${f.id}:${threshold}`;
      const adv = card(advSource, 'experience', {type: 'advance', threshold, title: `${f.customName} — rozwój (${threshold} PD)`},
        resolveAdvance(f, scoped(state.rolls, advSource), scoped(state.choices, advSource), catalog, {...pending}), f.id);
      experience.push(adv);
      for (const a of adv.actions) if (!a.removed && a.kind === 'stat') pending[a.stat] = (pending[a.stat] || 0) + a.delta;
    }
  }

  // 3. Exploration
  const explorers = took.filter(f => !isPet(f, catalog) && !setup.ooa[f.id] && !gone.has(f.id));
  const eyeBonus = explorers.some(f => f.equipment.some(e => e.name === 'Wszystkowidzące oko')) ? 1 : 0;
  const count = explorationDiceCount({heroes: explorers.length, won: setup.won, eyeBonus, adjust: state.inputs['exploration/adjust']}, catalog);
  const dice = Array.from({length: count}, (_, i) => {
    const value = Number(state.dice[i]);
    return Number.isInteger(value) && value >= 1 && value <= 6 ? value : null;
  });
  const complete = count > 0 && dice.every(Boolean);
  const groups = complete ? groupDice(dice) : [];
  const sum = complete ? dice.reduce((s, v) => s + v, 0) : 0;
  const warpstone = warpstoneFromSum(sum, catalog);
  if (warpstone) card('exploration', 'exploration', {}, {text: [], needs: [], actions: [{kind: 'treasury', shards: warpstone}]});
  const heroes = band.fighters.filter(f => !isPet(f, catalog) && !gone.has(f.id)).map(f => ({
    id: f.id, name: f.customName,
    exp: (Number(f.exp) || 0) + keptWhere(a => a.kind === 'exp' && a.fighterId === f.id).reduce((s, a) => s + a.delta, 0),
  }));
  const leaderId = band.fighters.find(f => !gone.has(f.id) && isLeader(f, catalog))?.id || null;
  const cards = groups.map(group => {
    const find = findFor(group, catalog), source = `find:${group.size}x${group.value}`;
    return card(source, 'exploration', {title: find.name, group}, resolveFind(find, scoped(state.rolls, source), scoped(state.choices, source), {leaderId, heroes}, catalog));
  });

  // 4. Warpstone sale
  const gained = keptWhere(a => a.kind === 'treasury' && a.shards > 0).reduce((s, a) => s + a.shards, 0);
  const available = (Number(band.treasury.shards) || 0) + gained;
  const bandSize = band.fighters.length - gone.size;
  const sold = Math.max(0, Math.min(available, Number(state.inputs['sale/sold']) || 0));
  const price = warpstoneSalePrice(sold, bandSize, catalog);
  if (sold) card('sale', 'sale', {}, {text: [], needs: [], actions: [{kind: 'treasury', gold: price, shards: -sold}]});

  return {rating, underdog, injuries, experience, exploration: {count, dice, groups, cards, sum, warpstone, eyeBonus}, sale: {available, bandSize, sold, price}, actions, leaderDied: band.fighters.some(f => gone.has(f.id) && isLeader(f, catalog))};
}

export function battleSummary(built, state) {
  const kept = built.actions.filter(a => !a.removed);
  const total = key => kept.filter(a => a.kind === 'treasury').reduce((s, a) => s + (a[key] || 0), 0);
  const shards = kept.filter(a => a.kind === 'treasury' && a.shards > 0).reduce((s, a) => s + a.shards, 0);
  const parts = [state.setup.won ? 'wygrana' : 'przegrana'];
  if (shards) parts.push(`+${shards} Spaczenia`);
  if (total('gold')) parts.push(`${signed(total('gold'))} zk`);
  if (total('armourFragments')) parts.push(`+${total('armourFragments')} fragm. pancerza`);
  const dead = kept.filter(a => a.kind === 'remove').map(a => a.label.split(':')[0]);
  if (dead.length) parts.push(`odeszli: ${dead.join(', ')}`);
  return `bitwa: ${parts.join(', ')}`;
}

const appendLine = (text, line) => (text ? `${text}\n${line}` : line);
const ORDER = ['exp', 'stat', 'addSkill', 'spellDifficulty', 'note', 'remove', 'treasury', 'storeItem', 'bandNote'];

export function applyActions(band, actions, catalog, {date, summary}) {
  const next = structuredClone(band);
  const fighter = id => next.fighters.find(f => f.id === id);
  const sorted = [...actions].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
  for (const action of sorted) {
    const f = action.fighterId ? fighter(action.fighterId) : null;
    switch (action.kind) {
      case 'exp': if (f) f.exp = Math.max(0, (Number(f.exp) || 0) + action.delta); break;
      case 'stat': if (f) f.stats[action.stat] = String(Math.max(1, (Number(f.stats[action.stat]) || 0) + action.delta)); break;
      case 'addSkill': if (f) f.skills.push(structuredClone(action.entry)); break;
      case 'spellDifficulty': {
        const entry = f?.skills.find(s => Skills.getSkillEntryNames(s).includes(Skills.normalizeSkillName(action.spell)));
        const base = Number(entry?.difficulty ?? catalog.spells.find(s => s.name === action.spell)?.difficulty);
        if (entry && Number.isFinite(base)) entry.difficulty = Math.max(2, base + action.delta);
        break;
      }
      case 'note': if (f) {
        const lines = (f.injuries || '').split('\n').filter(line => line && !(action.replaces && line.startsWith(action.replaces)));
        f.injuries = [...lines, action.text].join('\n');
      } break;
      case 'remove': if (f) {
        if (action.keepEquipment && f.equipment.length) next.storedEquipment = appendLine(next.storedEquipment, f.equipment.map(e => e.name).join(', '));
        next.fighters = next.fighters.filter(x => x.id !== f.id);
      } break;
      case 'treasury':
        for (const key of ['gold', 'shards', 'armourFragments']) if (action[key]) next.treasury[key] = Math.max(0, (Number(next.treasury[key]) || 0) + action[key]);
        break;
      case 'storeItem': next.storedEquipment = appendLine(next.storedEquipment, action.text); break;
      case 'bandNote': next.treasury.notes = appendLine(next.treasury.notes, action.text); break;
    }
  }
  const day = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
  next.treasury.notes = appendLine(next.treasury.notes, `${day} — ${summary}`);
  return next;
}

// When an earlier roll or choice changes, answers that depended on it no longer apply.
const RESETS_ALL = ['2d6', 'option'];
export function dropStale(state, fullKey) {
  const cut = fullKey.lastIndexOf('/'), source = fullKey.slice(0, cut), key = fullKey.slice(cut + 1);
  const depends = other => {
    if (other === key) return false;
    // Skill or spell is picked after the 2d6 roll, so that roll stays.
    if (key === 'learn') return other !== '2d6';
    if (RESETS_ALL.includes(key)) return true;
    if (/^\d+$/.test(key)) return /^\d+$/.test(other) && Number(other) > Number(key);
    if (key === 'spell') return ['duplicateSpell', 'spellReroll'].includes(other);
    if (key === 'skill') return other === 'skillOption';
    if (key === 'duplicateSpell') return other === 'spellReroll';
    return other.startsWith(`${key}.`);
  };
  for (const record of [state.rolls, state.choices]) {
    for (const full of Object.keys(record)) {
      const i = full.lastIndexOf('/');
      if (full.slice(0, i) === source && depends(full.slice(i + 1))) delete record[full];
    }
  }
}
