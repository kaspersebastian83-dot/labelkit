// LabelKit 5.2.0 – Audit 2026-11 Lauf 1 (Feldarbeit) im echten Browser: node tests/feld-audit-browser.cjs [chromium]
// A5  neues Projekt ohne Eingaben: „Noch nichts erfasst“, keine Rückfrage beim Verlassen
// A12 neue Proben: Probenahmedatum = Ortstermin aus _Projekt.json (nicht heute); vorhandene Proben unverändert
// A16 „+ Probe“: Cursor im Feld Raum/Ort der neuen Zeile
// A14 Schritt 3: Projektprüfung nur Arten mit Proben, „unvollständig“ nennt das Feld
// A3  „Kopieren (für Eurofins)“: Zwischenablage verweigert → Meldung, Nummern nicht fest
// A7  „Excel“ in Schritt 3 → „Laboraufträge“ unter dem Namen von „Laborauftrag speichern“, Projektdatei mit, kein Download
// A8  Meldung/Status nennen „_Spektron/LabelKit“ für die Projektdatei
// Projektordner im Origin Private File System, nur erfundene Daten.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const playwright = require('playwright');
const ui = require('./lk-ui.cjs');

const name = process.argv[2] || 'chromium';
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'));
const P = '26.0612 Feldweg Teststadt Dr.Ka';

(async () => {
  const server = http.createServer((req, res) => {
    if (req.url.split('?')[0] === '/spektron-ordner.js') { res.writeHead(200, {'content-type': 'application/javascript; charset=utf-8'}); res.end(fs.readFileSync(path.join(__dirname, '..', 'spektron-ordner.js'))); return; }
    res.writeHead(200, {'content-type': 'text/html; charset=utf-8'}); res.end(html);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await playwright[name].launch();
  const ctx = await browser.newContext({viewport: {width: 1190, height: 800}, acceptDownloads: true});
  await ctx.addInitScript(() => { try { localStorage.setItem('willkommen-gelesen', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  const errors = [], dialoge = [], downloads = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('dialog', d => { dialoge.push(d.message()); d.accept(); });
  page.on('download', d => downloads.push(d.suggestedFilename()));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await page.evaluate(() => { document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open')); document.querySelectorAll('dialog[open]').forEach(d => d.close()); });
  const kann = await page.evaluate(async () => { try { const r = await navigator.storage.getDirectory(); const h = await r.getFileHandle('p', {create: true}); if (!h.createWritable) return false; const w = await h.createWritable(); await w.write('x'); await w.close(); await r.removeEntry('p'); return !!window.showDirectoryPicker; } catch (e) { return false; } });
  if (!kann) { console.log(`SKIP (${name}): kein schreibbarer Ordnerzugriff`); await browser.close(); server.close(); return; }

  const status = () => page.locator('#header-save-status').textContent();
  const beforeunloadVerhindert = () => page.evaluate(() => { const e = new Event('beforeunload', {cancelable: true}); window.dispatchEvent(e); return e.defaultPrevented; });
  const liste = rel => page.evaluate(async ([proj, rel]) => {
    let d = await (await navigator.storage.getDirectory()).getDirectoryHandle(proj);
    for (const t of rel.split('/').filter(Boolean)) d = await d.getDirectoryHandle(t);
    const out = []; for await (const [n, h] of d.entries()) if (h.kind === 'file') out.push(n); return out.sort();
  }, [P, rel]);

  // Projekt öffnen (Nummer ≥ 26.0560 → Projektdatei nach „_Spektron/LabelKit“), Ortstermin 18.11.2026
  await page.evaluate(async proj => {
    const root = await navigator.storage.getDirectory();
    for await (const [n] of root.entries()) await root.removeEntry(n, {recursive: true});
    const dir = await root.getDirectoryHandle(proj, {create: true});
    await dir.getDirectoryHandle('Laboraufträge', {create: true});
    const sp = await dir.getDirectoryHandle('_Spektron', {create: true});
    const w = await (await sp.getFileHandle('_Projekt.json', {create: true})).createWritable();
    await w.write(JSON.stringify({format: 'mosaik-projekt', version: 1, objekt: 'EFH, Feldweg 1', ortstermin: '2026-11-18'})); await w.close();
    await PROJEKTORDNER.oeffnen(dir);
  }, P);
  assert.equal(await page.evaluate(() => PROJEKTORDNER.state.proj && PROJEKTORDNER.state.proj.nr), '26.0612');
  await page.waitForFunction(() => PROJEKTORDNER.projektdaten().ortstermin === '2026-11-18');

  // A5: nichts erfasst → kein „nicht gespeichert“, keine Rückfrage
  assert.equal(await status(), 'Noch nichts erfasst');
  assert.equal(await beforeunloadVerhindert(), false, 'keine Rückfrage beim Verlassen ohne Eingaben');

  // A12 + A16: „+ Probe“ → Ortstermin, Cursor im Raum/Ort
  await page.locator('#tab-eingabe .lk-artknoepfe button', {hasText: '+ Probe'}).click();
  await page.waitForFunction(() => document.activeElement && /'z2'/.test(document.activeElement.getAttribute('oninput') || ''));
  assert.equal(await page.evaluate(() => proben[0].datum), '2026-11-18', 'erste Probe: Ortstermin');
  await page.keyboard.type('EG Küche Decke');
  assert.equal(await page.evaluate(() => proben[0].z2), 'EG Küche Decke', 'getippt landet in Raum/Ort');
  await page.evaluate(() => { proben[0].datum = '2026-11-19'; proben[0].z3 = BEAUFSCHLAGUNG[0]; proben[0].z4 = OBERFLAECHEN[0]; renderTable(); });
  await page.locator('#tab-eingabe .lk-artknoepfe button', {hasText: '+ Probe'}).click();
  assert.equal(await page.evaluate(() => proben[1].datum), '2026-11-19', 'weitere Probe: Datum der vorigen');
  await page.evaluate(() => { proben.pop(); renummerieren(); renderTable(); });
  assert.equal(await beforeunloadVerhindert(), true, 'mit Eingaben fragt der Browser wie bisher');
  await ui.art(page, 'chlorid');
  await page.locator('#tab-chlorid .lk-artknoepfe button', {hasText: '+ Probe'}).click();
  assert.equal(await page.evaluate(() => chloridProben[0].datum), '2026-11-18', 'Chlorid: erste Probe Ortstermin');
  await page.evaluate(() => { chloridProben[0].z2 = 'EG Bad Wand'; chloridProben[0].z3 = BEAUFSCHLAGUNG[0]; chloridProben[0].z4 = OBERFLAECHEN[0]; renderChloridTable(); });

  // A14: Schritt 3 – nur PAK und Chlorid, fehlendes Feld genannt
  await ui.schritt(page, 3);
  assert.deepEqual((await page.locator('#abschluss-check-output .check-card .check-title').allTextContents()).map(t => t.replace('→', '').trim()), ['PAK', 'Chlorid']);
  assert.equal(await page.locator('#abschluss-check-output .check-card').count(), 2, 'nur Arten mit Proben');
  assert.match(await page.locator('#abschluss-probleme').textContent(), /Chlorid: unvollständig \(1\).*Es fehlt: cm² \(Probe 2\)\./);

  // A3: Zwischenablage verweigert → Meldung, Nummer nicht fest
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText: () => Promise.reject(new DOMException('Write permission denied.', 'NotAllowedError'))}}); });
  dialoge.length = 0;
  await page.locator('#tab-uebergabe button', {hasText: 'Kopieren (für Eurofins)'}).click();
  await page.waitForFunction(() => /Nicht kopiert/.test(document.getElementById('flash').textContent));
  assert.match(dialoge.join('\n'), /^Nicht kopiert – die Zwischenablage hat das Kopieren abgelehnt/);
  assert.equal(await page.evaluate(() => !!proben[0].nrFest), false, 'Nummer nicht fest');
  // … und mit funktionierender Zwischenablage wie bisher
  await page.evaluate(() => { window.kopiert = []; Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText: async t => { window.kopiert.push(t); }}}); });
  await page.locator('#tab-uebergabe button', {hasText: 'Kopieren (für Eurofins)'}).click();
  await page.waitForFunction(() => window.kopiert.length === 1 && /Tabelle kopiert/.test(document.getElementById('flash').textContent));
  assert.match(await page.evaluate(() => window.kopiert[0]), /^Probenreferenz\tProbenbeschreibung\tMatrix\tProbenahmedatum\nProbe 1\tEG Küche Decke, /);
  assert.equal(await page.evaluate(() => !!proben[0].nrFest), true);

  // A7 + A8: „Excel“ bei PAK → Laboraufträge, gleicher Name wie „Laborauftrag speichern“, Projektdatei mit, kein Download
  const heute = await page.evaluate(() => new Date().toLocaleDateString('de-DE').replace(/\//g, '.'));
  await page.locator('#tab-uebergabe button', {hasText: /^Excel$/}).click();
  await page.waitForFunction(() => /Projektdatei in/.test(document.getElementById('flash').textContent));
  assert.deepEqual(await liste('Laboraufträge'), [`26.0612_PAK_${heute}_Laborübergabe.xls`], 'nur PAK, Name wie beim Abschluss');
  assert.deepEqual(await liste('_Spektron/LabelKit'), ['26.0612_Daten.json']);
  assert.deepEqual(downloads, [], 'kein Download mit Projektordner');
  assert.match(await page.locator('#flash').textContent(), /^✓ 1 Datei in „Laboraufträge“, Projektdatei in „_Spektron\/LabelKit“ gespeichert/);
  assert.match(await status(), /^Gespeichert: .* · _Spektron\/LabelKit · 26\.0612_Daten\.json$/);
  // „Laborauftrag speichern“: dieselbe PAK-Datei (Rückfrage „ersetzen“ → OK), Chlorid dazu
  dialoge.length = 0;
  await page.locator('#lk-haupt').click();
  await page.waitForFunction(() => /2 Dateien in „Laboraufträge“, Projektdatei in „_Spektron\/LabelKit“ gespeichert/.test(document.getElementById('flash').textContent));
  assert.match(dialoge.join('\n'), /Diese Datei gibt es im Ordner schon:\n• 26\.0612_PAK_/);
  assert.deepEqual(await liste('Laboraufträge'), [`26.0612_Chlorid_${heute}_Laborübergabe.xls`, `26.0612_PAK_${heute}_Laborübergabe.xls`]);
  assert.match(await status(), /· _Spektron\/LabelKit · 26\.0612_Daten\.json$/);

  assert.deepEqual(errors, []);
  console.log(`OK ${name}: Ortstermin als Datum, Cursor in Raum/Ort, nichts erfasst = nichts ungespeichert, Projektprüfung kompakt, Kopieren-Fehler, Excel nach „Laboraufträge“, Speicherort genannt`);
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
