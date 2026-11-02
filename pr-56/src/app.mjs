import {STAT_KEYS,STAT_LABELS,BAND_TYPES,newBand,createFighter,duplicateFighter,fighterCost,summary,normalizeBand,templateFor,skillChoices,glossaryEntries,textExport,number,uid,label} from './model.mjs';
import {loadCatalog} from './catalog.mjs';
import {readLibrary,writeLibrary,encodeShare,decodeShare} from './storage.mjs';
import {validateBand,equipmentIssue} from './rules.mjs';
import * as Skills from './skills.mjs';
import {racialMaxima,racialMaximumProfile,canBuyMutations,mutationFor,skillCost,synchronizeMutationPrices} from './progression.mjs';
import {countedNoun,warningCount,errorCount} from './polish.mjs';

const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths=[['Bojowe','Bojowe'],['Strzeleckie','Strzeleckie'],['Akademickie','Akademickie'],['Siłowe','Siłowe'],['Szybkościowe','Szybkościowe'],['Specjalne','Specjalne']];
const categories={melee_weapons:'Broń do walki wręcz',ranged_weapons:'Broń strzelecka',armor:'Pancerz',miscellaneous:'Przedmioty',items:'Przedmioty'};
let bands=[],band,catalog,selectedId=null,messages=[],loading=false,protectedStorage=false,undoAction=null;
const selected=()=>band.fighters.find(f=>f.id===selectedId);
function notice(message,undo=null){$('notice').hidden=!message;$('notice').textContent=message;undoAction=undo;if(undo){const button=document.createElement('button');button.textContent='Cofnij';button.style.marginLeft='12px';button.onclick=()=>{const action=undoAction;undoAction=null;action?.();notice('Przywrócono.');};$('notice').append(button);}}
function shareNotice(url,copied){
  notice(copied?'Skopiowano link do bandy. Link zawiera bieżącą wersję rozpiski.':'Nie udało się skopiować linku. Możesz zaznaczyć i skopiować go poniżej.');
  const label=document.createElement('label');label.className='share-link';label.textContent='Link';
  const input=document.createElement('input');input.id='share-link';input.type='text';input.readOnly=true;input.value=url;input.setAttribute('aria-label','Link do bandy');
  input.addEventListener('click',()=>input.select());label.append(input);$('notice').append(label);
}
function save(){
  band.fighters.forEach(fighter=>synchronizeMutationPrices(fighter,catalog));
  const index=bands.findIndex(b=>b.id===band.id);if(index<0)bands.push(band);else bands[index]=band;
  try{if(protectedStorage)throw new Error('Biblioteka jest uszkodzona; wyeksportuj bieżącą bandę do pliku.');writeLibrary(localStorage,bands,band.id);$('save-status').textContent='✓ Zapisano lokalnie';}
  catch(error){$('save-status').textContent='Nie zapisano';notice(`Nie udało się zapisać bandy. ${error.message} Użyj eksportu JSON, aby zachować zmiany.`);}
  $('library-count').textContent=bands.length;
}
function changed(){save();renderRoster();}
function renderRoster(){
  if(!band||!catalog)return;
  const totals=summary(band,catalog);messages=validateBand(band,catalog);
  $('total-count').textContent=totals.count;$('total-cost').innerHTML=`${totals.cost} <small>zk</small>`;$('total-rating').textContent=totals.rating;
  $('roster-count').textContent=totals.count?`/ ${totals.count}`:'';$('band-type-label').textContent=BAND_TYPES[band.warbandTypeId];
  $('roster').innerHTML=band.fighters.length?band.fighters.map(rowMarkup).join(''):`<div class="empty-roster"><span class="empty-symbol" aria-hidden="true">✦</span><h2>Tu zaczyna się historia twojej bandy.</h2><p>Zwerbuj lidera, dobierz wojowników i przygotuj ich na wyprawę.<br>Każdy z nich otrzyma własny wiersz w rozpisce.</p></div>`;
  $('rating-breakdown').innerHTML=`<div class="rating-line"><span>Wojownicy (${totals.count-totals.large} × 5)</span><span>${(totals.count-totals.large)*5}</span></div><div class="rating-line"><span>Duże modele (${totals.large} × 20)</span><span>${totals.large*20}</span></div><div class="rating-line"><span>Doświadczenie łącznie</span><span>${totals.exp}</span></div><div class="rating-line"><span>Siła bandy</span><span>${totals.rating}</span></div>`;
  const errors=messages.filter(m=>m.severity==='error').length;
  $('validation-title').textContent=`Sprawdzenie rozpiski · ${errors?errorCount(errors):'bez błędów'}${messages.length-errors?` · ${warningCount(messages.length-errors)}`:''}`;
  $('validation-list').innerHTML=messages.length?messages.map(m=>`<div class="validation-item ${m.severity}"><span>${m.severity==='error'?'!':m.severity==='warning'?'△':'○'}</span><span>${esc(m.message)}</span>${m.fighterId?`<button data-edit="${esc(m.fighterId)}">Przejdź do wojownika</button>`:''}</div>`).join(''):'<div class="validation-item tip">✓ Rozpiska spełnia sprawdzane zasady.</div>';
  renderGlossary();
}
function rowMarkup(f,index){
  const t=templateFor(f,catalog),issues=messages.filter(m=>m.fighterId===f.id),cost=fighterCost(f,catalog),maxima=racialMaxima(f,catalog);
  const advances=[2,4,6,8,11,14,17,20,24,28,32,36,41,46,51,57,63,69,76,83,90];
  return `<div class="fighter-entry"><div class="fighter-order no-print" role="group" aria-label="Kolejność: ${esc(f.customName)}"><button type="button" data-move-fighter="${esc(f.id)}" data-direction="-1" ${index===0?'disabled':''} aria-label="Przesuń w górę: ${esc(f.customName)}" title="Przesuń w górę">↑</button><button type="button" data-move-fighter="${esc(f.id)}" data-direction="1" ${index===band.fighters.length-1?'disabled':''} aria-label="Przesuń w dół: ${esc(f.customName)}" title="Przesuń w dół">↓</button></div><article class="fighter-row" data-id="${esc(f.id)}" aria-label="${esc(f.customName)}">
    <div class="fighter-profile"><div class="identity-line"><span>Imię:</span><strong class="fighter-name">${esc(f.customName)}</strong><button class="row-number" data-edit="${esc(f.id)}" aria-label="Edytuj profil: ${esc(f.customName)}" title="Edytuj wojownika">${String(index+1).padStart(2,'0')}</button></div><div class="identity-line"><span>Typ:</span><strong class="fighter-type">${esc(f.type)}</strong></div>
    <div class="paths">${paths.map(([key,name])=>`<span class="path ${(t?.skills || []).includes(key)?'active':''}">${name}</span>`).join('')}</div>
    <table class="stats" aria-label="Profil wojownika"><thead><tr>${STAT_LABELS.map(k=>`<th scope="col">${k}</th>`).join('')}</tr></thead><tbody><tr>${STAT_KEYS.map(k=>`<td>${esc(f.stats[k])}</td>`).join('')}</tr><tr class="maxima" aria-label="Maksimum rasowe">${STAT_KEYS.map(k=>`<td>${esc(maxima[k] ?? '–')}</td>`).join('')}</tr></tbody></table>
    <div class="profile-bottom"><span class="role-stamp">${esc(t?.type || f.race || 'Wojownik')}</span><span class="maxima-label">↑ Maksimum rasowe</span><strong>${cost} zk</strong></div></div>
    <div class="row-section skills-cell"><h3>Umiejętności i czary</h3><div class="row-content">${f.skills.map(s=>`<span class="skill-chip">${esc(label(s))}</span>`).join('') || '—'}</div>${f.notes?`<div class="injury-line"><span>Uwagi:</span>${esc(f.notes)}</div>`:''}</div>
    <div class="row-section equipment-cell"><h3>Ekwipunek</h3><div class="row-content">${f.equipment.map(e=>esc(e.name)).join(' · ') || '—'}</div><div class="injury-line"><span>Obrażenia:</span>${esc(f.injuries || '—')}</div><div class="row-actions no-print"><span class="row-warning">${issues.length?warningCount(issues.length):''}</span><button data-edit="${esc(f.id)}" aria-label="Edytuj: ${esc(f.customName)}">Edytuj wojownika ↗</button></div></div>
    <div class="experience-cell"><div class="experience-grid" aria-label="Tor doświadczenia">${Array.from({length:90},(_,n)=>`<button class="exp-box ${n<f.exp?'earned':''} ${advances.includes(n+1)?'advance':''}" data-xp="${n+1}" data-fighter="${esc(f.id)}" aria-label="Ustaw doświadczenie: ${n+1}" aria-pressed="${n<f.exp}" title="${n+1} PD"></button>`).join('')}</div><div class="experience-total">Doświadczenie<strong>${number(f.exp)}</strong></div></div>
  </article></div>`;
}
function renderGlossary(){
  const entries=glossaryEntries(band,catalog);
  $('glossary-list').className='glossary-grid';
  $('glossary-list').innerHTML=entries.length?entries.map(e=>`<div class="glossary-entry"><h3>${esc(e.name)}</h3><label class="sr-only" for="glossary-${esc(e.name)}">Opis: ${esc(e.name)}</label><textarea id="glossary-${esc(e.name)}" data-description="${esc(e.name)}">${esc(e.description)}</textarea><p class="print-text">${esc(e.description)}</p></div>`).join(''):'<p class="muted">Opisy pojawią się po dodaniu wojowników i ekwipunku.</p>';
}
function renderAll(){
  $('band-name').value=band.name;$('treasury-gold').value=number(band.treasury.gold);$('treasury-shards').value=number(band.treasury.shards);$('treasury-notes').value=band.treasury.notes || '';$('stored-equipment').value=band.storedEquipment;
  renderRoster();$('library-count').textContent=bands.length;document.title=`${band.name} — Mordheim`;
}
async function activate(raw){
  if(loading)return false;loading=true;document.body.setAttribute('aria-busy','true');
  try{const next=normalizeBand(raw),nextCatalog=await loadCatalog(next.warbandTypeId);band=next;catalog=nextCatalog;notice('');save();renderAll();return true;}
  catch(error){notice(error.message);return false;}
  finally{loading=false;document.body.removeAttribute('aria-busy');}
}
function openPicker(){if(!catalog)return;$('fighter-search').value='';renderPicker();$('picker').showModal();$('fighter-search').focus();}
function renderPicker(){
  const query=$('fighter-search').value.toLocaleLowerCase('pl');
  const matching=catalog.fighters.filter(t=>`${t.name} ${t.race} ${t.type}`.toLocaleLowerCase('pl').includes(query));
  $('template-list').innerHTML=matching.map(t=>`<button class="template-option" data-template="${esc(t.name)}"><span><strong>${esc(t.name)}</strong><small>${esc(t.type)} · ${esc(t.race)} · ${t.exp_start || 0} PD</small></span><span class="price">${t.cost} zk &nbsp; +</span></button>`).join('') || '<p class="editor-hint">Brak wojowników pasujących do wyszukiwania.</p>';
}
function field(name,title,value,type='text'){return `<label class="editor-field">${title}<input name="${name}" type="${type}" value="${esc(value)}" ${type==='number'?'min="0" max="1000000"':''}></label>`;}
function openEditor(id){
  selectedId=id;const f=selected();if(!f)return;const t=templateFor(f,catalog),maxima=racialMaxima(f,catalog);
  $('editor-title').textContent=f.customName;
  $('editor-body').innerHTML=`${field('customName','Imię wojownika',f.customName)}<div class="editor-pair">${field('type','Typ (nazwa wyświetlana)',f.type)}${field('race','Rasa',f.race || '')}</div>
    <details class="editor-details"><summary>Zmień szablon wojownika</summary><p class="editor-hint">Szablon określa profil i zasady początkowe. Zmiana szablonu utworzy nowy profil; poprzednią wersję możesz przywrócić przyciskiem „Cofnij”.</p><select id="replace-template"><option value="">Wybierz nowy szablon…</option>${catalog.fighters.map(x=>`<option>${esc(x.name)}</option>`).join('')}</select><button id="apply-template" type="button">Zastosuj szablon</button></details>
    <h3>Profil wojownika</h3><div class="editor-stats">${STAT_KEYS.map((k,i)=>`<label>${STAT_LABELS[i]}<input name="stat.${k}" value="${esc(f.stats[k])}" aria-label="${STAT_LABELS[i]}"></label>`).join('')}</div>
    <details class="editor-details"><summary>Maksimum rasowe</summary><p id="maxima-source" class="editor-hint"></p><div class="editor-stats">${STAT_KEYS.map((k,i)=>`<label>${STAT_LABELS[i]}<input name="max.${k}" value="${esc(maxima[k] ?? '')}" aria-label="Maksimum ${STAT_LABELS[i]}"></label>`).join('')}</div><p class="editor-hint">Możesz wpisać wyjątek wynikający z zasad wojownika. Wyczyszczenie pola przywraca wartość z tabeli.</p><button id="reset-maxima" type="button">Przywróć maksimum rasowe</button></details>
    <div class="editor-pair">${field('baseCost','Koszt podstawowy (zk)',f.baseCost,'number')}${field('exp','Doświadczenie (PD)',f.exp,'number')}</div><label><input name="is_large" type="checkbox" ${f.is_large?'checked':''}> Duży model (20 pkt do siły bandy)</label><p class="editor-hint">Profil obsługuje też wartości takie jak 2k6.</p>
    <h3>Ekwipunek</h3><div id="equipment-entries"></div><form id="equipment-form" class="add-entry-form"><label class="sr-only" for="equipment-choice">Dodaj ekwipunek</label><select id="equipment-choice"><option value="">Wybierz ekwipunek…</option>${Object.entries(Object.groupBy?Object.groupBy(catalog.equipment,e=>e.originCategory):catalog.equipment.reduce((a,e)=>((a[e.originCategory]??=[]).push(e),a),{})).map(([category,items])=>`<optgroup label="${esc(categories[category] || 'Przedmioty')}">${items.map(e=>`<option value="${esc(e.name)}">${esc(e.name)} (${e.cost} zk)${equipmentIssue(e,f,catalog)?' · niedozwolony':''}</option>`).join('')}</optgroup>`).join('')}</select><button type="submit">Dodaj</button></form>
    <details class="editor-details"><summary>Własny przedmiot</summary><form id="custom-equipment-form" class="add-entry-form"><input name="name" aria-label="Nazwa własnego przedmiotu" placeholder="Nazwa przedmiotu" required maxlength="120"><input name="cost" type="number" aria-label="Koszt własnego przedmiotu" min="0" value="0"><select name="category" aria-label="Kategoria własnego przedmiotu"><option value="miscellaneous">Przedmiot</option><option value="melee_weapons">Broń wręcz</option><option value="ranged_weapons">Broń strzelecka</option><option value="armor">Pancerz</option></select><button type="submit">Dodaj własny</button></form></details>
    <h3>Umiejętności i czary</h3><p class="editor-hint">Ścieżki rozwoju: ${esc((t?.skills || []).join(', ') || 'brak')}. Wybierz konkretny czar lub umiejętność z listy.</p>${canBuyMutations(f,catalog)?'<p class="editor-hint">Mutacje kupuje się wyłącznie podczas rekrutacji. Pierwsza kosztuje cenę z listy; każda kolejna dwukrotność swojej ceny. Koszty są obliczane automatycznie w kolejności dodawania.</p>':''}<div id="skill-entries"></div><form id="skill-form" class="add-entry-form"><label class="sr-only" for="skill-choice">Dodaj umiejętność lub czar</label><select id="skill-choice"></select><button type="submit">Dodaj</button></form>
    <details class="editor-details"><summary>Własna zasada</summary><form id="custom-skill-form" class="add-entry-form"><input name="name" aria-label="Nazwa własnej zasady" placeholder="Nazwa zasady" required maxlength="180"><button type="submit">Dodaj zasadę</button></form></details>
    <label class="editor-field">Obrażenia i trwałe urazy<textarea name="injuries" rows="3">${esc(f.injuries)}</textarea></label><label class="editor-field">Uwagi<textarea name="notes" rows="3">${esc(f.notes)}</textarea></label><div id="editor-validation"></div>`;
  updateMaximaEditor(f);renderEditorEntries();if(!$('editor').open)$('editor').showModal();
}
function updateMaximaEditor(f){
  const profile=racialMaximumProfile(f,catalog),maxima=racialMaxima(f,catalog);
  $('maxima-source').textContent=Object.keys(profile.stats).length?`Wartości automatyczne: ${profile.name}. Źródło: Drachenfels, str. 34.`:'Drachenfels nie podaje maksimum rasowego dla tego modelu. Pola pozostają puste; możesz wpisać uzgodnione wartości.';
  STAT_KEYS.forEach(key=>{const input=document.querySelector(`[name="max.${key}"]`);input.value=maxima[key] ?? '';});
}
function renderEditorEntries(){
  const f=selected();if(!f)return;
  $('equipment-entries').innerHTML=f.equipment.map((e,i)=>`<div class="editor-item"><span class="entry-name">${esc(e.name)}</span><input type="number" min="0" value="${number(e.cost)}" data-eq-cost="${i}" aria-label="Koszt: ${esc(e.name)}"><small>zk</small><button class="remove-entry" data-remove-eq="${i}" aria-label="Usuń przedmiot: ${esc(e.name)}">×</button></div>`).join('') || '<p class="editor-hint">Brak ekwipunku.</p>';
  $('skill-entries').innerHTML=f.skills.map((s,i)=>`<div class="editor-item"><span class="entry-name">${esc(s.label || s.name)}${mutationFor(s,catalog)?' <small>· mutacja</small>':''}</span><input type="number" min="0" value="${skillCost(f,i,catalog)}" ${mutationFor(s,catalog)?'readonly title="Koszt obliczany automatycznie według kolejności mutacji"':''} data-skill-cost="${i}" aria-label="Koszt zasady: ${esc(s.label || s.name)}"><small>zk</small><button class="remove-entry" data-remove-skill="${i}" aria-label="Usuń zasadę: ${esc(s.label || s.name)}">×</button>${s.kind==='group'?`<select data-skill-option="${i}" aria-label="Opcja: ${esc(s.groupKey)}"><option value="">Wybierz opcję…</option>${Skills.getGroupedSkillOptions(s,catalog).map(o=>`<option value="${esc(o.name)}" ${o.name===s.selectedKey?'selected':''}>${esc(o.name)}${o.cost?` (${o.cost} zk)`:''}</option>`).join('')}</select>`:''}</div>`).join('') || '<p class="editor-hint">Brak umiejętności.</p>';
  $('skill-choice').innerHTML='<option value="">Wybierz umiejętność lub grupę…</option>'+skillChoices(f,catalog).map(s=>`<option value="${esc(s.name)}">${esc(s.name)}${s.mutation?` (${s.cost} zk)`:''}${s.kind==='group'?' · wybór opcji':''}</option>`).join('');
  renderEditorValidation();
}
function renderEditorValidation(){const box=$('editor-validation');if(box)box.innerHTML=messages.filter(m=>m.fighterId===selectedId).map(m=>`<p class="editor-hint">△ ${esc(m.message)}</p>`).join('');}
function renderLibrary(){
  $('library-list').innerHTML=bands.map(b=>`<div class="library-item"><div><strong>${esc(b.name)}</strong><small>${esc(BAND_TYPES[b.warbandTypeId])} · ${countedNoun(b.fighters.length,'wojownik','wojowników','wojowników')}${b.id===band.id?' · otwarta':''}</small></div><div><button data-load-band="${esc(b.id)}">Otwórz</button><button data-delete-band="${esc(b.id)}" class="danger" aria-label="Usuń bandę: ${esc(b.name)}">×</button></div></div>`).join('');
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
    case 'new-band':$('create-band').showModal();break;
    case 'library-button':renderLibrary();$('library').showModal();break;
    case 'import-button':case 'library-import':$('import-file').click();break;
    case 'export-json':download(JSON.stringify(band,null,2),'application/json','json');break;
    case 'export-text':download(textExport(band,catalog),'text/plain;charset=utf-8','txt');break;
    case 'print-button':document.body.classList.toggle('print-descriptions',$('print-glossary').checked);if($('print-glossary').checked)$('glossary').open=true;syncPrintText();window.print();break;
    case 'share-button':{
      const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('band',encodeShare(band,globalThis.LZString));
      let copied=false;
      try{await navigator.clipboard.writeText(url.href);copied=true;}catch{}
      shareNotice(url.href,copied);break;
    }
    case 'duplicate-fighter':{const copy=duplicateFighter(selected());band.fighters.splice(band.fighters.findIndex(f=>f.id===selectedId)+1,0,copy);changed();openEditor(copy.id);break;}
    case 'delete-fighter':{const i=band.fighters.findIndex(f=>f.id===selectedId),removed=band.fighters.splice(i,1)[0];$('editor').close();changed();notice(`Usunięto: ${removed.customName}.`,()=>{band.fighters.splice(i,0,removed);changed();});break;}
    case 'apply-template':{const t=catalog.fighters.find(x=>x.name===$('replace-template').value);if(!t)return;const old=structuredClone(selected()),i=band.fighters.findIndex(f=>f.id===selectedId);const replacement=createFighter(t,catalog);replacement.id=old.id;replacement.customName=old.customName;band.fighters[i]=replacement;changed();openEditor(old.id);notice('Zmieniono szablon wojownika.',()=>{const index=band.fighters.findIndex(f=>f.id===old.id);if(index>=0)band.fighters[index]=old;changed();if($('editor').open)openEditor(old.id);});break;}
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
$('fighter-search').addEventListener('input',renderPicker);
$('band-name').addEventListener('input',()=>{band.name=$('band-name').value;save();document.title=`${band.name} — Mordheim`;});
for(const [id,key]of [['treasury-gold','gold'],['treasury-shards','shards'],['treasury-notes','notes']])$(id).addEventListener('input',()=>{band.treasury[key]=key==='notes'?$(id).value:number($(id).value);save();});
$('stored-equipment').addEventListener('input',()=>{band.storedEquipment=$('stored-equipment').value;save();});
$('glossary-list').addEventListener('change',e=>{if(e.target.dataset.description){band.glossary.descriptions[e.target.dataset.description]=e.target.value;save();e.target.nextElementSibling.textContent=e.target.value;}});
$('editor-body').addEventListener('change',event=>{
  const input=event.target,f=selected();if(!f)return;
  if(input.dataset.eqCost!==undefined)f.equipment[number(input.dataset.eqCost)].cost=number(input.value);
  else if(input.dataset.skillCost!==undefined)f.skills[number(input.dataset.skillCost)].cost=number(input.value);
  else if(input.dataset.skillOption!==undefined){const i=number(input.dataset.skillOption);f.skills[i]=Skills.selectGroupedSkillOption(f.skills[i],input.value,catalog);}
  else if(input.name){
    if(input.name.startsWith('stat.'))f.stats[input.name.slice(5)]=input.value;
    else if(input.name.startsWith('max.'))f.maxStats[input.name.slice(4)]=input.value;
    else if(['baseCost','exp'].includes(input.name))f[input.name]=number(input.value);
    else if(input.name==='is_large')f.is_large=input.checked;
    else if(['customName','type','race','injuries','notes'].includes(input.name))f[input.name]=input.value;
    else return;
  }else return;
  changed();$('editor-title').textContent=f.customName;
  if(input.name==='race' || input.name?.startsWith('max.'))updateMaximaEditor(f);
  if(input.dataset.skillOption!==undefined)renderEditorEntries();else renderEditorValidation();
});
$('editor-body').addEventListener('submit',event=>{
  event.preventDefault();const f=selected(),form=event.target,values=new FormData(form);
  if(form.id==='equipment-form'){const item=catalog.equipment.find(e=>e.name===$('equipment-choice').value);if(!item)return;f.equipment.push({...item});}
  if(form.id==='custom-equipment-form')f.equipment.push({name:String(values.get('name')).trim(),cost:number(values.get('cost')),originCategory:values.get('category')});
  if(form.id==='skill-form'){const name=$('skill-choice').value;if(!name)return;f.skills.push(Skills.createAddableSkillEntry(name,templateFor(f,catalog),catalog));}
  if(form.id==='custom-skill-form')f.skills.push(Skills.createSimpleSkillEntry(String(values.get('name')).trim()));
  changed();renderEditorEntries();form.reset();
});
$('create-band-form').addEventListener('submit',async event=>{event.preventDefault();const form=event.target,values=new FormData(form),next=newBand(values.get('type'));next.name=String(values.get('name')).trim() || 'Nowa banda';if(await activate(next)){$('create-band').close();history.replaceState(null,'',location.pathname);notice('Utworzono nową bandę. Poprzednia rozpiska jest w zapisanych bandach.');}});
$('import-file').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>5000000)throw new Error('Plik jest zbyt duży (maks. 5 MB).');const next=normalizeBand(JSON.parse(await file.text()));next.id=uid();if(await activate(next)){if($('library').open)$('library').close();history.replaceState(null,'',location.pathname);notice('Zaimportowano bandę jako osobny zapis.');}}catch(error){notice(`Nie udało się zaimportować pliku. ${error.message}`);}finally{event.target.value='';}});
function syncPrintText(){document.querySelectorAll('.ledger textarea').forEach(input=>{let p=input.nextElementSibling;if(!p?.classList.contains('print-text')){p=document.createElement('p');p.className='print-text';input.after(p);}p.textContent=input.value;});}
window.addEventListener('beforeprint',()=>{document.body.classList.toggle('print-descriptions',$('print-glossary').checked);if($('print-glossary').checked)$('glossary').open=true;syncPrintText();});
async function init(){
  let raw=null,notices=[];
  try{const library=readLibrary(localStorage);notices=library.notices || [];for(const entry of library.bands){try{bands.push(normalizeBand(entry));}catch(error){protectedStorage=true;notices.push(error.message);}}raw=bands.find(b=>b.id===library.activeId) || bands[0];}catch(error){protectedStorage=true;notices.push(error.message);}
  const shared=new URLSearchParams(location.search).get('band');
  if(shared){try{raw=decodeShare(shared,globalThis.LZString);raw.id=uid();notices.push('Otwarto kopię bandy z linku. Zmiany zapisują się lokalnie.');}catch(error){notices.push('Nieprawidłowy link. '+error.message);}}
  const activated=await activate(raw || newBand());
  if(!activated){$('save-status').textContent='Błąd wczytywania';$('roster').innerHTML='<div class="empty-roster"><h2>Nie udało się wczytać zasad.</h2><p>Odśwież stronę, aby spróbować ponownie.</p></div>';}
  else if(shared)history.replaceState(null,'',location.pathname);
  if(notices.length)notice(notices.join('\n'));
}
init();
