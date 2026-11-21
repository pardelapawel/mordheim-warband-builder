import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {authorLines} from '../src/authorLines.mjs';

test('author lines are the four approved sentences',()=>{
  assert.deepEqual(authorLines,[
    'Spisane przez Pawła z Wrześni z Berlina. Pisał przy kiepskiej świecy.',
    'Ręką Pawła z Wrześni z Berlina. Bez gwarancji.',
    'Paweł z Wrześni z Berlina przepisał. Błędy są dziełem Chaosu.',
    'Księgę złożył Paweł z Wrześni z Berlina. Skargi przyjmuje szczur w piwnicy.'
  ]);
});

test('footer author line links to the feedback form instead of the local-save note',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const footer=html.match(/<footer>[\s\S]*?<\/footer>/)[0];
  assert.ok(!footer.includes('Zapis lokalny'));
  assert.match(footer,/<a id="footer-author" href="https:\/\/tally\.so\/r\/ArBL1D" target="_blank" rel="noopener noreferrer"><\/a>/);
});

test('author line is picked on load and does not cycle on click',()=>{
  const app=fs.readFileSync(new URL('../src/app.mjs',import.meta.url),'utf8');
  assert.match(app,/\$\('footer-author'\)\.textContent=/);
  assert.ok(!/cycleOnClick\(\$\('footer-author'\)/.test(app));
});

test('printed pages name the site',()=>{
  const css=fs.readFileSync(new URL('../style.css',import.meta.url),'utf8');
  assert.equal((css.match(/@bottom-center\s*\{[^}]*content:\s*"dlugobrody\.eu"/g) || []).length,2,'default and cards pages');
  assert.match(css,/\.running-head::before\s*\{[^}]*content:\s*"dlugobrody\.eu"/);
});

test('footer author link looks like plain footer text on paper too (rule outside @media screen)',()=>{
  const css=fs.readFileSync(new URL('../style.css',import.meta.url),'utf8');
  assert.match(css,/\nfooter a \{[^}]*color:inherit[^}]*text-decoration:none/);
});
