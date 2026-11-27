// LabelKit 5.5.0 – Nachauftrag (Plan claude/labelkit-nachauftrag-plan.md, N1–N10) im echten Browser:
// node tests/nachauftrag-browser.cjs [chromium]
// Szenario F2: Projekt „26.0999 Teststadt Ka“, Ortstermine 12.08. und 20.08.2026.
//   Runde 1 (14.08.): 8 PAK + 5 Chlorid → P1–P13, „Laborauftrag speichern“ → Projektdatei ohne neues Feld (wie 5.4.0)
//   Runde 2 (22.08.): 4 PAK + 4 Asbest → Datum = Termin 2, Rückfrage „schon beim Labor“, nur die neuen auf Etiketten,
//   Kopie und Übergabe, Dateien „…_Auftrag-2_Laborübergabe.xls“ nur mit P14–P17 / P18–P21, keine Chlorid-Datei,
//   Runde-1-Dateien byte-gleich; „Alle“ mit Rückfrage; A1/A2; Datei aus 5.4.0 → Liste neu aufgebaut; Versionssperre;
//   zwei Fenster → vorhandene Rückfrage; Zurücknehmen (N9); geänderter Text (N10); Link „mitteilung=“.
// Projektordner im privaten Dateisystem des Browsers, nur erfundene Daten.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const playwright = require('playwright');

const name = process.argv[2] || 'chromium';
// Das private Dateisystem mancher Chrome-Fassungen lehnt „ü“ in Dateinamen ab (Absturz der Seite) – in der Testseite heißt die
// Laborübergabe deshalb „…_Laboruebergabe.xls“ (auch in allen Mustern, die danach suchen). Am Windows-Laufwerk gilt „ü“.
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/Laborübergabe/g, 'Laboruebergabe').replace(/laborübergabe/g, 'laboruebergabe');
const P = '26.0999 Teststadt Ka';
const FELDER_540 = ['version', 'gespeichertAm', 'nrSchutz', 'projekt', 'ui', 'proben', 'chloridProben', 'asbestProben', 'sonstigeProben', 'brandgeruchProben',
  'pn98Proben', 'nextId', 'sonstigeNextId', 'asbestNextId', 'probenStartNr', 'brandgeruchNextId', 'brandgeruchOrt', 'brandgeruchDatum', 'bgBlind', 'pn98NextId',
  'pn98Projekt', 'feldprotokolle'];   // was LabelKit 5.4.0 (buildProjektSaveData) schreibt

(async () => {
  const server = http.createServer((req, res) => {
    if (req.url.split('?')[0] === '/spektron-ordner.js') { res.writeHead(200, {'content-type': 'application/javascript; charset=utf-8'}); res.end(fs.readFileSync(path.join(__dirname, '..', 'spektron-ordner.js'))); return; }
    res.writeHead(200, {'content-type': 'text/html; charset=utf-8'}); res.end(html);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}/index.html`;
  const browser = await playwright[name].launch();
  const ctx = await browser.newContext({viewport: {width: 1300, height: 900}, acceptDownloads: true});
  await ctx.addInitScript(() => { try { localStorage.setItem('willkommen-gelesen', '1'); localStorage.setItem('druckprofil-skip', '1'); localStorage.setItem('mosaik-kuerzel', 'Ka'); } catch (e) {} });
  const errors = [], dialoge = [], antworten = [];
  let page = await ctx.newPage();
  await page.goto(url);
  const kann = await page.evaluate(async () => { try { const r = await navigator.storage.getDirectory(); const h = await r.getFileHandle('p', {create: true}); if (!h.createWritable) return false; const w = await h.createWritable(); await w.write('x'); await w.close(); await r.removeEntry('p'); return !!window.showDirectoryPicker; } catch (e) { return false; } });
  if (!kann) { console.log(`SKIP (${name}): kein schreibbarer Ordnerzugriff`); await browser.close(); server.close(); return; }

  const neuePage = async (tag, hash = '') => {
    const pg = await ctx.newPage();
    pg.on('pageerror', e => errors.push(e.message));
    pg.on('console', m => { if (m.type() === 'error' && !/ERR_UPLOAD_FILE_CHANGED|favicon|404/.test(m.text())) errors.push('console: ' + m.text()); });
    pg.on('dialog', d => { dialoge.push(d.message()); const a = antworten.length ? antworten.shift() : true; if (a) d.accept(); else d.dismiss(); });
    await pg.clock.setFixedTime(new Date(tag + 'T10:00:00'));
    await pg.goto(url + hash);
    await pg.evaluate(() => {
      document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
      document.querySelectorAll('dialog[open]').forEach(d => d.close());
      window.kopiert = []; window.gedruckt = [];
      Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText: async t => { window.kopiert.push(t); }}});
      window.open = () => ({document: {write(h) { window.gedruckt.push(h); }, close() {}}});
      window.print = () => {};
    });
    await pg.evaluate(async proj => { const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle(proj); await PROJEKTORDNER.oeffnen(dir); }, P);
    await pg.waitForFunction(() => PROJEKTORDNER.state.pj && PROJEKTORDNER.projektdaten().ortstermin === '2026-08-12');
    await pg.waitForTimeout(150);   // Laborübergaben lesen (async)
    return pg;
  };
  const oeffnen = async (tag, hash) => { await page.close(); page = await neuePage(tag, hash); };
  const liste = (rel, pg = page) => pg.evaluate(async ([proj, rel]) => {
    let d = await (await navigator.storage.getDirectory()).getDirectoryHandle(proj);
    for (const t of rel.split('/').filter(Boolean)) d = await d.getDirectoryHandle(t);
    const out = {}; for await (const [n, h] of d.entries()) if (h.kind === 'file') out[n] = await (await h.getFile()).text(); return out;
  }, [P, rel]);
  const schreiben = (rel, n, text) => page.evaluate(async ([proj, rel, n, text]) => {
    let d = await (await navigator.storage.getDirectory()).getDirectoryHandle(proj);
    for (const t of rel.split('/').filter(Boolean)) d = await d.getDirectoryHandle(t);
    const w = await (await d.getFileHandle(n, {create: true})).createWritable(); await w.write(text); await w.close();
  }, [P, rel, n, text]);
  const projektdatei = async () => JSON.parse((await liste('_Spektron/LabelKit'))['26.0999_Daten.json']);
  const nummern = t => [...t.matchAll(/<td>Probe (\d+)<\/td>/g)].map(m => +m[1]);
  const schritt = async n => { await page.locator(`.lk-schritt[data-schritt="${n}"]`).click(); await page.waitForFunction(n => document.body.dataset.lkSchritt === String(n), n); };
  const flash = async re => { await page.waitForFunction(re => new RegExp(re).test(document.getElementById('flash').textContent), re.source); };
  const welche = (n = 3) => page.locator(`#lk-s${n}-auftrag [data-sicht]`).allTextContents();
  const gewaehlt = (n = 3) => page.locator(`#lk-s${n}-auftrag [data-sicht][aria-pressed="true"]`).getAttribute('data-sicht');
  const hauptaktion = async () => { await page.locator('#lk-haupt').click(); };

  // Projekt anlegen: zwei Ortstermine in den Projektdaten
  await page.evaluate(async proj => {
    const root = await navigator.storage.getDirectory();
    for await (const [n] of root.entries()) await root.removeEntry(n, {recursive: true});
    const dir = await root.getDirectoryHandle(proj, {create: true});
    await dir.getDirectoryHandle('Laboraufträge', {create: true});
    const sp = await dir.getDirectoryHandle('_Spektron', {create: true});
    const w = await (await sp.getFileHandle('_Projekt.json', {create: true})).createWritable();
    await w.write(JSON.stringify({format: 'mosaik-projekt', version: 1, objekt: 'EFH Teststr. 1', ortstermin: '2026-08-12',
      weitereOrtstermine: [{id: 't2', datum: '2026-08-20', bezeichnung: 'Nachbeprobung', wer: 'Ka'}], ortsterminZaehler: 2,
      weitereMitteilungen: [{id: 'm2', nr: 2, termine: ['t2'], auftraege: ['a2']}]}));
    await w.close();
  }, P);

  // ── Runde 1 am 14.08.: 8 PAK + 5 Chlorid ─────────────────────────────────────────────
  await oeffnen('2026-08-14');
  await page.evaluate(() => {
    for (let i = 1; i <= 8; i++) addProbe({z2: 'EG Raum ' + i + ' Decke', z3: 'verrußt', z4: 'Untersicht', datum: '2026-08-12'}, true);
    for (let i = 1; i <= 5; i++) { addChloridProbe(); Object.assign(chloridProben[chloridProben.length - 1], {z2: 'EG Raum ' + i + ' Wand', z3: 'verrußt', z4: 'Ansicht', cm2: '100', datum: '2026-08-12'}); }
    renummerieren(); renderTable(); renderChloridTable();
  });
  await schritt(2);
  assert.equal(await page.locator('#lk-dlg-auftrag1').evaluate(d => d.open), false, 'Runde 1: keine Rückfrage');
  assert.equal(await page.locator('#lk-s2-auftrag .lk-zeile').count(), 0, 'Runde 1: keine Zeile „Welche Proben?“');
  await schritt(3);
  await hauptaktion();
  await flash(/Projektdatei in/);
  const r1 = await liste('Laboraufträge');
  assert.deepEqual(Object.keys(r1).sort(), ['26.0999_Chlorid_14.8.2026_Laboruebergabe.xls', '26.0999_PAK_14.8.2026_Laboruebergabe.xls'], 'Auftrag 1: Namen wie bisher');
  let d = await projektdatei();
  assert.deepEqual(Object.keys(d), FELDER_540, 'ein Auftrag: Projektdatei mit genau den Feldern von 5.4.0');
  assert.equal([...d.proben, ...d.chloridProben].some(p => 'auftrag' in p), false, 'ein Auftrag: kein Merkmal an den Proben');

  // ── Runde 2 am 22.08.: 4 PAK + 4 Asbest ──────────────────────────────────────────────
  await oeffnen('2026-08-22');
  await page.locator('#tab-eingabe .lk-artknoepfe button', {hasText: '+ Probe'}).click();
  assert.equal(await page.evaluate(() => proben[8].datum), '2026-08-20', 'N7: neue Probe bekommt den neuesten Ortstermin (nicht 12.08.)');
  await page.evaluate(() => {
    Object.assign(proben[8], {z2: 'OG Raum 1 Decke', z3: 'verrußt', z4: 'Untersicht'});
    for (let i = 2; i <= 4; i++) addProbe({z2: 'OG Raum ' + i + ' Decke', z3: 'verrußt', z4: 'Untersicht'}, true);
    for (let i = 1; i <= 4; i++) { addAsbest(null, true); Object.assign(asbestProben[asbestProben.length - 1], {z2: 'OG Raum ' + i, z3: 'Putz', matrix: 'Material (mineralisch)'}); }
    renummerieren(); renderTable(); renderAsbestTable(); lkNachZeichnen();
  });
  assert.deepEqual(await page.evaluate(() => [proben.slice(8).map(p => p._nr), asbestProben.map(p => p._nr), [...new Set([...proben.slice(8), ...asbestProben].map(p => p.datum))]]),
    [[14, 15, 16, 17], [18, 19, 20, 21], ['2026-08-20']]);
  // gelbe Zeile: Datum passt zu keinem Termin
  assert.equal(await page.locator('#lk-z-termin-pak').count(), 0);
  await page.evaluate(() => { proben[9].datum = '2026-08-21'; renderTable(); lkNachZeichnen(); });
  await page.waitForSelector('#lk-z-termin-pak');
  assert.match(await page.locator('#lk-z-termin-pak').textContent(), /passt zu keinem Ortstermin \(12\.08\., 20\.08\.2026\): P15 21\.08\.2026/);
  await page.evaluate(() => { proben[9].datum = '2026-08-20'; renderTable(); lkNachZeichnen(); });
  await page.waitForSelector('#lk-z-termin-pak', {state: 'detached'});

  // Schritt ②: einmal fragen, welche Proben schon beim Labor sind (Vorschlag aus den Laborübergaben)
  await schritt(2);
  await page.waitForFunction(() => document.getElementById('lk-dlg-auftrag1').open);
  const frage = await page.locator('#lk-dlg-auftrag1').textContent();
  assert.match(frage, /Laborübergaben vom 14\.08\.2026|Laboruebergaben vom 14\.08\.2026/);
  assert.match(frage, /Schon beim Labor \(14\.08\.2026\): P1–P13/);
  assert.match(frage, /Neu für den Nachauftrag: P14–P21/);
  assert.equal(await page.locator('#lk-a1-liste input').count(), 13, 'ändern …: Haken je feste Probe');
  // „Später“ → gelbe Zeile, nichts geschrieben; „Festhalten …“ öffnet die Rückfrage wieder
  await page.locator('#lk-dlg-auftrag1 [data-zu]').click();
  await page.waitForSelector('#lk-z-auftrag1-2');
  assert.equal(await page.locator('#lk-s2-auftrag [data-sicht]').count(), 0);
  await page.locator('#lk-z-auftrag1-2 [data-auftrag-festhalten]').click();
  await page.waitForFunction(() => document.getElementById('lk-dlg-auftrag1').open);
  await page.locator('#lk-a1-ok').click();
  await page.waitForSelector('#lk-z-welche-2');
  assert.deepEqual(await welche(2), ['Nachauftrag: nur die 8 neuen (P14–P21)', 'alle Proben']);
  assert.equal(await gewaehlt(2), 'neu', 'N4/N5: nur die neuen vorgewählt');
  assert.equal(await page.evaluate(() => 'auftrag' in proben[0]), false, '„Übernehmen“ schreibt noch nichts an die Proben');
  // Etiketten nur der neuen (N5): PAK 4, Chlorid gar nicht, Asbest 4
  await page.waitForFunction(() => document.querySelectorAll('#etiketten-output .etikett-item:not(.empty-etikett)').length === 4);
  assert.equal(await page.locator('#tab-chlorid-etiketten').evaluate(e => e.classList.contains('lk-zeigen')), false, 'keine Chlorid-Etiketten');
  assert.equal(await page.locator('#asbest-etiketten-output .etikett-item:not(.empty-etikett)').count(), 4);
  await page.locator('#lk-haupt').click();   // „Alle Etiketten drucken →“
  const druck = await page.evaluate(() => window.gedruckt.join(''));
  assert.deepEqual([...druck.matchAll(/Probe (\d+)</g)].map(m => +m[1]), [14, 15, 16, 17, 18, 19, 20, 21], 'Etikettendruck nur P14–P21');
  assert.equal(await page.evaluate(() => (weitereAuftraege || []).length), 0, 'Etiketten machen den Nachauftrag nicht fest (N2)');

  // Schritt ③: Kopieren (für Eurofins) PAK → nur P14–P17, Spalten unverändert; macht Auftrag 2 fest für alle neuen Proben
  await schritt(3);
  assert.equal(await page.locator('#tab-chlorid-uebergabe').evaluate(e => e.classList.contains('lk-zeigen')), false, 'keine Chlorid-Übergabe');
  assert.match(await page.locator('#lk-z-welche-satz-3').textContent(), /Nachauftrag: 8 neue Proben \(P14–P21\)/);
  await page.locator('#tab-uebergabe button', {hasText: 'Kopieren (für Eurofins)'}).click();
  await page.waitForFunction(() => window.kopiert.length === 1);
  const kopie = await page.evaluate(() => window.kopiert[0]);
  assert.equal(kopie.split('\n')[0], 'Probenreferenz\tProbenbeschreibung\tMatrix\tProbenahmedatum', 'Spalten wie bisher');
  assert.deepEqual(kopie.split('\n').slice(1).map(z => z.split('\t')[0]), ['Probe 14', 'Probe 15', 'Probe 16', 'Probe 17']);
  await flash(/Auftrag 2 fest \(P14–P21\)/);
  let st = await page.evaluate(() => ({a: [...proben, ...chloridProben, ...asbestProben].map(p => [p._nr, p.auftrag || '']), w: weitereAuftraege, z: auftragZaehler, a1: auftrag1}));
  assert.deepEqual(st.a.filter(([, a]) => a === 'a1').map(([n]) => n), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  assert.deepEqual(st.a.filter(([, a]) => a === 'a2').map(([n]) => n), [14, 15, 16, 17, 18, 19, 20, 21], 'auch die Asbestproben gehören zu Auftrag 2');
  assert.deepEqual(st.w, [{id: 'a2', am: '2026-08-22', von: 'Ka', proben: [14, 15, 16, 17, 18, 19, 20, 21]}]);
  assert.equal(st.z, 2);
  assert.deepEqual(st.a1.proben, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  assert.equal(st.a1.am, '2026-08-14');
  assert.equal(await gewaehlt(), 'a2', 'danach Ansicht „Auftrag 2“ – Asbest gehört zum selben Auftrag');
  assert.deepEqual(await welche(), ['Auftrag 1 (14.08.)', 'Auftrag 2 (22.08.)', 'Alle']);
  // Laborauftrag speichern → nur Auftrag-2-Dateien, keine Chlorid-Datei, Runde 1 byte-gleich
  dialoge.length = 0;
  await hauptaktion();
  await flash(/Projektdatei in/);
  const r2 = await liste('Laboraufträge');
  assert.deepEqual(Object.keys(r2).sort(), ['26.0999_Asbest_22.8.2026_Auftrag-2_Laboruebergabe.xls', '26.0999_Chlorid_14.8.2026_Laboruebergabe.xls',
    '26.0999_PAK_14.8.2026_Laboruebergabe.xls', '26.0999_PAK_22.8.2026_Auftrag-2_Laboruebergabe.xls']);
  for (const n of Object.keys(r1)) assert.equal(r2[n], r1[n], 'Runde 1 byte-gleich: ' + n);
  assert.deepEqual(nummern(r2['26.0999_PAK_22.8.2026_Auftrag-2_Laboruebergabe.xls']), [14, 15, 16, 17]);
  assert.deepEqual(nummern(r2['26.0999_Asbest_22.8.2026_Auftrag-2_Laboruebergabe.xls']), [18, 19, 20, 21]);
  assert.equal(dialoge.filter(m => /Trotzdem/.test(m)).length, 0, 'keine Rückfrage in der Ansicht des Auftrags');
  d = await projektdatei();
  assert.deepEqual(Object.keys(d), [...FELDER_540, 'weitereAuftraege', 'auftragZaehler', 'auftrag1']);
  assert.equal(d.proben[8].auftrag, 'a2');

  // „Alle“ mit Rückfrage (N4): Abbrechen bleibt bei Auftrag 2, OK zeigt alle
  dialoge.length = 0; antworten.push(false);
  await page.locator('#lk-s3-auftrag [data-sicht="alle"]').click();
  assert.match(dialoge[0], /^P1–P13 \(Auftrag 1 vom 14\.08\.\) und P14–P21 \(Auftrag 2 vom 22\.08\.\) sind schon beim Labor\./);
  assert.equal(await gewaehlt(), 'a2');
  antworten.push(true);
  await page.locator('#lk-s3-auftrag [data-sicht="alle"]').click();
  await page.waitForFunction(() => document.querySelector('#lk-s3-auftrag [data-sicht="alle"]').getAttribute('aria-pressed') === 'true');
  await page.waitForFunction(() => document.querySelectorAll('#uebergabe-output tbody tr').length === 12);
  assert.equal(await page.locator('#tab-chlorid-uebergabe').evaluate(e => e.classList.contains('lk-zeigen')), true);

  // A1/A2 in der Nummernspalte (nur bei mehr als einem Auftrag)
  await schritt(1);
  assert.deepEqual(await page.locator('#proben-tbody .lk-auftrag-marke').allTextContents(), ['A1', 'A1', 'A1', 'A1', 'A1', 'A1', 'A1', 'A1', 'A2', 'A2', 'A2', 'A2']);
  // N10: Text einer Probe nach dem Auftrag geändert → gelber Hinweis, keine Sperre
  await page.evaluate(() => { proben[8].z2 = 'OG Raum 1 Wand'; renderTable(); lkNachZeichnen(); });
  await page.waitForSelector('#lk-z-labortext-pak');
  assert.match(await page.locator('#lk-z-labortext-pak').textContent(), /Schon beim Labor – im Eurofins-Portal steht der alte Text: P14 \(Auftrag 2 vom 22\.08\.\)/);
  await page.evaluate(() => { proben[8].z2 = 'OG Raum 1 Decke'; renderTable(); lkNachZeichnen(); });
  await page.waitForSelector('#lk-z-labortext-pak', {state: 'detached'});
  // Kopie einer Probe = neue Probe ohne Merkmal; nach Auftrag 2 dazugekommen → gelbe Zeile in Schritt ③
  await page.evaluate(() => { dupProbe(proben[8].id); proben[9].z2 = 'OG Raum 1 Boden'; renderTable(); });
  assert.deepEqual(await page.evaluate(() => [proben[9]._nr, 'auftrag' in proben[9]]), [22, false]);
  await schritt(3);
  await page.waitForSelector('#lk-z-dazu-3');
  assert.match(await page.locator('#lk-z-dazu-3').textContent(), /Nach Auftrag 2 vom 22\.08\. dazugekommen: P22 – eigener Nachauftrag \(Auftrag 3\)/);
  assert.equal(await gewaehlt(), 'alle', 'die gewählte Ansicht bleibt');
  await page.locator('#lk-z-dazu-3 [data-sicht="neu"]').click();
  await page.waitForFunction(() => document.querySelector('#lk-s3-auftrag [data-sicht="neu"]')?.getAttribute('aria-pressed') === 'true');
  // Auftrag 3 durch „Kopieren“ fest – dann zurücknehmen (N9): geht, solange keine Datei; Kennung a3 bleibt verbraucht
  await page.evaluate(() => { window.kopiert = []; });
  await page.locator('#tab-uebergabe button', {hasText: 'Kopieren (für Eurofins)'}).click();
  await flash(/Auftrag 3 fest \(P22\)/);
  dialoge.length = 0;
  await page.locator('#lk-s3-auftrag [data-auftrag-zurueck="a3"]').click();
  await flash(/Auftrag 3 zurückgenommen – P22 ist wieder eine neue Probe/);
  assert.match(dialoge[0], /der nächste Nachauftrag heißt Auftrag 4/);
  assert.deepEqual(await page.evaluate(() => [proben[9].auftrag, auftragZaehler, weitereAuftraege.map(a => a.id), !!proben[9].nrFest]), [undefined, 3, ['a2'], true]);
  // Auftrag 2 hat eine gespeicherte Laborübergabe → nicht zurücknehmbar
  await page.evaluate(() => sichtWaehlen('a2'));
  dialoge.length = 0;
  await page.locator('#lk-s3-auftrag [data-auftrag-zurueck="a2"]').click();
  await page.waitForTimeout(200);
  assert.match(dialoge[0] || '', /lässt sich nicht mehr zurücknehmen: „26\.0999_(PAK|Asbest)_22\.8\.2026_Auftrag-2_Laboruebergabe\.xls“/);
  assert.equal(await page.evaluate(() => weitereAuftraege.length), 1);
  // P22 wieder löschen (Nummer fest → storniert) und speichern
  await page.evaluate(() => { probeStornieren(proben[9], {grund: 'Test'}); renderTable(); return schnellSpeichern(); });
  await flash(/gespeichert/);

  // ── Datei aus 5.4.0: Liste und Zähler entfernt, Merkmale bleiben → neu aufgebaut, gelbe Zeile ──
  d = await projektdatei();
  for (const k of ['weitereAuftraege', 'auftragZaehler', 'auftrag1']) delete d[k];
  d.version = '5.4.0';
  await schreiben('_Spektron/LabelKit', '26.0999_Daten.json', JSON.stringify(d, null, 2));
  await oeffnen('2026-08-24');
  await page.waitForSelector('#lk-z-aufgebaut');
  assert.match(await page.locator('#lk-z-aufgebaut').textContent(), /aus den Proben neu aufgebaut: Auftrag 1 P1–P13 · Auftrag 2 P14–P21/);
  assert.equal(await page.evaluate(() => auftragZaehler), 2, 'ohne Zähler: aus den Merkmalen (das zurückgenommene a3 kennt die Datei aus 5.4.0 nicht mehr)');
  assert.deepEqual(await page.locator('#proben-tbody .lk-auftrag-marke').allTextContents(), ['A1', 'A1', 'A1', 'A1', 'A1', 'A1', 'A1', 'A1', 'A2', 'A2', 'A2', 'A2']);
  await page.evaluate(() => schnellSpeichern());
  await flash(/gespeichert/);
  d = await projektdatei();
  assert.deepEqual(d.weitereAuftraege.map(a => [a.id, a.proben]), [['a2', [14, 15, 16, 17, 18, 19, 20, 21]]]);
  assert.equal(d.auftragZaehler, 2);
  assert.deepEqual(d.auftrag1.proben, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);

  // ── Unbekannte Felder oben bleiben erhalten; Versionssperre (N8) ──
  d.kuenftigesFeld = {x: 1};
  await schreiben('_Spektron/LabelKit', '26.0999_Daten.json', JSON.stringify(d, null, 2));
  await oeffnen('2026-08-24');
  await page.evaluate(() => { proben[0].notiz = 'n'; return schnellSpeichern(); });
  await flash(/gespeichert/);
  d = await projektdatei();
  assert.deepEqual(d.kuenftigesFeld, {x: 1}, 'unbekanntes Feld bleibt');
  d.version = '9.9.9';
  const neuer = JSON.stringify(d, null, 2);
  await schreiben('_Spektron/LabelKit', '26.0999_Daten.json', neuer);
  await oeffnen('2026-08-24');
  await page.waitForSelector('#lk-z-version');
  assert.match(await page.locator('#lk-z-version').textContent(), /stammt von LabelKit 9\.9\.9 – neuer als dieses Fenster \(5\.5\.0\)\. Nur ansehen/);
  await page.evaluate(() => { proben[0].notiz = 'geändert'; return schnellSpeichern(); });
  await flash(/stammt von LabelKit 9\.9\.9/);
  await page.evaluate(() => abschlussSpeichernGeprueft(true));
  assert.equal((await liste('_Spektron/LabelKit'))['26.0999_Daten.json'], neuer, 'Datei der neueren Fassung unverändert');
  assert.equal(await page.evaluate(() => kopierenFuerEurofins([['x']], [[]], 'ok')), false, 'Kopieren gesperrt');
  // anderes Fenster schreibt eine neuere Fassung, nachdem dieses geladen hat → beim Schreiben nicht überschrieben
  d.version = '5.5.0'; delete d.kuenftigesFeld;
  await schreiben('_Spektron/LabelKit', '26.0999_Daten.json', JSON.stringify(d, null, 2));
  await oeffnen('2026-08-24');
  d.version = '9.9.9';
  await schreiben('_Spektron/LabelKit', '26.0999_Daten.json', JSON.stringify(d, null, 2));
  dialoge.length = 0;
  await page.evaluate(() => { proben[0].notiz = 'x'; return schnellSpeichern(); });
  await page.waitForTimeout(300);
  assert.equal(JSON.parse((await liste('_Spektron/LabelKit'))['26.0999_Daten.json']).version, '9.9.9', 'beim Schreiben erkannt – nichts überschrieben');
  assert.ok(dialoge.some(m => /stammt von LabelKit 9\.9\.9/.test(m)) || await page.evaluate(() => /9\.9\.9/.test(document.getElementById('flash').textContent)));
  d.version = '5.5.0';
  await schreiben('_Spektron/LabelKit', '26.0999_Daten.json', JSON.stringify(d, null, 2));

  // ── Zwei Fenster: das zweite speichert, das erste bekommt die vorhandene Rückfrage ──
  await oeffnen('2026-08-24');
  const zweites = await neuePage('2026-08-24');
  await zweites.evaluate(() => { proben[1].notiz = 'Fenster B'; return schnellSpeichern(); });
  await zweites.waitForFunction(() => /gespeichert/.test(document.getElementById('flash').textContent));
  dialoge.length = 0; antworten.push(false);
  await page.evaluate(() => { proben[2].notiz = 'Fenster A'; return schnellSpeichern(); });
  await page.waitForTimeout(300);
  assert.match(dialoge.join('\n'), /wurde inzwischen geändert/);
  assert.equal((await projektdatei()).proben[1].notiz, 'Fenster B', 'Abbrechen: Stand von Fenster B bleibt');
  await zweites.close();

  // ── Link aus der Projektzentrale: mitteilung=m2 → Auftrag 2 vorgewählt ──
  await page.close();
  page = await neuePage('2026-08-24', '#projekt=' + encodeURIComponent(P) + '&mitteilung=m2');
  await schritt(3);
  await page.waitForFunction(() => document.querySelector('#lk-s3-auftrag [data-sicht="a2"]')?.getAttribute('aria-pressed') === 'true');
  assert.match(await page.evaluate(() => location.hash), /mitteilung=m2/, 'Link-Teil bleibt stehen');
  assert.equal(await page.evaluate(() => typeof PROJEKTORDNER.state.pj.weitereMitteilungen[0].auftraege), 'object');

  assert.deepEqual(errors, [], 'keine Fehler in der Konsole');
  console.log(`OK Nachauftrag (${name}): Runde 1 wie 5.4.0, Runde 2 nur neue (Etiketten, Kopie, Dateien Auftrag-2), Runde-1-Dateien byte-gleich, Alle mit Rückfrage, A1/A2, N7, N9, N10, Datei aus 5.4.0, Versionssperre, zwei Fenster, mitteilung=`);
  await browser.close(); server.close();
})().catch(async e => { console.error(e); process.exitCode = 1; process.exit(1); });
