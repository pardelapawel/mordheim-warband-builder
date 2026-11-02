import {summary,templateFor,slug,number,label} from './model.mjs';
import {getTemplateStartingSkillEntries,getSkillEntryNames,isSkillAllowedForTemplate} from './skills.mjs';
import {canBuyMutations, requiresMutation, mutationFor} from './progression.mjs';
export function equipmentIssue(item,fighter,catalog) {
  const t=templateFor(fighter,catalog), r=t?.requirements || {}, name=item.name.toLocaleLowerCase('pl'), category=item.originCategory || catalog.equipment.find(e=>e.name===item.name)?.originCategory;
  if(t?.type==='Zwierzak' || r.noEquipment) return 'Ten wojownik nie może nosić ekwipunku.';
  if(item.restricted && item.restricted!==catalog.band.warband_name) return 'Przedmiot niedostępny dla tej bandy.';
  if(r.noArmor && category==='armor') return 'Ten wojownik nie może używać pancerza.';
  if(category==='ranged_weapons') {
    if(r.noRanged) return 'Ten wojownik nie może używać broni strzeleckiej.';
    if(r.noRangedExceptPistols && !name.includes('pistolet')) return 'Dozwolone są tylko pistolety.';
    if(r.noRangedExceptThrowing && !/rzuca|gwiazd|noże|oszczep/.test(name)) return 'Dozwolona jest tylko broń rzucana.';
    if(r.rangedOnlyBows && !/łuk/.test(name)) return 'Dozwolone są tylko łuki.';
    if(r.rangedOnlyCrossbows && !/kusz/.test(name)) return 'Dozwolone są tylko kusze.';
  }
  if(r.noPowderWeapons && /pistolet|muszkiet|garłacz|strzelb|proch/.test(name)) return 'Ten wojownik nie może używać broni prochowej.';
  if(r.noPoisons && /lotos|jad|trucizn/.test(name)) return 'Ten wojownik nie może używać trucizn.';
  if(r.noDrugs && /muchomor|mandragor|karmazynowy/.test(name)) return 'Ten wojownik nie może używać narkotyków.';
  if(r.useOgreEquipment && ['melee_weapons','ranged_weapons','armor'].includes(category) && !/^ogr/.test(name)) return 'Ten wojownik korzysta z ogrzego ekwipunku.';
  if(!r.useOgreEquipment && /^ogr/.test(name)) return 'Ekwipunek przeznaczony dla ogrów.';
  return '';
}
export function validateBand(band,catalog) {
  const messages=[], add=(message,fighterId=null,severity='error')=>messages.push({message,fighterId,severity});
  const templates=band.fighters.map(f=>templateFor(f,catalog));
  const leaders=templates.filter(t=>t?.type==='Lider');
  if(leaders.length!==1) add('Banda musi mieć dokładnie jednego lidera.');
  const modifiers=Object.assign({},...leaders.map(t=>t.modifies_limits || {}));
  const heroCount=templates.filter(t=>t && t.type!=='Zwierzak').length;
  const animals=templates.filter(t=>t?.type==='Zwierzak');
  if(heroCount<1) add('Banda musi mieć co najmniej jednego bohatera.');
  if(heroCount+(animals.length?1:0)>(modifiers.max_heroes || 6)) add(`Przekroczono limit ${modifiers.max_heroes || 6} miejsc (zwierzaki jednego typu zajmują jedno miejsce).`);
  if(new Set(animals.map(t=>t.name)).size>1) add('Banda może mieć zwierzaki tylko jednego typu.');
  for(const role of ['Czarodziej','Specjalny']) if(templates.filter(t=>t?.type===role).length>1) add(`Dozwolony jest najwyżej jeden wojownik: ${role}.`);
  if(summary(band,catalog).cost>500) add('Koszt przekracza 500 zk przewidziane dla bandy początkowej.',null,'warning');
  band.fighters.forEach((f,index)=>{
    const t=templates[index];
    if(!t){add('Nieznany typ wojownika. Wybierz szablon w edytorze.',f.id);return;}
    const maximum=modifiers[slug(t.name)] ?? t.max_quantity;
    if(maximum!==undefined && templates.filter(x=>x?.name===t.name).length>maximum) add(`Przekroczono limit: ${t.name} (maks. ${maximum}).`,f.id);
    if(t.type==='Zwierzak' && number(f.exp)>0) add('Zwierzaki nie zdobywają doświadczenia.',f.id);
    if(requiresMutation(f,catalog) && !f.skills.some(s=>mutationFor(s,catalog))) add('Mutant musi rozpocząć grę z co najmniej jedną mutacją. Wybierz ją w edytorze; koszt zostanie obliczony automatycznie.',f.id);
    f.equipment.forEach(e=>{const issue=equipmentIssue({...catalog.equipment.find(x=>x.name===e.name),...e},f,catalog);if(issue)add(`${e.name}: ${issue}`,f.id);});
    const starting=getTemplateStartingSkillEntries(t,catalog).flatMap(getSkillEntryNames);
    f.skills.forEach(s=>{
      if(mutationFor(s,catalog) && !canBuyMutations(f,catalog)) add('Mutacje mogą kupować tylko Mutant i Opętany podczas rekrutacji (nie Wulfen).',f.id);
      if(s.kind==='group' && !s.selectedKey) add(`Wybierz opcję: ${s.groupKey || s.label}.`,f.id,'tip');
      if(s.kind==='group' && s.selectedKey && ![...(catalog.skillsByCategory[s.groupKey] || []),...(catalog.spellsByList[s.groupKey] || [])].some(x=>x.name===s.selectedKey)) add('Nieznana opcja umiejętności lub czaru.',f.id);
      const extra=[...(t.rules?.includes('Mutacje') ? catalog.band.mutations || [] : []),...(catalog.band.special_skills || [])].map(x=>x.toLocaleLowerCase('pl'));
      if(!getSkillEntryNames(s).some(key=>starting.includes(key) || extra.includes(key)) && !isSkillAllowedForTemplate(s,t,catalog)) add(`${label(s)}: umiejętność spoza dostępnych ścieżek rozwoju.`,f.id,'warning');
    });
  });
  return messages;
}
