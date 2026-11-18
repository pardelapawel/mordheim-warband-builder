import {RULE_SETS,RULE_SET_BAND_TYPES,DEFAULT_RULE_SET,mutationChoices,exportBand,normalizePictureCrop,STAT_KEYS,STAT_LABELS,BAND_TYPES,bandTitle,newBand,createFighter,duplicateFighter,fighterCost,summary,normalizeBand,templateFor,skillChoices,glossaryEntries,ensureLeader,textExport,number,uid,label} from './model.mjs';
import {panPictureCrop,pictureCropRect} from './picture.mjs';
import {loadCatalog} from './catalog.mjs';
import {readLibrary,writeLibrary,encodeShare,decodeShare,STORAGE_KEY} from './storage.mjs';
import {validateBand,equipmentIssue} from './rules.mjs';
import * as Skills from './skills.mjs';
import {ADVANCE_THRESHOLDS,racialMaxima,racialMaximumProfile,canBuyMutations,mutationFor,skillCost,synchronizeMutationPrices} from './progression.mjs';
import {countedNoun,warningCount,errorCount} from './polish.mjs';
import {equipmentChoices,purchaseCost,purchaseEquipment} from './equipment.mjs';
import {recruitmentOptions,setRecruitmentAdvance,recruitmentCost} from './recruitment.mjs';
import {isLeader} from './eligibility.mjs';
import {reconcileRules} from './migration.mjs';
import {spellInfo,difficultyText,skillDisplay} from './spells.mjs';
import {applyActions} from './aftermath.mjs';
import {openAftermath} from './aftermathDialog.mjs';
import {rerollBandName} from './bandNames.mjs';

const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths=[['Bojowe','Bojowe'],['Strzeleckie','Strzeleckie'],['Akademickie','Akademickie'],['Siłowe','Siłowe'],['Szybkościowe','Szybkościowe'],['Specjalne','Specjalne']];
const categories={melee_weapons:'Broń do walki wręcz',ranged_weapons:'Broń strzelecka',armor:'Pancerz',miscellaneous:'Przedmioty',items:'Przedmioty'};
const headingPhrases=[
  'KRONIKA TYCH, KTÓRZY WRÓCILI',
  'ZAPISKI SPOD ZŁAMANEJ KOMETY',
  'MIĘDZY RUINAMI A LEGENDĄ',
  'KSIĘGA DŁUGÓW I DAWNYCH RAN',
  'ŚLADEM SPACZENIA I ZŁOTA',
  'IMIONA OCALONE OD ZAPOMNIENIA',
  'WYPRAWY, KTÓRYCH NIKT NIE ZLECAŁ',
  'Z RUIN WRACAJĄ TYLKO OPOWIEŚCI',
  'KSIĘGA PISANA KRWIĄ I ATRAMENTEM',
  'SPIS JESZCZE ŻYWYCH',
  'LISTA PŁAC I POGRZEBÓW',
  'KRONIKA MIASTA POTĘPIONYCH',
  'ZAPISKI Z PIWNIC MORDHEIM',
  'IMIONA, ZANIM POCHŁONIE JE MROK',
  'REJESTR ŚMIAŁKÓW I GŁUPCÓW',
  'GDZIE SPACZEŃ, TAM KŁOPOTY',
  'TYCH JESZCZE NIE ZJEDZONO',
  'KSIĘGA BEZ SZCZĘŚLIWYCH ZAKOŃCZEŃ',
  'ROZKAZY, KTÓRYCH NIKT NIE SŁUCHA',
  'SPIS INWENTARZA I UTRACONYCH KOŃCZYN',
  'ZAPISKI NIEUFNEGO KRONIKARZA',
  'BLIZNY, DŁUGI I OBIETNICE',
  'ZA TYMI MURAMI BOGOWIE NIE SŁUCHAJĄ',
  'ROZPISKA PISANA PRZY ŁOJOWEJ ŚWIECY',
  'KTO PRZEŻYJE, TEN OPOWIE'
];
const footerPhrases=[
  'Nie każdy wraca. Każdy zostawia ślad.',
  'Złoto się kończy. Blizny zostają.',
  'W ruinach nawet szczęście nosi sztylet.',
  'Za tę historię zapłacono z góry.',
  'Nie pytaj, skąd mamy ten spaczeń.',
  'Najpierw policz monety. Potem ocalałych.',
  'Szczury też mają swoją bandę.',
  'Kometa spadła. Ceny poszły w górę.',
  'Najlepszy pancerz to szybkie nogi.',
  'Tutaj każdy ma dwa imiona: własne i na nagrobku.',
  'Spaczeń błyszczy. Rozsądek gaśnie.',
  'Dziś kucharz. Jutro drugie danie.',
  'Nie ufaj nikomu, kto się uśmiecha.',
  'Najdłużej żyje ten, kto idzie ostatni.',
  'Jeśli coś szepcze z piwnicy, nie odpowiadaj.',
  'Bohaterowie giną pierwsi. Dlatego jest ich tak mało.',
  'Wszystko ma swoją cenę. Zwykle wyższą, niż nas stać.',
  'Mapa była dokładna. Tylko potwory się przeprowadziły.',
  'Kto pyta, nie błądzi. Kto błądzi, nie wraca.',
  'Cmentarz też ktoś musi zapełnić.'
];
const emptyRosterPhrases=[
  ['Zaraz będzie ciemno','Zbierz bandę i zapal pochodnie. W ruinach lepiej nie sprawdzać samotnie, co porusza się w mroku.'],
  ['Twoja banda jest jeszcze pusta.','Dodaj lidera i wojowników, a następnie wybierz ich wyposażenie.'],
  ['Ktoś musi po ten spaczeń pójść.','Zwerbuj lidera i kilku śmiałków o rozsądnie niskich oczekiwaniach. Broń, pancerz i szanse przeżycia dobierzesz później.'],
  ['Na razie masz tylko dobre chęci.','Przyda się jeszcze lider, kilku wojowników i coś ostrego. Udział w łupach obiecasz im później.'],
  ['Ruiny czekają. Nikt nie powinien iść sam.','Znajdź kogoś, kto poprowadzi bandę, i tych, którzy pójdą za nim. Rozdaj broń. Wkrótce zapadnie zmrok.'],
  ['Nikt jeszcze nie podpisał kontraktu.','Zwerbuj lidera. Najlepiej takiego, który przeczyta drobny druk.'],
  ['Banda bez ludzi to tylko ładna nazwa.','Zwerbuj kogoś, kto będzie ją nosił z dumą. Albo chociaż bez narzekania.'],
  ['Karczma pełna chętnych. Prawie trzeźwych.','Wybierz najmniej podejrzanych i daj im broń. Co może pójść nie tak?'],
  ['Tu jeszcze nikt nie zginął.','Na razie. Zwerbuj pierwszych wojowników i ruszajcie do Szczańca.'],
  ['Lista płac jest pusta. Skarbnik się cieszy.','Popsuj mu humor i zwerbuj pierwszych najemników.'],
  ['Kometa spadła. Ktoś musi to posprzątać.','Zbierz bandę, która nie boi się brudnej roboty.'],
  ['Ktoś musi nieść pochodnię.','Zwerbuj wojowników: jednego do walki, drugiego do pochodni, trzeciego na wszelki wypadek.'],
  ['Pusto jak w skarbcu po wypłacie.','Dodaj pierwszych śmiałków, zanim ktoś inny zgarnie najlepszych.'],
  ['Szczury już są pod podłogą.','Zbierz wojowników, zanim szczury założą własną bandę.'],
  ['Wolne miejsca przy ognisku.','Zwerbuj kilku twardzieli, którzy je zajmą i nie ukradną kociołka.'],
  ['Bez bandy nawet duchy się nudzą.','Dodaj wojowników i daj ruinom coś do roboty.']
];
// Flavour lines start at a random entry; clicking one shows the next from its list.
function phraseCycle(list){let i=Math.floor(Math.random()*list.length);return {current:()=>list[i],next:()=>list[i=(i+1)%list.length]};}
const headingCycle=phraseCycle(headingPhrases),footerCycle=phraseCycle(footerPhrases),emptyRosterCycle=phraseCycle(emptyRosterPhrases);
function cycleOnClick(el,show){
  Object.assign(el,{tabIndex:0,title:'Kliknij, aby zmienić'});el.setAttribute('role','button');el.classList.add('phrase-cycle');
  el.addEventListener('click',show);
  el.addEventListener('keydown',event=>{if(event.key==='Enter' || event.key===' '){event.preventDefault();show();}});
}
function emptyRosterMarkup(){
  const [title,description]=emptyRosterCycle.current();
  return `<div class="empty-roster" role="button" tabindex="0" title="Dodaj wojownika"><img class="empty-logo" src="logo.svg" alt="" width="80" height="80"><h2>${esc(title)}</h2><p>${esc(description)}</p></div>`;
}
let pictureTarget=null,pictureCropId=null,pictureDrag=null,pictureFrame=null;
let bands=[],band,catalog,selectedId=null,messages=[],loading=false,protectedStorage=false,undoAction=null;
const selected=()=>band.fighters.find(f=>f.id===selectedId);
function notice(message,undo=null){
  const box=$('notice');box.hidden=!message;box.textContent=message;undoAction=undo;if(!message)return;
  if(undo){
    const button=document.createElement('button');button.type='button';button.className='notice-undo';button.textContent='Cofnij';
    button.onclick=()=>{const action=undoAction;undoAction=null;action?.();notice('Przywrócono.');};box.append(button);
  }
  const close=document.createElement('button');close.type='button';close.className='notice-close';close.textContent='×';
  close.setAttribute('aria-label','Zamknij powiadomienie');close.title='Zamknij powiadomienie';close.onclick=()=>notice('');box.append(close);
}
function shareNotice(url,copied){
  notice(copied?'Skopiowano link do bandy. Link zawiera bieżącą wersję rozpiski, bez zdjęć.':'Nie udało się skopiować linku. Możesz zaznaczyć i skopiować go poniżej.');
  const label=document.createElement('label');label.className='share-link';label.textContent='Link';
  const input=document.createElement('input');input.id='share-link';input.type='text';input.readOnly=true;input.value=url;input.setAttribute('aria-label','Link do bandy');
  input.addEventListener('click',()=>input.select());label.append(input);$('notice').append(label);
}
// The library in memory updates at once; writing it to localStorage (all bands,
// photos included) waits until edits pause, so typing never stalls on it.
let saveTimer=null;
function save(){
  band.fighters.forEach(fighter=>synchronizeMutationPrices(fighter,catalog));
  const index=bands.findIndex(b=>b.id===band.id);if(index<0)bands.push(band);else bands[index]=band;
  $('library-count').textContent=bands.length;
  clearTimeout(saveTimer);saveTimer=setTimeout(flushSave,300);
}
function flushSave(){
  if(saveTimer===null)return;
  clearTimeout(saveTimer);saveTimer=null;
  try{if(protectedStorage)throw new Error('Biblioteka jest uszkodzona; wyeksportuj bieżącą bandę do pliku.');writeLibrary(localStorage,bands,band.id);$('save-status').textContent='✓ Zapisano lokalnie';}
  catch(error){$('save-status').textContent='Nie zapisano';notice(`Nie udało się zapisać bandy. ${error.message} Użyj eksportu JSON, aby zachować zmiany.`);}
}
addEventListener('pagehide',flushSave);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushSave();});
function changed(){ensureLeader(band,catalog);save();renderRoster();}
// One undo restores the whole band as it was before the post-battle results.
function applyBattle(actions,summary){
  const before=structuredClone(band);
  band=applyActions(band,actions,catalog,{date:new Date(),summary});ensureLeader(band,catalog);save();renderAll();
  notice('Zastosowano wyniki bitwy.',()=>{band=before;save();renderAll();});
}
function renderRoster(refreshRows=true){
  if(!band||!catalog)return;
  $('show-pictures').checked=band.showPictures!==false;
  $('roster').classList.toggle('pictures-visible',band.showPictures!==false);
  const totals=summary(band,catalog);messages=validateBand(band,catalog);
  $('total-count').textContent=totals.count;$('total-cost').innerHTML=`${totals.cost} <small>zk</small>`;$('total-rating').textContent=totals.rating;
  $('roster-count').textContent=totals.count?`/ ${totals.count}`:'';$('band-type-label').textContent=bandTitle(band);
  if(refreshRows)renderRows();
  else $('roster').querySelectorAll('.fighter-row').forEach(row=>{const count=messages.filter(m=>m.fighterId===row.dataset.id).length;row.querySelector('.row-warning').textContent=count?warningCount(count):'';});
  $('rating-breakdown').innerHTML=`<div class="rating-line"><span>Wojownicy (${totals.count-totals.large} × 5)</span><span>${(totals.count-totals.large)*5}</span></div><div class="rating-line"><span>Duże modele (${totals.large} × 20)</span><span>${totals.large*20}</span></div><div class="rating-line"><span>Doświadczenie łącznie</span><span>${totals.exp}</span></div><div class="rating-line"><span>Siła bandy</span><span>${totals.rating}</span></div>`;
  const errors=messages.filter(m=>m.severity==='error').length;
  $('validation-title').textContent=`Sprawdzenie rozpiski · ${errors?errorCount(errors):'bez błędów'}${messages.length-errors?` · ${warningCount(messages.length-errors)}`:''}`;
  $('validation-list').innerHTML=messages.length?messages.map(m=>`<div class="validation-item ${m.severity}"><span>${m.severity==='error'?'!':m.severity==='warning'?'△':'○'}</span><span>${esc(m.message)}</span>${m.fighterId?`<button data-edit="${esc(m.fighterId)}">Przejdź do wojownika</button>`:''}</div>`).join(''):'<div class="validation-item tip">✓ Rozpiska spełnia sprawdzane zasady.</div>';
  renderGlossary();
}
// Rebuild only the fighter cards whose markup changed, then fix their order.
// Untouched cards keep their DOM (and their painted tiles), so a click on one
// experience box no longer redraws the whole roster.
let rowHtml=new Map();
function renderRows(){
  const roster=$('roster');
  if(!band.fighters.length){roster.innerHTML=emptyRosterMarkup();rowHtml=new Map();return;}
  if(roster.querySelector('.empty-roster'))roster.innerHTML='';
  const existing=new Map([...roster.children].map(el=>[el.querySelector('.fighter-row')?.dataset.id,el]));
  const next=new Map(),template=document.createElement('template');
  band.fighters.forEach((f,index)=>{
    const markup=rowMarkup(f,index);next.set(f.id,markup);
    let el=existing.get(f.id);existing.delete(f.id);
    if(!el || rowHtml.get(f.id)!==markup){
      template.innerHTML=markup;const fresh=template.content.firstElementChild;
      if(el)el.replaceWith(fresh);el=fresh;
    }
    if(roster.children[index]!==el)roster.insertBefore(el,roster.children[index] || null);
  });
  existing.forEach(el=>el.remove());
  rowHtml=next;
}
function rowMarkup(f,index){
  const t=templateFor(f,catalog),issues=messages.filter(m=>m.fighterId===f.id),cost=fighterCost(f,catalog),maxima=racialMaxima(f,catalog);
  const advances=ADVANCE_THRESHOLDS;
  return `<div class="fighter-entry"><div class="fighter-order no-print" role="group" aria-label="Akcje wojownika: ${esc(f.customName)}"><button type="button" data-move-fighter="${esc(f.id)}" data-direction="-1" ${index===0?'disabled':''} aria-label="Przesuń w górę: ${esc(f.customName)}" title="Przesuń w górę">↑</button><button type="button" data-move-fighter="${esc(f.id)}" data-direction="1" ${index===band.fighters.length-1?'disabled':''} aria-label="Przesuń w dół: ${esc(f.customName)}" title="Przesuń w dół">↓</button><button type="button" data-duplicate-fighter="${esc(f.id)}" aria-label="Duplikuj: ${esc(f.customName)}" title="Duplikuj wojownika">+</button><button type="button" class="danger" data-delete-fighter="${esc(f.id)}" aria-label="Usuń: ${esc(f.customName)}" title="Usuń wojownika">×</button></div><article class="fighter-row" data-id="${esc(f.id)}" aria-label="${esc(f.customName)}">
    <div class="fighter-portrait"><button type="button" class="portrait-upload" data-picture="${esc(f.id)}" aria-label="${f.picture?'Zmień':'Dodaj'} zdjęcie: ${esc(f.customName)}">${f.picture?`<img src="${esc(f.picture)}" style="${pictureStyle(f)}" alt="${esc(f.customName)}"><span class="portrait-caption no-print">Zmień zdjęcie</span>`:'<span class="portrait-placeholder no-print" aria-hidden="true">+<small>Dodaj zdjęcie</small></span>'}</button>${f.picture?`<button type="button" class="portrait-remove no-print" data-remove-picture="${esc(f.id)}" aria-label="Usuń zdjęcie: ${esc(f.customName)}" title="Usuń zdjęcie">×</button>`:''}</div>
    <div class="fighter-profile"><div class="identity-line"><span>Imię:</span><strong class="fighter-name" contenteditable="plaintext-only" data-fighter-name role="textbox" aria-label="Imię wojownika: ${esc(f.customName)}" aria-multiline="false" spellcheck="false">${esc(f.customName)}</strong><button class="row-number" data-edit="${esc(f.id)}" aria-label="Edytuj profil: ${esc(f.customName)}" title="Edytuj wojownika">${String(index+1).padStart(2,'0')}</button></div><div class="identity-line"><span>Typ:</span><strong class="fighter-type">${esc(f.type)}</strong></div>
    <table class="stats" aria-label="Profil wojownika"><thead><tr>${STAT_LABELS.map(k=>`<th scope="col">${k}</th>`).join('')}</tr></thead><tbody><tr>${STAT_KEYS.map((k,i)=>`<td><input class="stat-input no-print" data-stat="${k}" value="${esc(f.stats[k])}" aria-label="${STAT_LABELS[i]}: ${esc(f.customName)}" title="Zmień ${STAT_LABELS[i]}" autocomplete="off" spellcheck="false"><span class="stat-print">${esc(f.stats[k])}</span></td>`).join('')}</tr><tr class="maxima" aria-label="Maksimum rasowe">${STAT_KEYS.map(k=>`<td>${esc(maxima[k] ?? '–')}</td>`).join('')}</tr></tbody></table>
    <div class="profile-bottom"><span class="role-stamp">${esc(isLeader(f,catalog)?'Lider bandy':t?.type || f.race || 'Wojownik')}</span><span class="maxima-label">↑ Maksimum rasowe</span><strong>${cost} zk</strong></div></div>
    <div class="row-section skills-cell"><h3>Umiejętności i czary</h3><div class="paths">${paths.map(([key,name])=>`<span class="path ${(t?.skills || []).includes(key)?'active':''}">${name}</span>`).join('')}</div><div class="row-content">${f.skills.map(s=>`<span class="skill-chip">${esc(skillDisplay(s,catalog))}</span>`).join('') || '—'}</div>${f.notes?`<div class="injury-line"><span>Uwagi:</span>${esc(f.notes)}</div>`:''}</div>
    <div class="row-section equipment-cell"><h3>Ekwipunek</h3><div class="row-content">${f.equipment.map(e=>esc(e.name)).join(' · ') || '—'}</div><div class="injury-line"><span>Obrażenia:</span>${esc(f.injuries || '—')}</div><div class="row-actions no-print"><span class="row-warning">${issues.length?warningCount(issues.length):''}</span><button data-edit="${esc(f.id)}" aria-label="Edytuj: ${esc(f.customName)}">Edytuj wojownika</button></div></div>
    <div class="experience-cell"><div class="experience-grid" aria-label="Tor doświadczenia">${experienceMarkup(f,advances)}</div><div class="experience-total">Doświadczenie<strong>${number(f.exp)}</strong></div></div>
  </article></div>`;
}
function experienceMarkup(f,advances){
  const boxes=Array.from({length:90},(_,n)=>`<button class="exp-box ${n<f.exp?'earned':''} ${advances.includes(n+1)?'advance':''}" data-xp="${n+1}" data-fighter="${esc(f.id)}" aria-label="Ustaw doświadczenie: ${n+1}" aria-pressed="${n<f.exp}" title="${n+1} PD"></button>`);
  return [boxes.slice(0,45),boxes.slice(45)].map(half=>`<div class="experience-half">${half.join('')}</div>`).join('');
}
function pictureStyle(fighter){
  const {x,y,zoom}=normalizePictureCrop(fighter.pictureCrop);
  return `--portrait-x:${x}%;--portrait-y:${y}%;--portrait-zoom:${zoom}`;
}
function updatePictureCrop(){
  const fighter=band.fighters.find(f=>f.id===pictureCropId);if(!fighter)return;
  const crop=normalizePictureCrop(fighter.pictureCrop);
  for(const key of ['x','y','zoom']){
    $(`picture-${key}`).value=crop[key];
    $(`picture-${key}-value`).textContent=key==='zoom'?`${Math.round(crop.zoom*100)}%`:`${Math.round(crop[key])}%`;
  }
  $('picture-crop-image').style.cssText=pictureStyle(fighter);
  const row=[...$('roster').querySelectorAll('.fighter-row')].find(row=>row.dataset.id===fighter.id);
  const image=row?.querySelector('.fighter-portrait img');if(image)image.style.cssText=pictureStyle(fighter);
}
function openPictureCrop(id){
  const fighter=band.fighters.find(f=>f.id===id);if(!fighter?.picture)return;
  pictureCropId=id;$('picture-crop-image').src=fighter.picture;$('picture-crop-image').alt=fighter.customName;
  const row=[...$('roster').querySelectorAll('.fighter-row')].find(row=>row.dataset.id===id);
  const bounds=row.querySelector('.portrait-upload').getBoundingClientRect();
  const scale=Math.min(260/bounds.width,340/bounds.height,innerWidth*0.7/bounds.width,innerHeight*0.4/bounds.height);
  pictureFrame={width:bounds.width*scale,height:bounds.height*scale};
  $('picture-crop-preview').style.width=`${pictureFrame.width}px`;$('picture-crop-preview').style.height=`${pictureFrame.height}px`;
  updatePictureCrop();if(!$('picture-crop').open)$('picture-crop').showModal();
}
// The glossary only depends on gear, skills, the band store and edited
// descriptions, so it is rebuilt only when the resulting entries change.
let glossaryKey='';
function renderGlossary(){
  const entries=glossaryEntries(band,catalog),key=JSON.stringify([band.id,entries]);
  if(key===glossaryKey)return;glossaryKey=key;
  $('glossary-list').className='glossary-grid';
  $('glossary-list').innerHTML=entries.length?entries.map(e=>`<div class="glossary-entry"><h3>${esc(e.name)}</h3>${e.difficulty!==undefined?`<p class="spell-difficulty">${e.difficulty==='X'?'':'Trudność: '}${esc(difficultyText(e.difficulty))}</p>`:''}<label class="sr-only" for="glossary-${esc(e.name)}">Opis: ${esc(e.name)}</label><textarea id="glossary-${esc(e.name)}" data-description="${esc(e.name)}">${esc(e.description)}</textarea><p class="print-text">${esc(e.description)}</p></div>`).join(''):'<p class="muted">Opisy pojawią się po dodaniu wojowników i ekwipunku.</p>';
}
// Labels that name the rule set follow the open band (Długobrody or Krótkobrody).
const ruleSetName=()=>RULE_SETS[band.ruleSetId] || RULE_SETS.dlugobrody;
function renderRuleSet(){
  const name=ruleSetName();
  document.title=`Mordheim - ${name}`;
  $('brand-name').textContent=name;
  $('footer-ruleset').textContent=`${name} w Szczańcu`;
}
function renderAll(){
  $('band-name-print').textContent=band.name;
  $('band-name').value=band.name;$('treasury-gold').value=number(band.treasury.gold);$('treasury-shards').value=number(band.treasury.shards);$('treasury-fragments').value=number(band.treasury.armourFragments);$('treasury-notes').value=band.treasury.notes || '';$('stored-equipment').value=band.storedEquipment;
  $('band-phase').value=band.phase;renderRuleSet();renderRoster();$('library-count').textContent=bands.length;
}
async function activate(raw){
  if(loading)return false;loading=true;document.body.setAttribute('aria-busy','true');
  try{const next=normalizeBand(raw),nextCatalog=await loadCatalog(next.warbandTypeId,next.ruleSetId);band=next;catalog=nextCatalog;const update=reconcileRules(band,catalog);ensureLeader(band,catalog);notice(update);save();renderAll();return true;}
  catch(error){notice(error.message);return false;}
  finally{loading=false;document.body.removeAttribute('aria-busy');}
}
function openPicker(){if(!catalog)return;$('fighter-search').value='';renderPicker();$('picker').showModal();$('fighter-search').focus();}
function renderPicker(){
  const query=$('fighter-search').value.toLocaleLowerCase('pl');
  const matching=catalog.fighters.filter(t=>`${t.name} ${t.race} ${t.type}`.toLocaleLowerCase('pl').includes(query));
  $('template-list').innerHTML=matching.map(t=>`<button class="template-option" data-template="${esc(t.name)}"><span><strong>${esc(t.name)}</strong><small>${esc(t.type)} · ${esc(t.race)} · ${t.exp_start || 0} PD</small></span><span class="price">${t.cost} zk${catalog.progression?.mutationEligibleTemplates.includes(t.name)?' + mutacje':''} &nbsp; +</span></button>`).join('') || '<p class="editor-hint">Brak wojowników pasujących do wyszukiwania.</p>';
}
function field(name,title,value,type='text'){return `<label class="editor-field">${title}<input name="${name}" type="${type}" value="${esc(value)}" ${type==='number'?'min="0" max="1000000"':''}></label>`;}
function openEditor(id){
  const redraw=selectedId===id && $('editor').open;
  const expanded=redraw?[...$('editor-body').querySelectorAll('details[open]')].map(details=>details.querySelector('summary')?.textContent):[];
  const seen=redraw?[...$('editor-body').querySelectorAll('details summary')].map(summary=>summary.textContent):[];
  const scroll=selectedId===id?$('editor').scrollTop:0;
  selectedId=id;const f=selected();if(!f)return;const t=templateFor(f,catalog),maxima=racialMaxima(f,catalog);
  $('editor-title').textContent=f.customName;
  $('editor-body').innerHTML=`${field('customName','Imię wojownika',f.customName)}<div class="editor-pair">${field('type','Typ (nazwa wyświetlana)',f.type)}${field('race','Rasa',f.race || '')}</div>
    <details class="editor-details"><summary>Zmień szablon wojownika</summary><p class="editor-hint">Szablon określa profil i zasady początkowe. Zmiana szablonu utworzy nowy profil; poprzednią wersję możesz przywrócić przyciskiem „Cofnij”.</p><select id="replace-template"><option value="">Wybierz nowy szablon…</option>${catalog.fighters.map(x=>`<option>${esc(x.name)}</option>`).join('')}</select><button id="apply-template" type="button">Zastosuj szablon</button></details>
    <h3>Profil wojownika</h3><div class="editor-stats">${STAT_KEYS.map((k,i)=>`<label>${STAT_LABELS[i]}<input name="stat.${k}" value="${esc(f.stats[k])}" aria-label="${STAT_LABELS[i]}"></label>`).join('')}</div>
    <details class="editor-details"><summary>Maksimum rasowe</summary><p id="maxima-source" class="editor-hint"></p><div class="editor-stats">${STAT_KEYS.map((k,i)=>`<label>${STAT_LABELS[i]}<input name="max.${k}" value="${esc(maxima[k] ?? '')}" aria-label="Maksimum ${STAT_LABELS[i]}"></label>`).join('')}</div><p class="editor-hint">Możesz wpisać wyjątek wynikający z zasad wojownika. Wyczyszczenie pola przywraca wartość z tabeli.</p><button id="reset-maxima" type="button">Przywróć maksimum rasowe</button></details>
    <div class="editor-pair">${field('baseCost','Koszt podstawowy (zk)',f.baseCost,'number')}${field('exp','Doświadczenie (PD)',f.exp,'number')}</div><label><input name="is_large" type="checkbox" ${f.is_large?'checked':''}> Duży model (20 pkt do siły bandy)</label>
    ${t?.type==='Zwierzak'?'':`<label><input name="leader" type="checkbox" ${isLeader(f,catalog)?'checked disabled':''}> Lider bandy — dowodzi bandą</label><p class="editor-hint">${isLeader(f,catalog)?'Tylko lider bandy korzysta z zasady Lider, zmienia limity wojowników i może kupić +1 W przy werbunku. Aby zmienić lidera, zaznacz to pole u innego wojownika.':'Bandą dowodzi jeden wojownik, nawet jeśli masz kilka modeli Lidera.'}</p>`}
    ${recruitmentOptions(f,catalog).length || canBuyMutations(f,catalog)?`<details class="editor-details" open><summary>Rozwój przy werbunku</summary><p class="editor-hint">Opcjonalne zakupy przy rekrutacji. Koszt, PD i profil aktualizują się razem. Koszt ulepszeń: ${recruitmentCost(f)} zk.</p>${canBuyMutations(f,catalog)?(f.recruitmentComplete?'<p class="editor-hint">Rekrutacja zakończona: mutacji nie można już dokupić.</p>':'<p class="editor-hint">Mutacje: pierwsza kosztuje cenę z listy, każda kolejna dwukrotność swojej ceny. Każdą mutację można kupić raz. Kupione mutacje są na liście umiejętności poniżej.</p><form id="mutation-form" class="add-entry-form"><label class="sr-only" for="mutation-choice">Dodaj mutację</label><select id="mutation-choice"></select></form>'):''}${recruitmentOptions(f,catalog).map(option=>option.key==='mercenaryAdvance'?`<label>${esc(option.label)}<select data-recruitment="mercenaryAdvance" ${f.recruitmentComplete?'disabled':''}><option value="">Bez rozwinięcia</option><option value="ws" ${f.recruitmentUpgrades?.mercenaryAdvance==='ws'?'selected':''}>+1 WS</option><option value="bs" ${f.recruitmentUpgrades?.mercenaryAdvance==='bs'?'selected':''}>+1 BS</option></select></label>`:`<label><input type="checkbox" data-recruitment="${option.key}" ${f.recruitmentUpgrades?.[option.key]?'checked':''} ${f.recruitmentComplete?'disabled':''}> ${esc(option.label)}</label>`).join('')}<label class="editor-field"><input name="recruitmentComplete" type="checkbox" ${f.recruitmentComplete?'checked':''}> Rekrutacja tego wojownika zakończona</label><p class="editor-hint">Zakończenie rekrutacji blokuje nowe mutacje i powyższe zakupy. Nowy wojownik w kampanii zaczyna z otwartą rekrutacją.</p></details>`:''}
    <h3>Ekwipunek</h3><p class="editor-hint">Ceny nowych zakupów: ${band.phase==='campaign'?'kampania':'tworzenie bandy'}. Zmiana etapu nie zmienia cen już kupionych przedmiotów. Premie z ekwipunku i umiejętności wpisuj do profilu ręcznie.</p><div id="equipment-entries"></div><form id="equipment-form" class="add-entry-form"><label class="sr-only" for="equipment-choice">Dodaj ekwipunek</label><select id="equipment-choice"><option value="">Wybierz ekwipunek…</option>${Object.entries(equipmentChoices(f,catalog).reduce((a,e)=>((a[e.originCategory]??=[]).push(e),a),{})).map(([category,items])=>`<optgroup label="${esc(categories[category] || 'Przedmioty')}">${items.map(e=>`<option value="${esc(e.name)}">${esc(e.name)} (${purchaseCost(e,band.phase)} zk)${equipmentIssue(e,f,catalog)?' · niedozwolony':''}</option>`).join('')}</optgroup>`).join('')}</select></form>
    <details class="editor-details"><summary>Znaleziony artefakt</summary><p class="editor-hint">Artefakty z eksploracji nie mają ceny zakupu. Dodanie zapisuje 0 wydanych zk; premie do profilu wpisz ręcznie.</p><form id="artifact-form" class="add-entry-form"><select name="artifact" aria-label="Znaleziony artefakt"><option value="">Wybierz artefakt…</option>${catalog.artifacts.map(item=>`<option>${esc(item.name)}</option>`).join('')}</select></form></details>
    <details class="editor-details"><summary>Własny przedmiot</summary><form id="custom-equipment-form" class="add-entry-form"><input name="name" aria-label="Nazwa własnego przedmiotu" placeholder="Nazwa przedmiotu" required maxlength="120"><input name="cost" type="number" aria-label="Koszt własnego przedmiotu" min="0" value="0"><select name="category" aria-label="Kategoria własnego przedmiotu"><option value="miscellaneous">Przedmiot</option><option value="melee_weapons">Broń wręcz</option><option value="ranged_weapons">Broń strzelecka</option><option value="armor">Pancerz</option></select><button type="submit">Dodaj własny</button></form></details>
    <h3>Umiejętności i czary</h3><p class="editor-hint">Ścieżki rozwoju: ${esc((t?.skills || []).join(', ') || 'brak')}. Wybierz konkretny czar lub umiejętność z listy.</p><div id="skill-entries"></div><form id="skill-form" class="add-entry-form"><label class="sr-only" for="skill-choice">Dodaj umiejętność lub czar</label><select id="skill-choice"></select></form>
    <details class="editor-details"><summary>Własna zasada</summary><form id="custom-skill-form" class="add-entry-form"><input name="name" aria-label="Nazwa własnej zasady" placeholder="Nazwa zasady" required maxlength="180"><button type="submit">Dodaj zasadę</button></form></details>
    <label class="editor-field">Obrażenia i trwałe urazy<textarea name="injuries" rows="3">${esc(f.injuries)}</textarea></label><label class="editor-field">Uwagi<textarea name="notes" rows="3">${esc(f.notes)}</textarea></label><div id="editor-validation"></div>`;
  updateMaximaEditor(f);renderEditorEntries();$('editor-body').querySelectorAll('details').forEach(details=>{const name=details.querySelector('summary')?.textContent,was=expanded.includes(name);if(was || seen.includes(name))details.open=was;});if(!$('editor').open)$('editor').showModal();$('editor').scrollTop=scroll;
}
function updateMaximaEditor(f){
  const profile=racialMaximumProfile(f,catalog),maxima=racialMaxima(f,catalog);
  $('maxima-source').textContent=Object.keys(profile.stats).length?`Wartości automatyczne: ${profile.name}. Źródło: ${ruleSetName()}, str. 34.`:`${ruleSetName()} nie podaje maksimum rasowego dla tego modelu. Pola pozostają puste; możesz wpisać uzgodnione wartości.`;
  STAT_KEYS.forEach(key=>{const input=document.querySelector(`[name="max.${key}"]`);input.value=maxima[key] ?? '';});
}
function renderEditorEntries(){
  const f=selected();if(!f)return;
  $('equipment-entries').innerHTML=f.equipment.map((e,i)=>`<div class="editor-item"><span class="entry-name">${esc(e.name)}</span><input type="number" min="0" value="${number(e.cost)}" data-eq-cost="${i}" aria-label="Koszt: ${esc(e.name)}"><small>zk</small><button class="remove-entry" data-remove-eq="${i}" aria-label="Usuń przedmiot: ${esc(e.name)}">×</button></div>`).join('') || '<p class="editor-hint">Brak ekwipunku.</p>';
  $('skill-entries').innerHTML=f.skills.map((s,i)=>`<div class="editor-item"><span class="entry-name">${esc(s.label || s.name)}${mutationFor(s,catalog)?' <small>· mutacja</small>':''}</span><input type="number" min="0" value="${skillCost(f,i,catalog)}" ${mutationFor(s,catalog)?'readonly title="Koszt obliczany automatycznie według kolejności mutacji"':''} data-skill-cost="${i}" aria-label="Koszt zasady: ${esc(s.label || s.name)}"><small>zk</small><button class="remove-entry" data-remove-skill="${i}" aria-label="Usuń zasadę: ${esc(s.label || s.name)}">×</button>${s.kind==='group'?`<select data-skill-option="${i}" aria-label="Opcja: ${esc(s.groupKey)}"><option value="">Wybierz opcję…</option>${Skills.getGroupedSkillOptions(s,catalog).map(o=>`<option value="${esc(o.name)}" ${o.name===s.selectedKey?'selected':''}>${esc(o.name)}${o.difficulty!==undefined?` · ${difficultyText(o.difficulty)}`:''}${o.cost?` (${o.cost} zk)`:''}</option>`).join('')}</select>`:''}${typeof spellInfo(s,catalog)?.difficulty==='number'?`<label>Trudność <input type="number" min="1" value="${spellInfo(s,catalog).difficulty}" data-spell-difficulty="${i}" aria-label="Trudność: ${esc(spellInfo(s,catalog).name)}"></label>`:''}</div>`).join('') || '<p class="editor-hint">Brak umiejętności.</p>';
  $('skill-choice').innerHTML='<option value="">Wybierz umiejętność lub grupę…</option>'+skillChoices(f,catalog).map(s=>`<option value="${esc(s.name)}">${esc(s.name)}${s.mutation?` (${s.cost} zk)`:''}${s.kind==='group'?' · wybór opcji':''}</option>`).join('');
  if($('mutation-choice'))$('mutation-choice').innerHTML='<option value="">Dodaj mutację…</option>'+mutationChoices(f,catalog).map(m=>`<option value="${esc(m.name)}">${esc(m.name)} (${m.cost} zk)</option>`).join('');
  renderEditorValidation();
}
function renderEditorValidation(){const box=$('editor-validation');if(box)box.innerHTML=messages.filter(m=>m.fighterId===selectedId).map(m=>`<p class="editor-hint">△ ${esc(m.message)}</p>`).join('');}
function renderLibrary(){
  $('library-list').innerHTML=bands.map(b=>`<div class="library-item"><div><strong>${esc(b.name)}</strong><small>${esc(bandTitle(b))} · ${countedNoun(b.fighters.length,'wojownik','wojowników','wojowników')}${b.id===band.id?' · otwarta':''}</small></div><div><button data-load-band="${esc(b.id)}">Otwórz</button><button data-delete-band="${esc(b.id)}" class="danger" aria-label="Usuń bandę: ${esc(b.name)}">×</button></div></div>`).join('');
}
function download(content,type,extension){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${band.name.replace(/[^\p{L}\p{N}_-]+/gu,'_') || 'banda'}.${extension}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

document.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.moveFighter){
    const id=button.dataset.moveFighter,direction=Number(button.dataset.direction);
    const index=band.fighters.findIndex(fighter=>fighter.id===id),target=index+direction;
    if(index<0 || ![-1,1].includes(direction) || target<0 || target>=band.fighters.length)return;
    const [fighter]=band.fighters.splice(index,1);band.fighters.splice(target,0,fighter);changed();
    const controls=[...document.querySelectorAll('[data-move-fighter]')].filter(control=>control.dataset.moveFighter===id);
    const focus=controls.find(control=>control.dataset.direction===String(direction) && !control.disabled) || controls.find(control=>!control.disabled);
    focus?.focus({preventScroll:true});focus?.scrollIntoView({block:'nearest',inline:'nearest'});
    return;
  }
  if(button.id==='replace-picture'){pictureTarget={bandId:band.id,fighterId:pictureCropId};$('fighter-picture-file').click();return;}
  if(button.id==='reset-picture-crop'){
    const fighter=band.fighters.find(f=>f.id===pictureCropId);if(fighter){fighter.pictureCrop=normalizePictureCrop();updatePictureCrop();save();}return;
  }
  if(button.dataset.picture){pictureTarget={bandId:band.id,fighterId:button.dataset.picture};$('fighter-picture-file').click();return;}
  if(button.dataset.removePicture){
    const fighter=band.fighters.find(f=>f.id===button.dataset.removePicture);if(!fighter)return;
    const previous=fighter.picture;fighter.picture='';changed();
    notice('Usunięto zdjęcie wojownika.',()=>{fighter.picture=previous;changed();});return;
  }
  if(button.dataset.duplicateFighter){
    const index=band.fighters.findIndex(f=>f.id===button.dataset.duplicateFighter);if(index<0)return;
    const copy=duplicateFighter(band.fighters[index]);band.fighters.splice(index+1,0,copy);changed();
    [...document.querySelectorAll('[data-duplicate-fighter]')].find(control=>control.dataset.duplicateFighter===copy.id)?.focus({preventScroll:true});
    return;
  }
  if(button.dataset.deleteFighter){
    const index=band.fighters.findIndex(f=>f.id===button.dataset.deleteFighter);if(index<0)return;
    const [removed]=band.fighters.splice(index,1);changed();
    notice(`Usunięto: ${removed.customName}.`,()=>{band.fighters.splice(index,0,removed);changed();});
    const controls=$('roster').querySelectorAll('[data-delete-fighter]');
    (controls[Math.min(index,controls.length-1)] || $('add-fighter')).focus({preventScroll:true});
    return;
  }
  if(button.dataset.close){$(button.dataset.close).close();return;}
  if(button.dataset.edit){openEditor(button.dataset.edit);return;}
  if(button.dataset.xp){const f=band.fighters.find(x=>x.id===button.dataset.fighter);const xp=number(button.dataset.xp);f.exp=f.exp===xp?xp-1:xp;changed();return;}
  if(button.dataset.template){const template=catalog.fighters.find(t=>t.name===button.dataset.template);const f=createFighter(template,catalog);band.fighters.push(f);$('picker').close();changed();openEditor(f.id);return;}
  if(button.dataset.removeEq!==undefined){const f=selected(),i=number(button.dataset.removeEq),removed=f.equipment.splice(i,1)[0];changed();renderEditorEntries();notice(`Usunięto: ${removed.name}.`,()=>{f.equipment.splice(i,0,removed);changed();if(selected()?.id===f.id)renderEditorEntries();});return;}
  if(button.dataset.removeSkill!==undefined){const f=selected(),i=number(button.dataset.removeSkill),removed=f.skills.splice(i,1)[0];changed();renderEditorEntries();notice(`Usunięto: ${label(removed)}.`,()=>{f.skills.splice(i,0,removed);changed();if(selected()?.id===f.id)renderEditorEntries();});return;}
  if(button.dataset.loadBand){const next=bands.find(b=>b.id===button.dataset.loadBand);if(await activate(next)){$('library').close();history.replaceState(null,'',location.pathname);}return;}
  if(button.dataset.deleteBand){const i=bands.findIndex(b=>b.id===button.dataset.deleteBand),removed=bands[i];if(loading)return;bands.splice(i,1);if(removed.id===band.id){const next=bands[0] || newBand();if(!await activate(next)){bands.splice(i,0,removed);return;}}else save();renderLibrary();notice(`Usunięto bandę: ${removed.name}.`,()=>{bands.splice(i,0,removed);save();renderLibrary();});return;}
  switch(button.id){
    case 'reset-maxima':selected().maxStats={};changed();updateMaximaEditor(selected());break;
    case 'add-fighter':case 'add-another':openPicker();break;
    case 'new-band':renderCreateBandChoices(DEFAULT_RULE_SET);rollCreateBandName();$('create-band').showModal();break;
    case 'library-button':renderLibrary();$('library').showModal();break;
    case 'import-button':case 'library-import':$('import-file').click();break;
    case 'export-json':download(JSON.stringify(exportBand(band),null,2),'application/json','json');break;
    case 'export-text':download(textExport(band,catalog),'text/plain;charset=utf-8','txt');break;
    case 'print-cards-button':printCards();break;
    case 'after-battle':if(catalog)openAftermath({band,catalog,onApply:applyBattle});break;
    case 'print-button':document.body.classList.toggle('print-descriptions',$('print-glossary').checked);if($('print-glossary').checked)$('glossary').open=true;syncPrintText();window.print();break;
    case 'share-button':{
      const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('band',encodeShare(band,globalThis.LZString));
      let copied=false;
      try{await navigator.clipboard.writeText(url.href);copied=true;}catch{}
      shareNotice(url.href,copied);break;
    }
    case 'duplicate-fighter':{const copy=duplicateFighter(selected());band.fighters.splice(band.fighters.findIndex(f=>f.id===selectedId)+1,0,copy);changed();openEditor(copy.id);break;}
    case 'delete-fighter':{const i=band.fighters.findIndex(f=>f.id===selectedId),removed=band.fighters.splice(i,1)[0];$('editor').close();changed();notice(`Usunięto: ${removed.customName}.`,()=>{band.fighters.splice(i,0,removed);changed();});break;}
    case 'apply-template':{const t=catalog.fighters.find(x=>x.name===$('replace-template').value);if(!t)return;const old=structuredClone(selected()),i=band.fighters.findIndex(f=>f.id===selectedId);const replacement=createFighter(t,catalog);replacement.id=old.id;replacement.customName=old.customName;if(old.leader)replacement.leader=true;band.fighters[i]=replacement;changed();openEditor(old.id);notice('Zmieniono szablon wojownika.',()=>{const index=band.fighters.findIndex(f=>f.id===old.id);if(index>=0)band.fighters[index]=old;changed();if($('editor').open)openEditor(old.id);});break;}
  }
});
const editor=$('editor');
let editorBackdropPress=false;
function outsideEditor(event){
  const bounds=editor.getBoundingClientRect();
  return event.clientX<bounds.left || event.clientX>bounds.right || event.clientY<bounds.top || event.clientY>bounds.bottom;
}
editor.addEventListener('pointerdown',event=>{editorBackdropPress=event.target===editor && outsideEditor(event);});
editor.addEventListener('click',event=>{
  if(editorBackdropPress && event.target===editor && outsideEditor(event))editor.close();
  editorBackdropPress=false;
});
editor.addEventListener('close',()=>{editorBackdropPress=false;});
function updateInlineName(input,commit=false){
  const row=input.closest('.fighter-row'),fighter=band.fighters.find(f=>f.id===row?.dataset.id);if(!fighter)return;
  let name=input.textContent.replace(/[\r\n]+/g,' ');
  if(commit)name=name.trim() || fighter.type || 'Wojownik';
  if(input.textContent!==name)input.textContent=name;
  fighter.customName=name;row.setAttribute('aria-label',name);
  const entry=row.closest('.fighter-entry');
  entry.querySelector('.fighter-order').setAttribute('aria-label',`Akcje wojownika: ${name}`);
  const controls=entry.querySelectorAll('[data-fighter-name],[data-edit],[data-stat],[data-move-fighter],[data-duplicate-fighter],[data-delete-fighter],[data-picture],[data-remove-picture]');
  controls.forEach(control=>{const label=control.getAttribute('aria-label');if(label?.includes(':'))control.setAttribute('aria-label',`${label.slice(0,label.indexOf(':')+1)} ${name}`);});
  const image=row.querySelector('.fighter-portrait img');if(image)image.alt=name;
  save();renderRoster(false);
}
$('roster').addEventListener('keydown',event=>{
  if(event.target.hasAttribute('data-fighter-name') && event.key==='Enter' && !event.isComposing){event.preventDefault();event.target.blur();}
});
$('roster').addEventListener('focusout',event=>{if(event.target.hasAttribute('data-fighter-name'))updateInlineName(event.target,true);});
$('roster').addEventListener('input',event=>{
  const input=event.target,key=input.dataset.stat;
  if(input.hasAttribute('data-fighter-name')){updateInlineName(input);return;}
  if(!STAT_KEYS.includes(key))return;
  const fighter=band.fighters.find(f=>f.id===input.closest('.fighter-row')?.dataset.id);if(!fighter)return;
  fighter.stats[key]=input.value;input.nextElementSibling.textContent=input.value;
  save();renderRoster(false);
});
$('picture-crop').addEventListener('input',event=>{
  const key=event.target.dataset.cropField;if(!['x','y','zoom'].includes(key))return;
  const fighter=band.fighters.find(f=>f.id===pictureCropId);if(!fighter)return;
  fighter.pictureCrop=normalizePictureCrop({...normalizePictureCrop(fighter.pictureCrop),[key]:Number(event.target.value)});
  updatePictureCrop();save();
});
const cropPreview=$('picture-crop-preview');
cropPreview.addEventListener('pointerdown',event=>{
  if(event.button!==0 || pictureDrag)return;
  const fighter=band.fighters.find(f=>f.id===pictureCropId),image=$('picture-crop-image');
  if(!fighter || !image.naturalWidth)return;
  event.preventDefault();
  pictureDrag={pointerId:event.pointerId,x:event.clientX,y:event.clientY,crop:normalizePictureCrop(fighter.pictureCrop)};
  cropPreview.setPointerCapture(event.pointerId);cropPreview.classList.add('dragging');
});
cropPreview.addEventListener('pointermove',event=>{
  if(!pictureDrag || event.pointerId!==pictureDrag.pointerId)return;
  const fighter=band.fighters.find(f=>f.id===pictureCropId);if(!fighter)return;
  const image=$('picture-crop-image');
  fighter.pictureCrop=panPictureCrop(pictureDrag.crop,event.clientX-pictureDrag.x,event.clientY-pictureDrag.y,cropPreview.clientWidth,cropPreview.clientHeight,image.naturalWidth,image.naturalHeight);
  updatePictureCrop();
});
function finishPictureDrag(event){
  if(!pictureDrag || event.pointerId!==pictureDrag.pointerId)return;
  pictureDrag=null;cropPreview.classList.remove('dragging');
  if(cropPreview.hasPointerCapture(event.pointerId))cropPreview.releasePointerCapture(event.pointerId);
  save();
}
for(const type of ['pointerup','pointercancel','lostpointercapture'])cropPreview.addEventListener(type,finishPictureDrag);
// Closing the crop dialog (Gotowe, × or Esc) keeps only the framed part of the
// photo; the crop cannot be changed afterwards, only a new photo chosen.
$('picture-crop').addEventListener('close',()=>{if(pictureDrag)finishPictureDrag({pointerId:pictureDrag.pointerId});bakePictureCrop();});
function bakePictureCrop(){
  const fighter=band.fighters.find(f=>f.id===pictureCropId),image=$('picture-crop-image');
  pictureCropId=null;
  if(!fighter?.picture || !pictureFrame || !image.naturalWidth)return;
  const {sx,sy,sw,sh}=pictureCropRect(fighter.pictureCrop,pictureFrame.width,pictureFrame.height,image.naturalWidth,image.naturalHeight);
  const scale=Math.min(1,900/Math.max(sw,sh)),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(sw*scale));canvas.height=Math.max(1,Math.round(sh*scale));
  canvas.getContext('2d').drawImage(image,sx,sy,sw,sh,0,0,canvas.width,canvas.height);
  fighter.picture=encodeCanvas(canvas);fighter.pictureCrop=normalizePictureCrop();changed();
}
cropPreview.addEventListener('wheel',event=>{
  event.preventDefault();if(pictureDrag)return;
  const fighter=band.fighters.find(f=>f.id===pictureCropId);if(!fighter)return;
  const crop=normalizePictureCrop(fighter.pictureCrop);
  fighter.pictureCrop=normalizePictureCrop({...crop,zoom:Math.round((crop.zoom+(event.deltaY<0?0.1:event.deltaY>0?-0.1:0))*100)/100});
  updatePictureCrop();save();
},{passive:false});
// Light or dark look: a per-browser preference, applied before first paint by
// a small script in index.html; dark (the rulebook look) is the default.
$('light-mode').checked=document.documentElement.dataset.theme==='light';
$('light-mode').addEventListener('change',()=>{
  const light=$('light-mode').checked;
  if(light)document.documentElement.dataset.theme='light';else delete document.documentElement.dataset.theme;
  try{localStorage.setItem('mordheim_theme',light?'light':'dark');}catch{}
});
// Photos are always in the markup; the toggle only shows or hides their column.
$('show-pictures').addEventListener('change',()=>{band.showPictures=$('show-pictures').checked;$('roster').classList.toggle('pictures-visible',band.showPictures);save();});
$('fighter-picture-file').addEventListener('change',async event=>{
  const file=event.target.files[0],target=pictureTarget;event.target.value='';pictureTarget=null;if(!file || !target)return;
  try{
    if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type))throw new Error('Wybierz plik JPG, PNG, WebP lub GIF.');
    if(file.size>10000000)throw new Error('Zdjęcie jest zbyt duże (maks. 10 MB).');
    const original=await new Promise((resolve,reject)=>{
      const reader=new FileReader();reader.onload=()=>resolve(reader.result);
      reader.onerror=()=>reject(new Error('Nie można odczytać pliku.'));reader.readAsDataURL(file);
    });
    const image=new Image();image.src=original;await image.decode();
    // The whole library shares one localStorage entry (about 5 MB), so large photos are downscaled.
    const picture=shrinkPicture(image,original);
    if(band.id!==target.bandId)return;
    const fighter=band.fighters.find(f=>f.id===target.fighterId);if(!fighter)return;
    fighter.picture=picture;fighter.pictureCrop=normalizePictureCrop();changed();
    openPictureCrop(fighter.id);
  }catch(error){notice(`Nie udało się dodać zdjęcia. ${error.message}`);}
});
function shrinkPicture(image,original,maxSide=1200,maxLength=400000){
  const scale=Math.min(1,maxSide/Math.max(image.naturalWidth,image.naturalHeight));
  if(scale===1 && original.length<=maxLength)return original;
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
  return encodeCanvas(canvas);
}
function encodeCanvas(canvas){
  const webp=canvas.toDataURL('image/webp',0.85);
  return webp.startsWith('data:image/webp')?webp:canvas.toDataURL('image/jpeg',0.85);
}
$('fighter-search').addEventListener('input',renderPicker);
$('band-phase').addEventListener('change',()=>{band.phase=$('band-phase').value;if(band.phase==='campaign')band.fighters.forEach(f=>f.recruitmentComplete=true);changed();notice(band.phase==='campaign'?'Rozpoczęto kampanię. Nowe zakupy używają cen kampanii; istniejące ceny pozostają bez zmian.':'Włączono ceny tworzenia bandy dla nowych zakupów.');});
$('band-name').addEventListener('input',()=>{band.name=$('band-name').value;$('band-name-print').textContent=band.name;save();});
for(const [id,key]of [['treasury-gold','gold'],['treasury-shards','shards'],['treasury-fragments','armourFragments'],['treasury-notes','notes']])$(id).addEventListener('input',()=>{band.treasury[key]=key==='notes'?$(id).value:number($(id).value);save();});
$('stored-equipment').addEventListener('input',()=>{band.storedEquipment=$('stored-equipment').value;save();renderGlossary();});
$('glossary-list').addEventListener('change',e=>{if(e.target.dataset.description){band.glossary.descriptions[e.target.dataset.description]=e.target.value;save();e.target.nextElementSibling.textContent=e.target.value;}});
$('editor-body').addEventListener('change',event=>{
  const input=event.target,f=selected();if(!f)return;
  // Picking from these lists adds the item at once; there is no separate add button.
  if(input.tagName==='SELECT' && input.closest('#equipment-form,#artifact-form,#skill-form,#mutation-form')){if(input.value)input.form.requestSubmit();return;}
  if(input.dataset.recruitment){setRecruitmentAdvance(f,input.dataset.recruitment,input.type==='checkbox'?input.checked:input.value,catalog);changed();openEditor(f.id);return;}
  if(input.dataset.spellDifficulty!==undefined)f.skills[number(input.dataset.spellDifficulty)].difficulty=Math.max(1,number(input.value));
  else if(input.dataset.eqCost!==undefined)f.equipment[number(input.dataset.eqCost)].cost=number(input.value);
  else if(input.dataset.skillCost!==undefined)f.skills[number(input.dataset.skillCost)].cost=number(input.value);
  else if(input.dataset.skillOption!==undefined){const i=number(input.dataset.skillOption);f.skills[i]=Skills.selectGroupedSkillOption(f.skills[i],input.value,catalog);delete f.skills[i].difficulty;}
  else if(input.name){
    if(input.name.startsWith('stat.'))f.stats[input.name.slice(5)]=input.value;
    else if(input.name.startsWith('max.'))f.maxStats[input.name.slice(4)]=input.value;
    else if(['baseCost','exp'].includes(input.name))f[input.name]=number(input.value);
    else if(input.name==='leader'){if(!input.checked)return;band.fighters.forEach(x=>{if(x!==f && isLeader(x,catalog) && x.recruitmentUpgrades?.extraWound && !x.recruitmentComplete)setRecruitmentAdvance(x,'extraWound',false,catalog);if(x===f)x.leader=true;else delete x.leader;});changed();openEditor(f.id);return;}
    else if(['is_large','recruitmentComplete'].includes(input.name))f[input.name]=input.checked;
    else if(['customName','type','race','injuries','notes'].includes(input.name))f[input.name]=input.value;
    else return;
  }else return;
  changed();$('editor-title').textContent=f.customName;
  if(input.name==='recruitmentComplete'){openEditor(f.id);return;}
  if(input.name==='race' || input.name?.startsWith('max.'))updateMaximaEditor(f);
  if(input.dataset.skillOption!==undefined)renderEditorEntries();else renderEditorValidation();
});
$('editor-body').addEventListener('submit',event=>{
  event.preventDefault();const f=selected(),form=event.target,values=new FormData(form);
  if(form.id==='equipment-form'){const item=catalog.equipment.find(e=>e.name===$('equipment-choice').value);if(!item)return;f.equipment.push(purchaseEquipment(item,band.phase));}
  if(form.id==='artifact-form'){const item=catalog.artifacts.find(e=>e.name===values.get('artifact'));if(!item)return;f.equipment.push({...item,acquired:'exploration'});}
  if(form.id==='custom-equipment-form')f.equipment.push({name:String(values.get('name')).trim(),cost:number(values.get('cost')),originCategory:values.get('category')});
  if(form.id==='skill-form'){const name=$('skill-choice').value;if(!name)return;f.skills.push(Skills.createAddableSkillEntry(name,templateFor(f,catalog),catalog));}
  if(form.id==='mutation-form'){const name=$('mutation-choice').value;if(!mutationChoices(f,catalog).some(m=>m.name===name))return;f.skills.push(Skills.createAddableSkillEntry(name,templateFor(f,catalog),catalog));}
  if(form.id==='custom-skill-form'){const entry=Skills.createSimpleSkillEntry(String(values.get('name')).trim());if(f.recruitmentComplete && mutationFor(entry,catalog)){notice('Mutacje można kupować tylko podczas rekrutacji.');return;}f.skills.push(entry);}
  changed();renderEditorEntries();form.reset();
});
// New band: rule set and band type are radio buttons drawn as swooshes.
const choiceButtons=(name,entries,selected)=>entries.map(([id,text])=>`<label class="choice-button"><input type="radio" name="${name}" value="${esc(id)}" ${id===selected?'checked':''} required><span>${esc(text)}</span></label>`).join('');
function renderCreateBandChoices(ruleSet){
  const form=$('create-band-form'),current=form.querySelector('input[name=type]:checked')?.value;
  const types=RULE_SET_BAND_TYPES[ruleSet] || Object.keys(BAND_TYPES);
  $('rule-set-choice').innerHTML=choiceButtons('ruleSet',Object.entries(RULE_SETS),ruleSet);
  $('band-type-choice').innerHTML=choiceButtons('type',types.map(id=>[id,BAND_TYPES[id]]),types.includes(current)?current:types[0]);
}
$('rule-set-choice').addEventListener('change',event=>{if(event.target.name==='ruleSet'){renderCreateBandChoices(event.target.value);if(!createNameTyped)rollCreateBandName();}});
// The name starts rolled; picking another band type rolls again until the player types their own.
let createNameTyped=false;
function rollCreateBandName(){
  const input=$('create-band-name'),type=$('create-band-form').querySelector('input[name=type]:checked')?.value;
  input.value=rerollBandName(type,input.value);createNameTyped=false;
}
$('create-band-name').addEventListener('input',()=>{createNameTyped=true;});
$('band-type-choice').addEventListener('change',()=>{if(!createNameTyped)rollCreateBandName();});
// The dice jump, bounce and show random faces while they tumble, then settle.
const DIE_PIPS={1:[[12,12]],2:[[8,8],[16,16]],3:[[8,8],[12,12],[16,16]],4:[[8,8],[16,8],[8,16],[16,16]],5:[[8,8],[16,8],[12,12],[8,16],[16,16]],6:[[8,7],[16,7],[8,12],[16,12],[8,17],[16,17]]};
const showDieFace=(die,face)=>{die.querySelector('g').innerHTML=DIE_PIPS[face].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.7"/>`).join('');};
let diceTimer=0;
function rollDice(button){
  const dice=[...button.querySelectorAll('.die')],face=()=>1+Math.floor(Math.random()*6);
  clearInterval(diceTimer);button.classList.remove('rolling');void button.offsetWidth;button.classList.add('rolling');
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){dice.forEach(die=>showDieFace(die,face()));return;}
  const started=performance.now();
  diceTimer=setInterval(()=>{dice.forEach(die=>showDieFace(die,face()));if(performance.now()-started>520)clearInterval(diceTimer);},80);
}
$('reroll-band-name').addEventListener('animationend',event=>{if(event.target.classList.contains('die') && !event.target.nextElementSibling)event.currentTarget.classList.remove('rolling');});
$('reroll-band-name').addEventListener('click',event=>{rollCreateBandName();rollDice(event.currentTarget);$('create-band-name').focus();});
renderCreateBandChoices(DEFAULT_RULE_SET);
$('create-band-form').addEventListener('submit',async event=>{event.preventDefault();const form=event.target,values=new FormData(form),next=newBand(values.get('type'),values.get('ruleSet'));next.name=String(values.get('name')).trim() || next.name;if(await activate(next)){$('create-band').close();history.replaceState(null,'',location.pathname);notice('Utworzono nową bandę. Poprzednia rozpiska jest w zapisanych bandach.');}});
$('import-file').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>50000000)throw new Error('Plik jest zbyt duży (maks. 50 MB).');const next=normalizeBand(JSON.parse(await file.text()));next.id=uid();if(await activate(next)){if($('library').open)$('library').close();history.replaceState(null,'',location.pathname);notice('Zaimportowano bandę jako osobny zapis.');}}catch(error){notice(`Nie udało się zaimportować pliku. ${error.message}`);}finally{event.target.value='';}});
function syncPrintText(){document.querySelectorAll('.ledger textarea').forEach(input=>{let p=input.nextElementSibling;if(!p?.classList.contains('print-text')){p=document.createElement('p');p.className='print-text';input.after(p);}p.textContent=input.value;});}
// Card print: copies of the rows, nine per A4 page, without the band heading, summary or footer.
function printCards(){
  const rows=[...$('roster').querySelectorAll('.fighter-row')];
  if(!rows.length){notice('Brak wojowników do wydruku.');return;}
  $('card-sheet')?.remove();
  const sheet=document.createElement('section');sheet.id='card-sheet';sheet.setAttribute('aria-hidden','true');
  sheet.classList.toggle('pictures-visible',$('roster').classList.contains('pictures-visible'));
  for(let i=0;i<rows.length;i+=9){
    const page=document.createElement('div');page.className='card-page';
    for(const row of rows.slice(i,i+9)){const card=row.cloneNode(true);card.querySelectorAll('[contenteditable]').forEach(el=>el.removeAttribute('contenteditable'));page.append(card);}
    sheet.append(page);
  }
  $('glossary').before(sheet);
  document.body.classList.add('print-cards');
  document.body.classList.toggle('print-descriptions',$('print-glossary').checked);if($('print-glossary').checked)$('glossary').open=true;
  window.print();
}
window.addEventListener('afterprint',()=>{document.body.classList.remove('print-cards');$('card-sheet')?.remove();});
window.addEventListener('beforeprint',()=>{document.body.classList.toggle('print-descriptions',$('print-glossary').checked);if($('print-glossary').checked)$('glossary').open=true;syncPrintText();});
// The empty roster is one big "add a fighter" button.
$('roster').addEventListener('click',event=>{if(event.target.closest('.empty-roster'))openPicker();});
$('roster').addEventListener('keydown',event=>{if(event.target.closest('.empty-roster') && (event.key==='Enter' || event.key===' ')){event.preventDefault();openPicker();}});
// Browsers without CSS field-sizing (Firefox, older Safari): size every
// visible text field to its content after edits and re-renders.
if(!CSS.supports('field-sizing','content')){
  const fit=el=>{if(!el.offsetParent)return;el.style.height='auto';el.style.height=`${el.scrollHeight+2}px`;};
  let queued=false;
  const fitAll=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;document.querySelectorAll('textarea').forEach(fit);});};
  document.addEventListener('input',event=>{if(event.target.tagName==='TEXTAREA')fit(event.target);});
  new MutationObserver(fitAll).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
  addEventListener('resize',fitAll);fitAll();
}
async function init(){
  $('band-eyebrow').textContent=headingCycle.current();
  $('footer-motto').textContent=footerCycle.current();
  cycleOnClick($('band-eyebrow'),()=>{$('band-eyebrow').textContent=headingCycle.next();});
  cycleOnClick($('footer-motto'),()=>{$('footer-motto').textContent=footerCycle.next();});
  let raw=null,notices=[];
  try{const library=readLibrary(localStorage);notices=library.notices || [];for(const entry of library.bands){try{bands.push(normalizeBand(entry));}catch(error){protectedStorage=true;notices.push(error.message);}}raw=bands.find(b=>b.id===library.activeId) || bands[0];}catch(error){protectedStorage=true;notices.push(error.message);}
  const shared=new URLSearchParams(location.search).get('band');
  if(shared){try{raw=decodeShare(shared,globalThis.LZString);raw.id=uid();notices.push('Otwarto kopię bandy z linku. Zmiany zapisują się lokalnie.');}catch(error){notices.push('Nieprawidłowy link. '+error.message);}}
  const activated=await activate(raw || newBand());
  if(!activated){$('save-status').textContent='Błąd wczytywania';$('roster').innerHTML='<div class="empty-roster"><h2>Nie udało się wczytać zasad.</h2><p>Odśwież stronę, aby spróbować ponownie.</p></div>';}
  else if(shared)history.replaceState(null,'',location.pathname);
  if(notices.length)notice(notices.join('\n'));
}
// Another tab saved the library: adopt its list so this tab's next save does not overwrite it.
window.addEventListener('storage',event=>{
  if(event.key!==STORAGE_KEY || !event.newValue || protectedStorage || loading || !band)return;
  try{
    const library=readLibrary(localStorage),next=library.bands.map(entry=>normalizeBand(entry));
    const current=next.find(b=>b.id===band.id && b.warbandTypeId===band.warbandTypeId && b.ruleSetId===band.ruleSetId);
    bands=next;
    if(current){band=current;renderAll();if(selected() && $('editor').open)openEditor(selectedId);}
    else{bands.push(band);$('library-count').textContent=bands.length;notice('Ta banda została usunięta w innej karcie. Kolejna zmiana zapisze ją ponownie.');}
    if($('library').open)renderLibrary();
  }catch(error){notice(`Nie udało się odczytać zmian z innej karty. ${error.message}`);}
});
init();
