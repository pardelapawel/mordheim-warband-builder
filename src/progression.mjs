import {getSkillEntryCost, getSkillEntryNames} from './skills.mjs';
import {fighterTemplate} from './eligibility.mjs';

// Specific profiles distinguish vampires from other undead and orcs from goblins.
// Animals without a profile in the source table must not inherit humanoid caps.
export function racialMaximumProfile(fighter, catalog) {
  const template = fighterTemplate(fighter, catalog);
  const progression = catalog.progression || {};
  const specific = progression.templateProfiles?.[template?.name];
  const name = specific || (template?.type !== 'Zwierzak' ? fighter.race || template?.race : null);
  return {name, stats: progression.racialMaxima?.[name] || {}};
}

export function racialMaxima(fighter, catalog) {
  const defaults = racialMaximumProfile(fighter, catalog).stats;
  const overrides = Object.entries(fighter.maxStats || {}).filter(([, value]) =>
    value !== '' && value !== null && value !== undefined);
  return {...defaults, ...Object.fromEntries(overrides)};
}

export function mutationFor(entry, catalog) {
  const names = getSkillEntryNames(entry);
  return catalog.progression?.mutations.find(mutation =>
    names.includes(mutation.name.toLocaleLowerCase('pl')));
}

export function canBuyMutations(fighter, catalog) {
  const template = fighterTemplate(fighter, catalog);
  return !!catalog.progression?.mutationEligibleTemplates.includes(template?.name);
}

export function requiresMutation(fighter, catalog) {
  const template = fighterTemplate(fighter, catalog);
  return !!catalog.progression?.mutationRequiredTemplates.includes(template?.name);
}

// Page 31: the first mutation is full price; every later one is twice its own
// listed price. This is not a progressively increasing 1x / 2x / 4x multiplier.
export function mutationPrice(fighter, entry, catalog, index = fighter.skills.length) {
  const mutation = mutationFor(entry, catalog);
  if (!mutation) return null;
  const hasEarlierMutation = fighter.skills.slice(0, index).some(skill => mutationFor(skill, catalog));
  return mutation.cost * (hasEarlierMutation ? 2 : 1);
}

export function skillCost(fighter, index, catalog) {
  const entry = fighter.skills[index];
  return mutationPrice(fighter, entry, catalog, index) ?? getSkillEntryCost(entry, catalog);
}

// Keep exported and stored costs consistent with the calculated totals, including
// old saves whose mutation costs were entered manually or left at zero.
export function synchronizeMutationPrices(fighter, catalog) {
  fighter.skills.forEach((entry, index) => {
    const mutation = mutationFor(entry, catalog);
    if (mutation) {
      const cost = skillCost(fighter, index, catalog);
      Object.assign(entry, {kind:'simple', label:mutation.name, groupKey:null, selectedKey:null, cost});
    }
  });
}
