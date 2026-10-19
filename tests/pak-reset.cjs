// Ausschließlich synthetische Einträge; keine Dateien oder Browserdaten verändern.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.slice(html.indexOf('function clearAll(){'), html.indexOf('// ── CHECKBOX & TRANSFER'));
const numbering = html.slice(html.indexOf('function renummerieren(){'), html.indexOf('function editProbeNr('));
function scenario() {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, {open: false, showModal() {this.open = true;}, close() {this.open = false;}, focus() {this.focused = true;}});
    return elements.get(id);
  };
  const events = [];
  const context = {
    proben: [{id: 1, z2: 'Synthetischer Raum', notiz: 'PAK'}, {id: 2, notiz: 'Zweite Probe'}], nextId: 3, probenStartNr: 7,
    chloridProben: [{id: 10, notiz: 'Chlorid'}], asbestProben: [{id: 11, notiz: 'Asbest'}], sonstigeProben: [{id: 12, notiz: 'Sonstige'}],
    brandgeruchProben: [{id: 13, notiz: 'Brandgeruch'}], pn98Proben: [{id: 14, notiz: 'PN 98'}], feldprotokolle: [{id: 'synthetisches-protokoll'}],
    projekt: {nr: '26.0999', ort: 'Testort'},
    document: {getElementById: element}, aktuellerProjektName: () => '26.0999 Testort',
    undoSnapshot() {events.push('undo');}, renderTable() {events.push('render');}, markUnsaved() {events.push('unsaved');}
  };
  vm.createContext(context); vm.runInContext(numbering + code, context); context.renummerieren();
  const data = () => JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(context).filter(([key]) => /Proben$|^proben$|^nextId$|^projekt$|^probenStartNr$|^feldprotokolle$/.test(key)))));
  return {context, element, events, data};
}
const cancel = scenario(), before = cancel.data();
cancel.context.clearAll();
assert.equal(cancel.element('modal-pak-reset').open, true);
assert.equal(cancel.element('pak-reset-abbrechen').focused, true);
assert.match(cancel.element('pak-reset-text').textContent, /Alle 2 PAK-Proben.*26.0999 Testort/);
cancel.element('modal-pak-reset').close();
assert.deepEqual(cancel.data(), before); assert.deepEqual(cancel.events, []);
cancel.context.bestaetigePakZuruecksetzen(); // Ohne offenen Dialog kein Zurücksetzen.
assert.deepEqual(cancel.data(), before);
const reset = scenario(), previous = reset.data();
reset.context.clearAll(); reset.context.bestaetigePakZuruecksetzen();
assert.equal(reset.context.proben.length, 0); assert.equal(reset.context.nextId, 1);
assert.deepEqual(reset.events, ['undo', 'render', 'unsaved']);
for (const key of ['brandgeruchProben', 'pn98Proben', 'feldprotokolle', 'projekt', 'probenStartNr']) assert.deepEqual(reset.data()[key], previous[key]);
// Bestehende gemeinsame Nummerierung bleibt unverändert: nur abgeleitete Nummern verschieben sich.
for (const [i, key] of ['chloridProben', 'asbestProben', 'sonstigeProben'].entries()) {
  assert.equal(reset.context[key][0]._nr, 7 + i);
  const omitNumbers = rows => rows.map(({_nr, chloridNr, ...rest}) => rest);
  assert.deepEqual(omitNumbers(reset.data()[key]), omitNumbers(previous[key]));
}
const empty = scenario(); empty.context.proben = []; const emptyBefore = empty.data(); empty.context.clearAll();
assert.equal(empty.element('modal-pak-reset').open, false); assert.deepEqual(empty.events, []); assert.deepEqual(empty.data(), emptyBefore);
assert.match(html, /id="btn-pak-reset"[^>]*disabled>PAK-Proben zurücksetzen …/);
assert.match(html, /id="pak-reset-abbrechen"[^>]*autofocus/);
assert.match(html, /Die fortlaufenden Probennummern werden wie bisher neu berechnet/);
console.log('PAK-Reset: Abbrechen, Bestätigung, leere Liste und Erhalt anderer Angaben bestanden.');
