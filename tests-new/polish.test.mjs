import {test} from 'node:test';
import assert from 'node:assert/strict';
import {warningCount,errorCount} from '../src/polish.mjs';

test('Polish warnings use the correct form for single, few, and many counts',()=>{
  const cases=new Map([[0,'uwag'],[1,'uwaga'],[2,'uwagi'],[4,'uwagi'],[5,'uwag'],[11,'uwag'],[12,'uwag'],[14,'uwag'],[21,'uwag'],[22,'uwagi'],[25,'uwag'],[101,'uwag'],[102,'uwagi'],[112,'uwag']]);
  for(const [count,word]of cases)assert.equal(warningCount(count),`${count} ${word}`);
});

test('Polish errors use the correct form including teen-number exceptions',()=>{
  for(const [count,word]of [[1,'błąd'],[2,'błędy'],[4,'błędy'],[5,'błędów'],[12,'błędów'],[22,'błędy'],[24,'błędy'],[25,'błędów'],[112,'błędów']])assert.equal(errorCount(count),`${count} ${word}`);
});
