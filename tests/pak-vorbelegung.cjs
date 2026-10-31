// PAK-Vorbelegung: reine Logik mit ausschließlich synthetischen Daten.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.slice(html.indexOf('function pakVorbelegungLesen(){'), html.indexOf('function applyVorbelegung(){'));
const dates = html.slice(html.indexOf('function fmtDatum('), html.indexOf('function normDatum('));
// Feste Probennummern (4.49.0): Hilfsfunktionen (Nummerierung, Storno, Migration) liegen in einem Block
const nrHelfer = html.slice(html.indexOf('function renummerieren(){'), html.indexOf('function editProbeNr('));
function scenario() {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, {value: '', open: false, textContent: '', showModal() {this.open = true;}, close() {this.open = false;}, focus() {}});
    return elements.get(id);
  };
  for (const [id, value] of Object.entries({'vb-anzahl': '2', 'vb-datum': '19.10.2026', 'vb-cm2': '600', 'proj-nr': '26.0999'})) element(id).value = value;
  const events = [], ctx = {
    proben: [{id: 1, _nr: 7, z1: 'ALT', datum: '2026-10-01', cm2: '140', matrix: 'Wischprobe'}, {id: 2, _nr: 8, z1: '', datum: '', cm2: '', matrix: 'Wischprobe'}, {id: 3, _nr: 9, cm2: '88', matrix: 'Bauschutt'}], nextId: 4,
    document: {getElementById: element}, aktuellerProjektName: () => '26.0999', probeNr: p => p._nr,
    undoSnapshot() {events.push('undo');}, renderTable() {events.push('render');}, markUnsaved() {events.push('dirty');}, flash() {}
  };
  vm.createContext(ctx); vm.runInContext(dates + nrHelfer + code, ctx);
  const data = () => JSON.parse(JSON.stringify({proben: ctx.proben, nextId: ctx.nextId}));
  return {ctx, element, events, data};
}
let s = scenario(), before = s.data();
s.ctx.vorbelegungUebernehmen();
assert.deepEqual(s.data().proben.slice(0, 3), before.proben);
assert.equal(s.ctx.proben.length, 5); assert.equal(s.ctx.nextId, 6);
assert.equal(s.ctx.proben[3].datum, '2026-10-19'); assert.equal(s.ctx.proben[3].cm2, '600');
assert.deepEqual(s.events, ['undo', 'render', 'dirty']);
for (const invalid of ['', '0', '-1', '1.5', '97', '2x']) {
  s = scenario(); before = s.data(); s.element('vb-anzahl').value = invalid;
  s.ctx.vorbelegungUebernehmen(); assert.deepEqual(s.data(), before); assert.deepEqual(s.events, []);
}
s = scenario(); before = s.data(); s.element('vb-anzahl').value = '0';
s.ctx.vorbelegungNurLeere();
assert.deepEqual(s.data().proben[0], before.proben[0]);
assert.equal(s.ctx.proben[1].z1, '26.0999'); assert.equal(s.ctx.proben[1].cm2, '600'); assert.equal(s.ctx.proben[2].cm2, '88');
assert.equal(s.ctx.proben.length, 3); assert.equal(s.ctx.nextId, 4);
const count = s.events.length; s.ctx.vorbelegungNurLeere(); assert.equal(s.events.length, count, 'Ohne Änderungen kein Undo oder dirty');
s = scenario(); before = s.data(); s.ctx.vorbelegungAendern();
assert.deepEqual(s.data(), before); assert.deepEqual(s.events, []);
assert.match(s.element('pak-vorbelegung-text').textContent, /Projektnummer → 26.0999/);
assert.match(s.element('pak-vorbelegung-text').textContent, /PAK-Proben: 7/);
s.element('modal-pak-vorbelegung').close(); s.ctx.bestaetigePakVorbelegung();
assert.deepEqual(s.data(), before); assert.deepEqual(s.events, []);
s.ctx.vorbelegungAendern(); s.ctx.bestaetigePakVorbelegung();
assert.equal(s.ctx.proben.length, 3); assert.equal(s.ctx.nextId, 4);
assert.equal(s.ctx.proben[0].z1, '26.0999'); assert.equal(s.ctx.proben[0].datum, '2026-10-19');
assert.equal(s.ctx.proben[0].cm2, '600'); assert.equal(s.ctx.proben[2].cm2, '88');
assert.deepEqual(s.data().proben[1], before.proben[1], 'Ändern lässt leere Angaben unverändert');
assert.deepEqual(s.events, ['undo', 'render', 'dirty']);
// Bestätigung bezieht sich auf die angezeigten Werte, keine erneute Eingabeauswertung.
s = scenario(); s.ctx.vorbelegungAendern(); s.element('vb-cm2').value = '999'; s.ctx.bestaetigePakVorbelegung();
assert.equal(s.ctx.proben[0].cm2, '600');
// Veraltete Bestätigung nach Datenersetzung/Änderung wird verworfen.
for (const replace of [false, true]) {
  s = scenario(); s.ctx.vorbelegungAendern();
  if (replace) s.ctx.proben = s.data().proben; else s.ctx.proben[0].z1 = 'INZWISCHEN';
  before = s.data(); s.ctx.bestaetigePakVorbelegung();
  assert.deepEqual(s.data(), before); assert.deepEqual(s.events, []);
}
for (const action of ['vorbelegungUebernehmen', 'vorbelegungNurLeere', 'vorbelegungAendern']) {
  for (const [field, value] of [['vb-datum', '31.02.2026'], ['vb-cm2', '-1']]) {
    s = scenario(); before = s.data(); s.element(field).value = value; s.ctx[action]();
    assert.deepEqual(s.data(), before); assert.deepEqual(s.events, []);
  }
}
s = scenario(); s.element('vb-datum').value = ''; s.element('vb-cm2').value = ''; s.element('proj-nr').value = '';
before = s.data(); s.ctx.vorbelegungNurLeere(); s.ctx.vorbelegungAendern(); assert.deepEqual(s.data(), before); assert.deepEqual(s.events, []);
s.ctx.vorbelegungUebernehmen(); assert.equal(s.ctx.proben[3].cm2, '600'); assert.equal(s.ctx.proben[3].datum, '');
console.log('PAK-Vorbelegung: getrennte Aktionen, Validierung, No-op, Vorschau und veraltete Bestätigung bestanden.');
