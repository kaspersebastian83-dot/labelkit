// Ausschließlich synthetische Proben in einem frischen Browserkontext.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const playwright = require('playwright');
const name = process.argv[2] || 'chromium';
(async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'));
  const server = http.createServer((req, res) => {if (req.url.split('?')[0] === '/spektron-ordner.js') { res.writeHead(200, {'content-type': 'application/javascript; charset=utf-8'}); res.end(require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'spektron-ordner.js'))); return; } res.writeHead(200, {'content-type': 'text/html; charset=utf-8'}); res.end(html);});
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  let browser;
  try {
    browser = await playwright[name].launch();
    const context = await browser.newContext({viewport: {width: 1280, height: 900}, acceptDownloads: true});
    await context.addInitScript(() => localStorage.setItem('willkommen-gelesen', '1'));
    const page = await context.newPage(), errors = [], unexpectedDialogs = [];
    page.setDefaultTimeout(10000);
    let expectedImport = false;
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', d => {
      if (expectedImport && d.type() === 'confirm' && d.message().startsWith('Diese JSON ersetzt')) {expectedImport = false; d.accept();}
      else {unexpectedDialogs.push(d.message()); d.dismiss();}
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
    await page.evaluate(() => {
      zeigWillkommen();
      document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
      document.querySelectorAll('dialog[open]').forEach(d => d.close());
      switchMainTab('pak');
      document.getElementById('proj-nr').value = '26.0999';
      updateProjekt(); // Bestehenden Projektabgleich vor dem Ausgangssnapshot abschließen.
      probenStartNr = 7;
      addChloridProbe(); addAsbest(); addSonstige(); addBrandgeruchProbe(); addPn98Probe();
      addProbe({z1: 'ALT', datum: '2026-10-01', z2: 'Synthetischer Raum A', matrix: 'Wischprobe', cm2: '140', notiz: 'Erhalten', checked: true});
      addProbe({z1: '', datum: '', z2: 'Synthetischer Raum B', matrix: 'Wischprobe', cm2: ''});
      addProbe({z1: 'ALT', datum: '2026-10-02', z2: 'Synthetischer Raum C', matrix: 'Bauschutt', cm2: '88'});
      renderTable(); markSaved('Synthetisch_Daten.json', 'Synthetischer Ordner');
    });
    const state = () => page.evaluate(() => {
      const saved = JSON.parse(buildProjektSaveData().content); delete saved.gespeichertAm;
      return {saved, undo: [...undoStack], status: {...projektStatus}};
    });
    const add = page.locator('#btn-pak-hinzufuegen'), fill = page.locator('#btn-pak-leere'), change = page.locator('#btn-pak-aendern');
    const dialog = page.locator('#modal-pak-vorbelegung');
    await page.locator('#vb-anzahl').fill('2');
    await page.locator('#vb-datum').fill('19.10.2026');
    await page.locator('#vb-cm2').fill('600');
    let before = await state();
    await add.click();
    let after = await state();
    assert.deepEqual(after.saved.proben.slice(0, 3), before.saved.proben, 'Hinzufügen überschreibt keine vorhandenen PAK-Angaben');
    assert.equal(after.saved.proben.length, 5); assert.equal(after.saved.nextId, before.saved.nextId + 2);
    assert.deepEqual(after.saved.proben.map(p => p._nr), [7, 8, 9, 10, 11]);
    assert.equal(after.saved.proben[3].datum, '2026-10-19'); assert.equal(after.saved.proben[3].z1, '26.0999');
    assert.equal(after.undo.length, before.undo.length + 1); assert.equal(after.status.dirty, true);
    // Nur die abgeleiteten Nummern anderer Proben verschieben sich wie bisher beim Hinzufügen.
    for (const key of ['chloridProben', 'asbestProben', 'sonstigeProben']) {
      const strip = rows => rows.map(({_nr, chloridNr, ...rest}) => rest);
      assert.deepEqual(strip(after.saved[key]), strip(before.saved[key]));
      assert.equal(after.saved[key][0]._nr, before.saved[key][0]._nr + 2);
    }
    await page.evaluate(() => undoLetzteAktion());
    assert.deepEqual((await state()).saved, before.saved);
    await page.evaluate(() => markSaved('Synthetisch_Daten.json', 'Synthetischer Ordner'));
    before = await state();
    await fill.click(); after = await state();
    assert.equal(after.saved.proben.length, 3); assert.equal(after.saved.nextId, before.saved.nextId);
    assert.deepEqual(after.saved.proben[0], before.saved.proben[0]);
    assert.deepEqual(after.saved.proben[2], before.saved.proben[2]);
    assert.equal(after.saved.proben[1].z1, '26.0999'); assert.equal(after.saved.proben[1].datum, '2026-10-19'); assert.equal(after.saved.proben[1].cm2, '600');
    assert.equal(after.undo.length, before.undo.length + 1); assert.equal(after.status.dirty, true);
    const otherData = data => {const result = structuredClone(data); delete result.proben; return result;};
    assert.deepEqual(otherData(after.saved), otherData(before.saved));
    await fill.click(); assert.deepEqual(await state(), after, 'Erneutes Ergänzen ohne Änderungen ist ein No-op');
    await page.evaluate(() => undoLetzteAktion()); assert.deepEqual((await state()).saved, before.saved);
    await page.evaluate(() => markSaved('Synthetisch_Daten.json', 'Synthetischer Ordner'));
    before = await state();
    // Vorschau, Abbrechen, Escape und vorausgewähltes Enter verändern auch Undo und Status nicht.
    for (const cancel of ['button', 'Escape', 'Enter']) {
      await change.click();
      assert.equal(await page.evaluate(() => document.activeElement.id), 'pak-vorbelegung-abbrechen');
      const text = await dialog.textContent();
      assert.match(text, /Projektnummer → 26.0999/); assert.match(text, /PAK-Proben: 7, 9/);
      assert.match(text, /Probenahmedatum → 19.10.2026/); assert.match(text, /Fläche.*600 cm²/);
      assert.match(text, /2 vorhandene Angaben überschreiben/);
      assert.deepEqual(await state(), before);
      for (const modifier of ['Control', 'Meta']) {
        for (const key of ['Enter', 'z', 'Shift+E', 's']) await page.keyboard.press(`${modifier}+${key}`);
      }
      assert.deepEqual(await state(), before); assert.equal(await dialog.isVisible(), true);
      assert.equal(await page.locator('.modal-overlay.open').count(), 0);
      if (cancel === 'button') await page.locator('#pak-vorbelegung-abbrechen').click(); else await page.keyboard.press(cancel);
      assert.equal(await dialog.isVisible(), false); assert.deepEqual(await state(), before);
    }
    await change.click(); await dialog.getByRole('button', {name: 'Genannte Angaben jetzt ändern', exact: true}).click();
    after = await state();
    assert.equal(after.saved.proben.length, 3); assert.equal(after.saved.nextId, before.saved.nextId);
    assert.deepEqual(after.saved.proben.map(p => p._nr), before.saved.proben.map(p => p._nr));
    for (let i = 0; i < 3; i++) {
      const expected = {...before.saved.proben[i]};
      if (expected.z1) expected.z1 = '26.0999';
      if (expected.datum) expected.datum = '2026-10-19';
      if (expected.matrix === 'Wischprobe' && expected.cm2) expected.cm2 = '600';
      assert.deepEqual(after.saved.proben[i], expected);
    }
    assert.deepEqual(otherData(after.saved), otherData(before.saved));
    assert.equal(after.undo.length, before.undo.length + 1); assert.equal(after.status.dirty, true);
    // Tatsächlicher JSON-Download und Laden über den vorhandenen Datei-Import.
    const [download] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => exportJSON())]);
    const bytes = fs.readFileSync(await download.path());
    const saved = JSON.parse(bytes.toString('utf8')); delete saved.gespeichertAm; assert.deepEqual(saved, after.saved);
    await page.evaluate(() => undoLetzteAktion()); assert.deepEqual((await state()).saved, before.saved);
    expectedImport = true;
    await page.locator('#import-file').setInputFiles({name: 'Synthetisch_Daten.json', mimeType: 'application/json', buffer: bytes});
    await page.waitForFunction(() => proben[0].z1 === '26.0999');
    assert.deepEqual((await state()).saved, after.saved);
    // Bestehende Tastenkürzel funktionieren außerhalb der Bestätigung weiterhin.
    await page.locator('#btn-pak-hinzufuegen').focus(); await page.keyboard.press('Control+Enter');
    assert.equal((await state()).saved.proben.length, 4);
    await page.locator('#btn-pak-hinzufuegen').focus(); await page.keyboard.press('Control+z');
    assert.equal((await state()).saved.proben.length, 3);
    // Schmale Ansicht: echte Schaltflächenbedienung und Bestätigung erreichbar.
    await page.setViewportSize({width: 390, height: 844});
    await page.locator('#vb-datum').fill('20.10.2026');
    await change.click();
    const box = await dialog.boundingBox(); assert.ok(box.x >= 0 && box.x + box.width <= 391);
    await page.locator('#pak-vorbelegung-abbrechen').click();
    // Leere Eingaben ändern keine bestehenden Werte; Hinzufügen bei leerer Liste bleibt möglich.
    await page.locator('#vb-datum').fill(''); await page.locator('#vb-cm2').fill('');
    await page.evaluate(() => {document.getElementById('proj-nr').value = '';});
    before = await state(); await fill.click(); await change.click(); assert.deepEqual(await state(), before);
    assert.equal(await dialog.isVisible(), false);
    await page.evaluate(() => {proben = []; nextId = 1; renderTable();});
    assert.equal(await fill.isDisabled(), true); assert.equal(await change.isDisabled(), true);
    await add.click(); assert.equal((await state()).saved.proben.length, 2);
    assert.deepEqual(errors, []); assert.deepEqual(unexpectedDialogs, []);
    console.log(`PAK-Vorbelegung (${name}): getrennte Aktionen, Vorschau/Abbruch, Tastatur, Undo, Nummern, andere Proben, JSON-Dateiimport und schmale Ansicht bestanden.`);
  } finally {if (browser) await browser.close(); server.close();}
})().catch(e => {console.error(e); process.exitCode = 1;});
