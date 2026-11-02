import {getSkillEntryNames} from './skills.mjs';

export function fighterTemplate(fighter,catalog) {
  return catalog.fighters.find(t=>[fighter.templateName,fighter.typeId,fighter.type].includes(t.name));
}

export function hasSkill(fighter,name) {
  return fighter.skills.some(skill=>getSkillEntryNames(skill).includes(name.toLocaleLowerCase('pl')));
}

export function isLeader(fighter,catalog) {
  return fighterTemplate(fighter,catalog)?.type==='Lider' || !!fighter.actingLeader;
}

export function isCaster(fighter,catalog) {
  return !!fighterTemplate(fighter,catalog)?.spell_list || fighter.skills.some(s=>s.kind==='group' && Array.isArray(catalog.spellsByList?.[s.groupKey]));
}

function matchesRule(rule,fighter,catalog) {
  const template=fighterTemplate(fighter,catalog);
  if(!template || template.type==='Zwierzak')return false;
  if(rule.excludedTemplates?.includes(template.name) || rule.excludedRaces?.includes(template.race))return false;
  if(rule.leaderOnly && !isLeader(fighter,catalog))return false;
  if(rule.casterOnly && !isCaster(fighter,catalog))return false;
  if(rule.templates || rule.races)return !!(rule.templates?.includes(template.name) || rule.races?.includes(template.race));
  return true;
}

export function specialSkillRules(catalog) {
  return catalog.ruleMetadata?.specialSkills?.[catalog.bandId] || [];
}

export function specialSkillNames(fighter,catalog) {
  return specialSkillRules(catalog).filter(rule=>matchesRule(rule,fighter,catalog)).map(rule=>rule.name);
}

export function skillRestriction(skill,fighter,catalog) {
  const keys=getSkillEntryNames(skill);
  const special=specialSkillRules(catalog).find(rule=>keys.includes(rule.name.toLocaleLowerCase('pl')));
  if(special && !matchesRule(special,fighter,catalog))return 'Ta umiejętność specjalna nie jest dostępna dla tego wojownika.';
  for(const [name,rule] of Object.entries(catalog.ruleMetadata?.skillRestrictions || {})) {
    if(keys.includes(name.toLocaleLowerCase('pl')) && !matchesRule(rule,fighter,catalog))return `${name}: wojownik nie spełnia wymagań tej umiejętności.`;
  }
  return '';
}
