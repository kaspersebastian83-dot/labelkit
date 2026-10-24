// Wandblatt Bohrkerne (4.35.0): Tiefenstufen, Wandkennung, Segmente mit Probenbezeichnung, Hinweise, Druckseiten – ohne Browser.
// Mit AidKit (AIDKIT_DIR, sonst ../aidkit neben dem Repo) werden die IDs zusätzlich nach den AidKit-Regeln geprüft.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const aidkit = path.resolve(process.env.AIDKIT_DIR || path.join(__dirname, '..', '..', 'aidkit'), 'konventionen.js');
const ctx = {};
if (fs.existsSync(aidkit)) vm.runInNewContext(fs.readFileSync(aidkit, 'utf8'), ctx);
const cut = (a, b) => { const s = html.indexOf(a), e = html.indexOf(b); assert.ok(s > 0 && e > s, a); return html.slice(s, e); };
vm.runInNewContext(cut('/* PN98-STAFFEL-START */', '/* PN98-STAFFEL-ENDE */') + cut('/* FBE-LOGIK-START */', '/* FBE-LOGIK-ENDE */')
  + cut('const FB_CSS=`', '/** Zahlenangabe aus ISO')
  + '\nthis.api={fbeNeu,fbeSetze,fbePlausi,fbeTiefen,fbeBkKennung,fbeBohrkernSegmente,fbeFeldLabel,fbSeiten,fbBlattzahl,fbFormularId};', ctx);
const A = ctx.api;
const P = x => JSON.parse(JSON.stringify(x));
let n = 0; const ok = (name, fn) => { fn(); n++; console.log('OK Wandblatt: ' + name); };

ok('Tiefenstufen lesen', () => {
  assert.deepEqual(P(A.fbeTiefen('0–2 / 2–6 / 6–12').stufen), [{von: 0, bis: 2}, {von: 2, bis: 6}, {von: 6, bis: 12}]);
  assert.equal(A.fbeTiefen('0-2, 2-6,5').stufen[1].bis, 6.5, 'Dezimalkomma');
  assert.match(A.fbeTiefen('').fehler, /Keine/); assert.match(A.fbeTiefen('0-2 2-4 4-6 6-8').fehler, /drei/);
  assert.match(A.fbeTiefen('0-4 2-6').fehler, /überlappen/);
});
ok('Druck: Blatt 1 + ein Wandblatt je Wand, Endungen vorgedruckt', () => {
  assert.equal(A.fbBlattzahl('bohrkern', 4), 5); assert.equal(A.fbFormularId('bohrkern', '26.0142', '2'), '26.0142-BK-02');
  const s = A.fbSeiten({typ: 'bohrkern', n: 2, lfd: '1', nr: '26.0142', datum: '24.10.2026', objekt: '<b>EFH</b>', tiefen: '0-2 / 2-6', untersuchung: 'MKW', leer: false});
  assert.equal(s.length, 3); assert.match(s[0], /&lt;b&gt;EFH/, 'escaped'); assert.match(s[1], /Wand 1/); assert.match(s[2], /Wand 2/);
  for (const e of ['-1', '-9', '-____']) assert.ok(s[1].includes('>' + e + '<'), e);
  assert.equal(A.fbSeiten({typ: 'bohrkern', n: 1, leer: true}).join('').includes('MKW'), false, 'Leerformular ohne Vorgaben');
});
const neu = () => A.fbeNeu({typ: 'bohrkern', formularId: '26.0142-BK-01', n: 2, von: 'SK', jetzt: '2026-10-24T08:00:00Z', vor: {projektNr: '26.0142', tiefen: '0-2 / 2-6 / 6-12', untersuchung: 'MKW'}});
const zeile = (rec, w, j, werte) => { for (const [k, v] of Object.entries(werte)) A.fbeSetze(rec, `mp.${w}.punkte.${j}.${k}`, v, {}); };
ok('neues Protokoll: Endungen 1–9 vorbelegt, Vorgedrucktes übernommen', () => {
  const rec = neu();
  assert.deepEqual(P(rec.mp[0].w.punkte.map(r => r.endung || '')), ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '']);
  assert.equal(rec.kopf.tiefen, '0-2 / 2-6 / 6-12');
  assert.equal(A.fbeFeldLabel(rec, 'mp.0.punkte.6.kern'), 'Wand 1 · Bohrkerne Zeile 7 · Kern cm');
});
ok('Segmente: ID, Tiefe am Kernende gekürzt, A/R, Material ausgeschrieben', () => {
  const rec = neu();
  Object.assign(rec.mp[0].w, {geschoss: 'EG', raum: 'kz2', flaeche: 'B'});
  zeile(rec, 0, 6, {kern: '9', m1: 'p', m2: 'Z', s1: 'A', s2: 'r', s3: 'A'});
  zeile(rec, 0, 9, {endung: '10', kern: '4', s1: 'A'});
  const {segmente, fehler} = A.fbeBohrkernSegmente(rec);
  assert.deepEqual(P(segmente.map(x => x.id)), ['EG-KZ2-B-7-T1', 'EG-KZ2-B-7-T2', 'EG-KZ2-B-7-T3', 'EG-KZ2-B-10-T1']);
  assert.deepEqual(P(segmente.map(x => [x.von, x.bis, x.status])), [[0, 2, 'A'], [2, 6, 'R'], [6, 9, 'A'], [0, 2, 'A']]);
  assert.equal(segmente[0].material, 'Putz'); assert.equal(segmente[2].gekuerzt, true); assert.deepEqual(P(fehler), []);
  assert.deepEqual(P(segmente.map(x => [x.ecke, x.okff, x.wandL, x.wandH])[0]), ['', '', '', ''], 'ohne Lageangaben leer, nichts erfunden');
});
ok('Lage für die Wandansicht: Abstand, Höhe, Wandmaße in m (Komma oder Punkt), Unlesbares bleibt leer', () => {
  const rec = neu();
  Object.assign(rec.mp[0].w, {geschoss: 'EG', raum: 'WZ', flaeche: 'B', laenge: '4,20', hoehe: '2.5'});
  zeile(rec, 0, 0, {ecke: '0,6', okff: '2,1', kern: '8', s1: 'A', geruch: '+'});
  zeile(rec, 0, 1, {ecke: 'x', kern: '8', s1: 'A'});
  const s = A.fbeBohrkernSegmente(rec).segmente;
  assert.deepEqual(P([s[0].ecke, s[0].okff, s[0].wandL, s[0].wandH, s[0].geruch]), [0.6, 2.1, 4.2, 2.5, '+']);
  assert.equal(s[1].ecke, '');
});
ok('nichts wird geraten: fehlende Angaben werden gemeldet, nicht ergänzt', () => {
  const rec = neu();
  zeile(rec, 0, 0, {kern: '12', s1: 'A'});
  assert.match(A.fbeBohrkernSegmente(rec).fehler[0].text, /Wandkennung unvollständig/);
  Object.assign(rec.mp[0].w, {geschoss: 'EG', raum: 'WZ', flaeche: 'A'});
  zeile(rec, 0, 1, {s1: 'A'}); zeile(rec, 0, 2, {kern: '12', s1: 'X'}); zeile(rec, 0, 3, {kern: '3', s1: 'A', s2: 'A', s3: 'A'});
  const f = A.fbeBohrkernSegmente(rec).fehler.map(x => x.text).join(' | ');
  assert.match(f, /Kernlänge fehlt/); assert.match(f, /Nur A .* „X“/); assert.match(f, /T3 beginnt bei 6 cm, der Kern ist nur 3 cm lang/);
});
ok('Hinweise: doppelte Wandkennung, Lage außerhalb der Wand, Raumkürzel nicht in AidKit', () => {
  const rec = neu();
  for (const i of [0, 1]) Object.assign(rec.mp[i].w, {geschoss: 'EG', raum: 'XYZ', flaeche: 'B', laenge: '3,5', hoehe: '2,5'});
  zeile(rec, 0, 0, {ecke: '4', okff: '0,15', kern: '10', s1: 'A'});
  const h = A.fbePlausi(rec).map(x => x.text).join(' | ');
  assert.match(h, /EG-XYZ-B steht auf mehreren Wandblättern/); assert.match(h, /größer als die Wandlänge/);
  if (ctx.SpektronKonventionen) assert.match(h, /„XYZ“ steht nicht in der Liste/);
});
console.log(`OK Wandblatt: ${n} Fälle${ctx.SpektronKonventionen ? ' (mit AidKit-Regeln)' : ' (ohne AidKit)'}`);
