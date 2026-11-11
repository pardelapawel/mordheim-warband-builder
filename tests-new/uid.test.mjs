import {test} from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {uid,newBand,createFighter,duplicateFighter,normalizeBand} from '../src/model.mjs';

function withCrypto(crypto,run){
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto');
  Object.defineProperty(globalThis,'crypto',{configurable:true,value:crypto});
  try{run();}finally{
    if(descriptor)Object.defineProperty(globalThis,'crypto',descriptor);
    else delete globalThis.crypto;
  }
}
test('uses the native UUID generator when available',()=>{
  withCrypto({randomUUID:()=> 'native-uuid'},()=>assert.equal(uid(),'native-uuid'));
});
test('HTTP crypto without randomUUID supports band creation, recruitment, duplication and import',()=>{
  withCrypto({getRandomValues:bytes=>webcrypto.getRandomValues(bytes)},()=>{
    const band=newBand();
    const fighter=createFighter({name:'Test fighter',type:'Zwierzak',stats:{}},{skills:[]});
    band.fighters=[fighter,duplicateFighter(fighter)];
    const imported=normalizeBand(band);
    const ids=[imported.id,...imported.fighters.map(f=>f.id),...Array.from({length:1000},uid)];
    assert.equal(new Set(ids).size,ids.length);
    for(const id of ids)assert.match(id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
test('local record IDs remain unique when crypto is unavailable',()=>{
  withCrypto(undefined,()=>{
    const ids=Array.from({length:1000},uid);
    assert.equal(new Set(ids).size,ids.length);
    assert.ok(newBand().id);
  });
});
