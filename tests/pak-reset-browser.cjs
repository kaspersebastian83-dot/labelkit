// Echte Bedienung mit synthetischen Daten im isolierten Browserkontext.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
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
    const page = await context.newPage(), errors = [], downloads = [], prompts = [];
    page.on('download', d => downloads.push(d.suggestedFilename()));
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', d => {prompts.push(d.message()); d.dismiss();});
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
      probenStartNr = 7; bgBlind = false;
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
    // Vorhandene Undo-Historie: globale App-Aktionen dürfen im Resetdialog nichts auslösen.
    assert.ok(before.undo.length > 0);
    for (const modifier of ['Control', 'Meta']) {
      await reset.click();
      const promptCount = prompts.length, downloadCount = downloads.length;
      for (const shortcut of ['Enter', 'z', 'Shift+E', 's']) {
        await page.keyboard.press(`${modifier}+${shortcut}`);
        await page.waitForTimeout(100); // Auch verzögerten Fokus und Speichervorgänge beobachten.
        assert.equal(await dialog.isVisible(), true, `${modifier}+${shortcut}: Resetdialog bleibt offen`);
        const during = await state(); delete during.saved.gespeichertAm;
        assert.deepEqual(during, baseline, `${modifier}+${shortcut}: Daten, Undo und Speicherstatus unverändert`);
        assert.equal(await page.locator('.modal-overlay.open').count(), 0, 'Keine zusätzliche Eingabemaske');
        assert.equal(prompts.length, promptCount, 'Kein zusätzlicher Browserdialog');
        assert.equal(downloads.length, downloadCount, 'Kein Speichern/Download');
        assert.match(await dialog.textContent(), /Alle 2 PAK-Proben/);
      }
      assert.equal(await page.evaluate(() => istModalOffen()), true);
      // Native Tab-Reihenfolge hängt bei WebKit von der Plattform-Tastatursteuerung ab.
      // Die App darf weder Tab noch Shift+Tab abfangen oder den Dialog schließen.
      for (const key of ['Tab', 'Shift+Tab']) {
        await page.evaluate(() => {
          window.pakTabPrevented = null;
          document.addEventListener('keydown', function observe(event) {
            if (event.key !== 'Tab') return;
            window.pakTabPrevented = event.defaultPrevented;
            document.removeEventListener('keydown', observe);
          });
        });
        await page.keyboard.press(key);
        assert.equal(await page.evaluate(() => window.pakTabPrevented), false);
        assert.equal(await dialog.isVisible(), true);
      }
      await page.locator('#pak-reset-abbrechen').click();
      const cancelled = await state(); delete cancelled.saved.gespeichertAm;
      assert.deepEqual(cancelled, baseline);
    }
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
    // Direkt nach Reset, VOR Rückgängig: JSON und echte Sammel-Laborübergaben enthalten nur die verbleibenden Proben.
    const [resetDownload] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => exportJSON())]);
    const resetJson = JSON.parse(fs.readFileSync(await resetDownload.path(), 'utf8'));
    const expectedReset = structuredClone(after.saved); delete expectedReset.gespeichertAm;
    const actualReset = structuredClone(resetJson); delete actualReset.gespeichertAm;
    assert.deepEqual(actualReset, expectedReset);
    for (const [i, key] of ['chloridProben', 'asbestProben', 'sonstigeProben'].entries()) assert.equal(resetJson[key][0]._nr, 7 + i);
    assert.equal(resetJson.chloridProben[0].chloridNr, 7);
    const files = await page.evaluate(async () => {
      // Nur die Dateisystemgrenze nachbilden, alle Exportgeneratoren unverändert ausführen.
      const previousPicker = window.showDirectoryPicker, previousFolder = letzterSpeicherOrdner;
      const written = [];
      const disk = {};   // LabelKit liest vor dem Speichern, was schon im Ordner liegt
      const handle = name => ({name, kind: 'file', async getFile() {return new File([disk[name] ?? ''], name);},
        async createWritable() {let t = ''; return {async write(content) {t = content; written.push({name, content});}, async close() {disk[name] = t;}, async abort() {}};}});
      window.showDirectoryPicker = async () => ({name: 'Synthetischer Exportordner', async *values() {for (const n of Object.keys(disk)) yield handle(n);}, async getFileHandle(name, o = {}) {
        if (!(name in disk)) {if (!o.create) throw new DOMException('fehlt', 'NotFoundError'); disk[name] = '';} return handle(name);
      }});
      try {await alleUebergabenSpeichernMitWord({skipValidation: true}); return written;}
      finally {window.showDirectoryPicker = previousPicker; letzterSpeicherOrdner = previousFolder;}
    });
    assert.ok(files.some(file => file.name.endsWith('_Daten.json')));
    const exportedJson = JSON.parse(files.find(file => file.name.endsWith('_Daten.json')).content);
    delete exportedJson.gespeichertAm;
    // Feste Probennummern (4.49.0): Die Laborübergabe beim Abschluss macht die übergebenen Nummern fest – sonst unverändert.
    for (const key of ['chloridProben', 'asbestProben', 'sonstigeProben']) for (const p of exportedJson[key]) {assert.equal(p.nrFest.anlass, 'Abschluss'); delete p.nrFest;}
    assert.deepEqual(exportedJson, expectedReset);
    const sheets = files.filter(file => file.name.endsWith('.xls'));
    assert.equal(sheets.length, 3); assert.ok(!files.some(file => /_PAK_/.test(file.name)));
    for (const [i, type] of ['Chlorid', 'Asbest', 'Sonstige'].entries()) {
      const file = sheets.find(file => file.name.includes(`_${type}_`)); assert.ok(file, `${type} erhalten`);
      const rows = await page.evaluate(content => [...new DOMParser().parseFromString(content, 'text/html').querySelectorAll('tr')].map(row => [...row.querySelectorAll('td')].map(cell => cell.textContent)), file.content);
      assert.equal(rows.length, 2); assert.equal(rows[1][0], `Probe ${7 + i}`);
      assert.ok(!file.content.includes('Synthetischer Raum') && !file.content.includes('Zweiter Testraum'));
    }
    // Mit festen Nummern endet die Rückgängig-Historie: ein älterer Stand könnte die Nummern sonst wieder lösen.
    assert.equal((await state()).undo.length, 0, 'Laborübergabe leert die Rückgängig-Historie');
    await page.evaluate(() => undoLetzteAktion());
    assert.deepEqual((await state()).saved.proben, []);
    // Reguläre Eingabe arbeitet weiter, auch im Kartenmodus: neue Probe bekommt die nächste freie Nummer hinter den festen.
    await page.locator('button[onclick="addProbe()"]').first().click();
    assert.equal((await state()).saved.proben.length, 1);
    assert.equal((await state()).saved.proben[0]._nr, 10);
    await page.evaluate(() => {proben[0].z2 = 'Synthetischer Raum'; renderTable();});
    await page.locator('#btn-karten-ansicht').click(); assert.equal(await reset.isEnabled(), true);
    // Tatsächliche JSON- und Laborübergabe-Downloads aus dem unveränderten Exportweg.
    for (const action of ['exportJSON', 'exportExcel']) {
      const [download] = await Promise.all([page.waitForEvent('download'), page.evaluate(fn => window[fn](), action)]);
      const bytes = fs.readFileSync(await download.path(), 'utf8');
      if (action === 'exportJSON') {
        const json = JSON.parse(bytes); assert.equal(json.proben.length, 1); assert.equal(json.chloridProben.length, 1); assert.equal(json.projekt.nr, '26.0999');
        await page.evaluate(data => applyProjektData(data), json); assert.equal((await state()).saved.proben.length, 1);
      } else {assert.match(download.suggestedFilename(), /\.xls$/); assert.ok(bytes.includes('Synthetischer Raum'));}
    }
    await page.setViewportSize({width: 390, height: 844});
    await page.evaluate(() => {switchMainTab('pak'); clearAll();});
    assert.equal(await page.evaluate(() => document.activeElement.id), 'pak-reset-abbrechen');
    const box = await dialog.boundingBox(); assert.ok(box.x >= 0 && box.x + box.width <= 391, 'Dialog passt auf schmalen Bildschirm');
    await page.keyboard.press('Escape');
    assert.deepEqual(errors, []);
    console.log(`PAK-Reset (${name}): Abbrechen, Dialog-Tastenkürzelsperre (Strg/⌘), Escape/Enter/Tab, Reset-Exporte, andere Daten, Rückgängig, Eingabe, JSON/Import und schmaler Dialog bestanden.`);
  } finally {if (browser) await browser.close(); server.close();}
})().catch(e => {console.error(e); process.exitCode = 1;});
