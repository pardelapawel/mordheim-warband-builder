// Post-battle sequence (book pp. 32-43): pure rules, no DOM.
// Resolvers return {text, needs, actions}: book text so far, rolls still missing, and action drafts.
import {fighterTemplate} from './eligibility.mjs';

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
