// Feste Projektdatei im echten Browser (4.50.0): node tests/projektdatei-browser.cjs [chromium]
// Projektordner im Origin Private File System: Öffnen mit datierten Dateien → Speichern legt „<Nr>_Daten.json“ an und
// verschiebt die datierten nach „_LabelKit_Sicherungen“; ein fremder Stand fragt nach. Nur synthetische Daten.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const playwright = require('playwright');

const name = process.argv[2] || 'chromium';
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'));

(async () => {
  const server = http.createServer((req, res) => { if (req.url.split('?')[0] === '/spektron-ordner.js') { res.writeHead(200, {'content-type': 'application/javascript; charset=utf-8'}); res.end(fs.readFileSync(path.join(__dirname, '..', 'spektron-ordner.js'))); return; } res.writeHead(200, {'content-type': 'text/html; charset=utf-8'}); res.end(html); });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  let browser;
  try {
    browser = await playwright[name].launch();
    const ctx = await browser.newContext({viewport: {width: 1400, height: 900}});
    await ctx.addInitScript(() => { try { localStorage.setItem('willkommen-gelesen', '1'); } catch (e) {} });
    const page = await ctx.newPage(), errors = [], dialoge = [];
    let antwort = true;
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', d => { dialoge.push(d.message()); antwort ? d.accept() : d.dismiss(); });
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
    await page.evaluate(() => { document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open')); document.querySelectorAll('dialog[open]').forEach(d => d.close()); });
    const kann = await page.evaluate(async () => {
      try { const r = await navigator.storage.getDirectory(); const h = await r.getFileHandle('probe.txt', {create: true}); if (!h.createWritable) return false; const w = await h.createWritable(); await w.write('x'); await w.close(); await r.removeEntry('probe.txt'); return true; } catch (e) { return false; }
    });
    if (!kann) { console.log(`Projektdatei (${name}): übersprungen – kein beschreibbares OPFS`); return; }

    const flash = () => page.evaluate(() => document.getElementById('flash').textContent);
    const status = () => page.evaluate(() => document.getElementById('header-save-status').textContent);
    const liste = () => page.evaluate(async () => {
      const lab = await (await (await navigator.storage.getDirectory()).getDirectoryHandle('26.0101 Synthetisch')).getDirectoryHandle('Laboraufträge');
      const r = {dateien: [], sicherungen: []};
      for await (const [n, h] of lab.entries()) if (h.kind === 'file') r.dateien.push(n); else if (n === '_LabelKit_Sicherungen') for await (const [m] of h.entries()) r.sicherungen.push(m);
      r.dateien.sort(); r.sicherungen.sort(); return r;
    });

    // Projekt mit zwei datierten Projektdateien (bis 4.49.x) und einer Laborübergabe (Dateinamen ASCII: OPFS mancher Chromium-Builds lehnt Umlaute ab)
    await page.evaluate(async () => {
      const root = await navigator.storage.getDirectory();
      for await (const [n] of root.entries()) await root.removeEntry(n, {recursive: true});
      const lab = await (await root.getDirectoryHandle('26.0101 Synthetisch', {create: true})).getDirectoryHandle('Laboraufträge', {create: true});
      const put = async (n, t) => { const w = await (await lab.getFileHandle(n, {create: true})).createWritable(); await w.write(t); await w.close(); };
      const stand = (z2, am) => JSON.stringify({version: '4.49.0', gespeichertAm: am, nrSchutz: 1, projekt: {nr: '26.0101'}, proben: [{id: 1, _nr: 1, z2, matrix: 'Wischprobe'}], chloridProben: [], asbestProben: [], sonstigeProben: [], brandgeruchProben: [], pn98Proben: [], nextId: 2, probenStartNr: 1});
      await put('26.0101_28.10.2026_Daten.json', stand('Stand 28.', '2026-10-28T16:00:00Z'));
      await new Promise(r => setTimeout(r, 30));
      await put('26.0101_29.10.2026_Daten.json', stand('Stand 29.', '2026-10-29T16:00:00Z'));
      await put('26.0101_PAK_29.10.2026_Laboruebergabe.xls', 'XLS');
      await PROJEKTORDNER.oeffnen(await root.getDirectoryHandle('26.0101 Synthetisch'));
    });
    assert.deepEqual(await page.evaluate(() => proben.map(p => p.z2)), ['Stand 29.'], 'wie bisher die neueste geladen');
    assert.match(await flash(), /beim nächsten Speichern heißt die Projektdatei „26\.0101_Daten\.json“/);
    assert.match(await status(), /^Gespeichert:.*26\.0101_29\.10\.2026_Daten\.json/, 'aus dem Projektordner geladen = gespeichert');

    // Erstes Speichern: feste Datei, datierte in die Sicherungen, Übergabe unberührt
    await page.evaluate(async () => { proben[0].z2 = 'Stand 31.'; markUnsaved(); await schnellSpeichern(); });
    assert.deepEqual(await liste(), {dateien: ['26.0101_Daten.json', '26.0101_PAK_29.10.2026_Laboruebergabe.xls'], sicherungen: ['26.0101_2026-10-28_Sicherung.json', '26.0101_2026-10-29_Sicherung.json']});
    assert.match(await flash(), /2 ältere Projektdateien nach „_LabelKit_Sicherungen“ verschoben/);
    assert.match(await status(), /^Gespeichert:.*26\.0101_Daten\.json$/);
    assert.equal(dialoge.length, 0, 'keine Rückfrage beim Übergang');

    // Anderer Rechner schreibt die feste Datei → Rückfrage; Abbrechen lässt seinen Stand liegen
    await page.evaluate(async () => {
      const lab = await (await (await navigator.storage.getDirectory()).getDirectoryHandle('26.0101 Synthetisch')).getDirectoryHandle('Laboraufträge');
      const w = await (await lab.getFileHandle('26.0101_Daten.json')).createWritable(); await w.write('{"projekt":{"nr":"26.0101"},"von":"anderer Rechner"}'); await w.close();
    });
    antwort = false;
    await page.evaluate(async () => { proben[0].z2 = 'Stand 31. später'; markUnsaved(); await schnellSpeichern(); });
    assert.match(dialoge[0], /„26\.0101_Daten\.json“ in „Laboraufträge“ wurde inzwischen geändert/);
    assert.match(await status(), /Speichern abgebrochen/);
    const platte = await page.evaluate(async () => (await (await (await (await (await navigator.storage.getDirectory()).getDirectoryHandle('26.0101 Synthetisch')).getDirectoryHandle('Laboraufträge')).getFileHandle('26.0101_Daten.json')).getFile()).text());
    assert.match(platte, /anderer Rechner/);
    assert.equal(await page.evaluate(() => { const e = new Event('beforeunload', {cancelable: true}); window.dispatchEvent(e); return e.defaultPrevented; }), true, 'nicht gespeichert: Warnung beim Schließen');
    // OK = überschreiben, der fremde Stand landet mit Uhrzeit in den Sicherungen
    antwort = true;
    await page.evaluate(() => schnellSpeichern());
    const nachher = await liste();
    assert.equal(nachher.sicherungen.length, 3); assert.ok(nachher.sicherungen.some(n => /^26\.0101_\d{4}-\d{2}-\d{2}_\d{4}_Sicherung\.json$/.test(n)));
    assert.match(await status(), /^Gespeichert:/);
    assert.deepEqual(errors, []);
    console.log(`OK Projektdatei (${name}): Übergang aus datierten Dateien, feste Datei, Sicherungen, fremder Stand fragt`);
  } finally { if (browser) await browser.close(); await new Promise(r => server.close(r)); }
})().catch(e => { console.error(e); process.exitCode = 1; });
