// Run with the local server active: node scripts/check-ui-fixes.mjs [path-to-playwright].
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require(process.argv[2] || 'playwright');
const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({viewport:{width:1440,height:1100}});
// Exercise clipboard behavior without changing or reading the user's clipboard.
await context.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async value=>{
  if(window.failClipboard)throw new Error('Test: clipboard unavailable');
  window.copiedBandLink=value;
}}}));
const page=await context.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));
const recruit=async name=>{await page.locator('#add-fighter').click();await page.locator(`button[data-template="${name}"]`).click();};
const close=()=>page.locator('#editor .editor-footer [data-close="editor"]').click();
const output=new URL('../tmp/browser/',import.meta.url);await fs.mkdir(output,{recursive:true});
try{
  await page.goto('http://127.0.0.1:4173');await page.locator('#save-status').filter({hasText:'Zapisano'}).waitFor();
  await recruit('Kapitan Najemników');
  assert.equal(await page.locator('#editor [name="save"]').count(),0);
  assert.equal(await page.locator('.stats th').count(),9);
  assert.equal(await page.locator('.maxima td').count(),9);
  assert.ok(!(await page.locator('#editor').innerText()).includes('Sv'));
  // Padding is inside the editor; a drag starting there must not dismiss it.
  const bounds=await page.locator('#editor').boundingBox();
  await page.mouse.click(bounds.x+10,15);assert.ok(await page.locator('#editor').evaluate(e=>e.open));
  await page.mouse.move(bounds.x+10,15);await page.mouse.down();await page.mouse.move(200,15);await page.mouse.up();assert.ok(await page.locator('#editor').evaluate(e=>e.open));
  // Clicking the blurred background commits the focused field and closes the editor.
  await page.locator('#editor [name="customName"]').fill('Żółw z Północy');await page.mouse.click(200,200);
  assert.ok(!await page.locator('#editor').evaluate(e=>e.open));assert.match(await page.locator('.fighter-name').innerText(),/Żółw z Północy/);
  await page.reload();await page.locator('.fighter-name').filter({hasText:'Żółw z Północy'}).waitFor();
  await page.locator('.row-number').click();
  const custom=page.locator('#custom-skill-form');await custom.locator('xpath=..').locator('summary').click();
  for(let count=1;count<=5;count++){
    await custom.locator('input').fill(`Własna zasada ${count}`);await custom.locator('button').click();
    const expected=count===1?'1 uwaga':count<5?`${count} uwagi`:'5 uwag';
    assert.equal(await page.locator('.row-warning').innerText(),expected);
    assert.match(await page.locator('#validation-title').innerText(),new RegExp(expected));
  }
  await close();await page.locator('#share-button').click();
  assert.match(await page.locator('#notice').innerText(),/Skopiowano link do bandy/);
  const link=await page.locator('#share-link').inputValue();assert.equal(link,await page.evaluate(()=>window.copiedBandLink));assert.ok(new URL(link).searchParams.has('band'));
  await page.locator('#share-link').click();assert.deepEqual(await page.locator('#share-link').evaluate(e=>[e.selectionStart,e.selectionEnd]),[0,link.length]);
  await page.evaluate(()=>window.failClipboard=true);await page.locator('#share-button').click();assert.match(await page.locator('#notice').innerText(),/Nie udało się skopiować/);assert.equal(await page.locator('#share-link').inputValue(),link);
  await page.evaluate(()=>window.failClipboard=false);await page.locator('#share-button').click();
  await page.screenshot({path:fileURLToPath(new URL('ui-fixes.png',output)),fullPage:true});
  const footer=page.locator('footer>span:nth-child(2)');assert.equal(await footer.innerText(),'Każdy wojownik ma swoją historię.');assert.match(await footer.evaluate(e=>getComputedStyle(e).fontFamily),/^Georgia/);
  await footer.screenshot({path:fileURLToPath(new URL('polish-footer.png',output))});
  await page.emulateMedia({media:'print'});assert.equal(await page.locator('.stats th').count(),9);assert.match(await footer.evaluate(e=>getComputedStyle(e).fontFamily),/^Georgia/);await page.emulateMedia({media:'screen'});
  // Compose rosters with exactly one, two, and five errors.
  await page.locator('#new-band').click();await page.locator('#create-band-form button').click();await page.locator('.empty-roster').waitFor();
  await recruit('Ludzki Młodzik');await close();assert.match(await page.locator('#validation-title').innerText(),/· 1 błąd$/);
  await recruit('Wampir Renegat');await close();await recruit('Ogr Najemnik');await close();assert.match(await page.locator('#validation-title').innerText(),/· 2 błędy$/);
  await recruit('Ludzki Młodzik');await close();await recruit('Ludzki Młodzik');await close();assert.match(await page.locator('#validation-title').innerText(),/· 5 błędów$/);
  assert.deepEqual(errors,[]);
  console.log('PASS: nine-stat profiles, backdrop close and pending edits, inside-click/drag protection, visible/copied share links, clipboard fallback, Polish footer font, and correctly inflected warnings/errors.');
}finally{await browser.close();}
