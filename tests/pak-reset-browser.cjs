// Echte Bedienung mit synthetischen Daten im isolierten Browserkontext.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const playwright = require('playwright');
const name = process.argv[2] || 'chromium';
(async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'));
  const server = http.createServer((req, res) => {res.writeHead(200, {'content-type': 'text/html; charset=utf-8'}); res.end(html);});
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  let browser;
  try {
    browser = await playwright[name].launch();
    const context = await browser.newContext({viewport: {width: 1280, height: 900}, acceptDownloads: true});
    await context.addInitScript(() => localStorage.setItem('willkommen-gelesen', '1'));
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', d => d.dismiss());
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
    await page.evaluate(() => {
      zeigWillkommen(); // Verzögerten Browserhinweis vor dem Test vollständig behandeln.
      document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
      document.querySelectorAll('dialog[open]').forEach(d => d.close());
      switchMainTab('pak');
    });
    const reset = page.locator('#btn-pak-reset'), dialog = page.locator('#modal-pak-reset');
    await reset.locator('..').locator('summary').click();
    assert.equal(await reset.isDisabled(), true);
    await page.evaluate(() => {
      document.getElementById('proj-nr').value = '26.0999';
      addChloridProbe(); addAsbest(); addSonstige(); addBrandgeruchProbe(); addPn98Probe();
      addProbe({z2: 'Synthetischer Raum', notiz: 'Erhalten bei Abbruch'}); addProbe({z2: 'Zweiter Testraum'});
      renummerieren(); renderTable();
    });
    const state = () => page.evaluate(() => ({saved: JSON.parse(buildProjektSaveData().content), undo: [...undoStack], status: {...projektStatus}}));
    const before = await state();
    assert.equal(await reset.isEnabled(), true);
    await reset.click();
    assert.equal(await dialog.isVisible(), true);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'pak-reset-abbrechen');
    assert.match(await dialog.textContent(), /Alle 2 PAK-Proben.*26.0999/);
    assert.match(await dialog.textContent(), /Angaben.*verloren/);
    await page.locator('#pak-reset-abbrechen').click();
    const unchanged = await state(); delete unchanged.saved.gespeichertAm; const baseline = structuredClone(before); delete baseline.saved.gespeichertAm;
    assert.deepEqual(unchanged, baseline);
    await reset.click(); await page.keyboard.press('Escape');
    const escaped = await state(); delete escaped.saved.gespeichertAm; assert.deepEqual(escaped, baseline);
    await reset.click(); await page.keyboard.press('Enter');
    assert.equal(await dialog.isVisible(), false, 'Enter bestätigt die vorausgewählte ungefährliche Option');
    const entered = await state(); delete entered.saved.gespeichertAm; assert.deepEqual(entered, baseline);
    await reset.click(); await dialog.getByRole('button', {name: 'PAK-Proben jetzt zurücksetzen', exact: true}).click();
    const after = await state(); assert.deepEqual(after.saved.proben, []); assert.equal(after.saved.nextId, 1);
    assert.equal(after.undo.length, before.undo.length + 1);
    for (const key of ['chloridProben','asbestProben','sonstigeProben']) {
      const strip = rows => rows.map(({_nr, chloridNr, ...rest}) => rest);
      assert.deepEqual(strip(after.saved[key]), strip(before.saved[key]));
    }
    for (const key of ['projekt','ui','brandgeruchProben','pn98Proben','pn98Projekt','feldprotokolle','probenStartNr','sonstigeNextId','asbestNextId']) assert.deepEqual(after.saved[key], before.saved[key]);
    assert.equal(await reset.isDisabled(), true);
    // Rückgängig und reguläre Eingabe arbeiten weiter, auch im Kartenmodus.
    await page.evaluate(() => undoLetzteAktion());
    const restored = await state(); assert.deepEqual(restored.saved.proben, before.saved.proben);
    await page.locator('button[onclick="addProbe()"]').first().click();
    assert.equal((await state()).saved.proben.length, 3);
    await page.locator('#btn-karten-ansicht').click(); assert.equal(await reset.isEnabled(), true);
    // Tatsächliche JSON- und Laborübergabe-Downloads aus dem unveränderten Exportweg.
    for (const action of ['exportJSON', 'exportExcel']) {
      const [download] = await Promise.all([page.waitForEvent('download'), page.evaluate(fn => window[fn](), action)]);
      const bytes = fs.readFileSync(await download.path(), 'utf8');
      if (action === 'exportJSON') {
        const json = JSON.parse(bytes); assert.equal(json.proben.length, 3); assert.equal(json.chloridProben.length, 1); assert.equal(json.projekt.nr, '26.0999');
        await page.evaluate(data => applyProjektData(data), json); assert.equal((await state()).saved.proben.length, 3);
      } else {assert.match(download.suggestedFilename(), /\.xls$/); assert.ok(bytes.includes('Synthetischer Raum'));}
    }
    await page.setViewportSize({width: 390, height: 844});
    await page.evaluate(() => {switchMainTab('pak'); clearAll();});
    assert.equal(await page.evaluate(() => document.activeElement.id), 'pak-reset-abbrechen');
    const box = await dialog.boundingBox(); assert.ok(box.x >= 0 && box.x + box.width <= 391, 'Dialog passt auf schmalen Bildschirm');
    await page.keyboard.press('Escape');
    assert.deepEqual(errors, []);
    console.log(`PAK-Reset (${name}): Abbrechen, Escape/Enter, Bestätigung, andere Daten, Rückgängig, Eingabe, JSON/Import, Laborübergabe und schmaler Dialog bestanden.`);
  } finally {if (browser) await browser.close(); server.close();}
})().catch(e => {console.error(e); process.exitCode = 1;});
