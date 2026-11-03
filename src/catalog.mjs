import {BAND_TYPES} from './model.mjs';
import {expandEquipment} from './equipment.mjs';
export async function loadCatalog(type) {
  if(!BAND_TYPES[type]) throw new Error('Nieznany typ bandy.');
  const read = async file=>{const response=await fetch(`data/drachenfels/${file}`);if(!response.ok) throw new Error('Nie udało się pobrać zasad. Odśwież stronę i spróbuj ponownie.');return response.json();};
  const [equipment,skills,spells,band,progression,ruleMetadata,artifacts]=await Promise.all([read('equipment.json'),read('skills.json'),read('spells.json'),read(`warbands/${type}.json`),read('progression.json'),read('rules.json'),read('artifacts.json')]);
  return assembleCatalog(type,{equipment,skills,spells,band,progression,ruleMetadata,artifacts});
}

export function assembleCatalog(type,{equipment,skills,spells,band,progression,ruleMetadata,artifacts}) {
  const mutationCatalog = new Map(progression.mutations.map(mutation=>[mutation.name,mutation]));
  const skillsByCategory = Object.fromEntries(Object.entries(skills).map(([category,items])=>[category,items.map(skill=>({...skill,...mutationCatalog.get(skill.name),...(skill.name==='Mutacje'?{description:progression.mutationRulesDescription}:{})}))]));
  return {fighters:band.fighters,band,bandId:type,progression,ruleMetadata,equipment:expandEquipment(equipment),artifacts,skills:Object.values(skillsByCategory).flat(),skillsByCategory,spells:Object.values(spells).filter(Array.isArray).flat(),spellsByList:spells,spellListDescriptions:spells.__listDescriptions || {}};
}
