// Feste Projektdatei „<Nr>_Daten.json“ + datierte Sicherungen (4.50.0, Workflow-Review Befund 7).
// Speichern an zwei Tagen, fremder Stand vom Vortag, Übergang aus datierten Dateien, Sicherungen unsichtbar für die
// „_Daten.json“-Suche, Aufräumen. Ordner im Speicher, nur synthetische Daten.
'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const stueck = (von, bis) => { const a = html.indexOf(von), b = html.indexOf(bis, a + von.length); assert.ok(a >= 0 && b > a, 'Abschnitt ' + von); return html.slice(a, b); };
const zeile = von => stueck(von, '\n');

let uhr = 1;   // Änderungsdatum der Dateien: jede Schreibung später als die vorige
/** Ordner im Speicher mit Unterordnern; haken.vorSchreiben(name) läuft in createWritable, haken.fehler(name) wirft dort. */
function ordner(name, dateien = {}, haken = {}){
  const zeit = {}; for (const n of Object.keys(dateien)) zeit[n] = uhr++;
  const d = {
    name, kind: 'directory', dateien, zeit, ordner: {}, haken,
    async *values(){ for (const n of Object.keys(dateien)) yield d.handle(n); for (const n of Object.keys(d.ordner)) yield d.ordner[n]; },
    handle(n){
      return { name: n, kind: 'file',
        getFile: async () => ({ name: n, text: async () => dateien[n], lastModified: zeit[n] }),
        createWritable: async () => {
          if (haken.fehler && haken.fehler(n)) throw Object.assign(Error('Schreibfehler (synthetisch)'), { name: 'NotAllowedError' });
          if (haken.vorSchreiben) await haken.vorSchreiben(n);
          let t = ''; return { write: async v => { t = v; }, close: async () => { dateien[n] = t; zeit[n] = uhr++; }, abort: async () => {} };
        } };
    },
    async getFileHandle(n, o){ if (!(n in dateien)){ if (!(o && o.create)) throw Object.assign(Error('fehlt'), { name: 'NotFoundError' }); dateien[n] = ''; zeit[n] = uhr++; } return d.handle(n); },
    async getDirectoryHandle(n, o){ if (!d.ordner[n]){ if (!(o && o.create)) throw Object.assign(Error('fehlt'), { name: 'NotFoundError' }); d.ordner[n] = ordner(n, {}, haken.unter || {}); } return d.ordner[n]; },
    async removeEntry(n){ if (!(n in dateien)) throw Object.assign(Error('fehlt'), { name: 'NotFoundError' }); delete dateien[n]; delete zeit[n]; }
  };
  return d;
}
function laden(antworten = []){
  const fragen = [];
  const ctx = { console, navigator: {}, DOMException: class extends Error { constructor(m, n){ super(m); this.name = n; } },
    confirm: m => { fragen.push(m); assert.ok(antworten.length, 'unerwartete Rückfrage: ' + m); return antworten.shift(); } };
  vm.createContext(ctx);
  vm.runInContext(zeile('function safeFilename(s){') + '\n' + zeile('function projektNummer(v){') + '\n'
    + stueck('function projektdateiName(nr){', '\n\n') + '\n' + stueck('/* Sicher speichern', 'const meldungAnhang='), ctx);
  ctx.tag = t => { ctx.projektdateiJetzt = () => new Date(t); };
  return { ctx, fragen };
}
const FEST = '99.9001_Daten.json', S = '_LabelKit_Sicherungen';
const stand = (inhalt, am) => JSON.stringify({ gespeichertAm: new Date(am).toISOString(), projekt: { nr: '99.9001' }, inhalt });
/** Was eine „_Daten.json“-Suche findet (wie LabelKit, ResultKit, BerichtKit, PlanKit, FotoKit, Leiste): Dateien im Ordner selbst. */
const datenDateien = d => Object.keys(d.dateien).filter(n => /_Daten\.json$/i.test(n));
/** Alle Dateien im ganzen Baum, die auf „_Daten.json“ enden – auch rekursiv sieht niemand eine Sicherung. */
const baum = (d, p = '') => Object.keys(d.dateien).map(n => p + n).concat(...Object.values(d.ordner).map(u => baum(u, p + u.name + '/')));
/** Öffnen wie im Projektordner: in einem Durchgang lesen und merken (siehe oeffnen). */
async function oeffnen(ctx, d){
  const b = await ctx.projektdateienLesen(d, FEST);
  ctx.projektStandMerken(d, FEST, { fest: b.fest, datiert: b.datiert, gelesen: b.neueste ? b.neueste.text : null });
  return b;
}

(async () => {
  // 0. Dateiname: nur die Projektnummer, auch wenn die Adresse im Feld steht; ohne Nummer der Text wie bisher
  {
    const { ctx } = laden();
    assert.equal(ctx.projektdateiName('26.0560'), '26.0560_Daten.json');
    assert.equal(ctx.projektdateiName('26.0512 Stegerwaldstraße Leverkusen'), '26.0512_Daten.json');
    assert.equal(ctx.projektdateiName('PAK'), 'PAK_Daten.json');
    assert.equal(ctx.datierteProjektdatei('26.0512_Stegerwaldstraße_Leverkusen_1.10.2026_Daten.json', '26.0512'), '2026-10-01', 'datierte Datei mit Adresse gehört zum Projekt');
    assert.equal(ctx.datierteProjektdatei('26.0513_01.10.2026_Daten.json', '26.0512'), null, 'andere Nummer nie');
    assert.equal(ctx.datierteProjektdatei('26.0512_Daten.json', '26.0512'), null, 'die feste Datei ist nicht datiert');
    assert.equal(ctx.datierteProjektdatei('26.0512_PAK_x_Daten.json', '26.0512'), null, 'ältere Formate bleiben liegen');
  }
  console.log('OK Dateiname: „<Nr>_Daten.json“, datierte Dateien nur desselben Projekts');

  // 1. Speichern an zwei Tagen → eine Datei plus Sicherung des Vortags; am selben Tag keine Sicherung
  {
    const d = ordner('LabelKit'), { ctx, fragen } = laden();
    ctx.tag('2026-10-29T09:00:00');
    await ctx.sicherSpeichern(d, FEST, stand('Mi früh', '2026-10-29T09:00:00'));
    await ctx.sicherSpeichern(d, FEST, stand('Mi abend', '2026-10-29T18:00:00'));
    assert.equal(d.ordner[S], undefined, 'am selben Tag keine Sicherung');
    ctx.tag('2026-10-30T08:00:00');
    await ctx.sicherSpeichern(d, FEST, stand('Do', '2026-10-30T08:00:00'));
    await ctx.sicherSpeichern(d, FEST, stand('Do mittag', '2026-10-30T12:00:00'));
    ctx.tag('2026-10-31T08:00:00');
    await ctx.sicherSpeichern(d, FEST, stand('Fr', '2026-10-31T08:00:00'));
    assert.deepEqual(datenDateien(d), [FEST], 'genau eine Projektdatei');
    assert.equal(JSON.parse(d.dateien[FEST]).inhalt, 'Fr');
    assert.deepEqual(Object.keys(d.ordner[S].dateien).sort(), ['99.9001_2026-10-29_Sicherung.json', '99.9001_2026-10-30_Sicherung.json']);
    assert.equal(JSON.parse(d.ordner[S].dateien['99.9001_2026-10-29_Sicherung.json']).inhalt, 'Mi abend', 'letzter Stand des Tages');
    assert.equal(JSON.parse(d.ordner[S].dateien['99.9001_2026-10-30_Sicherung.json']).inhalt, 'Do mittag');
    assert.equal(fragen.length, 0);
  }
  console.log('OK Zwei Tage: eine Projektdatei, je Arbeitstag eine Sicherung (letzter Stand)');

  // 2. Fremder Stand vom Vortag → Rückfrage (bis 4.49 entstand still eine neue Datei daneben)
  {
    const d = ordner('LabelKit', { [FEST]: stand('gemeinsamer Stand', '2026-10-28T10:00:00') });
    const A = laden([false, true]), B = laden();
    A.ctx.tag('2026-10-29T08:00:00'); B.ctx.tag('2026-10-29T16:00:00');
    await oeffnen(A.ctx, d); await oeffnen(B.ctx, d);                         // beide Rechner öffnen am 29.
    await B.ctx.sicherSpeichern(d, FEST, stand('Arbeit von B', '2026-10-29T16:00:00'));   // B speichert am 29.
    A.ctx.tag('2026-10-30T09:00:00');                                          // A speichert am 30. aus dem älteren Stand
    await assert.rejects(A.ctx.sicherSpeichern(d, FEST, stand('A aus altem Stand', '2026-10-30T09:00:00')), e => e.name === 'AbortError');
    assert.match(A.fragen[0], /inzwischen geändert/); assert.match(A.fragen[0], /Sicherung/);
    assert.equal(JSON.parse(d.dateien[FEST]).inhalt, 'Arbeit von B', 'Abbrechen lässt Bs Stand liegen');
    assert.deepEqual(datenDateien(d), [FEST], 'keine zweite Datei daneben');
    await A.ctx.sicherSpeichern(d, FEST, stand('A bewusst', '2026-10-30T09:05:00'));   // OK = überschreiben …
    assert.equal(JSON.parse(d.dateien[FEST]).inhalt, 'A bewusst');
    const s = d.ordner[S].dateien;   // … Bs Stand liegt mit Uhrzeit in den Sicherungen (dazu Bs Tagessicherung vom 28.)
    assert.deepEqual(Object.keys(s).sort(), ['99.9001_2026-10-28_Sicherung.json', '99.9001_2026-10-30_0900_Sicherung.json']);
    assert.equal(JSON.parse(s['99.9001_2026-10-30_0900_Sicherung.json']).inhalt, 'Arbeit von B');
    await A.ctx.sicherSpeichern(d, FEST, stand('A weiter', '2026-10-30T10:00:00'));   // danach fragt A nicht mehr
    assert.equal(A.fragen.length, 2);
  }
  console.log('OK Fremder Stand vom Vortag: Rückfrage, Abbrechen ändert nichts, OK sichert den fremden Stand');

  // 3. Übergang aus datierten Dateien: neueste wird geladen, erstes Speichern legt die feste Datei an und verschiebt
  {
    const alt28 = stand('28.', '2026-10-28T17:00:00'), alt29 = stand('29.', '2026-10-29T17:00:00');
    const d = ordner('Laboraufträge', {
      '99.9002_29.10.2026_Daten.json': 'anderes Projekt', '99.9001_PAK_2025_Daten.json': 'ganz altes Format',
      '99.9001_28.10.2026_Daten.json': alt28, '99.9001_29.10.2026_Daten.json': alt29,
      '99.9001_PAK_29.10.2026_Laborübergabe.xls': 'XLS'
    });
    const { ctx, fragen } = laden(); ctx.tag('2026-10-30T09:00:00');
    const b = await oeffnen(ctx, d);
    assert.equal(b.neueste.name, '99.9001_29.10.2026_Daten.json', 'wie bisher die neueste'); assert.equal(b.fest, null);
    assert.deepEqual([...b.datiertNamen].sort(), ['99.9001_28.10.2026_Daten.json', '99.9001_29.10.2026_Daten.json']);
    await ctx.sicherSpeichern(d, FEST, stand('30.', '2026-10-30T09:00:00'));
    assert.equal(fragen.length, 0, 'bekannte datierte Dateien: keine Rückfrage');
    assert.deepEqual(datenDateien(d).sort(), [FEST, '99.9001_PAK_2025_Daten.json', '99.9002_29.10.2026_Daten.json'], 'fremde Nummer und altes Format bleiben liegen');
    assert.equal(d.dateien['99.9001_PAK_29.10.2026_Laborübergabe.xls'], 'XLS');
    assert.deepEqual(d.ordner[S].dateien, { '99.9001_2026-10-28_Sicherung.json': alt28, '99.9001_2026-10-29_Sicherung.json': alt29 }, 'byte-gleich verschoben');
    assert.match(ctx.projektdateiMeldung(), /^2 ältere Projektdateien nach „_LabelKit_Sicherungen“ verschoben$/);
    assert.equal(ctx.projektdateiMeldung(), '', 'Meldung nur einmal');
  }
  // 3b. Gleicher Sicherungsname mit anderem Inhalt → „(2)“; Fehler beim Kopieren → Original bleibt, nächstes Speichern fragt nicht
  {
    const alt = stand('29. alt', '2026-10-29T17:00:00'), kaputt = stand('28.', '2026-10-28T17:00:00');
    const d = ordner('Laboraufträge', { '99.9001_29.10.2026_Daten.json': alt, '99.9001_28.10.2026_Daten.json': kaputt },
      { unter: { fehler: n => n.includes('2026-10-28') && laden.einmal && !(laden.einmal = false) } });
    d.ordner[S] = ordner(S, { '99.9001_2026-10-29_Sicherung.json': 'anderer Inhalt' }, d.haken.unter);
    laden.einmal = true;
    const { ctx, fragen } = laden(); ctx.tag('2026-10-30T09:00:00');
    await oeffnen(ctx, d);
    await ctx.sicherSpeichern(d, FEST, stand('30.', '2026-10-30T09:00:00'));
    assert.equal(d.ordner[S].dateien['99.9001_2026-10-29_Sicherung.json'], 'anderer Inhalt', 'vorhandene Sicherung bleibt');
    assert.equal(d.ordner[S].dateien['99.9001_2026-10-29_Sicherung (2).json'], alt);
    assert.equal(d.dateien['99.9001_28.10.2026_Daten.json'], kaputt, 'Kopierfehler: Original bleibt');
    assert.equal('99.9001_2026-10-28_Sicherung.json' in d.ordner[S].dateien, false, 'keine leere Sicherung liegen gelassen');
    assert.match(ctx.projektdateiMeldung(), /1 ältere Projektdatei .*verschoben · liegen geblieben: „99\.9001_28\.10\.2026_Daten\.json“/);
    await ctx.sicherSpeichern(d, FEST, stand('30. später', '2026-10-30T10:00:00'));   // zweiter Versuch klappt, ohne Rückfrage
    assert.equal(d.dateien['99.9001_28.10.2026_Daten.json'], undefined);
    assert.equal(d.ordner[S].dateien['99.9001_2026-10-28_Sicherung.json'], kaputt);
    assert.equal(fragen.length, 0);
  }
  // 3c. Datierte Datei kommt nach dem Laden dazu (älteres LabelKit auf einem anderen Rechner) → Rückfrage; nie geladen → Rückfrage
  {
    const d = ordner('Laboraufträge', { '99.9001_29.10.2026_Daten.json': stand('29.', '2026-10-29T17:00:00') });
    const { ctx, fragen } = laden([false, true]); ctx.tag('2026-10-30T09:00:00');
    await oeffnen(ctx, d);
    d.dateien['99.9001_30.10.2026_Daten.json'] = stand('altes LabelKit am 30.', '2026-10-30T08:30:00'); d.zeit['99.9001_30.10.2026_Daten.json'] = uhr++;
    await assert.rejects(ctx.sicherSpeichern(d, FEST, stand('30.', '2026-10-30T09:00:00')), e => e.name === 'AbortError');
    assert.match(fragen[0], /99\.9001_30\.10\.2026_Daten\.json“ in „Laboraufträge“ ist nach dem Laden dazugekommen/);
    assert.deepEqual(datenDateien(d).sort(), ['99.9001_29.10.2026_Daten.json', '99.9001_30.10.2026_Daten.json'], 'Abbrechen: nichts geschrieben, nichts verschoben');
    await ctx.sicherSpeichern(d, FEST, stand('30.', '2026-10-30T09:00:00'));
    assert.deepEqual(datenDateien(d), [FEST]);
    assert.equal(JSON.parse(d.ordner[S].dateien['99.9001_2026-10-30_Sicherung.json']).inhalt, 'altes LabelKit am 30.', 'nichts verloren');
    const nie = ordner('Laboraufträge', { '99.9001_29.10.2026_Daten.json': 'x' }), n = laden([false]);
    await assert.rejects(n.ctx.sicherSpeichern(nie, FEST, '{}'), e => e.name === 'AbortError');
    assert.match(n.fragen[0], /nichts von dort geladen/);
  }
  // 3d. Älteres LabelKit schreibt nach der Umstellung eine datierte Datei, die neuer ist als die feste → die wird geladen,
  //     die bisherige feste Datei kommt beim Speichern mit Uhrzeit in die Sicherungen
  {
    const d = ordner('LabelKit', { [FEST]: stand('fest vom Vormittag', '2026-10-30T10:00:00') });
    d.dateien['99.9001_30.10.2026_Daten.json'] = stand('altes LabelKit 11 Uhr', '2026-10-30T11:00:00'); d.zeit['99.9001_30.10.2026_Daten.json'] = uhr++;
    const { ctx, fragen } = laden(); ctx.tag('2026-10-30T12:00:00');
    const b = await oeffnen(ctx, d);
    assert.equal(b.neueste.name, '99.9001_30.10.2026_Daten.json'); assert.ok(b.neueste.datiert && b.fest !== null, 'Fall für den Hinweis beim Öffnen');
    await ctx.sicherSpeichern(d, FEST, stand('weiter auf 11 Uhr', '2026-10-30T12:00:00'));
    assert.equal(fragen.length, 0);
    assert.deepEqual(datenDateien(d), [FEST]);
    const s = d.ordner[S].dateien;
    assert.equal(JSON.parse(s['99.9001_2026-10-30_1200_Sicherung.json']).inhalt, 'fest vom Vormittag', 'nicht geladener Stand mit Uhrzeit gesichert');
    assert.equal(JSON.parse(s['99.9001_2026-10-30_Sicherung.json']).inhalt, 'altes LabelKit 11 Uhr');
  }
  console.log('OK Übergang: neueste datierte geladen, feste Datei angelegt, datierte geprüft verschoben (Namensgleichheit, Kopierfehler, nachträglich dazugekommen, älteres LabelKit)');

  // 4. Sicherungen findet keine „_Daten.json“-Suche – weder im Ordner noch im ganzen Baum noch über spektron-ordner.js
  {
    const d = ordner('LabelKit'), { ctx } = laden();
    for (let t = 1; t <= 5; t++){ ctx.tag('2026-10-' + (20 + t) + 'T09:00:00'); await ctx.sicherSpeichern(d, FEST, stand('Tag ' + t, '2026-10-' + (20 + t) + 'T09:00:00')); }
    assert.equal(Object.keys(d.ordner[S].dateien).length, 4);
    assert.deepEqual(baum(d).filter(n => /_Daten\.json$/i.test(n)), [FEST]);
    assert.equal((await ctx.projektdateienLesen(d.ordner[S], FEST)).neueste, null);
    const SO = require('../spektron-ordner.js'), passt = SO.BEREICHE.labelkit.passt;
    for (const n of Object.keys(d.ordner[S].dateien).concat('99.9001_2026-10-30_1200_Sicherung (2).json')) assert.equal(passt(n, 'file'), false, n);
    assert.equal(passt(S, 'directory'), false, 'Sicherungsordner zählt nicht für die Ortswahl');
    assert.equal(passt(FEST, 'file'), true, 'die feste Datei findet spektron-ordner.js');
    // Die feste Datei hat am neuen Ort Vorrang: ort() wählt den Ort mit Projektdatei, die Sicherungen ändern daran nichts
    const pj = ordner('26.0560 Synthetisch'); pj.ordner._Spektron = ordner('_Spektron'); pj.ordner._Spektron.ordner.LabelKit = d;
    pj.ordner['Laboraufträge'] = ordner('Laboraufträge', { 'x.xls': '' });
    const r = await SO.ort(pj, 'labelkit'); assert.equal(r.wo, 'neu'); assert.equal(r.dir, d); assert.equal(r.konflikt, false);
  }
  console.log('OK Sicherungen: unsichtbar für jede „_Daten.json“-Suche und für spektron-ordner.js');

  // 5. Aufräumen: nur die neuesten 30 Sicherungen dieses Projekts bleiben, fremde Dateien bleiben unberührt
  {
    const s = {}; for (let i = 0; i < 33; i++){ const t = new Date(2026, 8, 1 + i); s['99.9001_' + t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0') + '_Sicherung.json'] = 'S' + i; }
    s['99.9002_2026-01-01_Sicherung.json'] = 'anderes Projekt'; s['Notiz.txt'] = 'von Hand';
    const d = ordner('LabelKit', { [FEST]: stand('alt', '2026-10-03T10:00:00') }); d.ordner[S] = ordner(S, s);
    const { ctx } = laden(); ctx.tag('2026-10-31T09:00:00');
    await oeffnen(ctx, d);
    await ctx.sicherSpeichern(d, FEST, stand('neu', '2026-10-31T09:00:00'));
    const namen = Object.keys(d.ordner[S].dateien).filter(n => n.startsWith('99.9001_')).sort();
    assert.equal(namen.length, 30); assert.equal(namen[29], '99.9001_2026-10-03_Sicherung.json', 'neueste dabei');
    assert.equal(namen[0], '99.9001_2026-09-05_Sicherung.json', 'die ältesten vier sind weg');
    assert.equal(d.ordner[S].dateien['99.9002_2026-01-01_Sicherung.json'], 'anderes Projekt'); assert.equal(d.ordner[S].dateien['Notiz.txt'], 'von Hand');
  }
  console.log('OK Aufräumen: neueste 30 Sicherungen, fremde Dateien bleiben');

  // 6. Sicherung schlägt fehl → nicht gespeichert, bisheriger Stand bleibt
  {
    const d = ordner('LabelKit', { [FEST]: stand('Vortag', '2026-10-29T10:00:00') }, { unter: { fehler: () => true } });
    const { ctx } = laden(); ctx.tag('2026-10-30T09:00:00');
    await oeffnen(ctx, d);
    await assert.rejects(ctx.sicherSpeichern(d, FEST, stand('heute', '2026-10-30T09:00:00')), /Sicherung des bisherigen Stands .* fehlgeschlagen – nicht gespeichert/);
    assert.equal(JSON.parse(d.dateien[FEST]).inhalt, 'Vortag');
  }
  console.log('OK Sicherung fehlgeschlagen: nichts überschrieben');
})().catch(e => { console.error(e); process.exitCode = 1; });
