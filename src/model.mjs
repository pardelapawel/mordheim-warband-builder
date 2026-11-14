import * as Skills from './skills.mjs';
import {canBuyMutations, mutationPrice, skillCost} from './progression.mjs';
import {specialSkillNames,skillRestriction,fighterTemplate} from './eligibility.mjs';
import {recruitmentCost} from './recruitment.mjs';
import {RULES_REVISION} from './migration.mjs';
import {spellInfo,skillDisplay} from './spells.mjs';
export const STAT_KEYS = ['m','ws','bs','s','t','w','i','a','ld'];
export const STAT_LABELS = ['M','WS','BS','S','T','W','I','A','Ld'];
export const BAND_TYPES = {awanturnicy:'Awanturnicy', sludzy_ciemnosci:'Słudzy Ciemności'};
let fallbackIdSequence=0;
export function uid() {
  const crypto=globalThis.crypto;
  if(typeof crypto?.randomUUID==='function')return crypto.randomUUID();
  // getRandomValues also works on HTTP, where randomUUID is unavailable.
  if(typeof crypto?.getRandomValues==='function'){
    const bytes=crypto.getRandomValues(new Uint8Array(16));
    bytes[6]=(bytes[6]&0x0f)|0x40;bytes[8]=(bytes[8]&0x3f)|0x80;
    const hex=Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  }
  // These IDs identify local records; they are not authentication tokens.
  return `local-${Date.now().toString(36)}-${(++fallbackIdSequence).toString(36)}-${Math.random().toString(36).slice(2)}`;
}
export const slug = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ł/g,'l').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
export const number = value => Math.max(0, Math.min(1000000, Number(value) || 0));
export const normalizePicture = value => typeof value==='string' && value.length<=14000000 && /^data:image\/(?:jpeg|png|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(value) ? value : '';
export function normalizePictureCrop(crop) {
  const bounded=(value,min,max,fallback)=>typeof value==='number' && Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;
  return {x:bounded(crop?.x,0,100,50),y:bounded(crop?.y,0,100,50),zoom:bounded(crop?.zoom,1,3,1)};
}
export const label = entry => Skills.formatSkillEntry(entry);
export function newBand(type = 'awanturnicy') {
  return {schemaVersion:2,rulesRevision:RULES_REVISION,id:uid(),name:'Nowa banda',showPictures:true,phase:'recruitment',ruleSetId:'Drachenfels',warbandTypeId:type,fighters:[],glossary:{descriptions:{},deletedTerms:[]},treasury:{gold:0,shards:0,notes:''},storedEquipment:''};
}
export function createFighter(template, catalog) {
  const fighter = {id:uid(),typeId:template.name,templateName:template.name,type:template.name,customName:template.name,race:template.race,baseCost:template.cost,exp:template.exp_start || 0,exp_start:template.exp_start || 0,is_large:!!template.is_large,stats:{...template.stats},maxStats:{},equipment:[],skills:Skills.getTemplateStartingSkillEntries(template,catalog),injuries:'',notes:'',picture:'',pictureCrop:normalizePictureCrop()};
  if (template.type !== 'Zwierzak' && template.race !== 'Ogr' && !template.requirements?.noEquipment) fighter.equipment.push({name:'Sztylet',cost:0,originCategory:'melee_weapons'});
  return fighter;
}
export function duplicateFighter(fighter) { return {...structuredClone(fighter),id:uid(),customName:`${fighter.customName} (kopia)`}; }
export function fighterCost(fighter,catalog) {
  return number(fighter.baseCost) + recruitmentCost(fighter) + fighter.equipment.reduce((sum,item)=>sum+number(item.cost),0) + fighter.skills.reduce((sum,item,index)=>sum+number(skillCost(fighter,index,catalog)),0);
}
export function summary(band,catalog) {
  return band.fighters.reduce((out,f)=>({count:out.count+1,cost:out.cost+fighterCost(f,catalog),exp:out.exp+number(f.exp),large:out.large+(f.is_large?1:0),rating:out.rating+(f.is_large?20:5)+number(f.exp)}),{count:0,cost:0,exp:0,large:0,rating:0});
}
export function normalizeBand(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Plik nie zawiera prawidłowej bandy.');
  if (raw.ruleSetId && !['Drachenfels','smocza_turnia'].includes(raw.ruleSetId)) throw new Error('Ten zapis korzysta z nieobsługiwanego zestawu zasad. Obsługiwany jest tylko Drachenfels.');
  if (raw.schemaVersion && raw.schemaVersion !== 2) throw new Error('Nieobsługiwana wersja zapisu.');
  if (!Array.isArray(raw.fighters) || raw.fighters.length>500 || !BAND_TYPES[raw.warbandTypeId]) throw new Error('Nieprawidłowy typ bandy lub lista wojowników.');
  const base = newBand(raw.warbandTypeId), usedIds = new Set();
  const fighters = raw.fighters.map(f=>{
    if (!f || typeof f !== 'object' || !f.stats || !Array.isArray(f.equipment) || (f.skills && !Array.isArray(f.skills))) throw new Error('Nieprawidłowe dane wojownika.');
    let id = typeof f.id === 'string' && f.id ? f.id : uid();
    if (usedIds.has(id)) id = uid();
    usedIds.add(id);
    const cleaned = {...f,picture:normalizePicture(f.picture),pictureCrop:normalizePictureCrop(f.pictureCrop)};
    delete cleaned.save;
    cleaned.recruitmentComplete=f.recruitmentComplete===true;
    cleaned.recruitmentUpgrades={extraWound:f.recruitmentUpgrades?.extraWound===true,weaponSkill:f.recruitmentUpgrades?.weaponSkill===true,mercenaryAdvance:['ws','bs'].includes(f.recruitmentUpgrades?.mercenaryAdvance)?f.recruitmentUpgrades.mercenaryAdvance:''};
    return {...cleaned,id,customName:String(f.customName || f.type || 'Wojownik'),type:String(f.type || f.templateName || ''),templateName:String(f.templateName || f.typeId || f.type || ''),baseCost:number(f.baseCost),exp:number(f.exp),stats:Object.fromEntries(STAT_KEYS.map(k=>[k,String(f.stats[k] ?? 0)])),maxStats:f.maxStats && typeof f.maxStats === 'object'?f.maxStats:{},equipment:f.equipment.map(e=>{if(!e || typeof e !== 'object') throw new Error('Nieprawidłowy ekwipunek.'); return {...e,name:String(e.name || ''),cost:number(e.cost)};}),skills:(f.skills || []).map(s=>typeof s==='string'?{name:s}:s).filter(s=>s && typeof s==='object'),injuries:String(f.injuries || ''),notes:String(f.notes || '')};
  });
  return {...base,...raw,schemaVersion:2,showPictures:raw.showPictures!==false,rulesRevision:raw.rulesRevision || 0,phase:raw.phase==='campaign'?'campaign':'recruitment',id:typeof raw.id==='string'&&raw.id?raw.id:base.id,ruleSetId:'Drachenfels',name:String(raw.name || 'Nowa banda'),fighters,glossary:{descriptions:{...(raw.glossary?.descriptions || {})},deletedTerms:Array.isArray(raw.glossary?.deletedTerms)?raw.glossary.deletedTerms:[]},treasury:{...base.treasury,...raw.treasury},storedEquipment:String(raw.storedEquipment || '')};
}
export function exportBand(band,{includePictures=true}={}) {
  const exported=structuredClone(band);
  if(!includePictures)exported.fighters.forEach(fighter=>{delete fighter.picture;delete fighter.pictureCrop;});
  return exported;
}
export function templateFor(fighter,catalog) { return fighterTemplate(fighter,catalog); }
export function skillChoices(fighter,catalog) {
  const template = templateFor(fighter,catalog), names = Skills.getTemplateAllowedSkillNames(template,catalog);
  const direct = catalog.skills.filter(s=>names.has(Skills.normalizeSkillName(s.name)) && !skillRestriction(s.name,fighter,catalog)).map(s=>({name:s.name,kind:'simple'}));
  const groups = Skills.getTemplateAddableSkillGroupNames(template,catalog);
  if (template?.spell_list) groups.push(template.spell_list);
  const mutations = canBuyMutations(fighter,catalog) && !fighter.recruitmentComplete ? catalog.progression.mutations.map(mutation=>({name:mutation.name,kind:'simple',mutation:true,cost:mutationPrice(fighter,{name:mutation.name},catalog)})) : [];
  const extra = [...mutations,...specialSkillNames(fighter,catalog).filter(name=>!skillRestriction(name,fighter,catalog)).map(name=>({name,kind:'simple'}))];
  const existing=new Set(fighter.skills.filter(s=>s.kind!=='group').map(s=>Skills.formatSkillEntry(s).toLocaleLowerCase('pl')));
  return [...direct,...extra,...groups.map(name=>({name,kind:'group'}))].filter(s=>s.mutation || s.kind==='group' || !existing.has(s.name.toLocaleLowerCase('pl')));
}
export function glossaryEntries(band,catalog) {
  const entries = new Map();
  const add = (name,description,difficulty) => {if(name && !band.glossary.deletedTerms.includes(name)) entries.set(name,{name,description:band.glossary.descriptions[name] ?? description ?? '',...(difficulty!==undefined?{difficulty}:{})});};
  band.fighters.forEach(f=>{
    f.equipment.forEach(e=>add(e.name,[...catalog.equipment,...(catalog.artifacts || [])].find(i=>i.name===e.name)?.description || e.description));
    f.skills.forEach(s=>{
      const direct=[...catalog.skills,...catalog.spells].find(x=>x.name.toLocaleLowerCase('pl')===label(s).toLocaleLowerCase('pl'));
      if(direct && s.kind!=='group'){add(direct.name,direct.description,spellInfo(s,catalog)?.difficulty);return;}
      const names=Skills.getSkillEntryNames(s);
      names.forEach(key=>{const item=[...catalog.skills,...catalog.spells].find(x=>Skills.normalizeSkillName(x.name)===key);if(item) add(item.name,item.description,spellInfo(s,catalog)?.name===item.name?spellInfo(s,catalog).difficulty:undefined);});
      if(s.groupKey && catalog.spellListDescriptions[s.groupKey]) add(s.groupKey,catalog.spellListDescriptions[s.groupKey]);
      if(!names.some(key=>[...catalog.skills,...catalog.spells].some(x=>Skills.normalizeSkillName(x.name)===key)) && !s.groupKey) add(label(s),s.description);
    });
  });
  return [...entries.values()].sort((a,b)=>a.name.localeCompare(b.name,'pl'));
}
export function textExport(band,catalog) {
  const totals=summary(band,catalog);
  return [`${band.name} — ${BAND_TYPES[band.warbandTypeId]}`,`Koszt: ${totals.cost} zk | Liczebność: ${totals.count} | Siła bandy: ${totals.rating}`,...band.fighters.map((f,i)=>`\n${i+1}. ${f.customName} — ${f.type}\n${STAT_KEYS.map((k,n)=>`${STAT_LABELS[n]}: ${f.stats[k]}`).join(' | ')}\nEkwipunek: ${f.equipment.map(e=>e.name).join(', ') || '—'}\nUmiejętności i czary: ${f.skills.map(s=>skillDisplay(s,catalog)).join(', ') || '—'}\nObrażenia: ${f.injuries || '—'}\nPD: ${f.exp} | Koszt: ${fighterCost(f,catalog)} zk${f.notes?'\nUwagi: '+f.notes:''}`),`\nSkarbiec: ${band.treasury.gold} zk | Spaczeń: ${band.treasury.shards}\n${band.treasury.notes}\nMagazyn: ${band.storedEquipment}`].join('\n');
}
