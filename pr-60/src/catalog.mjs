import {BAND_TYPES,RULE_SETS,DEFAULT_RULE_SET} from './model.mjs';
import {expandEquipment} from './equipment.mjs';
export async function loadCatalog(type,ruleSet=DEFAULT_RULE_SET) {
  if(!BAND_TYPES[type]) throw new Error('Nieznany typ bandy.');
  if(!RULE_SETS[ruleSet]) throw new Error('Nieznany zestaw zasad.');
  const read = async file=>{const response=await fetch(`data/${ruleSet}/${file}`);if(!response.ok) throw new Error('Nie udało się pobrać zasad. Odśwież stronę i spróbuj ponownie.');return response.json();};
  const [equipment,skills,spells,band,progression,ruleMetadata,artifacts,aftermath]=await Promise.all([read('equipment.json'),read('skills.json'),read('spells.json'),read(`warbands/${type}.json`),read('progression.json'),read('rules.json'),read('artifacts.json'),read('aftermath.json')]);
  return assembleCatalog(type,{equipment,skills,spells,band,progression,ruleMetadata,artifacts,aftermath});
}

export function assembleCatalog(type,{equipment,skills,spells,band,progression,ruleMetadata,artifacts,aftermath}) {
  const mutationCatalog = new Map(progression.mutations.map(mutation=>[mutation.name,mutation]));
  const skillsByCategory = Object.fromEntries(Object.entries(skills).map(([category,items])=>[category,items.map(skill=>({...skill,...mutationCatalog.get(skill.name),...(skill.name==='Mutacje'?{description:progression.mutationRulesDescription}:{})}))]));
  return {fighters:band.fighters,band,bandId:type,progression,ruleMetadata,equipment:expandEquipment(equipment),artifacts,skills:Object.values(skillsByCategory).flat(),skillsByCategory,spells:Object.values(spells).filter(Array.isArray).flat(),spellsByList:spells,spellListDescriptions:spells.__listDescriptions || {},aftermath};
}
