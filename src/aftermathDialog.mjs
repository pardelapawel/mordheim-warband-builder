// "Po bitwie" dialog: renders the post-battle sequence from src/aftermath.mjs state.
import * as A from './aftermath.mjs';

const STEPS = [['setup', 'Bitwa'], ['injuries', 'Obrażenia'], ['experience', 'Doświadczenie'], ['exploration', 'Eksploracja'], ['sale', 'Spaczenie'], ['summary', 'Podsumowanie']];
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
let view = null, wired = false;
const $ = id => document.getElementById(id);

export function openAftermath({band, catalog, onApply}) {
  view = {band, catalog, onApply, state: A.newAftermathState(band), step: 0, dirty: false};
  if (!wired) wire();
  render();
  $('aftermath').showModal();
}

function close() {
  if (view?.dirty && !confirm('Porzucić wyniki bitwy?')) return;
  view = null;
  $('aftermath').close();
}

// Rolls N dice whose total lands in min…sides (2d6: min 2, sides 12; 3k6: min 3, sides 18).
function throwDice(min, sides) {
  const count = Math.max(1, min), faces = Math.round(sides / count);
  let total = 0;
  for (let i = 0; i < count; i++) total += A.rollDie(faces);
  return total;
}

function dieControl(fullKey, need, valid) {
  const min = need.min || 1, value = view.state.rolls[fullKey] ?? '', invalid = !valid && value !== '';
  return `<div class="am-die${invalid ? ' am-invalid' : ''}"><label>${esc(need.label)} <input type="number" inputmode="numeric" min="${min}" max="${need.sides}" value="${esc(value)}" data-am-roll="${esc(fullKey)}" ${invalid ? 'aria-invalid="true"' : ''}></label>${invalid ? `<span class="am-warning">Wynik spoza zakresu ${min}–${need.sides}.</span>` : ''}<button type="button" class="quiet" data-am-throw="${esc(fullKey)}" data-min="${min}" data-sides="${need.sides}">Rzuć</button></div>`;
}

function choiceControl(source, choose) {
  const fullKey = `${source}/${choose.key}`;
  if (choose.key === 'heroes') {
    const split = view.state.choices[fullKey] || {};
    return `<fieldset class="am-split"><legend>${esc(choose.label)}</legend>${choose.options.map(o => `<label>${esc(o.label)} <input type="number" min="0" max="${choose.total}" value="${esc(split[o.value] ?? '')}" data-am-split="${esc(fullKey)}" data-hero="${esc(o.value)}"></label>`).join('') || '<p class="editor-hint">Żaden heros nie może teraz otrzymać PD bez rozwoju — wybierz inną nagrodę.</p>'}</fieldset>`;
  }
  const current = view.state.choices[fullKey];
  return `<label class="am-choice">${esc(choose.label)} <select data-am-choice="${esc(fullKey)}"><option value="">Wybierz…</option>${choose.options.map(o => `<option value="${esc(o.value)}" ${String(current) === String(o.value) ? 'selected' : ''}${o.disabled ? ' disabled' : ''}>${esc(o.label)}</option>`).join('')}</select></label>`;
}

function actionList(actions) {
  if (!actions.length) return '';
  return `<ul class="am-actions">${actions.map(a => `<li class="${a.removed ? 'removed' : ''}"><span>${esc(a.label)}</span><button type="button" class="icon-button" data-am-toggle="${esc(a.id)}" aria-label="${a.removed ? 'Przywróć' : 'Pomiń'}: ${esc(a.label)}" title="${a.removed ? 'Przywróć' : 'Pomiń'}">${a.removed ? '↺' : '×'}</button></li>`).join('')}</ul>`;
}

function cardMarkup(card, extra = '') {
  const {result} = card;
  return `<section class="am-card" data-am-card data-title="${esc(card.title)}"><h3>${esc(card.title)}</h3>${extra}${result.text.map(line => `<p>${esc(line)}</p>`).join('')}${result.rolled.map(need => dieControl(`${card.source}/${need.key}`, need, true)).join('')}${result.chosen.map(choose => choiceControl(card.source, choose)).join('')}${result.needs.map(need => dieControl(`${card.source}/${need.key}`, need, false)).join('')}${result.choose ? choiceControl(card.source, result.choose) : ''}${actionList(card.actions)}</section>`;
}

const numberInput = (key, label, value) => `<label class="am-number">${esc(label)} <input type="number" inputmode="numeric" value="${esc(value ?? '')}" data-am-input="${esc(key)}"></label>`;

function stepSetup(built) {
  const {band, state} = view, {setup} = state;
  return `<table class="am-setup"><thead><tr><th>Wojownik</th><th>Brał udział</th><th>Wykluczony (OOA)</th></tr></thead><tbody>${band.fighters.map(f => `<tr data-name="${esc(f.customName)}"><td>${esc(f.customName)}</td><td><input type="checkbox" data-am-took="${esc(f.id)}" ${setup.took[f.id] !== false ? 'checked' : ''} aria-label="Brał udział: ${esc(f.customName)}"></td><td><input type="checkbox" data-am-ooa="${esc(f.id)}" ${setup.ooa[f.id] ? 'checked' : ''} ${setup.took[f.id] === false ? 'disabled' : ''} aria-label="Wykluczony z akcji: ${esc(f.customName)}"></td></tr>`).join('')}</tbody></table>
  <label class="am-check"><input type="checkbox" data-am-won ${setup.won ? 'checked' : ''}> Wygraliśmy</label>
  <label class="am-number">Siła bandy przeciwnika <input type="number" inputmode="numeric" min="0" value="${esc(setup.opponentRating ?? '')}" data-am-opponent></label>
  <p class="editor-hint">Siła bandy w bitwie: ${built.rating}. Premia Słabeuszy: ${built.underdog ? `+${built.underdog} PD dla każdego herosa` : 'brak'}.</p>`;
}

function stepInjuries(built) {
  if (!built.injuries.length) return '<p class="editor-hint">Nikt nie został wykluczony z akcji.</p>';
  return built.injuries.map(card => cardMarkup(card, `<p class="editor-hint">${card.pet ? 'Zwierzak: k6, 1–2 ginie.' : 'Tabela poważnych obrażeń.'}</p>`)).join('');
}

function stepExperience(built) {
  if (!built.experience.length) return '<p class="editor-hint">Żaden heros nie zdobywa doświadczenia.</p>';
  return built.experience.map(card => {
    if (card.type !== 'exp') return cardMarkup(card);
    const source = card.source, inputs = view.state.inputs;
    return cardMarkup(card, `<div class="am-inputs">${numberInput(`${source}/kills`, 'Wykluczeni wrogowie', inputs[`${source}/kills`])}${numberInput(`${source}/warpstone`, 'Spaczenie z planszy', inputs[`${source}/warpstone`])}${numberInput(`${source}/scenario`, 'Inne PD ze scenariusza', inputs[`${source}/scenario`])}</div>`);
  }).join('');
}

function stepExploration(built) {
  const {exploration} = built, {state} = view;
  const dice = Array.from({length: exploration.count}, (_, i) => `<label class="am-die-face${state.dice[i] != null && !exploration.dice[i] ? ' am-invalid' : ''}">Kość ${i + 1} <input type="number" inputmode="numeric" min="1" max="6" value="${esc(state.dice[i] ?? '')}" data-am-dice="${i}"></label>`).join('');
  return `<p class="editor-hint">Kości: ${exploration.count} (herosi bez OOA, +1 za zwycięstwo${exploration.eyeBonus ? ', +1 Wszystkowidzące oko' : ''}; najwyżej 6). Przerzuty i modyfikatory ±1 wpisz, poprawiając wynik kości.</p>
  ${numberInput('exploration/adjust', 'Dodatkowe kości (+/−)', state.inputs['exploration/adjust'])}
  <div class="am-dice">${dice}${exploration.count ? '<button type="button" class="quiet" data-am-throw-all>Rzuć wszystkie</button>' : ''}</div>
  ${exploration.sum ? `<p>Suma oczek: <strong>${exploration.sum}</strong> → Spaczenie: <strong>${exploration.warpstone}</strong></p>` : ''}
  ${exploration.cards.map(card => cardMarkup(card, `<p class="editor-hint">${card.group.size > 1 ? `${card.group.size} × ${card.group.value}` : `Pojedyncze ${card.group.value}`}</p>`)).join('')}`;
}

function stepSale(built) {
  const {sale} = built, prices = A.warpstonePriceList(sale.bandSize, sale.available, view.catalog);
  const perShard = (total, count) => (Math.round(total / count * 10) / 10).toLocaleString('pl-PL');
  return `<p>Spaczenie do sprzedania: <strong>${sale.available}</strong> szt. Modele w bandzie: <strong>${sale.bandSize}</strong>.</p>
  <label class="am-number">Sprzedaj <input type="number" inputmode="numeric" min="0" max="${sale.available}" value="${esc(view.state.inputs['sale/sold'] ?? '')}" data-am-input="sale/sold"> szt.</label>
  ${prices.length ? `<p class="am-prices">Cennik: ${prices.map((total, i) => `${i + 1} szt. = ${total} zk (${perShard(total, i + 1)} zk/szt.)`).join(' · ')}</p>` : ''}
  <p>Dochód: <strong>${sale.price} zk</strong>${sale.sold ? ` (${perShard(sale.price, sale.sold)} zk za 1 szt.)` : ''}. Niesprzedane Spaczenie zostają w skarbcu.</p>`;
}

function stepSummary(built) {
  const groups = new Map();
  for (const action of built.actions) {
    const name = view.band.fighters.find(f => f.id === action.fighterId)?.customName || 'Banda';
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(action);
  }
  const open = [...built.injuries, ...built.experience, ...built.exploration.cards].filter(card => card.result.needs.length || card.result.choose).length
    + (built.exploration.count && !built.exploration.sum ? 1 : 0);
  return `${open ? `<p class="am-warning">Bez wyniku: ${open}. Te pozycje nie zostaną zastosowane.</p>` : ''}
  ${built.leaderDied ? `<p class="am-warning">${esc(view.catalog.aftermath.leaderDeath)}</p>` : ''}
  ${groups.size ? [...groups].map(([name, actions]) => `<section class="am-card"><h3>${esc(name)}</h3>${actionList(actions)}</section>`).join('') : '<p class="editor-hint">Brak zmian do zastosowania.</p>'}`;
}

// Steps whose cards still wait for a roll or a choice.
function openSteps(built) {
  const open = cards => cards.some(card => card.result.needs.length || card.result.choose);
  return new Set([
    open(built.injuries) && 'injuries',
    open(built.experience) && 'experience',
    (open(built.exploration.cards) || (built.exploration.count && !built.exploration.sum)) && 'exploration',
  ].filter(Boolean));
}

function render() {
  const built = A.buildAftermath(view.band, view.catalog, view.state);
  view.built = built;
  const [key, title] = STEPS[view.step];
  const body = {setup: stepSetup, injuries: stepInjuries, experience: stepExperience, exploration: stepExploration, sale: stepSale, summary: stepSummary}[key](built);
  const focused = document.activeElement?.closest?.('#aftermath') ? document.activeElement : null;
  const focusKey = focused && ['data-am-roll', 'data-am-input', 'data-am-dice', 'data-am-split', 'data-am-opponent', 'data-am-throw', 'data-am-toggle', 'data-am-choice', 'data-am-took', 'data-am-ooa'].map(attr => focused.hasAttribute(attr) ? `[${attr}="${CSS.escape(focused.getAttribute(attr))}"]${attr === 'data-am-split' ? `[data-hero="${CSS.escape(focused.dataset.hero)}"]` : ''}` : null).find(Boolean);
  $('aftermath-title').textContent = title;
  const open = openSteps(built), earlier = STEPS.slice(0, view.step).filter(([step]) => open.has(step)).map(([, name]) => name);
  $('aftermath-steps').innerHTML = STEPS.map(([step, name], i) => `<li class="${i === view.step ? 'current' : i < view.step ? 'done' : ''}"><button type="button" data-am-step="${i}" ${i === view.step ? 'aria-current="step"' : ''}>${esc(name)}${open.has(step) && i !== view.step ? '<span class="am-open" title="Czeka na rzut lub wybór"> !</span>' : ''}</button></li>`).join('');
  $('aftermath-body').innerHTML = (earlier.length && STEPS[view.step][0] !== 'summary' ? `<p class="am-warning">Bez wyniku w krokach: ${esc(earlier.join(', '))}. Wartości na tej stronie mogą się jeszcze zmienić.</p>` : '') + body;
  $('am-back').disabled = view.step === 0;
  $('am-next').hidden = view.step === STEPS.length - 1;
  $('am-apply').hidden = view.step !== STEPS.length - 1;
  if (focusKey) $('aftermath-body').querySelector(focusKey)?.focus();
}

const setValue = (record, key, raw) => {
  if (raw === '' || raw === null || raw === undefined) delete record[key];
  else record[key] = raw;
};

function changed(key) {
  A.dropStale(view.state, key);
  A.clearRemovedFor(view.state, key);
  view.dirty = true;
  // A change fires before Tab moves focus; render after it lands so focus follows the player.
  setTimeout(() => { if (view) render(); });
}

function onInput(event) {
  if (!view) return;
  const el = event.target, {state} = view;
  if (el.dataset.amRoll !== undefined) { setValue(state.rolls, el.dataset.amRoll, el.value === '' ? '' : Number(el.value)); changed(el.dataset.amRoll); }
  else if (el.dataset.amInput !== undefined) { setValue(state.inputs, el.dataset.amInput, el.value === '' ? '' : Number(el.value)); changed(el.dataset.amInput); }
  else if (el.dataset.amDice !== undefined) { state.dice[Number(el.dataset.amDice)] = el.value === '' ? null : Number(el.value); changed('dice'); }
  else if (el.dataset.amChoice !== undefined) { setValue(state.choices, el.dataset.amChoice, el.value === '' ? '' : (el.dataset.amChoice.endsWith('/option') ? Number(el.value) : el.value)); changed(el.dataset.amChoice); }
  else if (el.dataset.amSplit !== undefined) {
    const split = {...(state.choices[el.dataset.amSplit] || {})};
    setValue(split, el.dataset.hero, el.value === '' ? '' : Number(el.value));
    state.choices[el.dataset.amSplit] = split; changed(el.dataset.amSplit);
  }
  else if (el.dataset.amTook !== undefined) { state.setup.took[el.dataset.amTook] = el.checked; if (!el.checked) state.setup.ooa[el.dataset.amTook] = false; view.dirty = true; render(); }
  else if (el.dataset.amOoa !== undefined) { state.setup.ooa[el.dataset.amOoa] = el.checked; view.dirty = true; render(); }
  else if (el.hasAttribute('data-am-won')) { state.setup.won = el.checked; view.dirty = true; render(); }
  else if (el.hasAttribute('data-am-opponent')) { state.setup.opponentRating = el.value === '' ? null : Number(el.value); view.dirty = true; render(); }
}

function onClick(event) {
  if (!view) return;
  const button = event.target.closest('button');
  if (!button) return;
  const {state} = view;
  if (button.id === 'am-close') return close();
  if (button.dataset.amStep !== undefined) { view.step = Number(button.dataset.amStep); render(); $('aftermath-body').scrollTop = 0; return; }
  if (button.id === 'am-back') { view.step = Math.max(0, view.step - 1); render(); return; }
  if (button.id === 'am-next') { view.step = Math.min(STEPS.length - 1, view.step + 1); render(); $('aftermath-body').scrollTop = 0; return; }
  if (button.id === 'am-apply') {
    const built = A.buildAftermath(view.band, view.catalog, state), kept = built.actions.filter(a => !a.removed);
    const {onApply} = view; view = null; $('aftermath').close();
    onApply(kept, A.battleSummary(built, state));
    return;
  }
  if (button.dataset.amThrow) {
    state.rolls[button.dataset.amThrow] = throwDice(Number(button.dataset.min), Number(button.dataset.sides));
    changed(button.dataset.amThrow); return;
  }
  if (button.hasAttribute('data-am-throw-all')) {
    state.dice = Array.from({length: view.built.exploration.count}, () => A.rollDie(6));
    changed('dice'); return;
  }
  if (button.dataset.amToggle) {
    const id = button.dataset.amToggle;
    if (state.removed.has(id)) state.removed.delete(id); else state.removed.add(id);
    view.dirty = true; render();
  }
}

function wire() {
  wired = true;
  const dialog = $('aftermath');
  // Commit on change, not per keystroke, so multi-digit values (2k6 = 11) can be typed.
  dialog.addEventListener('change', onInput);
  dialog.addEventListener('click', onClick);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
}
