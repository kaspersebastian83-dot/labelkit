// Feste Probennummern (4.49.0) in der echten Oberfläche: Druck macht fest, Ergänzen verschiebt nichts,
// Löschen storniert, Storno fehlt in Etiketten/Excel/Kopie/Zählungen, Storno aufheben, „Neue Proben“, Migration.
// Ausschließlich synthetische Daten im isolierten Browserkontext.
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
    const page = await context.newPage(), errors = [], prompts = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', d => { prompts.push(d.message()); d.accept(); });
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
    await page.evaluate(() => {
      zeigWillkommen();
      document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
      document.querySelectorAll('dialog[open]').forEach(d => d.close());
      // Druckfenster und Zwischenablage an der Browsergrenze nachbilden
      window.gedruckt = []; window.kopiert = [];
      window.open = () => ({document: {write(h) { window.gedruckt.push(h); }, close() {}}});
      Object.defineProperty(navigator, 'clipboard', {value: {writeText: async t => { window.kopiert.push(t); }}, configurable: true});
      switchMainTab('pak');
      document.getElementById('proj-nr').value = '26.0999';
      addProbe({z2: 'Raum A'}); addProbe({z2: 'Raum B'}); addProbe({z2: 'Raum C'});
      addChloridProbe(); chloridProben[0].z2 = 'Chlorid Raum';
      renummerieren(); renderTable(); renderChloridTable();
    });
    const nr = () => page.evaluate(() => ({pak: proben.map(p => p._nr), cl: chloridProben.map(p => p._nr)}));
    assert.deepEqual(await nr(), {pak: [1, 2, 3], cl: [4]});
    assert.equal(await page.locator('#proben-tbody .nr-fest').count(), 0);

    // Alle Etiketten drucken → alle vier Nummern fest
    await page.evaluate(() => druckenAlleEtiketten());
    const druck = await page.evaluate(() => window.gedruckt.join(''));
    for (const n of [1, 2, 3, 4]) assert.ok(druck.includes('Probe ' + n), 'Etikett ' + n);
    assert.deepEqual(await page.evaluate(() => [...proben, ...chloridProben].map(p => p.nrFest && p.nrFest.anlass)), ['Etiketten', 'Etiketten', 'Etiketten', 'Etiketten']);
    assert.equal(await page.locator('#proben-tbody .nr-fest').count(), 3, 'Schloss an jeder festen Nummer');
    assert.equal(await page.locator('#probe-startnr').isDisabled(), true, 'Startnummer gesperrt');
    assert.equal(await page.locator('#proben-tbody tr').first().getAttribute('draggable'), 'false', 'feste Zeile nicht ziehbar');
    assert.equal(await page.evaluate(() => undoStack.length), 0);

    // Ergänzen nach dem Druck verschiebt nichts: neue PAK-Probe bekommt 5, Chlorid bleibt 4
    await page.locator('button[onclick="addProbe()"]').first().click();
    assert.deepEqual(await nr(), {pak: [1, 2, 3, 5], cl: [4]});
    assert.equal(await page.locator('#proben-tbody tr').nth(3).locator('.nr-fest').count(), 0, 'neue Probe noch nicht fest');
    await page.evaluate(() => { proben[3].z2 = 'Raum D'; renderTable(); });

    // Löschen einer festen Probe → Storno-Dialog statt Löschen
    await page.locator('#proben-tbody tr').nth(1).locator('button[onclick^="removeProbe"]').click();
    const dlg = page.locator('#modal-storno');
    assert.equal(await dlg.isVisible(), true);
    assert.match(await dlg.textContent(), /Probe 2.*feste Nummer/);
    assert.equal(await page.locator('#storno-kuerzel').inputValue(), 'TST');
    await page.locator('#storno-grund').fill('doppelt erfasst');
    await page.locator('#storno-ok').click();
    assert.equal(await dlg.isVisible(), false);
    assert.equal(await page.evaluate(() => proben.length), 4, 'nicht gelöscht');
    assert.deepEqual(await page.evaluate(() => ({grund: proben[1].storniert.grund, kz: proben[1].storniert.kuerzel})), {grund: 'doppelt erfasst', kz: 'TST'});
    assert.deepEqual(await nr(), {pak: [1, 2, 3, 5], cl: [4]}, 'Nummern unverändert');
    const zeile2 = page.locator('#proben-tbody tr').nth(1);
    assert.match(await zeile2.getAttribute('class'), /storno-row/);
    assert.match(await zeile2.textContent(), /storniert am .*TST.*doppelt erfasst/);
    assert.equal(await zeile2.locator('input[type=text]').first().isDisabled(), true, 'stornierte Zeile gesperrt');

    // Storno fehlt in Etiketten, Excel, Kopie, Zählungen und Badges
    await page.evaluate(() => renderEtiketten());
    const etiketten = await page.locator('#etiketten-output').textContent();
    assert.ok(etiketten.includes('Raum A') && !etiketten.includes('Raum B'), 'Etiketten ohne Storno');
    assert.equal(await page.locator('#etiketten-output .etikett-item:not(.empty-etikett)').count(), 3);
    const excel = async () => { const [d] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => exportExcel())]); return fs.readFileSync(await d.path(), 'utf8'); };
    let xls = await excel();
    assert.ok(xls.includes('Raum A') && xls.includes('Raum D') && !xls.includes('Raum B'), 'Excel ohne Storno');
    assert.ok(xls.includes('Probe 5') && !xls.includes('Probe 2<'), 'Nummern in der Übergabe');
    assert.equal(await page.evaluate(() => proben[3].nrFest.anlass), 'Laborübergabe', 'Excel-Übergabe macht die neue Probe fest');
    await page.evaluate(() => copyUebergabe()); await page.waitForFunction(() => window.kopiert.length === 1);
    const kopie = await page.evaluate(() => window.kopiert[0]);
    assert.ok(kopie.includes('Raum A') && !kopie.includes('Raum B'), 'Kopie ohne Storno');
    assert.equal(await page.locator('#main-pak .tab-badge').textContent(), '3');
    await page.evaluate(() => renderAbschlussStatus());
    assert.match(await page.locator('#abschluss-check-output .check-card').first().textContent(), /PAK.*3 offen/);
    const konsistenz = await page.evaluate(() => JSON.stringify(pruefeAbschlussKonsistenz()));
    assert.ok(!/"nr":2\b/.test(konsistenz), 'Abschlussprüfung ohne stornierte Probe');

    // Storno aufheben
    await zeile2.getByRole('button', {name: 'Storno aufheben'}).click();
    assert.equal(await page.evaluate(() => 'storniert' in proben[1]), false);
    assert.ok((await excel()).includes('Raum B'), 'nach Aufheben wieder in der Übergabe');
    assert.equal(await page.locator('#main-pak .tab-badge').textContent(), '4');

    // Nicht feste Probe wird weiter direkt gelöscht
    await page.locator('button[onclick="addProbe()"]').first().click();
    assert.deepEqual(await nr(), {pak: [1, 2, 3, 5, 6], cl: [4]});
    const vorher = prompts.length;
    await page.locator('#proben-tbody tr').nth(4).locator('button[onclick^="removeProbe"]').click();
    assert.equal(await dlg.isVisible(), false); assert.equal(prompts.length, vorher);
    assert.deepEqual(await nr(), {pak: [1, 2, 3, 5], cl: [4]});

    // „Neue Proben“ im Reiter Chlorid: feste Probe wird storniert, nicht gelöscht
    await page.evaluate(() => clearChlorid());
    assert.match(prompts.at(-1), /feste Nummer.*storniert/s);
    assert.equal(await page.evaluate(() => chloridProben.length), 1);
    assert.equal(await page.evaluate(() => chloridProben[0].storniert.grund), 'Neue Proben');
    await page.evaluate(() => { addChloridProbe(); renderChloridTable(); });
    assert.deepEqual(await nr(), {pak: [1, 2, 3, 5], cl: [4, 6]}, 'neue Chlorid-Probe hinter allen festen');

    // Projektdatei: Marker und Status gespeichert, Rundreise behält Nummern
    const gespeichert = await page.evaluate(() => JSON.parse(buildProjektSaveData().content));
    assert.equal(gespeichert.nrSchutz, 1);
    assert.equal(gespeichert.proben[0].nrFest.anlass, 'Etiketten');
    assert.equal(gespeichert.chloridProben[0].storniert.grund, 'Neue Proben');
    await page.evaluate(d => { applyProjektData(d); }, gespeichert);
    assert.deepEqual(await nr(), {pak: [1, 2, 3, 5], cl: [4, 6]});

    // Migration: ältere Datei ohne nrSchutz, kein Projektordner offen → im Zweifel fest
    const alt = {version: '4.48.1', projekt: {nr: '26.0999'}, probenStartNr: 3, proben: [{id: 1, z2: 'Alt 1'}, {id: 2, z2: 'Alt 2'}], chloridProben: [], asbestProben: [], sonstigeProben: [{id: 1, z2: 'Alt S'}]};
    await page.locator('#import-file').setInputFiles({name: '26.0999_01.10.2026_Daten.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(alt))});
    await page.waitForFunction(() => proben.length === 2 && proben[0].z2 === 'Alt 1');
    assert.deepEqual(await page.evaluate(() => [...proben, ...sonstigeProben].map(p => [p._nr, p.nrFest && p.nrFest.anlass])), [[3, 'Bestand'], [4, 'Bestand'], [5, 'Bestand']]);
    assert.match(await page.locator('#flash').textContent(), /gelten als fest/);
    assert.equal(await page.evaluate(() => projektStatus.dirty), true, 'fest gewordene Nummern noch nicht gespeichert');
    // … mit geprüftem Ordner ohne Laborübergabe → nicht fest
    await page.evaluate(d => applyProjektData(d, '', {migration: true, laborUebergabe: false}), alt);
    assert.equal(await page.evaluate(() => festeNummernVorhanden()), false);
    assert.equal(await page.locator('#probe-startnr').isDisabled(), false);

    assert.deepEqual(errors, []);
    console.log(`Feste Probennummern (${name}): Druck, Ergänzen, Storno, Ausgaben ohne Storno, Storno aufheben, Löschen, Neue Proben, Rundreise und Migration bestanden.`);
  } finally { if (browser) await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
