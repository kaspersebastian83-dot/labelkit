// Feste Probennummern (4.51.0): Auftragsübersicht und Schnittplan machen die Nummern fest – in der echten Oberfläche.
// Ausschließlich synthetische Daten im isolierten Browserkontext. node tests/nummern-fest-druck-browser.cjs [chromium]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const playwright = require('playwright');
const name = process.argv[2] || 'chromium';
(async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'));
  const server = http.createServer((req, res) => {
    if (req.url.split('?')[0] === '/spektron-ordner.js') { res.writeHead(200, {'content-type': 'application/javascript; charset=utf-8'}); res.end(fs.readFileSync(path.join(__dirname, '..', 'spektron-ordner.js'))); return; }
    res.writeHead(200, {'content-type': 'text/html; charset=utf-8'}); res.end(html);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  let browser;
  try {
    browser = await playwright[name].launch();
    const context = await browser.newContext({viewport: {width: 1400, height: 900}, acceptDownloads: true});
    await context.addInitScript(() => { localStorage.setItem('willkommen-gelesen', '1'); localStorage.setItem('druckprofil-skip', '1'); localStorage.setItem('mosaik-kuerzel', 'TST'); });
    const page = await context.newPage(), errors = [];
    let antwort = true;
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', d => { if (antwort) d.accept(); else d.dismiss(); });
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
    await page.evaluate(() => {
      zeigWillkommen();
      document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
      document.querySelectorAll('dialog[open]').forEach(d => d.close());
      window.gedruckt = [];
      window.open = () => ({document: {write(h) { window.gedruckt.push(h); }, close() {}}});
      switchMainTab('pak');
      document.getElementById('proj-nr').value = '26.0999';
      addProbe({z2: 'Raum A'}); addProbe({z2: 'Raum B'});
      addChloridProbe(); chloridProben[0].z2 = 'Chlorid Raum';
      addSonstige({matrix: 'Bohrkern', bkBez: 'BK-1', bkId: 'BK-1.1', bkVon: 0, bkBis: 5, bkGesamt: 10, bkSegment: 1, notiz: 'analysieren'});
      addSonstige({matrix: 'Bohrkern', bkBez: 'BK-1', bkId: 'BK-1.2', bkVon: 5, bkBis: 10, bkGesamt: 10, bkSegment: 2, notiz: 'analysieren'});
      addSonstige({z2: 'Sonst Raum'});
      renummerieren(); renderTable(); renderChloridTable(); renderSonstigeTable();
    });
    const status = () => page.evaluate(() => ({
      pak: proben.map(p => [p._nr, p.nrFest && p.nrFest.anlass || null]),
      cl: chloridProben.map(p => [p._nr, p.nrFest && p.nrFest.anlass || null]),
      so: sonstigeProben.map(p => [p._nr, p.nrFest && p.nrFest.anlass || null])
    }));
    assert.deepEqual(await status(), {pak: [[1, null], [2, null]], cl: [[3, null]], so: [[4, null], [5, null], [6, null]]});

    // Schnittplan abgebrochen (unvollständiger Bohrkern, Rückfrage verneint) → nichts wird fest
    await page.evaluate(() => addSonstige({matrix: 'Bohrkern', bkBez: 'BK-2', bkId: 'BK-2.1', bkVon: '', bkBis: '', bkGesamt: 10, bkSegment: 1}));
    antwort = false;
    await page.evaluate(() => schnittplaeneDrucken());
    antwort = true;
    assert.equal(await page.locator('#modal-schnittplan-aktion').count(), 0, 'kein Auswahlfenster nach Abbruch');
    assert.deepEqual((await status()).so.map(x => x[1]), [null, null, null, null], 'Abbruch macht nichts fest');
    await page.evaluate(() => { sonstigeProben.pop(); renummerieren(); renderSonstigeTable(); });

    // Auswahlfenster „Abbrechen“, abgebrochener Ordnerdialog, blockiertes Druckfenster → nichts wird fest (kein Rückgängig-Verlust, nicht ungespeichert)
    const abort = () => { window.showDirectoryPicker = () => Promise.reject(Object.assign(new Error('abgebrochen'), {name: 'AbortError'})); };
    await page.evaluate(() => { projektStatus.dirty = false; undoStack = [{probe: 'vorher'}]; });
    await page.evaluate(() => schnittplaeneDrucken());
    await page.locator('#modal-schnittplan-aktion .modal-actions button', {hasText: 'Abbrechen'}).click();
    await page.evaluate(abort);
    await page.evaluate(() => schnittplaeneDrucken());
    await page.locator('#bk-save-ordner').click();
    await page.waitForTimeout(200);
    await page.evaluate(() => { document.getElementById('modal-schnittplan-aktion')?.remove(); window.offen = window.open; window.open = () => null; });
    await page.evaluate(() => schnittplaeneDrucken());
    await page.locator('#bk-open-print').click();
    await page.evaluate(() => { window.open = window.offen; });
    assert.deepEqual((await status()).so.map(x => x[1]), [null, null, null], 'Abbrechen/Ordnerdialog/Popup blockiert: nichts fest');
    assert.equal(await page.evaluate(() => window.gedruckt.length), 0, 'nichts gedruckt');
    assert.deepEqual(await page.evaluate(() => [projektStatus.dirty, undoStack.length]), [false, 1], 'Rückgängig bleibt, nichts ungespeichert');
    // dasselbe für die Auftragsübersicht
    await page.evaluate(abort);
    await page.evaluate(() => exportAuftragsscheinPDF());
    await page.evaluate(() => { window.showDirectoryPicker = undefined; window.open = () => null; return exportAuftragsscheinPDF(); });
    await page.evaluate(() => { window.open = window.offen; });
    const vorher = await status();
    assert.deepEqual([...vorher.pak, ...vorher.cl, ...vorher.so].map(x => x[1]).filter(Boolean), [], 'Übersicht abgebrochen/blockiert: nichts fest');
    assert.deepEqual(await page.evaluate(() => [projektStatus.dirty, undoStack.length]), [false, 1]);

    // Schnittplan: nur die Segment-Proben werden fest; gedruckt wird die feste Nummer
    await page.evaluate(() => schnittplaeneDrucken());
    await page.locator('#bk-open-print').click();
    assert.deepEqual(await status(), {pak: [[1, null], [2, null]], cl: [[3, null]], so: [[4, 'Schnittplan'], [5, 'Schnittplan'], [6, null]]});
    const plan = await page.evaluate(() => window.gedruckt.join(''));
    assert.ok(plan.includes('→ P4') && plan.includes('→ P5'), 'Schnittplan nennt die festen Nummern 4 und 5');
    assert.match(await page.locator('#flash').textContent(), /Schnittpl(an|äne) geöffnet.*2 Probennummern sind jetzt fest/);
    assert.equal(await page.evaluate(() => projektStatus.dirty), true, 'fest gewordene Nummern noch nicht gespeichert');

    // Danach eine neue PAK-Probe vorn: die Nummern auf dem Schnittplan bleiben
    await page.evaluate(() => { proben.unshift({id: nextId++, datum: today(), z1: '26.0999', z2: 'Raum 0', z3: '', z4: '', matrix: 'Wischprobe', cm2: '600', notiz: ''}); renummerieren(); renderTable(); });
    const nachher = await page.evaluate(() => sonstigeProben.slice(0, 2).map(p => p._nr));
    assert.deepEqual(nachher, [4, 5], 'Segment-Proben behalten 4 und 5');

    // Auftragsübersicht: alle vier Listen werden fest; schon feste behalten Nummer und Anlass
    await page.evaluate(() => { window.showDirectoryPicker = undefined; return exportAuftragsscheinPDF(); }); // ohne Ordnerauswahl öffnet die Übersicht das Druckfenster
    await page.waitForFunction(() => /Auftragsübersicht.*geöffnet/.test(document.getElementById('flash').textContent));
    const s = await status();
    assert.deepEqual(s.pak.map(x => x[1]), ['Auftragsübersicht', 'Auftragsübersicht', 'Auftragsübersicht']);
    assert.deepEqual(s.cl.map(x => x[1]), ['Auftragsübersicht']);
    assert.deepEqual(s.so.map(x => x[1]), ['Schnittplan', 'Schnittplan', 'Auftragsübersicht'], 'Anlass der ersten Festlegung bleibt');
    assert.equal(new Set([...s.pak, ...s.cl, ...s.so].map(x => x[0])).size, 7, 'sieben verschiedene Nummern');
    assert.match(await page.locator('#flash').textContent(), /5 Probennummern sind jetzt fest/);
    const uebersicht = await page.locator('#auftragsschein-output').textContent();
    assert.ok(uebersicht.includes('Raum 0') && uebersicht.includes('Sonst Raum'), 'Übersicht enthält die Proben');

    // Zweites Mal: nichts Neues, kein Hinweis
    await page.evaluate(() => { document.getElementById('flash').textContent = ''; window.showDirectoryPicker = undefined; return exportAuftragsscheinPDF(); });
    await page.waitForFunction(() => /Auftragsübersicht.*geöffnet/.test(document.getElementById('flash').textContent));
    assert.doesNotMatch(await page.locator('#flash').textContent(), /jetzt fest/);

    // Stornierte feste Probe steht weder in der Übersicht noch im Schnittplan; ihre Nummer bleibt vergeben
    await page.evaluate(() => { probeStornieren(sonstigeProben[1], {grund: 'Test'}); renummerieren(); });
    const nrStorno = await page.evaluate(() => sonstigeProben[1]._nr);
    await page.evaluate(() => { window.gedruckt = []; schnittplaeneDrucken(); });
    await page.locator('#bk-open-print').click();
    const plan2 = await page.evaluate(() => window.gedruckt.join(''));
    assert.ok(plan2.includes('→ P4') && !plan2.includes('→ P' + nrStorno), 'stornierte Probe nicht im Schnittplan');
    await page.evaluate(() => { window.showDirectoryPicker = undefined; return exportAuftragsscheinPDF(); }); // ohne Ordnerauswahl öffnet die Übersicht das Druckfenster
    await page.waitForFunction(() => /Auftragsübersicht.*geöffnet/.test(document.getElementById('flash').textContent));
    assert.equal(await page.evaluate(n => sonstigeProben[1]._nr === n && !!sonstigeProben[1].storniert, nrStorno), true, 'Storno bleibt, Nummer bleibt');

    assert.deepEqual(errors, []);
    console.log(`Feste Probennummern durch Auftragsübersicht und Schnittplan (${name}): Abbruch, Abbrechen/Ordnerdialog/Popup blockiert, Schnittplan, Ergänzen danach, Übersicht, Wiederholung und Storno bestanden.`);
  } finally { if (browser) await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
