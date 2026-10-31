// Feste Probennummern (4.49.0): Nummerierung, Festlegen, Storno, Ersetzen über Brücken und Migration älterer Dateien.
// Echte Funktionen aus index.html, ausschließlich synthetische Proben; keine Dateien oder Browserdaten.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const between = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i + a.length); assert.ok(i >= 0 && j > i, a); return html.slice(i, j); };
const helfer = between('function renummerieren(){', 'function editProbeNr(');

function welt(start = 1) {
  const c = {
    console, probenStartNr: start, proben: [], chloridProben: [], asbestProben: [], sonstigeProben: [],
    undoStack: ['älterer Stand'], unsaved: 0, archiv: 0,
    markUnsaved() { c.unsaved++; }, projektArchivAutoSave() { c.archiv++; },
    fbeKuerzel: () => 'Dr. Ka', window: {}
  };
  vm.createContext(c); vm.runInContext(helfer, c);
  return c;
}
// Arrays aus dem vm-Kontext haben einen anderen Prototyp – für Vergleiche als JSON übernehmen
const plain = x => JSON.parse(JSON.stringify(x));
const nummern = c => plain([c.proben, c.chloridProben, c.asbestProben, c.sonstigeProben].map(l => l.map(p => p._nr)));
const pak = (id, z2) => ({id, z2: z2 || 'Raum ' + id, matrix: 'Wischprobe'});
let n = 0;
const ok = (msg) => { n++; if (process.env.VERBOSE) console.log('  ✓ ' + msg); };

// 1. Ohne feste Proben: wie bisher fortlaufend ab Startnummer, Löschen rückt nach
{
  const c = welt(7);
  c.proben = [pak(1), pak(2)]; c.chloridProben = [pak(3)]; c.asbestProben = [pak(4)]; c.sonstigeProben = [pak(5)];
  c.renummerieren();
  assert.deepEqual(nummern(c), [[7, 8], [9], [10], [11]]);
  assert.equal(c.chloridProben[0].chloridNr, 9);
  c.proben.splice(0, 1); c.renummerieren();
  assert.deepEqual(nummern(c), [[7], [8], [9], [10]]);
  assert.equal(c.festeNummernVorhanden(), false);
  ok('ohne feste Proben unverändert');
}

// 2. Ergänzen nach Etikettendruck verschiebt nichts: neue Probe bekommt max + 1
{
  const c = welt(1);
  c.proben = [pak(1), pak(2), pak(3)]; c.chloridProben = [pak(10)]; c.sonstigeProben = [pak(20)];
  const neu = c.nummernFestlegen([c.proben, c.chloridProben, c.asbestProben, c.sonstigeProben], 'Etiketten', {neuZeichnen: false});
  assert.equal(neu, 5);
  assert.deepEqual(nummern(c), [[1, 2, 3], [4], [], [5]]);
  assert.equal(c.proben[0].nrFest.anlass, 'Etiketten');
  assert.equal(c.undoStack.length, 0, 'Rückgängig endet an festen Nummern');
  assert.equal(c.unsaved, 1); assert.equal(c.archiv, 1);
  c.proben.push(pak(4, 'nach dem Druck')); c.renummerieren();
  assert.deepEqual(nummern(c), [[1, 2, 3, 6], [4], [], [5]], 'neue PAK-Probe: 6, Chlorid und Sonstige bleiben');
  c.proben.splice(1, 0, pak(5, 'dazwischen')); c.renummerieren();
  assert.deepEqual(nummern(c), [[1, 6, 2, 3, 7], [4], [], [5]], 'dazwischen eingefügt: freie Nummern in Listenreihenfolge, nur nicht feste rücken (noch nicht gedruckt)');
  assert.equal(c.nummernFestlegen([c.proben], 'Etiketten', {neuZeichnen: false}), 2, 'nur die neuen werden fest');
  assert.equal(c.nummernFestlegen([c.proben], 'Etiketten', {neuZeichnen: false}), 0, 'zweiter Druck ändert nichts');
  ok('Ergänzen nach Druck');
}

// 3. Nur ein Teil fest (Chlorid gedruckt, PAK nicht): PAK nummeriert sich weiter frei, Chlorid bleibt
{
  const c = welt(1);
  c.proben = [pak(1), pak(2)]; c.chloridProben = [pak(10), pak(11)]; c.asbestProben = [pak(30)];
  c.renummerieren(); c.nummernFestlegen([c.chloridProben], 'Laborübergabe', {neuZeichnen: false});
  c.proben.push(pak(3)); c.renummerieren();
  assert.deepEqual(nummern(c), [[1, 2, 5], [3, 4], [6], []], 'PAK springt hinter die festen Chlorid-Nummern, Asbest (nicht fest) rückt nach');
  c.proben.splice(0, 1); c.renummerieren();
  assert.deepEqual(nummern(c), [[1, 2], [3, 4], [5], []], 'Löschen einer nicht festen Probe wie bisher (nicht feste rücken auf); feste bleiben');
  ok('teilweise fest');
}

// 4. Löschen nach Druck storniert; Storno aufheben; stornierte fehlen in aktiv()
{
  const c = welt(1);
  c.proben = [pak(1), pak(2), pak(3)];
  c.nummernFestlegen([c.proben], 'Etiketten', {neuZeichnen: false});
  assert.equal(c.probeStornieren(c.proben[1], {grund: 'doppelt erfasst'}), true);
  assert.equal(c.proben.length, 3);
  assert.equal(c.proben[1].storniert.grund, 'doppelt erfasst');
  assert.equal(c.proben[1].storniert.kuerzel, 'Dr. Ka', 'Kürzel aus „Ihr Kürzel“');
  assert.deepEqual(plain(c.aktiv(c.proben).map(p => p._nr)), [1, 3]);
  c.proben.push(pak(4)); c.renummerieren();
  assert.deepEqual(nummern(c)[0], [1, 2, 3, 4], 'stornierte Nummer bleibt vergeben');
  assert.equal(c.probeStornieren(c.proben[3]), false, 'nicht feste Probe wird nicht storniert, sondern gelöscht');
  assert.equal(c.stornoAufheben(c.proben[1]), true);
  assert.equal(c.proben[1].storniert, undefined); assert.ok(c.proben[1].nrFest);
  assert.deepEqual(plain(c.aktiv(c.proben).map(p => p._nr)), [1, 2, 3, 4]);
  ok('Storno und Storno aufheben');
}

// 5. „Neue Proben“ / Zurücksetzen: nicht feste fallen weg, feste werden storniert; ids bleiben eindeutig
{
  const c = welt(1);
  c.asbestProben = [pak(1), pak(2), pak(3)];
  c.nummernFestlegen([[c.asbestProben[0], c.asbestProben[2]]], 'Etiketten', {neuZeichnen: false});
  assert.match(c.festeHinweis(c.asbestProben), /2 Proben haben schon eine feste Nummer/);
  assert.equal(c.festeHinweis([pak(9)]), '');
  c.asbestProben = c.listeLeeren(c.asbestProben, 'Neue Proben');
  assert.deepEqual(plain(c.asbestProben.map(p => [p.id, p._nr, p.storniert.grund])), [[1, 1, 'Neue Proben'], [3, 3, 'Neue Proben']]);
  assert.equal(c.naechsteId(c.asbestProben), 4); assert.equal(c.naechsteId([]), 1);
  ok('Liste leeren');
}

// 6. Brücken (Bohrkern-Bogen, PN 98): Ersatz behält Nummer und Status, wegfallende feste werden storniert
{
  const c = welt(1);
  const alt = [{id: 1, bkId: 'A', z2: 'alt A'}, {id: 2, bkId: 'B', z2: 'alt B'}, {id: 3, bkId: 'C', z2: 'alt C'}];
  const danach = {id: 4, z2: 'später angelegt'};
  c.sonstigeProben = [...alt, danach];
  c.nummernFestlegen([c.sonstigeProben], 'Etiketten', {neuZeichnen: false});
  let next = 5;
  const neu = [{bkId: 'A', z2: 'neu A'}, {bkId: 'C', z2: 'neu C'}, {bkId: 'D', z2: 'neu D'}];
  c.sonstigeProben = c.anPlatzErsetzen(c.sonstigeProben, alt, neu, p => p.bkId, () => next++);
  c.renummerieren();
  assert.deepEqual(plain(c.sonstigeProben.map(p => [p.z2, p._nr, !!p.nrFest, !!p.storniert])),
    [['neu A', 1, true, false], ['alt B', 2, true, true], ['neu C', 3, true, false], ['später angelegt', 4, true, false], ['neu D', 5, false, false]]);
  assert.equal(c.sonstigeProben[1].storniert.grund, 'beim Aktualisieren weggefallen');
  // Kommt die weggefallene Probe zurück, wird das automatische Storno aufgehoben (gleiche Nummer); von Hand storniert bleibt storniert
  c.probeStornieren(c.sonstigeProben[2], {grund: 'Kern gebrochen'});
  const altBk = c.sonstigeProben.filter(p => p.bkId);
  c.sonstigeProben = c.anPlatzErsetzen(c.sonstigeProben, altBk, [{bkId: 'A', z2: 'A'}, {bkId: 'B', z2: 'B zurück'}, {bkId: 'C', z2: 'C'}, {bkId: 'D', z2: 'D'}], p => p.bkId, () => next++);
  c.renummerieren();
  assert.deepEqual(plain(c.sonstigeProben.map(p => [p.z2, p._nr, p.storniert ? p.storniert.grund : ''])),
    [['A', 1, ''], ['B zurück', 2, ''], ['C', 3, 'Kern gebrochen'], ['später angelegt', 4, ''], ['D', 5, '']]);
  // Ohne feste Proben wie 4.43.0: weggefallene entfallen
  const d = welt(1);
  const alt2 = [{id: 1, k: 'x'}, {id: 2, k: 'y'}];
  d.sonstigeProben = [...alt2];
  d.sonstigeProben = d.anPlatzErsetzen(d.sonstigeProben, alt2, [{k: 'y'}], p => p.k, () => 9);
  assert.deepEqual(plain(d.sonstigeProben.map(p => [p.id, p.k])), [[2, 'y']]);
  ok('Ersetzen über Brücken');
}

// 7. Kopien erben keinen Status
{
  const c = welt(1);
  const q = c.ohneNrStatus({id: 1, _nr: 5, nrFest: {am: 'x'}, storniert: {am: 'y'}, z2: 'Raum'});
  assert.deepEqual(plain(q), {id: 1, z2: 'Raum'});
  ok('Kopie ohne Status');
}

// 8. Migration älterer Projektdateien (ohne nrSchutz)
{
  const alt = () => ({version: '4.48.1', gespeichertAm: '2026-10-20T10:00:00.000Z'});
  const mit = (c) => { c.proben = [pak(1), pak(2)]; c.sonstigeProben = [pak(3)]; return c; };
  let c = mit(welt(5));
  assert.equal(c.nummernMigrieren(alt(), true), 3, 'Laborübergabe vorhanden → fest');
  assert.deepEqual(nummern(c), [[5, 6], [], [], [7]]);
  assert.deepEqual(plain(c.proben[0].nrFest), {am: '2026-10-20T10:00:00.000Z', anlass: 'Bestand'});
  c = mit(welt(1)); assert.equal(c.nummernMigrieren(alt(), null), 3, 'nicht prüfbar → im Zweifel fest');
  c = mit(welt(1)); assert.equal(c.nummernMigrieren(alt(), undefined), 3);
  c = mit(welt(1)); assert.equal(c.nummernMigrieren(alt(), false), 0, 'keine Laborübergabe → nicht fest');
  assert.equal(c.festeNummernVorhanden(), false);
  c = mit(welt(1)); assert.equal(c.nummernMigrieren({...alt(), nrSchutz: 1}, true), 0, 'neue Datei wird nie migriert');
  c = welt(1); assert.equal(c.nummernMigrieren(alt(), true), 0, 'ohne Proben nichts zu tun');
  assert.equal(c.migrationsText(0), '');
  assert.match(c.migrationsText(3), /3 Probennummern gelten als fest/);
  ok('Migration');
}

// 9. Laborübergabe im Ordner „Laboraufträge“ erkennen
(async () => {
  const c = welt(1);
  const ordner = (...namen) => ({async *values() { for (const name of namen) yield {kind: 'file', name}; }});
  assert.equal(await c.laborUebergabeImOrdner(ordner('26.0999_10.10.2026_Daten.json', '26.0999_PAK_10.10.2026_Laborübergabe.xls')), true);
  assert.equal(await c.laborUebergabeImOrdner(ordner('26.0999_Sonstige_Laborübergabe.xls')), true, 'auch zerlegtes ü (NFD)');
  assert.equal(await c.laborUebergabeImOrdner(ordner('26.0999_10.10.2026_Daten.json', 'Feldbogen.pdf')), false);
  assert.equal(await c.laborUebergabeImOrdner({async *values() { throw new Error('kein Zugriff'); }}), null, 'nicht lesbar → unbekannt');
  assert.equal(await c.laborUebergabeImOrdner(null), null);
  // Import/Archiv: ohne offenen Projektordner synchron „unbekannt“, neue Datei gar nicht prüfen
  assert.equal(c.laborUebergabeFuer({version: '4.48.1'}), null);
  let gesehen = 'nie';
  assert.equal(c.mitLaborUebergabe({nrSchutz: 1}, b => { gesehen = b; return 'weiter'; }), 'weiter');
  assert.equal(gesehen, null);
  c.PROJEKTORDNER = {state: {proj: {lab: ordner('x_Laborübergabe.xls')}}};
  await c.mitLaborUebergabe({version: '4.48.1'}, b => { gesehen = b; });
  assert.equal(gesehen, true);
  ok('Laborübergabe im Ordner');
  // Quelltext: alle Ausgaben lassen stornierte Proben weg, Speichern markiert neue Dateien
  for (const f of ['renderEtiketten', 'renderChloridEtiketten', 'renderAsbestEtiketten', 'renderSonstigeEtiketten',
    'exportExcel', 'exportChloridExcel', 'exportAsbestExcel', 'exportSonstigeExcel',
    'copyUebergabe', 'copyChloridUebergabe', 'copyAsbestUebergabe', 'copySonstigeUebergabe', 'alleUebergabenSpeichernMitWord', 'renderAbschlussStatus']) {
    const i = html.indexOf('function ' + f + '('); assert.ok(i >= 0, f);
    assert.match(html.slice(i, i + 400), /=aktiv\((proben|chloridProben|asbestProben|sonstigeProben)\)/, f + ' filtert stornierte Proben');
  }
  assert.match(html, /nrSchutz:1, \/\/ ab 4\.49\.0/);
  ok('Ausgaben und Speichern');
  console.log('OK Feste Probennummern: ' + n + ' Gruppen (Nummerierung, Druck, Storno, Leeren, Brücken, Kopien, Migration, Ordner, Ausgaben)');
})().catch(e => { console.error(e); process.exitCode = 1; });
