// Optional end-to-end checks: npm start, then node scripts/check-browser.mjs [path-to-playwright].
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require(process.argv[2] || 'playwright');
const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({viewport:{width:1440,height:1100},acceptDownloads:true});
const page=await context.newPage();
const errors=[];page.on('pageerror',error=>errors.push(error.message));
const output=new URL('../tmp/browser/',import.meta.url);await fs.mkdir(output,{recursive:true});
const closeEditor=()=>page.locator('#editor .editor-footer [data-close="editor"]').click();
const recruit=async name=>{await page.locator('#add-fighter').click();await page.locator(`button[data-template="${name}"]`).click();await page.locator('#editor[open]').waitFor();};
const setField=async(name,value)=>{const field=page.locator(`#editor-body [name="${name}"]`);await field.fill(value);await field.press('Tab');};
try{
  await page.goto('http://127.0.0.1:4173');
  await page.locator('#save-status').filter({hasText:'Zapisano'}).waitFor();
  assert.equal(await page.locator('.fighter-row').count(),0);
  await recruit('Kapitan Najemników');
  await setField('customName','Konrad „Popiół”');
  await page.locator('#equipment-choice').selectOption('Miecz');await page.locator('#equipment-form button').click();
  await setField('injuries','Blizna nad lewym okiem');await setField('notes','Dowódca wyprawy');
  await closeEditor();
  assert.match(await page.locator('.fighter-row').innerText(),/Konrad „Popiół”/);
  assert.equal(await page.locator('#total-cost').innerText(),'68 zk');
  assert.equal(await page.locator('.experience-grid .exp-box').count(),90);
  await page.locator('.exp-box[data-xp="24"]').click();assert.equal(await page.locator('#total-rating').innerText(),'29');
  await page.reload();await page.locator('.fighter-row').waitFor();assert.match(await page.locator('.fighter-row').innerText(),/Blizna nad lewym okiem/);assert.equal(await page.locator('.experience-total strong').innerText(),'24');
  await page.locator('.row-actions button').click();await page.locator('#duplicate-fighter').click();await closeEditor();assert.equal(await page.locator('.fighter-row').count(),2);
  await page.locator('.row-actions button').last().click();await page.locator('#delete-fighter').click();assert.equal(await page.locator('.fighter-row').count(),1);await page.locator('#notice .notice-undo').click();assert.equal(await page.locator('.fighter-row').count(),2);
  await recruit('Kapłan Sigmara');const spellSelect=page.locator('[data-skill-option]');await spellSelect.selectOption('Młot Sigmara');await closeEditor();
  assert.match(await page.locator('.fighter-row').last().innerText(),/Młot Sigmara/);
  await page.locator('#glossary summary').click();const desc=page.locator('[data-description="Młot Sigmara"]');await desc.fill('Własny opis modlitwy.');await desc.press('Tab');
  await page.locator('#band-name').fill('Łowcy z południa');await page.locator('#band-name').press('Tab');
  await page.locator('#treasury-gold').fill('27');await page.locator('#treasury-notes').fill('Kamień znaleziony przy bramie.');await page.locator('#stored-equipment').fill('Zapasowy łuk\nPłaszcz podróżny');
  await page.screenshot({path:new URL('desktop.png',output).pathname.replace(/^\/([A-Z]:)/i,'$1'),fullPage:true});
  await page.locator('.export-menu summary').click();
  const downloaded=page.waitForEvent('download');await page.locator('#export-json').click();const jsonFile=await downloaded;const exportPath=await jsonFile.path();const saved=JSON.parse(await fs.readFile(exportPath,'utf8'));assert.equal(saved.fighters.length,3);assert.equal(saved.glossary.descriptions['Młot Sigmara'],'Własny opis modlitwy.');
  const downloadedText=page.waitForEvent('download');await page.locator('#export-text').click();const text=await downloadedText;assert.match(await fs.readFile(await text.path(),'utf8'),/WS: 4/);assert.equal(await page.locator('.fighter-row').count(),3);await page.locator('.export-menu summary').click();
  await page.locator('#import-file').setInputFiles({name:'uszkodzony.json',mimeType:'application/json',buffer:Buffer.from('{broken')});await page.locator('#notice').filter({hasText:'Nie udało się zaimportować'}).waitFor();assert.equal(await page.locator('.fighter-row').count(),3);
  await page.locator('#import-file').setInputFiles({name:'angielski.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...saved,ruleSetId:'Mordheimer'}))});await page.locator('#notice').filter({hasText:'nieobsługiwanego'}).waitFor();assert.equal(await page.locator('.fighter-row').count(),3);
  await page.locator('#new-band').click();await page.locator('#create-band-form [name="name"]').fill('Łowcy z południa');await page.locator('#create-band-form [name="type"]').selectOption('sludzy_ciemnosci');await page.locator('#create-band-form button').click();await page.locator('#band-type-label').filter({hasText:'Słudzy'}).waitFor();
  assert.equal(await page.locator('.fighter-row').count(),0);
  await recruit('Wampir');await closeEditor();assert.match(await page.locator('.fighter-row').innerText(),/Wampir/);
  await recruit('Zębacz jaskiniowy');await closeEditor();assert.match(await page.locator('.fighter-row').last().innerText(),/2k6/);
  await page.locator('#library-button').click();assert.equal(await page.locator('.library-item').count(),2);await page.locator('.library-item').filter({hasText:'Awanturnicy'}).locator('[data-load-band]').click();await page.locator('#band-type-label').filter({hasText:'Awanturnicy'}).waitFor();assert.equal(await page.locator('.fighter-row').count(),3);
  await page.locator('#import-file').setInputFiles(exportPath);await page.locator('#notice').filter({hasText:'Zaimportowano'}).waitFor();assert.equal(await page.locator('#library-count').innerText(),'3');assert.equal(await page.locator('.fighter-row').count(),3);
  // Opening a shared snapshot creates another independent save.
  const shared=await page.evaluate(()=>{const lib=JSON.parse(localStorage.getItem('mordheim_rosters_v2'));return LZString.compressToBase64(JSON.stringify(lib.bands.find(b=>b.id===lib.activeId))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');});
  await page.goto('http://127.0.0.1:4173?band='+shared);await page.locator('#notice').filter({hasText:'Otwarto kopię'}).waitFor();assert.equal(await page.locator('.fighter-row').count(),3);assert.equal(await page.locator('#library-count').innerText(),'4');
  await page.locator('.row-number').first().click();await setField('notes','Zmiana po otwarciu linku');await closeEditor();await page.reload();await page.locator('.fighter-row').first().waitFor();assert.match(await page.locator('.fighter-row').first().innerText(),/Zmiana po otwarciu linku/);assert.equal(await page.locator('#library-count').innerText(),'4');
  // Exercise a multi-page roster and long text before printing.
  for(const name of ['Ludzki Najemnik','Krasnoludzki Pogromca','Ogr Najemnik','Pies bojowy']){await recruit(name);await closeEditor();}
  await page.locator('.row-actions button').first().click();await setField('customName','Konrad o wyjątkowo długim imieniu z południowej dzielnicy');await setField('notes','Dłuższe notatki o historii wyprawy i spotkaniach w ruinach. '.repeat(5));await closeEditor();
  await page.locator('#glossary').evaluate(node=>node.open=true);await page.locator('#print-glossary').check();
  await page.emulateMedia({media:'print'});await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
  await page.screenshot({path:new URL('print.png',output).pathname.replace(/^\/([A-Z]:)/i,'$1'),fullPage:true});
  await page.pdf({path:new URL('roster-print.pdf',output).pathname.replace(/^\/([A-Z]:)/i,'$1'),preferCSSPageSize:true,printBackground:true});
  await page.emulateMedia({media:'screen'});await page.setViewportSize({width:390,height:844});await page.screenshot({path:new URL('mobile.png',output).pathname.replace(/^\/([A-Z]:)/i,'$1'),fullPage:true});
  const widths=await page.evaluate(()=>({viewport:innerWidth,page:document.documentElement.scrollWidth}));assert.ok(widths.page<=widths.viewport+1,JSON.stringify(widths));
  await page.locator('.roster-scroll').evaluate(node=>node.scrollLeft=0);await page.locator('.row-number').first().click();const editorBounds=await page.locator('#editor').boundingBox();assert.ok(editorBounds.y<1);await page.screenshot({path:new URL('mobile-editor.png',output).pathname.replace(/^\/([A-Z]:)/i,'$1'),fullPage:false});await closeEditor();
  assert.deepEqual(errors,[]);
  console.log('PASS: recruitment, editing, equipment, spells, XP, reload, duplication, deletion/undo, glossary, exports, invalid imports, band switching, import, shared links, responsive layout, and print generation.');
  console.log('Screenshots and print sample: tmp/browser/');
}finally{await browser.close();}
