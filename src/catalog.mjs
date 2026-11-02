import {BAND_TYPES} from './model.mjs';
export async function loadCatalog(type) {
  if(!BAND_TYPES[type]) throw new Error('Nieznany typ bandy.');
  const read = async file=>{const response=await fetch(`data/drachenfels/${file}`);if(!response.ok) throw new Error('Nie udało się pobrać zasad. Odśwież stronę i spróbuj ponownie.');return response.json();};
  const [equipment,skills,spells,band,progression]=await Promise.all([read('equipment.json'),read('skills.json'),read('spells.json'),read(`warbands/${type}.json`),read('progression.json')]);
  const mutationCatalog = new Map(progression.mutations.map(mutation=>[mutation.name,mutation]));
  const skillsByCategory = Object.fromEntries(Object.entries(skills).map(([category,items])=>[category,items.map(skill=>({...skill,...mutationCatalog.get(skill.name),...(skill.name==='Mutacje'?{description:progression.mutationRulesDescription}:{})}))]));
  return {fighters:band.fighters,band,progression,equipment:Object.entries(equipment).flatMap(([category,items])=>items.map(i=>({...i,originCategory:category}))),skills:Object.values(skillsByCategory).flat(),skillsByCategory,spells:Object.values(spells).filter(Array.isArray).flat(),spellsByList:spells,spellListDescriptions:spells.__listDescriptions || {}};
}
