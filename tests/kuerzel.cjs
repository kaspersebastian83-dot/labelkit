// „Ihr Kürzel“ wird mit BelegKit geteilt (localStorage „mosaik-kuerzel“): gemeinsamer Wert zuerst, eigener alter Wert („fbe-kuerzel“) als Rückfall.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.slice(html.indexOf('function fbeKuerzel(){'), html.indexOf('function fbeCtx(){'));
assert.ok(code.includes('fbeKuerzelSetzen'), 'Funktionen gefunden');

function app(speicher = {}) {
  const context = {localStorage: {getItem: k => (k in speicher ? speicher[k] : null), setItem: (k, v) => { speicher[k] = String(v); }}, document: {getElementById: () => null}};
  vm.createContext(context); vm.runInContext(code, context);
  return {context, speicher};
}

// neuer Kollege: nichts eingetragen
let a = app();
assert.equal(a.context.fbeKuerzel(), '');
// BelegKit hat „SK“ eingetragen → LabelKit zeigt es sofort
a = app({'mosaik-kuerzel': 'SK'});
assert.equal(a.context.fbeKuerzel(), 'SK');
// gemeinsamer Wert hat Vorrang vor dem eigenen alten
a = app({'mosaik-kuerzel': 'SK', 'fbe-kuerzel': 'XY'});
assert.equal(a.context.fbeKuerzel(), 'SK');
// bisheriger Eintrag nur in LabelKit → wird übernommen und für BelegKit geteilt (BelegKit schreibt Großbuchstaben)
a = app({'fbe-kuerzel': 'sk'});
assert.equal(a.context.fbeKuerzel(), 'sk');
assert.equal(a.speicher['mosaik-kuerzel'], 'SK');
// Eingabe in LabelKit geht in beide Schlüssel; leeres Feld leert den gemeinsamen Wert
a.context.fbeKuerzelSetzen(' mk ');
assert.equal(a.speicher['fbe-kuerzel'], 'mk');
assert.equal(a.speicher['mosaik-kuerzel'], 'MK');
a.context.fbeKuerzelSetzen('');
assert.equal(a.context.fbeKuerzel(), '');
assert.equal(a.speicher['mosaik-kuerzel'], '');
// ohne Speicher (privates Fenster): Feldinhalt
const ohne = {localStorage: {getItem() { throw new Error('gesperrt'); }, setItem() { throw new Error('gesperrt'); }}, document: {getElementById: () => ({value: ' AB '})}};
vm.createContext(ohne); vm.runInContext(code, ohne);
assert.equal(ohne.fbeKuerzel(), 'AB');
ohne.fbeKuerzelSetzen('x');
console.log('LabelKit Kürzel: alle Prüfungen bestanden');
