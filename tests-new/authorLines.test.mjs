import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {authorLines} from '../src/authorLines.mjs';

test('author lines are the eight approved sentences',()=>{
  assert.equal(authorLines.length,8);
  assert.ok(authorLines.includes('Kopista: Paweł z Wrześni z Berlina. Zapłata: stalowy bicz i dwie korony.'));
  for(const line of authorLines){assert.match(line,/[.!?]$/);assert.match(line,/Wrześni/);}
});

test('footer shows the author line instead of the local-save note',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const footer=html.match(/<footer>[\s\S]*?<\/footer>/)[0];
  assert.ok(!footer.includes('Zapis lokalny'));
  assert.match(footer,/<span id="footer-author">/);
});

test('printed pages name the site',()=>{
  const css=fs.readFileSync(new URL('../style.css',import.meta.url),'utf8');
  assert.equal((css.match(/@bottom-center\s*\{[^}]*content:\s*"dlugobrody\.eu"/g) || []).length,2,'default and cards pages');
  assert.match(css,/\.running-head::before\s*\{[^}]*content:\s*"dlugobrody\.eu"/);
});
