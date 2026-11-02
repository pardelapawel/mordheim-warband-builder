// Run with the local server active: node scripts/check-rules-corrections.mjs [path-to-playwright].
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require(process.argv[2] || 'playwright');
const browser=await chromium.launch({headless:true,channel:'chrome'});
const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
const recruit=async name=>{await page.locator('#add-fighter').click();await page.locator(`[data-template="${name}"]`).click();};
const close=()=>page.locator('#editor .editor-footer [data-close="editor"]').click();
const addEquipment=async name=>{await page.locator('#equipment-choice').selectOption(name);await page.locator('#equipment-form button').click();};
const expand=async name=>{const details=page.locator('#editor details').filter({has:page.locator('summary',{hasText:name})}).first();if(!await details.evaluate(e=>e.open))await details.locator('summary').click();};
const createBand=async type=>{await page.locator('#new-band').click();await page.locator('#create-band-form [name="type"]').selectOption(type);await page.locator('#create-band-form button').click();await page.locator('.empty-roster').waitFor();};
const output=new URL('../tmp/browser/',import.meta.url);await fs.mkdir(output,{recursive:true});
try {
  await page.goto('http://127.0.0.1:4173');await page.locator('#save-status').filter({hasText:'Zapisano'}).waitFor();
  await recruit('Kapitan Najemników');assert.ok(!(await page.locator('.fighter-row .skills-cell').innerText()).includes('Przysięga krwi'));
  assert.equal(await page.locator('#skill-choice option[value="Przysięga krwi"]').count(),1);assert.equal(await page.locator('#skill-choice option[value="Berserker"]').count(),0);
  await expand('Rozwój przy werbunku');await page.locator('[data-recruitment="extraWound"]').check();assert.equal(await page.locator('#total-cost').innerText(),'75 zk');assert.equal(await page.locator('.stats tbody tr').first().locator('td').nth(5).innerText(),'2');assert.equal(await page.locator('.experience-total strong').innerText(),'24');
  await addEquipment('Ciężka zbroja');assert.equal(await page.locator('#total-cost').innerText(),'100 zk');
  assert.match(await page.locator('#equipment-choice option[value="Miecz z gromrilu"]').innerText(),/32 zk/);
  await close();await page.locator('#band-phase').selectOption('campaign');await page.locator('.row-number').click();assert.ok(await page.locator('[name="recruitmentComplete"]').isChecked());
  assert.match(await page.locator('#equipment-choice option[value="Ciężka zbroja"]').innerText(),/50 zk/);await addEquipment('Ciężka zbroja');assert.equal(await page.locator('#total-cost').innerText(),'150 zk');
  await expand('Znaleziony artefakt');await page.locator('#artifact-form select').selectOption('Runiczna zbroja');await page.locator('#artifact-form button').click();assert.match(await page.locator('.fighter-row').innerText(),/Runiczna zbroja/);assert.equal(await page.locator('#total-cost').innerText(),'150 zk');await close();
  await page.reload();await page.locator('.fighter-row').waitFor();assert.equal(await page.locator('#band-phase').inputValue(),'campaign');assert.equal(await page.locator('#total-cost').innerText(),'150 zk');
  await recruit('Ludzki Najemnik');await expand('Rozwój przy werbunku');await page.locator('[data-recruitment="mercenaryAdvance"]').selectOption('bs');assert.equal(await page.locator('.fighter-row').last().locator('.stats tbody tr').first().locator('td').nth(2).innerText(),'4');await close();
  await recruit('Kapłan Sigmara');await page.locator('[data-skill-option]').selectOption('Młot Sigmara');assert.match(await page.locator('.fighter-row').last().innerText(),/trudność 7/);await page.getByRole('spinbutton',{name:'Trudność: Młot Sigmara',exact:true}).fill('6');await page.getByRole('spinbutton',{name:'Trudność: Młot Sigmara',exact:true}).press('Tab');await close();assert.match(await page.locator('.fighter-row').last().innerText(),/trudność 6/);
  await page.locator('#glossary').evaluate(e=>e.open=true);assert.ok((await page.locator('.spell-difficulty').allTextContents()).some(t=>t.includes('6')));
  await page.screenshot({path:fileURLToPath(new URL('corrected-rules-desktop.png',output)),fullPage:true});
  await recruit('Ogr Najemnik');assert.match(await page.locator('#equipment-choice option[value="Dwuręczny młot (ogrzy)"]').innerText(),/20 zk/);await addEquipment('Dwuręczny młot (ogrzy)');await addEquipment('Młot');assert.ok(!(await page.locator('#editor-validation').innerText()).includes('Ten wojownik korzysta'));
  await addEquipment('Czarny lotos');assert.match(await page.locator('#editor-validation').innerText(),/Innego ekwipunku/);await close();
  await createBand('sludzy_ciemnosci');await recruit('Wampir');assert.equal(await page.locator('#skill-choice option[value="Walka ogonem"]').count(),0);assert.equal(await page.locator('#skill-choice option[value="Poważne groźby"]').count(),1);assert.match(await page.locator('.fighter-row').innerText(),/Oporny na psychologię \(Wampir\)/);await close();
  await recruit('Zabójca Eshin');for(const name of ['Walka ogonem','Ścianobiegacz','Infiltracja'])assert.equal(await page.locator(`#skill-choice option[value="${name}"]`).count(),1);await close();
  await recruit('Mutant');assert.equal(await page.locator('#skill-choice option[value="Macka"]').count(),1);await page.locator('#skill-choice').selectOption('Macka');await page.locator('#skill-form button').click();await expand('Rozwój przy werbunku');await page.locator('[name="recruitmentComplete"]').check();assert.equal(await page.locator('#skill-choice option[value="Kolce"]').count(),0);await close();
  await page.setViewportSize({width:390,height:844});const width=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth}));assert.ok(width.page<=width.viewport+1,JSON.stringify(width));await page.locator('.row-number').last().click();await page.screenshot({path:fileURLToPath(new URL('corrected-rules-mobile.png',output))});await close();
  // Old saves keep player progress, gain canonical descriptions and known data repairs.
  const legacy=await page.evaluate(()=>{const l=JSON.parse(localStorage.getItem('mordheim_rosters_v2'));const b=l.bands[0];b.rulesRevision=0;b.fighters[0].skills.push({label:'Przysięga krwi',kind:'simple',cost:0});return b;});
  await page.locator('#import-file').setInputFiles({name:'stara-banda.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legacy))});await page.locator('#notice').filter({hasText:'Zaimportowano'}).waitFor();assert.match(await page.locator('.fighter-row').first().innerText(),/Przysięga krwi/);assert.equal(await page.locator('#total-cost').innerText(),'388 zk');
  assert.deepEqual(errors,[]);
  console.log('PASS: corrected starting rules and eligibility, recruitment advances, campaign pricing, historical prices, material variants, artefacts, casting difficulty, Ogre restrictions, mutation recruitment lock, mobile layout, and old-save preservation.');
} finally {await browser.close();}
