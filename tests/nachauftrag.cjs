// LabelKit 5.5.0 – Nachauftrag (Plan claude/labelkit-nachauftrag-plan.md, N1–N10): echte Funktionen aus index.html, erfundene Proben.
// Ansicht neu/Auftrag/alle, Kennung und Zähler (nie neu vergeben), Merkmal nur mit fester Nummer und Liste, Kopie ohne Merkmal,
// Liste fehlt (älteres LabelKit) → neu aufgebaut, Vorschlag für Auftrag 1 (ein Tag, zwei Tage, keine Datei, unlesbar),
// Dateiname ab Auftrag 2, Datum neuer Proben mit 1 / 2 Ortsterminen, gelbe Zeile Datum, Zurücknehmen, Versionsvergleich.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const between = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i + a.length); assert.ok(i >= 0 && j > i, a); return html.slice(i, j); };
const code = between('function renummerieren(){', 'function editProbeNr(')
  + between('function fmtDatum(iso){', 'function esc(s){')   // Datum, neuesProbenDatum und der Block „NACHAUFTRAG (5.5.0)“
  + between('function uebergabeDateiname(art){', '/** Spektron-Ordner: Die Projektdatei')
  + 'function safeFilename(s){return(String(s||"").trim()||"Projekt").replace(/[\\\\/:*?"<>|]+/g,"-").replace(/\\s+/g,"_").replace(/^-+|-+$/g,"")||"Projekt"}'
  + between('function projektNummer(v){', 'function gleichesProjekt(');
const plain = x => JSON.parse(JSON.stringify(x));

function welt({heute = '2026-08-22', pj = null, url = {}} = {}) {
  const felder = {'proj-nr': {value: '26.0999 Teststadt Ka'}, 'svb-bohrmehl': {checked: false}};
  const c = {
    console, probenStartNr: 1, proben: [], chloridProben: [], asbestProben: [], sonstigeProben: [], undoStack: ['alt'], APP_VERSION: '5.5.0',
    markUnsaved() { c.unsaved = (c.unsaved || 0) + 1; }, projektArchivAutoSave() {}, fbeKuerzel: () => 'Ka', window: {},
    flash(t) { c.meldung = t; }, confirm(t) { c.fragen.push(t); return c.antworten.length ? c.antworten.shift() : true; }, alert(t) { c.fragen.push(t); },
    fragen: [], antworten: [], document: {getElementById: id => felder[id] || null},
    PROJEKTORDNER: {state: {proj: null, pj}, projektdaten: () => ({ortstermin: pj ? pj.ortstermin || '' : ''})},
    PROJEKT_URL: {projekt: null, mitteilung: null, ...url},
    beschreibung: p => [p.z2, p.z3, p.z4].filter(Boolean).join(', '), beschreibungChlorid: p => [p.z2, p.z3, p.z4].filter(Boolean).join(', '),
    beschreibungAsbest: p => [p.z2, p.z3].filter(Boolean).join(', '), beschreibungSonstige: p => p.z2 || ''
  };
  vm.createContext(c);
  vm.runInContext(code + '\n;globalThis.__get=n=>eval(n);globalThis.__set=(n,v)=>eval(n+"=v");', c);   // let-Variablen des Skripts lesen/setzen
  // Uhr: heute fest (Date für today(), tagIso und den Dateinamen)
  vm.runInContext(`(()=>{const T=new Date(${JSON.stringify(heute + 'T10:00:00')}).getTime(),D=Date;Date=class extends D{constructor(...a){super(...(a.length?a:[T]));}static now(){return T;}};})()`, c);
  return c;
}
const pak = (n, extra) => ({id: n, _nr: n, z2: 'Raum ' + n, z3: 'verrußt', z4: 'Decke', matrix: 'Wischprobe', datum: '2026-08-12', ...extra});
const fest = (am, anlass) => ({am: am + 'T10:00:00.000Z', anlass});
const weiter = [];
let n = 0; const ok = m => { n++; if (process.env.VERBOSE) console.log('  ✓ ' + m); };

// 1. Ein Auftrag: keine Zeile, Ansicht „alle“, keine neuen Felder, Name wie bisher
{
  const c = welt();
  c.proben = [1, 2, 3].map(i => pak(i, {nrFest: fest('2026-08-14', 'Abschluss')}));
  vm.runInContext('auftraegeAnwenden({proben})', c);
  assert.equal(c.sichtOptionen(), null);
  assert.equal(c.sicht(), 'alle');
  assert.deepEqual(plain(c.auftraegeFuerDatei()), {}, 'kein neues Feld');
  assert.equal(c.auswahl(c.proben).length, 3);
  assert.equal(c.uebergabeDateiname('pak'), '26.0999_Teststadt_Ka_PAK_22.8.2026_Laborübergabe.xls');
  assert.equal(c.nachauftragVorAusgabe(), true, 'keine Rückfrage');
  ok('ein Auftrag wie bisher');
}

// 2. Vorschlag aus den Laborübergaben (ein Tag), bestätigen, Nachauftrag fest machen, Dateiname, Zähler
{
  const c = welt();
  c.proben = [1, 2, 3].map(i => pak(i, {nrFest: fest('2026-08-14', 'Etiketten')})).concat([pak(4), pak(5)]);
  c.asbestProben = [pak(6, {z2: 'Putz'})];
  vm.runInContext('auftraegeAnwenden({proben})', c);
  c.__get('auftragBefund').dateien = [{name: '26.0999_PAK_14.8.2026_Laborübergabe.xls', datum: '2026-08-14', nummern: [1, 2, 3]}];
  const v = c.auftragBestandVorschlag();
  assert.deepEqual(plain(v.auftraege), [{id: 'a1', am: '2026-08-14', quelle: 'Laborübergabe vom 14.08.2026', proben: [1, 2, 3]}]);
  assert.deepEqual(plain(v.neu), [4, 5, 6]);
  assert.equal(c.schonBeimLaborText(), 'P1–P3 sind laut Laborübergabe vom 14.08.2026 schon beim Labor.', 'Rückfrage „alle“ auch vor dem Festhalten');
  c.auftragVorschlagUebernehmen(v.auftraege);
  assert.deepEqual(plain(c.sichtOptionen().ids), ['neu', 'alle']);
  assert.equal(c.sicht(), 'neu');
  assert.deepEqual(plain(c.auswahl(c.proben).map(p => p._nr)), [4, 5]);
  assert.deepEqual(plain(c.auswahl(c.asbestProben).map(p => p._nr)), [6]);
  assert.equal(c.proben[0].auftrag, undefined, 'noch nichts an den Proben');
  const r = c.nachauftragFestmachen('Kopieren');
  assert.deepEqual(plain(r), {id: 'a2', k: 2, nrs: [4, 5, 6]});
  assert.deepEqual(plain(c.proben.map(p => p.auftrag)), ['a1', 'a1', 'a1', 'a2', 'a2']);
  assert.equal(c.asbestProben[0].auftrag, 'a2', 'alle neuen Proben, auch anderer Arten');
  assert.ok(c.proben[3].nrFest && c.asbestProben[0].nrFest, 'Merkmal nur mit fester Nummer');
  assert.deepEqual(plain(c.auftraegeFuerDatei()), {weitereAuftraege: [{id: 'a2', am: '2026-08-22', von: 'Ka', proben: [4, 5, 6]}], auftragZaehler: 2,
    auftrag1: {am: '2026-08-14', quelle: 'Laborübergabe vom 14.08.2026', proben: [1, 2, 3]}});
  assert.equal(c.sicht(), 'a2');
  assert.equal(c.undoStack.length, 0, 'kein Rückgängig über das Festwerden');
  assert.equal(c.uebergabeDateiname('pak'), '26.0999_Teststadt_Ka_PAK_22.8.2026_Auftrag-2_Laborübergabe.xls');
  c.__set('lkSichtWahl', 'a1');
  assert.equal(c.uebergabeDateiname('pak'), '26.0999_Teststadt_Ka_PAK_14.8.2026_Laborübergabe.xls', 'Auftrag 1: Name wie bisher, Tag des Auftrags');
  assert.equal(c.nachauftragFestmachen('Kopieren'), null, 'nur in der Ansicht „neu“');
  ok('Vorschlag aus Dateien, Nachauftrag fest, Dateiname');
  // Zurücknehmen (N9): neue Proben wieder neu, Kennung verbraucht
  weiter.push((async () => {
    c.__set('lkSichtWahl', 'a2');
    assert.equal(await c.nachauftragZuruecknehmen('a2'), true);
    assert.deepEqual(c.proben.map(p => p.auftrag || null), ['a1', 'a1', 'a1', null, null]);
    assert.ok(c.proben[3].nrFest, 'Nummer bleibt fest');
    assert.equal(c.__get('auftragZaehler'), 2, 'Zähler sinkt nie');
    assert.match(c.fragen.pop(), /der nächste Nachauftrag heißt Auftrag 3/);
    c.__set('lkSichtWahl', null);
    assert.equal(c.sicht(), 'neu');
    assert.equal(c.nachauftragFestmachen('Kopieren').id, 'a3', 'a2 wird nicht wieder vergeben');
    ok('Zurücknehmen, Kennung nie neu');
    // Datei des Auftrags gespeichert → nicht mehr zurücknehmbar
    c.PROJEKTORDNER.state.proj = {lab: {async *values() { yield {kind: 'file', name: '26.0999_PAK_22.8.2026_Auftrag-3_Laborübergabe.xls'}; }}};
    assert.equal(await c.nachauftragZuruecknehmen('a3'), false);
    assert.match(c.fragen.pop(), /lässt sich nicht mehr zurücknehmen/);
    assert.equal(c.proben[3].auftrag, 'a3');
    ok('Zurücknehmen gesperrt nach gespeicherter Datei');
  })());
}

// 3. Merkmal gilt nur mit fester Nummer und Eintrag in der Liste; Kopie verliert es; Liste fehlt → neu aufgebaut
{
  const c = welt();
  c.proben = [pak(1, {nrFest: fest('2026-08-14', 'Abschluss'), auftrag: 'a1'}), pak(2, {nrFest: fest('2026-08-22', 'Kopieren'), auftrag: 'a2'}),
    pak(3, {auftrag: 'a1'}), pak(4, {nrFest: fest('2026-08-22', 'Etiketten'), auftrag: 'a2'})];
  vm.runInContext(`auftraegeAnwenden({proben,weitereAuftraege:[{id:'a2',am:'2026-08-22',von:'Ka',proben:[2]}],auftragZaehler:2,auftrag1:{am:'2026-08-14',quelle:'x',proben:[1]}})`, c);
  assert.equal(c.__get('auftragAufgebaut'), '', 'nichts fehlt');
  assert.deepEqual(plain(c.proben.map(p => c.auftragVon(p))), ['a1', 'a2', null, null], 'ohne feste Nummer (P3) oder nicht in der Liste (P4): neu');
  assert.deepEqual(plain(c.ungueltigeMerkmale('pak').map(p => p._nr)), [3, 4]);
  assert.equal('auftrag' in c.ohneNrStatus(c.proben[0]), false, 'Kopie ohne Merkmal');
  assert.equal(c.mehrereAuftraege(), true);
  assert.deepEqual(plain(c.sichtOptionen().ids), ['neu', 'a1', 'a2', 'alle']);
  // Datei aus 5.4.0: Liste und Zähler fehlen, Merkmale bleiben
  const d = welt();
  d.proben = [pak(1, {nrFest: fest('2026-08-14', 'Abschluss'), auftrag: 'a1'}), pak(2, {nrFest: fest('2026-08-22', 'Kopieren'), auftrag: 'a3'}), pak(3, {auftrag: 'a2'})];
  vm.runInContext('auftraegeAnwenden({proben})', d);
  assert.match(d.__get('auftragAufgebaut'), /neu aufgebaut: Auftrag 1 P1 · Auftrag 3 P2\./);
  assert.equal(d.__get('auftragZaehler'), 3);
  assert.deepEqual(plain(d.auftraegeFuerDatei().weitereAuftraege), [{id: 'a3', am: '', von: '', proben: [2], quelle: 'neu aufgebaut'}]);
  assert.equal(d.naechsteAuftragNr(), 4, 'auch ungültige Merkmale zählen für die Kennung');
  ok('Merkmal-Regeln, Kopie, Liste neu aufgebaut');
}

// 4. Vorschlag: zwei Tage (Bestand, schon zweimal übergeben), keine Datei (feste Nummern), unlesbare Datei, keine neuen Proben
{
  const c = welt();
  c.proben = [1, 2].map(i => pak(i, {nrFest: fest('2026-08-14', 'Etiketten')})).concat([3, 4].map(i => pak(i, {nrFest: fest('2026-08-22', 'Etiketten')})), [pak(5)]);
  vm.runInContext('auftraegeAnwenden({proben})', c);
  c.__get('auftragBefund').dateien = [{name: '26.0999_PAK_14.8.2026_Laborübergabe.xls', datum: '2026-08-14', nummern: [1, 2]}, {name: '26.0999_PAK_22.8.2026_Laborübergabe.xls', datum: '2026-08-22', nummern: [1, 2, 3, 4]}];
  const v = c.auftragBestandVorschlag();
  assert.deepEqual(plain(v.auftraege.map(a => [a.id, a.am, a.proben])), [['a1', '2026-08-14', [1, 2]], ['a2', '2026-08-22', [3, 4]]], 'früheste Datei je Probe');
  assert.deepEqual(plain(v.neu), [5]);
  c.auftragVorschlagUebernehmen(v.auftraege);
  assert.equal(c.nachauftragFestmachen('Abschluss').id, 'a3');
  assert.deepEqual(plain(c.__get('weitereAuftraege').map(a => a.id)), ['a2', 'a3']);
  ok('zwei Tage → zwei frühere Aufträge');
  // keine Datei: feste Nummern beim Öffnen (Kopieren am 14.08., Etiketten am selben Tag) – später gedruckte zählen als neu
  const k = welt();
  k.proben = [pak(1, {nrFest: fest('2026-08-14', 'Kopieren')}), pak(2, {nrFest: fest('2026-08-13', 'Etiketten')}), pak(3, {nrFest: fest('2026-08-21', 'Etiketten')}), pak(4)];
  vm.runInContext('auftraegeAnwenden({proben})', k);
  const w = k.auftragBestandVorschlag();
  assert.deepEqual(plain(w.auftraege.map(a => [a.am, a.proben])), [['2026-08-14', [1, 2]]]);
  assert.equal(w.quelle, 'festen Probennummern (übergeben am 14.08.2026)');
  assert.deepEqual(plain(w.neu), [3, 4]);
  // in dieser Sitzung fest geworden (Kopieren gerade eben) → kein früherer Auftrag (derselbe Laborauftrag, Art für Art kopiert)
  const s = welt();
  s.proben = [pak(1), pak(2)];
  vm.runInContext('auftraegeAnwenden({proben})', s);
  s.proben[0].nrFest = fest('2026-08-22', 'Kopieren');
  assert.equal(s.auftragBestandVorschlag(), null);
  // unlesbare Datei (in Excel umgespeichert): Tag aus dem Namen, Proben nach festen Nummern
  const u = welt();
  u.proben = [pak(1, {nrFest: fest('2026-08-14', 'Etiketten')}), pak(2)];
  vm.runInContext('auftraegeAnwenden({proben})', u);
  u.__get('auftragBefund').dateien = [{name: '26.0999_PAK_14.8.2026_Laborübergabe.xls', datum: '2026-08-14', nummern: null}];
  const x = u.auftragBestandVorschlag();
  assert.deepEqual(plain(x.auftraege.map(a => a.proben)), [[1]]);
  assert.deepEqual(plain(x.unlesbar), ['26.0999_PAK_14.8.2026_Laborübergabe.xls']);
  assert.match(x.quelle, /Inhalt nicht lesbar/);
  // keine neuen Proben → keine Rückfrage, nichts ändert sich
  const g = welt();
  g.proben = [pak(1, {nrFest: fest('2026-08-14', 'Abschluss')})];
  vm.runInContext('auftraegeAnwenden({proben})', g);
  g.__get('auftragBefund').dateien = [{name: '26.0999_PAK_14.8.2026_Laborübergabe.xls', datum: '2026-08-14', nummern: [1]}];
  assert.equal(g.auftragBestandVorschlag(), null);
  // „keine Probe ist beim Labor“ festgehalten → kein Vorschlag mehr
  k.__set('auftragBestandAus', true);
  assert.equal(k.auftragBestandVorschlag(), null);
  ok('Vorschlag ohne Datei, unlesbar, ohne neue Proben');
}

// 5. Laborübergabe-Dateien lesen: Datum aus dem Namen, Nummern aus Spalte 1, fremdes Projekt übergangen
weiter.push((async () => {
  const c = welt();
  const datei = (name, text) => ({kind: 'file', name, getFile: async () => ({text: async () => text})});
  const lab = {async *values() {
    yield datei('26.0999_PAK_14.8.2026_Laborübergabe.xls', '<table><tr><th>Probenreferenz</th></tr><tr><td>Probe 1</td><td>x</td></tr><tr><td>Probe 12</td></tr></table>');
    yield datei('26.0999_Chlorid_Bohrmehl_9.8.2026_Auftrag-2_Laborübergabe.xls', 'PK\u0003\u0004 binär');
    yield datei('26.0998_PAK_14.8.2026_Laborübergabe.xls', '<td>Probe 99</td>');
    yield datei('26.0999_Daten.json', '{}');
    yield {kind: 'directory', name: 'x_Laborübergabe.xls'};
  }};
  const l = await c.auftragDateienLesen(lab, '26.0999 Teststadt Ka');
  assert.deepEqual(plain(l), [{name: '26.0999_Chlorid_Bohrmehl_9.8.2026_Auftrag-2_Laborübergabe.xls', datum: '2026-08-09', nummern: null},
    {name: '26.0999_PAK_14.8.2026_Laborübergabe.xls', datum: '2026-08-14', nummern: [1, 12]}]);
  ok('Laborübergaben lesen');
})());

// 6. Datum neuer Proben (N7) und gelbe Zeile
{
  const ein = welt({pj: {ortstermin: '2026-08-12'}});
  assert.equal(ein.neuesProbenDatum([pak(1, {datum: '2026-08-13'})]), '2026-08-13', 'ein Termin: wie bisher die vorige Probe');
  assert.equal(ein.neuesProbenDatum([]), '2026-08-12');
  ein.proben = [pak(1, {datum: '2026-08-13'})];
  assert.deepEqual(plain(ein.datumOhneTermin('pak')), [], 'ein Termin: keine neue gelbe Zeile');
  const zwei = welt({pj: {ortstermin: '2026-08-12', weitereOrtstermine: [{id: 't2', datum: '2026-08-20'}, {id: 't3', datum: '2026-09-01'}]}});
  assert.equal(zwei.neuesProbenDatum([pak(1)]), '2026-08-20', 'mehrere Termine: neuester bis heute (nicht der künftige 01.09.)');
  assert.equal(zwei.ortsterminVorschlag(), '2026-08-20');
  zwei.proben = [pak(1), pak(2, {datum: '2026-08-21'}), pak(3, {datum: '2026-08-20'}), pak(4, {datum: '2026-08-21', storniert: {am: 'x'}, nrFest: {}})];
  assert.deepEqual(plain(zwei.datumOhneTermin('pak').map(p => p._nr)), [2]);
  const zukunft = welt({pj: {ortstermin: '2026-09-02', weitereOrtstermine: [{id: 't2', datum: '2026-09-05'}]}});
  assert.equal(zukunft.neuesProbenDatum([pak(1, {datum: '2026-08-13'})]), '2026-08-13', 'alle Termine in der Zukunft: wie bisher');
  ok('Datum neuer Proben');
}

// 7. Link „mitteilung=“ wählt den Auftrag der Mitteilung vor; Versionsvergleich
{
  const pj = {ortstermin: '2026-08-12', weitereMitteilungen: [{id: 'm2', auftraege: ['a2']}, {id: 'm3', auftraege: []}]};
  const c = welt({pj, url: {mitteilung: 'm2'}});
  c.proben = [pak(1, {nrFest: fest('2026-08-14', 'x'), auftrag: 'a1'}), pak(2, {nrFest: fest('2026-08-22', 'x'), auftrag: 'a2'})];
  vm.runInContext(`auftraegeAnwenden({proben,weitereAuftraege:[{id:'a2',am:'2026-08-22',von:'',proben:[2]}],auftragZaehler:2,auftrag1:{am:'2026-08-14',proben:[1]}})`, c);
  assert.equal(c.sicht(), 'a2');
  c.PROJEKT_URL.mitteilung = 'm3';
  assert.equal(c.sicht(), 'alle', 'leere Liste: Vorwahl');
  c.antworten.push(false);
  assert.equal(c.nachauftragVorAusgabe(), false, '„alle“ mit früheren Aufträgen: Rückfrage, Abbrechen übergibt nichts');
  assert.match(c.fragen.pop(), /^P1 \(Auftrag 1 vom 14\.08\.\) und P2 \(Auftrag 2 vom 22\.08\.\) sind schon beim Labor\./);
  assert.equal(c.nachauftragVorAusgabe(), true);
  assert.equal(c.nachauftragVorAusgabe(), true, 'einmal bestätigt');
  assert.equal(c.fragen.length, 1);
  assert.equal(c.versionVergleich('5.10.0', '5.5.0'), 1);
  assert.equal(c.versionVergleich('5.5.0', '5.5.0'), 0);
  assert.equal(c.versionVergleich('5.4.0', '5.5.0'), -1);
  vm.runInContext(`auftraegeAnwenden({proben,version:'5.6.0',kuenftig:1,textblockLabor:'x'})`, c);
  assert.match(c.__get('lkVersionSperre'), /LabelKit 5\.6\.0 – neuer als dieses Fenster \(5\.5\.0\)/);
  assert.equal(c.nachauftragVorAusgabe(), false, 'Versionssperre');
  assert.deepEqual(plain(c.__get('projektUnbekannt')), {kuenftig: 1}, 'unbekannte Felder gemerkt, ältere Angaben (ui) nicht');
  ok('mitteilung=, Rückfrage alle, Versionssperre');
}
Promise.all(weiter).then(() => console.log('OK Nachauftrag: ' + n + ' Prüfgruppen (Ansicht, Festwerden, Kennung, Merkmal, Vorschlag, Dateien, Datum, Zurücknehmen, Link, Version)'))
  .catch(e => { console.error(e); process.exitCode = 1; });
