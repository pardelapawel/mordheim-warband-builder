// Run with the local server active: node scripts/check-aftermath-browser.mjs [path-to-playwright].
// Walks one full post-battle sequence at desktop and phone width, then checks undo.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require(process.argv[2] || 'playwright');
const browser=await chromium.launch({headless:true,channel:'chrome'});
const output=new URL('../tmp/browser/',import.meta.url);await fs.mkdir(output,{recursive:true});
try{
  for(const [name,viewport] of [['desktop',{width:1440,height:1100}],['phone',{width:375,height:812}]]){
    const page=await (await browser.newContext({viewport})).newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    const recruit=async template=>{await page.locator('#add-fighter').click();await page.locator(`button[data-template="${template}"]`).click();await page.locator('#editor .editor-footer [data-close="editor"]').click();};
    await page.goto('http://127.0.0.1:4173');await page.locator('#save-status').filter({hasText:'Zapisano'}).waitFor();
    for(const template of ['Kapitan Najemników','Ludzki Najemnik','Pies bojowy'])await recruit(template);
    const roster=async()=>page.evaluate(()=>JSON.parse(localStorage.getItem('mordheim_rosters_v2')));
    const activeBand=async()=>{const lib=await roster();return lib.bands.find(b=>b.id===lib.activeId);};
    const start=await activeBand();
    const dialog=page.locator('#aftermath'),next=()=>dialog.locator('#am-next').click();
    // The dialog commits typed values on change, like a player tabbing out of the field.
    const set=async(locator,value)=>{await locator.fill(value);await locator.dispatchEvent('change');};
    const card=title=>dialog.locator(`[data-am-card][data-title="${title}"]`);

    // Closing with entered results asks first.
    await page.locator('#after-battle').click();
    await dialog.locator('tr[data-name="Ludzki Najemnik"] input[data-am-ooa]').check();
    page.once('dialog',d=>d.dismiss());await dialog.locator('#am-close').click();
    assert.ok(await dialog.evaluate(d=>d.open),'cancelled close keeps the dialog open');
    page.once('dialog',d=>d.accept());await dialog.locator('#am-close').click();
    assert.ok(!await dialog.evaluate(d=>d.open));

    // Full sequence.
    await page.locator('#after-battle').click();
    await dialog.locator('tr[data-name="Ludzki Najemnik"] input[data-am-ooa]').check();
    await next();
    await set(card('Ludzki Najemnik').locator('[data-am-roll$="/1"]'),'1');
    await set(card('Ludzki Najemnik').locator('[data-am-roll$="/2"]'),'3');
    assert.match(await card('Ludzki Najemnik').innerText(),/T −1/);
    // A typed die stays editable: change it, then change it back.
    await set(card('Ludzki Najemnik').locator('[data-am-roll$="/1"]'),'4');
    assert.doesNotMatch(await card('Ludzki Najemnik').innerText(),/T −1/);
    await set(card('Ludzki Najemnik').locator('[data-am-roll$="/1"]'),'1');
    await set(card('Ludzki Najemnik').locator('[data-am-roll$="/2"]'),'3');
    assert.match(await card('Ludzki Najemnik').innerText(),/T −1/);
    await page.screenshot({path:fileURLToPath(new URL(`aftermath-injuries-${name}.png`,output))});
    await next();
    await set(card('Kapitan Najemników').locator('[data-am-input$="/kills"]'),'1');
    await next();
    await set(dialog.locator('[data-am-dice="0"]'),'3');
    await set(dialog.locator('[data-am-dice="1"]'),'3');
    await set(dialog.locator('[data-am-roll="find:2x3/g0"]'),'4');
    await set(dialog.locator('[data-am-roll="find:2x3/g1"]'),'2');
    await page.screenshot({path:fileURLToPath(new URL(`aftermath-exploration-${name}.png`,output))});
    await next();await next();
    assert.match(await dialog.innerText(),/Kapitan Najemników: \+2 PD/);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'no horizontal scroll');
    await page.screenshot({path:fileURLToPath(new URL(`aftermath-summary-${name}.png`,output))});
    await dialog.locator('#am-apply').click();
    const after=await activeBand(),merc=after.fighters.find(f=>f.type==='Ludzki Najemnik'),captain=after.fighters.find(f=>f.type==='Kapitan Najemników');
    const startMerc=start.fighters.find(f=>f.type==='Ludzki Najemnik');
    assert.equal(Number(merc.stats.t),Number(startMerc.stats.t)-1);
    assert.equal(captain.exp,start.fighters.find(f=>f.type==='Kapitan Najemników').exp+2);
    assert.deepEqual([after.treasury.shards,after.treasury.gold,after.treasury.armourFragments],[2,4,2]);
    await page.locator('#notice .notice-undo').click();
    const undone=await activeBand();
    assert.deepEqual(undone.fighters,start.fighters);assert.deepEqual(undone.treasury,start.treasury);
    assert.deepEqual(errors,[]);
  }
  console.log('PASS: post-battle close confirm, injuries, experience, exploration, apply and undo at desktop and phone width');
}finally{await browser.close();}
