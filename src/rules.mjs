import {summary,templateFor,slug,number,label} from './model.mjs';
import {getTemplateStartingSkillEntries,getSkillEntryNames,isSkillAllowedForTemplate} from './skills.mjs';
import {canBuyMutations, requiresMutation, mutationFor} from './progression.mjs';
import {fighterTemplate,hasSkill,isCaster,isLeader,skillRestriction,specialSkillNames} from './eligibility.mjs';
import {weaponLoadoutIssues} from './equipment.mjs';
export function equipmentIssue(item,fighter,catalog) {
  item={...item,...[...catalog.equipment,...(catalog.artifacts || [])].find(e=>e.name===item.name)};
  const t=templateFor(fighter,catalog), r=t?.requirements || {}, name=item.name.toLocaleLowerCase('pl'), category=item.originCategory,ogre=t?.race==='Ogr';
  if(t?.type==='Zwierzak' || r.noEquipment) return 'Ten wojownik nie może nosić ekwipunku.';
  if(item.restricted && item.restricted!==catalog.band.warband_name) return 'Przedmiot niedostępny dla tej bandy.';
  if(item.ogreOnly && !ogre)return 'Ekwipunek przeznaczony wyłącznie dla Ogrów.';
  if(item.allowedRaces && !item.allowedRaces.includes(t?.race))return 'Przedmiot niedostępny dla tej rasy.';
  if(item.excludedRaces?.includes(t?.race))return 'Ta rasa nie może korzystać z przedmiotu.';
  if(item.allowedTemplates && !item.allowedTemplates.includes(t?.name))return 'Przedmiot niedostępny dla tego typu wojownika.';
  if(item.requiresHammer && !fighter.equipment.some(e=>/młot/i.test(e.baseName || e.name) && e.name!=='Poświęcenie młota'))return 'Poświęcenie wymaga posiadanego młota lub młota dwuręcznego.';
  if(item.prayersOnly && !(/^Modlitwy /.test(t?.spell_list || '') || fighter.skills.some(s=>/^Modlitwy /.test(s.groupKey || ''))))return 'Święta księga jest przeznaczona dla modeli korzystających z modlitw.';
  if(ogre) {
    if(['items','miscellaneous'].includes(category) || item.foundOnly)return 'Ogry nie korzystają z Innego ekwipunku ani znalezionych przedmiotów.';
    if([item.name,item.baseName].includes('Sztylet'))return 'Ogry nie używają sztyletów.';
    if(/tarcz|puklerz/.test(name))return 'Ogry nie używają tarcz ani puklerzy; zamiast nich używają Pancerpiąchy.';
    if(['ranged_weapons','armor'].includes(category) && !item.ogreOnly)return 'Wybierz ogrzą wersję broni strzeleckiej lub pancerza.';
    if(item.twoHanded && !item.ogreOnly)return 'Wybierz ogrzą wersję broni z dopłatą 5 zk.';
  }
  if(r.noArmor && category==='armor' && !(isCaster(fighter,catalog) && hasSkill(fighter,'Mag bitewny'))) return 'Ten wojownik nie może używać pancerza.';
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
  return '';
}
export function validateBand(band,catalog) {
  const messages=[], add=(message,fighterId=null,severity='error')=>messages.push({message,fighterId,severity});
  const templates=band.fighters.map(f=>templateFor(f,catalog));
  const leaders=templates.filter((t,i)=>isLeader(band.fighters[i],catalog));
  if(leaders.length!==1) add('Banda musi mieć dokładnie jednego lidera.');
  const modifiers=Object.assign({},...leaders.map(t=>t?.modifies_limits || {}));
  // e.g. Nekromanta: with a Wampir in the roster, Wilkory and Ghoule become 0-3.
  for(const t of templates) {
    const condition=t?.conditional_limits;
    if(condition && condition.requires.every(name=>templates.some(x=>x?.name===name)))for(const [key,value] of Object.entries(condition.limits))modifiers[key]=Math.max(modifiers[key] ?? 0,value);
  }
  const heroCount=templates.filter(t=>t && t.type!=='Zwierzak').length;
  const animals=templates.filter(t=>t?.type==='Zwierzak');
  if(heroCount<1) add('Banda musi mieć co najmniej jednego bohatera.');
  const dwarfAllowance=leaders.some(t=>t?.name==='Krasnoludzki Szlachcic');
  if(dwarfAllowance?heroCount>5:heroCount+(animals.length?1:0)>6) add(dwarfAllowance?'Krasnoludzki Szlachcic pozwala na najwyżej pięciu Herosów oraz jeden rodzaj Zwierzaków.':'Przekroczono limit 6 miejsc (zwierzaki jednego typu zajmują jedno miejsce).');
  if(new Set(animals.map(t=>t.name)).size>1) add('Banda może mieć zwierzaki tylko jednego typu.');
  for(const role of ['Czarodziej','Specjalny']) if(templates.filter(t=>t?.type===role).length>1) add(`Dozwolony jest najwyżej jeden wojownik: ${role}.`);
  if(band.phase!=='campaign' && summary(band,catalog).cost>500) add('Koszt przekracza 500 zk przewidziane dla bandy początkowej.',null,'warning');
  band.fighters.forEach((f,index)=>{
    const t=templates[index];
    if(!t){add('Nieznany typ wojownika. Wybierz szablon w edytorze.',f.id);return;}
    const maximum=modifiers[slug(t.name)] ?? t.max_quantity;
    if(maximum!==undefined && templates.filter(x=>x?.name===t.name).length>maximum) add(`Przekroczono limit: ${t.name} (maks. ${maximum}).`,f.id);
    if(t.type==='Zwierzak' && number(f.exp)>0) add('Zwierzaki nie zdobywają doświadczenia.',f.id);
    if(requiresMutation(f,catalog) && !f.skills.some(s=>mutationFor(s,catalog))) add('Mutant musi rozpocząć grę z co najmniej jedną mutacją. Wybierz ją w edytorze; koszt zostanie obliczony automatycznie.',f.id);
    f.equipment.forEach(e=>{const issue=equipmentIssue({...catalog.equipment.find(x=>x.name===e.name),...e},f,catalog);if(issue)add(`${e.name}: ${issue}`,f.id);});
    weaponLoadoutIssues(f,catalog).forEach(issue=>add(issue.message,f.id,issue.severity));
    f.equipment.forEach(e=>{const item=catalog.equipment.find(x=>x.name===e.name);if(item?.ineffectiveRaces?.includes(t.race))add(`${e.name}: przedmiot nie działa na tę rasę.`,f.id,'warning');});
    const starting=getTemplateStartingSkillEntries(t,catalog).flatMap(getSkillEntryNames);
    f.skills.forEach(s=>{
      const restricted=skillRestriction(s,f,catalog);if(restricted)add(restricted,f.id);
      if(mutationFor(s,catalog) && !canBuyMutations(f,catalog)) add('Mutacje mogą kupować tylko Mutant i Opętany podczas rekrutacji (nie Wulfen).',f.id);
      if(s.kind==='group' && !s.selectedKey) add(`Wybierz opcję: ${s.groupKey || s.label}.`,f.id,'tip');
      if(s.kind==='group' && s.selectedKey && ![...(catalog.skillsByCategory[s.groupKey] || []),...(catalog.spellsByList[s.groupKey] || [])].some(x=>x.name===s.selectedKey)) add('Nieznana opcja umiejętności lub czaru.',f.id);
      const extra=[...(t.rules?.includes('Mutacje') ? catalog.band.mutations || [] : []),...specialSkillNames(f,catalog)].map(x=>x.toLocaleLowerCase('pl'));
      if(!getSkillEntryNames(s).some(key=>starting.includes(key) || extra.includes(key)) && !isSkillAllowedForTemplate(s,t,catalog)) add(`${label(s)}: umiejętność spoza dostępnych ścieżek rozwoju.`,f.id,'warning');
    });
    const seen=new Set();
    f.skills.forEach(s=>{const key=label(s).toLocaleLowerCase('pl');if(!mutationFor(s,catalog) && seen.has(key))add(`${label(s)}: tej samej umiejętności lub tego samego czaru nie wybiera się ponownie; przy ponownym wyniku czaru obniż jego trudność.`,f.id);seen.add(key);});
  });
  return messages;
}
