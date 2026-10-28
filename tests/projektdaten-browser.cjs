// Projektdaten aus der Projektzentrale (_Projekt.json) in LabelKit: node tests/projektdaten-browser.cjs [chromium|webkit]
//  • Objekt, Auftraggeber, Schaden-Nr. stehen nur zur Ansicht oben im Projektschritt (geändert wird in der Projektzentrale)
//  • Auftragsschein (Bildschirm/PDF und Word/RTF): nur das Objekt – Auftraggeber und Schaden-Nr. gehören nicht auf ein Dokument an das Labor
//  • Änderungen in der Projektzentrale kommen beim Zurückkehren ins Fenster an
// Der Archivordner wird im Origin Private File System nachgebildet; WebKit kann keine Ordner beschreiben (dort nur Laden).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const playwright = require('playwright');

const name = process.argv[2] || 'chromium';
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'));
const PROJ = '26.0142 Köln & Süd + 50% #Hof';

(async () => {
  const server = http.createServer((req, res) => { if (req.url.split('?')[0] === '/spektron-ordner.js') { res.writeHead(200, {'content-type': 'application/javascript; charset=utf-8'}); res.end(require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'spektron-ordner.js'))); return; } res.writeHead(200, {'content-type': 'text/html; charset=utf-8'}); res.end(html); });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}/index.html`;
  const browser = await playwright[name].launch();
  const ctx = await browser.newContext({viewport: {width: 1500, height: 950}, acceptDownloads: true});
  await ctx.addInitScript(() => { try { localStorage.setItem('willkommen-gelesen', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('dialog', d => d.accept());
  await page.goto(url);
  await page.evaluate(() => { document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open')); document.querySelectorAll('dialog[open]').forEach(d => d.close()); });
  const kann = await page.evaluate(async () => {
    try { const r = await navigator.storage.getDirectory(); const h = await r.getFileHandle('probe.txt', {create: true}); if (!h.createWritable) return false; const w = await h.createWritable(); await w.write('x'); await w.close(); await r.removeEntry('probe.txt'); return true; } catch (e) { return false; }
  });
  if (!kann) {
    assert.deepEqual(errors, []);
    await browser.close(); server.close();
    console.log(`OK (${name}, ohne Ordnerzugriff: nur Laden geprüft)`);
    return;
  }

  await page.evaluate(async proj => {
    const r = await navigator.storage.getDirectory();
    for await (const [n] of r.entries()) await r.removeEntry(n, {recursive: true});
    const archiv = await r.getDirectoryHandle('Mosaik Archivordner', {create: true});
    const p = await archiv.getDirectoryHandle(proj, {create: true});
    await p.getDirectoryHandle('Laboraufträge', {create: true});
    const w = await (await p.getFileHandle('_Projekt.json', {create: true})).createWritable();
    await w.write(JSON.stringify({format: 'mosaik-projekt', version: 1, objekt: 'EFH, Musterweg 7, 52525 Heinsberg', auftraggeber: 'Beispiel Versicherung AG', schadennummer: 'S-2026-4711'}, null, 2)); await w.close();
    await new Promise((res, rej) => { const q = indexedDB.open('mosaik-suite', 1); q.onupgradeneeded = () => q.result.createObjectStore('kv');
      q.onsuccess = () => { const t = q.result.transaction('kv', 'readwrite'); t.objectStore('kv').put(archiv, 'archiv'); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }; q.onerror = () => rej(q.error); });
  }, PROJ);
  await page.goto(url + '?projekt=' + encodeURIComponent(PROJ));
  await page.waitForSelector('#pj-info:not([hidden])', {timeout: 8000});
  assert.equal(new URL(page.url()).searchParams.has('projekt'), false, 'alter Query-Link bereinigt');
  assert.equal(new URLSearchParams(new URL(page.url()).hash.slice(1)).get('projekt'), PROJ);
  await page.goto(url + '?projekt=falsch&ansicht=liste#fotos&projekt=' + encodeURIComponent(PROJ));
  await page.waitForSelector('#pj-info:not([hidden])', {timeout: 8000});
  assert.equal(new URL(page.url()).searchParams.has('projekt'), false, 'Fragment gewinnt vor altem Query-Projekt');
  assert.equal(new URL(page.url()).searchParams.get('ansicht'), 'liste');
  assert.ok(new URL(page.url()).hash.startsWith('#fotos&'), 'fremdes Fragment erhalten');
  assert.equal(await page.evaluate(() => PROJEKTORDNER.state.proj.name), PROJ, 'Fragment öffnet exakten Ordner mit Sonderzeichen');

  const info = (await page.locator('#pj-info').textContent()).replace(/\s+/g, ' ');
  assert.match(info, /Objekt EFH, Musterweg 7, 52525 Heinsberg/); assert.match(info, /Auftraggeber Beispiel Versicherung AG/); assert.match(info, /Schaden-Nr\. S-2026-4711/);
  assert.equal(await page.locator('#pj-info input, #pj-info textarea').count(), 0, 'nur Ansicht');

  // Auftragsschein: nur das Objekt, nicht Auftraggeber oder Schaden-Nr.
  await page.evaluate(() => { proben.push({id: 1, datum: '2026-07-28', z1: '26.0142', z2: 'Küche', z3: 'direkt', z4: 'Glas', matrix: 'Wischprobe', cm2: '100', notiz: ''}); });
  await page.evaluate(() => { switchMainTab('auftrag'); switchTab('auftragsschein', document.getElementById('sub-auftragsschein')); });
  await page.waitForSelector('#auftragsschein-output');
  const schein = (await page.locator('#auftragsschein-output').textContent()).replace(/\s+/g, ' ');
  assert.match(schein, /Objekt: EFH, Musterweg 7, 52525 Heinsberg/);
  assert.doesNotMatch(schein, /Beispiel Versicherung|S-2026-4711/, 'Auftraggeber und Schaden-Nr. nicht auf dem Auftragsschein');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => exportAuftragsscheinRTF())]);
  const rtf = fs.readFileSync(await dl.path(), 'latin1');
  assert.match(rtf, /Objekt: \\b EFH, Musterweg 7, 52525 Heinsberg/);
  assert.doesNotMatch(rtf, /Beispiel Versicherung|S-2026-4711/);

  // Änderung in der Projektzentrale → beim Zurückkehren ins Fenster neu gelesen
  await page.evaluate(async proj => {
    const p = await (await (await navigator.storage.getDirectory()).getDirectoryHandle('Mosaik Archivordner')).getDirectoryHandle(proj);
    const h = await p.getFileHandle('_Projekt.json'); const o = JSON.parse(await (await h.getFile()).text()); o.objekt = 'MFH, Neuweg 9'; o.auftraggeber = '';
    const w = await h.createWritable(); await w.write(JSON.stringify(o)); await w.close();
  }, PROJ);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.waitForFunction(() => /MFH, Neuweg 9/.test(document.getElementById('pj-info').textContent));
  const neu = (await page.locator('#pj-info').textContent()).replace(/\s+/g, ' ');
  assert.doesNotMatch(neu, /Auftraggeber/, 'leere Felder werden nicht angezeigt');

  assert.deepEqual(errors, []);
  await browser.close(); server.close();
  console.log(`OK (${name})`);
})().catch(e => { console.error(e); process.exit(1); });
