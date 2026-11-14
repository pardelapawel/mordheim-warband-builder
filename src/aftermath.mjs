// Post-battle sequence (book pp. 32-43): pure rules, no DOM.
// Resolvers return {text, needs, actions}: book text so far, rolls still missing, and action drafts.
import {fighterTemplate} from './eligibility.mjs';
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
const result = () => ({text: [], needs: [], actions: []});

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
    const roll = rolls['1'];
    if (!roll) { out.needs.push({key: '1', sides: 6, label: 'Zwierzak: k6'}); return out; }
    if (roll <= table.petInjury.deathMax) { out.text.push('Zwierzak ginie.'); out.actions.push({kind: 'remove', keepEquipment: false}); }
    else out.text.push('Zwierzakowi nic się nie stało.');
    return out;
  }
  let step = table.heroInjury, depth = 1;
  while (step) {
    const key = String(depth), roll = rolls[key];
    if (!roll) { out.needs.push({key, sides: step.sides, label: step.label}); return out; }
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
    if (!rolls[key]) { out.needs.push({key, sides: spells.length || 6, label: `Czar: ${list}`}); return null; }
    return spells[rolls[key] - 1] || null;
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
  const decision = choices.duplicateSpell;
  if (!decision) {
    out.choose = {key: 'duplicateSpell', label: 'Powtórzony czar', options: [{value: 'reroll', label: 'Rzuć ponownie'}, {value: 'lower', label: 'Obniż trudność o 1'}]};
    return out;
  }
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
  const chosen = options.find(skill => skill.name === choices.skill);
  if (!chosen) {
    out.choose = {key: 'skill', label: 'Nowa umiejętność', options: options.map(s => ({value: s.name, label: s.kind === 'group' ? `${s.name} · wybór opcji` : s.name}))};
    return out;
  }
  let entry = Skills.createAddableSkillEntry(chosen.name, fighterTemplate(fighter, catalog), catalog);
  if (entry.kind === 'group') {
    const groupOptions = Skills.getGroupedSkillOptions(entry, catalog);
    if (!groupOptions.some(o => o.name === choices.skillOption)) {
      out.choose = {key: 'skillOption', label: chosen.name, options: groupOptions.map(o => ({value: o.name, label: o.name}))};
      return out;
    }
    entry = Skills.selectGroupedSkillOption(entry, choices.skillOption, catalog);
  }
  out.text.push(`Nowa umiejętność: ${Skills.formatSkillEntry(entry, catalog)}.`);
  out.actions.push({kind: 'addSkill', entry: {...entry, cost: 0}});
  return out;
}

export function resolveAdvance(fighter, rolls, choices, catalog, pendingStatDeltas = {}) {
  const out = result(), roll = rolls['2d6'];
  if (!roll) { out.needs.push({key: '2d6', sides: 12, min: 2, label: 'Rozwój: 2k6'}); return out; }
  const row = catalog.aftermath.advance.results.find(entry => inRange(roll, entry));
  if (!row) return out;
  out.text.push(row.text);
  if (row.type === 'skill') {
    if (fighterTemplate(fighter, catalog)?.spell_list) {
      if (!choices.learn) {
        out.choose = {key: 'learn', label: 'Umiejętność czy czar?', options: [{value: 'skill', label: 'Umiejętność'}, {value: 'spell', label: 'Czar (losowy)'}]};
        return out;
      }
      if (choices.learn === 'spell') return spellAdvance(fighter, rolls, choices, catalog, out);
    }
    return skillAdvance(fighter, choices, catalog, out);
  }
  const maxima = racialMaxima(fighter, catalog);
  let stat;
  if (row.type === 'choose') {
    const pick = statChoice(fighter, row.pair, maxima, pendingStatDeltas, 'Wybierz charakterystykę');
    if (!pick.options.some(o => o.value === choices.stat)) { out.choose = pick; return out; }
    stat = choices.stat;
  } else {
    const pair = rolls.pair;
    if (!pair) { out.needs.push({key: 'pair', sides: 6, label: `k6: 1–3 ${statLabel(row.pair[0])}, 4–6 ${statLabel(row.pair[1])}`}); return out; }
    const [rolled, other] = pair <= 3 ? row.pair : [...row.pair].reverse();
    if (belowMax(fighter, rolled, maxima, pendingStatDeltas)) stat = rolled;
    else if (belowMax(fighter, other, maxima, pendingStatDeltas)) { stat = other; out.text.push(`${statLabel(rolled)} ma maksimum rasowe — rośnie ${statLabel(other)}.`); }
    else {
      const pick = statChoice(fighter, [], maxima, pendingStatDeltas, `${statLabel(rolled)} i ${statLabel(other)} mają maksimum — wybierz inną`);
      if (!pick.options.some(o => o.value === choices.stat)) { out.choose = pick; return out; }
      stat = choices.stat;
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
  const roll = rolls[key];
  if (!roll) { out.needs.push({key, sides: dice.count * dice.sides, min: dice.count, label: `${label}: ${diceText(dice)}`}); return null; }
  return roll * (dice.times || 1);
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
      const roll = rolls[key('a')];
      if (!roll) out.needs.push({key: key('a'), sides: 6, label: 'Magiczny artefakt: k6'});
      else out.actions.push({kind: 'storeItem', text: catalog.aftermath.artefacts[roll - 1]});
    } else if (gain.kind === 'table' || gain.kind === 'check') {
      const roll = rolls[key('t')];
      if (!roll) { out.needs.push({key: key('t'), sides: gain.sides, label: gain.label || `k${gain.sides}`}); return; }
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
      if (!valid) { out.choose = {key: 'heroes', label: `Rozdziel ${points} PD`, total: points, options: eligible.map(h => ({value: h.id, label: h.name}))}; return; }
      for (const [fighterId, value] of assigned) out.actions.push({kind: 'exp', fighterId, delta: Number(value)});
    }
  });
}

export function resolveFind(find, rolls, choices, context, catalog) {
  const out = result();
  out.text.push(`${find.name}: ${find.text}`);
  let option = find.options[0];
  if (find.options.length > 1) {
    option = find.options[choices.option];
    if (!option) { out.choose = {key: 'option', label: 'Wybierz nagrodę', options: find.options.map((o, i) => ({value: i, label: o.label}))}; return out; }
  }
  resolveGains(option.gains, '', rolls, choices, context, catalog, out);
  return out;
}

