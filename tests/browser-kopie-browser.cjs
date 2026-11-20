// LabelKit 5.3.0 – Browser-Kopie der Eingaben (Audit 2026-11 A2) im echten Browser: node tests/browser-kopie-browser.cjs [chromium]
// A  ohne Ordnerzugriff (Safari/iPad nachgestellt): Eingaben, Neuladen ohne Speichern → Zeile „Ungespeicherte Eingaben …“,
//    Wiederherstellen; nach dem Download keine Zeile mehr; Verwerfen entfernt die Kopie; ohne Eingaben keine Kopie.
// B  mit Projektordner: Neuladen ohne Speichern → Wiederherstellen; Kopie einer früheren Sitzung wird beim Weiterarbeiten nie
//    überschrieben; Projektdatei inzwischen von woanders gespeichert → nur „Als Datei herunterladen“ / „Verwerfen“, nichts übernommen;
//    nach dem Speichern keine Zeile.
// D  Projektwechsel im selben Fenster: die Kopie des vorigen Projekts bleibt ungespeichert (Codex).
// C  Speicher voll → rote Zeile „Eingaben NICHT im Browser gesichert“.
// Nie wird in den Projektordner geschrieben, ohne dass gespeichert wird. Nur erfundene Daten.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const playwright = require('playwright');
const ui = require('./lk-ui.cjs');

const name = process.argv[2] || 'chromium';
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'));
const P = '26.0613 Kopieweg Teststadt Dr.Ka';

(async () => {
  const server = http.createServer((req, res) => {
    if (req.url.split('?')[0] === '/spektron-ordner.js') { res.writeHead(200, {'content-type': 'application/javascript; charset=utf-8'}); res.end(fs.readFileSync(path.join(__dirname, '..', 'spektron-ordner.js'))); return; }
    res.writeHead(200, {'content-type': 'text/html; charset=utf-8'}); res.end(html);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}/index.html`;
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'lk-kopie-'));
  const ctx = await playwright[name].launchPersistentContext(profil, {viewport: {width: 1190, height: 800}, acceptDownloads: true});
  await ctx.addInitScript(() => { try { localStorage.setItem('willkommen-gelesen', '1'); } catch (e) {} if (sessionStorage.getItem('ohne-ordner') === '1') { delete window.showDirectoryPicker; } });
  const page = ctx.pages()[0] || await ctx.newPage();
  const errors = [], dialoge = [], downloads = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('dialog', d => { dialoge.push(d.message()); d.accept(); });
  page.on('download', d => downloads.push(d.suggestedFilename()));
  const zu = () => page.evaluate(() => { document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open')); document.querySelectorAll('dialog[open]').forEach(d => d.close()); });
  const zeile = () => page.evaluate(() => { const e = document.getElementById('lk-entwurf'); return e && !e.hidden ? e.textContent : ''; });
  const kopien = () => page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('lk-entwurf:')).length);
  const neuLaden = async () => { await page.reload(); await page.waitForSelector('#mosaikLeiste.ml-band', {timeout: 8000}); if (await page.evaluate(() => typeof window.showDirectoryPicker === 'undefined')) await page.waitForSelector('#modal-browser-hinweis[open]', {timeout: 3000}).catch(() => {}); await zu(); };
  const plusProbe = async () => { await ui.art(page, 'pak'); await page.locator('#tab-eingabe .lk-artknoepfe button', {hasText: '+ Probe'}).click(); await page.waitForFunction(() => /'z2'/.test(document.activeElement && document.activeElement.getAttribute('oninput') || '')); };

  // ---------- A: ohne Ordnerzugriff ----------
  await page.goto(url);
  await page.evaluate(() => sessionStorage.setItem('ohne-ordner', '1'));
  await neuLaden();
  assert.equal(await page.evaluate(() => typeof window.showDirectoryPicker), 'undefined', 'Safari nachgestellt');
  await ui.projNr(page, '26.0612');
  await page.waitForTimeout(1000);
  assert.equal(await kopien(), 0, 'ohne Proben keine Kopie');
  await plusProbe(); await page.keyboard.type('EG Küche Decke');
  await plusProbe(); await page.keyboard.type('EG Flur Wand');
  await page.waitForTimeout(1100);
  assert.equal(await kopien(), 1, 'Kopie geschrieben');
  await neuLaden();
  assert.equal(await page.evaluate(() => proben.length), 0, 'nach Neuladen leer');
  assert.match(await zeile(), /^⚠ Ungespeicherte Eingaben vom \d\d\.\d\d\.\d{4}, \d\d:\d\d \(2 Proben · Projekt 26\.0612\).*WiederherstellenVerwerfen$/);
  await page.locator('#lk-entwurf button', {hasText: 'Wiederherstellen'}).click();
  assert.deepEqual(await page.evaluate(() => proben.map(p => p.z2)), ['EG Küche Decke', 'EG Flur Wand'], 'wiederhergestellt');
  assert.equal(await page.evaluate(() => document.getElementById('proj-nr').value), '26.0612');
  assert.equal(await zeile(), '', 'Zeile weg');
  assert.match(await page.locator('#header-save-status').textContent(), /nicht gespeichert/);
  // Speichern = Download → gilt als gesichert, beim nächsten Start keine Zeile
  await page.locator('#btn-zwischenstand-speichern').click();
  await page.waitForFunction(() => document.getElementById('flash').textContent.includes('heruntergeladen'));
  assert.ok(downloads.some(d => /^26\.0612_.*_Daten\.json$/.test(d)), 'Projektdatei heruntergeladen');
  await neuLaden();
  assert.equal(await zeile(), '', 'nach dem Download keine Zeile');
  // Verwerfen
  await ui.projNr(page, '26.0612');
  await plusProbe(); await page.keyboard.type('KG Keller');
  await page.waitForTimeout(1100);
  await neuLaden();
  assert.match(await zeile(), /\(1 Probe · Projekt 26\.0612\)/);
  dialoge.length = 0;
  await page.locator('#lk-entwurf button', {hasText: 'Verwerfen'}).click();
  assert.match(dialoge[0], /verwerfen\? Das lässt sich nicht rückgängig machen\./);
  assert.equal(await zeile(), '');
  await neuLaden();
  assert.equal(await zeile(), '', 'verworfen bleibt verworfen');
  assert.equal(await page.evaluate(() => Object.values(localStorage).some(v => /KG Keller/.test(v))), false, 'Kopie entfernt');
  // Codex: Kopie von 26.0612 angeboten, inzwischen 26.0700 eingetragen → Wiederherstellen blockiert, nichts übernommen
  await ui.projNr(page, '26.0612');
  await plusProbe(); await page.keyboard.type('KG Heizraum');
  await page.waitForTimeout(1100);
  await neuLaden();
  assert.match(await zeile(), /\(1 Probe · Projekt 26\.0612\)/);
  await ui.projNr(page, '26.0700');
  dialoge.length = 0;
  await page.locator('#lk-entwurf button', {hasText: 'Wiederherstellen'}).click();
  assert.match(dialoge.at(-1) || '', /Projektzuordnung blockiert: „Browser-Kopie“ gehört zu Projekt 26\.0612/);
  assert.equal(await page.evaluate(() => proben.length), 0, 'nichts übernommen');
  assert.equal(await page.evaluate(() => document.getElementById('proj-nr').value), '26.0700');
  await page.locator('#lk-entwurf button', {hasText: 'Verwerfen'}).click();

  // ---------- B: mit Projektordner ----------
  await page.evaluate(() => { sessionStorage.removeItem('ohne-ordner'); Object.keys(localStorage).filter(k => k.startsWith('lk-entwurf:')).forEach(k => localStorage.removeItem(k)); });
  await neuLaden();
  const oeffnen = () => page.evaluate(async proj => { const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle(proj); await PROJEKTORDNER.oeffnen(dir); }, P);
  await page.evaluate(async proj => {
    const root = await navigator.storage.getDirectory();
    for await (const [n] of root.entries()) await root.removeEntry(n, {recursive: true});
    const dir = await root.getDirectoryHandle(proj, {create: true});
    await dir.getDirectoryHandle('Laboraufträge', {create: true});
  }, P);
  await oeffnen();
  await plusProbe(); await page.keyboard.type('EG Küche Decke');
  await page.evaluate(() => { proben[0].z3 = BEAUFSCHLAGUNG[0]; proben[0].z4 = OBERFLAECHEN[0]; renderTable(); });
  await page.keyboard.press('Control+s');
  await page.waitForFunction(() => /^Gespeichert:/.test(document.getElementById('header-save-status').textContent));
  const datei = () => page.evaluate(async proj => { const d = await (await (await (await navigator.storage.getDirectory()).getDirectoryHandle(proj)).getDirectoryHandle('_Spektron')).getDirectoryHandle('LabelKit'); return (await (await d.getFileHandle('26.0613_Daten.json')).getFile()).text(); }, P);
  const gespeichert = await datei();
  await plusProbe(); await page.keyboard.type('EG Flur Wand');
  await page.waitForTimeout(1100);
  await neuLaden(); await oeffnen();
  assert.equal(await page.evaluate(() => proben.length), 1, 'Projektdatei: 1 Probe');
  assert.match(await zeile(), /\(2 Proben · Projekt 26\.0613\) – sie wurden nicht gespeichert\..*WiederherstellenVerwerfen$/);
  // Weiterarbeiten überschreibt die angebotene Kopie nicht
  await plusProbe(); await page.keyboard.type('Neu in dieser Sitzung');
  await page.waitForTimeout(1100);
  assert.equal(await kopien(), 2, 'eigene Kopie dieser Sitzung neben der angebotenen');
  await page.locator('#lk-entwurf button', {hasText: 'Wiederherstellen'}).click();
  assert.match(dialoge.at(-1), /wird dadurch ersetzt/);
  assert.deepEqual(await page.evaluate(() => proben.map(p => p.z2)), ['EG Küche Decke', 'EG Flur Wand']);
  assert.equal(await datei(), gespeichert, 'Wiederherstellen schreibt nichts in den Projektordner');
  // Projektdatei inzwischen woanders gespeichert → nur herunterladen/verwerfen
  await page.waitForTimeout(1100);
  await neuLaden();
  await page.evaluate(async proj => { const d = await (await (await (await navigator.storage.getDirectory()).getDirectoryHandle(proj)).getDirectoryHandle('_Spektron')).getDirectoryHandle('LabelKit');
    const h = await d.getFileHandle('26.0613_Daten.json'); const o = JSON.parse(await (await h.getFile()).text()); o.gespeichertAm = '2030-01-01T00:00:00.000Z'; o.proben[0].z2 = 'Anderer PC';
    const w = await h.createWritable(); await w.write(JSON.stringify(o)); await w.close(); }, P);
  await oeffnen();
  assert.match(await zeile(), /die Projektdatei wurde danach noch einmal gespeichert\..*Als Datei herunterladenVerwerfen$/);
  assert.equal(await page.locator('#lk-entwurf button', {hasText: 'Wiederherstellen'}).count(), 0);
  downloads.length = 0;
  await page.locator('#lk-entwurf button', {hasText: 'Als Datei herunterladen'}).click();
  await page.waitForTimeout(500);
  assert.match(downloads[0], /^26\.0613_ungespeichert_.*_Daten\.json$/);
  assert.equal(await page.evaluate(() => proben[0].z2), 'Anderer PC', 'nichts übernommen');
  await page.locator('#lk-entwurf button', {hasText: 'Verwerfen'}).click();
  // nach dem Speichern keine Zeile
  await plusProbe(); await page.keyboard.type('Noch eine');
  await page.evaluate(() => { const p = proben.at(-1); p.z3 = BEAUFSCHLAGUNG[0]; p.z4 = OBERFLAECHEN[0]; renderTable(); });
  await page.keyboard.press('Control+s');
  await page.waitForFunction(() => /^Gespeichert:/.test(document.getElementById('header-save-status').textContent));
  await neuLaden(); await oeffnen();
  assert.equal(await zeile(), '', 'gespeichert → keine Zeile');

  // ---------- D: Projektwechsel im selben Fenster (Codex) ----------
  // Ungespeicherte Kopie von P bleibt ungespeichert, wenn danach das gespeicherte Projekt Q geöffnet wird
  const Q = '26.0614 Zweitweg Teststadt Dr.Ka';
  const oeffnenQ = () => page.evaluate(async proj => { const root = await navigator.storage.getDirectory(); const dir = await root.getDirectoryHandle(proj, {create: true}); await dir.getDirectoryHandle('Laboraufträge', {create: true}); await PROJEKTORDNER.oeffnen(dir); }, Q);
  await oeffnenQ();
  await plusProbe(); await page.keyboard.type('Q Probe');
  await page.evaluate(() => { const p = proben.at(-1); p.z3 = BEAUFSCHLAGUNG[0]; p.z4 = OBERFLAECHEN[0]; renderTable(); });
  await page.keyboard.press('Control+s');
  await page.waitForFunction(() => /^Gespeichert:/.test(document.getElementById('header-save-status').textContent));
  await oeffnen();
  await plusProbe(); await page.keyboard.type('P ungespeichert');
  await page.waitForTimeout(1100);
  await oeffnenQ();
  assert.equal(await page.evaluate(() => PROJEKTORDNER.state.proj.nr), '26.0614');
  const kopieP = await page.evaluate(proj => Object.keys(localStorage).filter(k => k.startsWith('lk-entwurf:ordner:' + proj + '|')).map(k => JSON.parse(localStorage.getItem(k))).find(o => /P ungespeichert/.test(o.daten)), P);
  assert.ok(kopieP, 'Kopie von P noch da');
  assert.equal(kopieP.gespeichert, false, 'Öffnen von Q markiert die Kopie von P nicht als gespeichert');
  await neuLaden(); await oeffnen();
  assert.match(await zeile(), /Projekt 26\.0613\) – sie wurden nicht gespeichert\./);
  await page.locator('#lk-entwurf button', {hasText: 'Verwerfen'}).click();

  // ---------- C: Speicher voll ----------
  await page.evaluate(() => { const o = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (String(k).startsWith('lk-entwurf:')) throw new DOMException('voll', 'QuotaExceededError'); return o.call(this, k, v); }; });
  await plusProbe(); await page.keyboard.type('Ohne Kopie');
  await page.waitForTimeout(1100);
  assert.match(await zeile(), /^⚠ Eingaben NICHT im Browser gesichert \(Speicher des Browsers voll\)/);
  assert.equal(await page.locator('#lk-entwurf').evaluate(e => e.classList.contains('lk-entwurf-fehler')), true);

  assert.deepEqual(errors, []);
  console.log(`OK ${name}: Browser-Kopie – Neuladen ohne Speichern, Wiederherstellen, Verwerfen, Download, Projektordner, fremder Stand, Speicher voll`);
  await ctx.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
