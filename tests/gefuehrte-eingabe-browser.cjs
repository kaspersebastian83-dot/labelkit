// Nur synthetische Proben. Bestehende Eingabe-/Speicher-/Undo-Wege im echten Browser.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const playwright = require('playwright');
const name = process.argv[2] || 'chromium';
(async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'));
  const server = http.createServer((req, res) => {res.writeHead(200, {'content-type': 'text/html; charset=utf-8'});res.end(html);});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await playwright[name].launch();
    const context = await browser.newContext({viewport: {width: 1280, height: 900}, acceptDownloads: true});
    await context.addInitScript(() => localStorage.setItem('willkommen-gelesen', '1'));
    const page = await context.newPage(), errors = [], dialogs = [], downloads = [];
    let importExpected = false;
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', d => {
      if (importExpected && d.message().startsWith('Diese JSON ersetzt')) {importExpected = false;d.accept();}
      else {dialogs.push(d.message());d.dismiss();}
    });
    page.on('download', d => downloads.push(d));
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
    await page.evaluate(() => {
      zeigWillkommen();
      document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
      document.querySelectorAll('dialog[open]').forEach(d => d.close());
      switchMainTab('pak');
    });
    const state = () => page.evaluate(() => {
      const data = JSON.parse(buildProjektSaveData().content); delete data.gespeichertAm;
      return {data, nextId, undo: [...undoStack], status: {...projektStatus}};
    });
    const samples = () => page.evaluate(() => JSON.parse(JSON.stringify(proben)));
    const guided = page.locator('#modal-schnell'), panel = page.locator('#fokus-panel');
    const closePanel = () => panel.locator('.fokus-panel-header button').click();
    const cards = page.locator('.probe-karte'), edits = cards.locator('button.karte-bearbeiten');
    const start = page.getByRole('button', {name: 'Geführte Eingabe', exact: true});
    assert.equal(await start.isVisible(), true);
    // Leerer Einstieg nutzt unverändert openSchnell(): genau eine neue Probe.
    await page.getByRole('button', {name: 'Geführte Eingabe starten', exact: true}).click();
    assert.equal(await guided.locator('h2').textContent(), 'Geführte Eingabe');
    assert.equal((await samples()).length, 1);
    await guided.getByRole('button', {name: 'Beenden', exact: true}).click();
    await page.evaluate(() => {
      applyProjektData({projekt: {nr: '26.0999'}, probenStartNr: 7,
        proben: [
          {id: 41, datum: '2026-10-19', z1: '26.0999', z2: 'EG Testflur', z3: 'mit Belag', z4: 'Aufsicht', matrix: 'Wischprobe', cm2: '600', notiz: 'Synthetisch A'},
          {id: 83, datum: '2026-10-18', z1: '26.0999', z2: 'OG Testraum', z3: 'gereinigt', z4: 'Ansicht', matrix: 'Bauschutt', cm2: '', notiz: 'Synthetisch B'},
          {id: 105, datum: '2026-10-17', z1: '26.0999', z2: '', z3: '', z4: '', matrix: 'Wischprobe', cm2: '140', notiz: ''}
        ], chloridProben: [{id: 301, datum: '', z1: '26.0999', z2: 'Chlorid Test', matrix: 'Wischprobe', cm2: '140'}],
        asbestProben: [{id: 401, z2: 'Asbest Test', matrix: 'Material (mineralisch)'}],
        sonstigeProben: [{id: 501, z2: 'Sonstige Test', matrix: 'Wasser'}]});
      // Zentrale Nummerierung, unabhängig von den IDs.
      setProbenStartNr(7); undoStack = []; projektStatus.dirty = false; updateProjektStatus();
    });
    let before = await state();
    await start.click();
    await page.waitForFunction(() => document.activeElement.id === 's-datum');
    assert.equal(await guided.isVisible(), true);
    assert.deepEqual(await state(), before, 'Öffnen vorhandener Proben verändert weder Daten noch Status/Undo');
    for (const [id, value] of Object.entries({'s-datum': '19.10.2026', 's-z2': 'EG Testflur', 's-z3': 'mit Belag', 's-z4': 'Aufsicht', 's-matrix': 'Wischprobe', 's-cm2': '600', 's-notiz': 'Synthetisch A'})) {
      assert.equal(await page.locator('#' + id).inputValue(), value);
    }
    assert.equal(await page.locator('#schnell-nr').textContent(), 'Probe 7');
    assert.equal(await page.locator('#schnell-prev-btn').isDisabled(), true);
    await page.locator('#s-z2').fill('EG Testflur geändert');
    await page.locator('#s-z2').press('Enter');
    await page.waitForFunction(() => schnellIdx === 1 && document.activeElement.id === 's-datum');
    assert.equal(await page.locator('#s-z2').inputValue(), 'OG Testraum');
    let changed = await samples();
    assert.deepEqual(changed, before.data.proben.map((p, i) => i === 0 ? {...p, z2: 'EG Testflur geändert'} : p));
    await page.locator('#schnell-prev-btn').click();
    await page.waitForFunction(() => document.activeElement.id === 's-datum');
    assert.equal(await page.locator('#s-z2').inputValue(), 'EG Testflur geändert');
    // Bestehendes Verhalten: Beenden/Escape übernehmen kein noch nicht bestätigtes Formularfeld.
    changed = await samples();
    await page.locator('#s-z2').fill('Nicht mit Weiter bestätigt');
    await guided.getByRole('button', {name: 'Beenden', exact: true}).click();
    assert.deepEqual(await samples(), changed);
    for (const modifier of ['Control', 'Meta']) {
      await page.keyboard.press(`${modifier}+Shift+E`);
      assert.equal(await guided.isVisible(), true);
      await page.waitForFunction(() => document.activeElement.id === 's-datum');
      assert.equal(await page.locator('#s-z2').inputValue(), 'EG Testflur geändert');
      await page.locator('#s-z2').fill('Auch Escape bestätigt nicht');
      await page.keyboard.press('Escape');
      assert.equal(await guided.isVisible(), false);
      assert.deepEqual(await samples(), changed);
    }
    await start.click();
    for (let i = 0; i < 3; i++) await page.locator('#schnell-next-btn').click();
    assert.equal(await guided.isVisible(), false);
    assert.match(await page.locator('#flash').textContent(), /Geführte Eingabe abgeschlossen/);
    assert.equal((await samples()).length, 3);
    assert.deepEqual((await state()).undo, before.undo, 'Die Eingabe fügt wie bisher keinen eigenen Undo-Schritt hinzu');
    await page.locator('#btn-karten-ansicht').click();
    assert.equal(await cards.count(), 3); assert.equal(await edits.count(), 3);
    for (let i = 0; i < 3; i++) {
      const p = (await samples())[i];
      assert.equal(await edits.nth(i).isVisible(), true);
      assert.equal(await edits.nth(i).textContent(), 'Bearbeiten');
      assert.equal(await edits.nth(i).getAttribute('type'), 'button');
      before = await state();
      await edits.nth(i).click();
      await page.waitForFunction(() => document.activeElement.id === 'fp-z2');
      assert.equal(await page.locator('#fokus-titel').textContent(), `Probe ${p._nr} bearbeiten`);
      assert.equal(await page.locator('#fokus-untertitel').textContent(), ['PAK', p.z2, p.matrix].filter(Boolean).join(' · '));
      assert.equal(await page.locator('#fp-z2').inputValue(), p.z2);
      assert.equal(await page.locator('#fp-matrix').inputValue(), p.matrix);
      assert.deepEqual(await state(), before, 'Bloßes Öffnen bleibt vollständig lesend');
      await closePanel();
    }
    // Button-Ereignisse dürfen keine Kartenaktion auslösen. Auch dblclick bleibt am Button.
    await page.evaluate(() => {
      window.cardActions = [];
      document.querySelectorAll('.probe-karte').forEach(card => {
        for (const type of ['click', 'dblclick']) card.addEventListener(type, e => cardActions.push(e.type));
      });
    });
    await edits.nth(1).click();
    await edits.nth(1).dispatchEvent('dblclick');
    assert.deepEqual(await page.evaluate(() => cardActions), []);
    assert.equal(await page.locator('#fp-z2').inputValue(), 'OG Testraum');
    await closePanel();
    // Echter Doppelklick auf die Karte und auf die Tabellenzeile öffnet dieselbe Probe.
    await cards.nth(1).locator('.karte-nr').dblclick();
    assert.equal(await page.locator('#fp-z2').inputValue(), 'OG Testraum');
    await closePanel();
    await page.locator('#btn-karten-ansicht').click();
    await page.locator('#proben-tbody tr').nth(1).locator('td').nth(2).dblclick();
    assert.equal(await page.locator('#fp-z2').inputValue(), 'OG Testraum');
    await closePanel(); await page.locator('#btn-karten-ansicht').click();
    // Tab-Reihenfolge (WebKit richtet native Buttons nach der Plattform-Einstellung aus).
    await edits.first().focus();
    await page.keyboard.press('Tab');
    if (name === 'webkit' && !(await edits.nth(1).evaluate(el => el === document.activeElement))) {
      await edits.first().focus(); await page.keyboard.press('Alt+Tab');
    }
    assert.equal(await edits.nth(1).evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.activeElement.id === 'fp-z2');
    before = await state();
    await page.locator('#fp-z2').fill('OG gezielt bearbeitet');
    await page.locator('#fp-notiz').fill('Nur diese Probe ändern');
    const panelSave = panel.getByRole('button', {name: '✓ Speichern & Schließen', exact: true});
    try {
      await panelSave.click();
    } catch (error) {
      // Linux-CI: einen außerhalb des Viewports liegenden Knopf diagnostizieren,
      // ohne Klick zu erzwingen, Assertion abzuschwächen oder zu wiederholen.
      console.error('Panel-Speicherdiagnose', JSON.stringify(await page.evaluate(() => {
        const info = selector => {
          const el = document.querySelector(selector);
          if (!el) return null;
          const style = getComputedStyle(el);
          return {className: el.className, rect: el.getBoundingClientRect().toJSON(),
            client: [el.clientWidth, el.clientHeight], scroll: [el.scrollLeft, el.scrollTop, el.scrollWidth, el.scrollHeight],
            position: style.position, transform: style.transform, overflow: style.overflow,
            minHeight: style.minHeight, flex: style.flex};
        };
        return {viewport: [innerWidth, innerHeight], pageScroll: [scrollX, scrollY],
          active: document.activeElement?.id, fonts: document.fonts.status,
          panel: info('#fokus-panel'), header: info('.fokus-panel-header'),
          body: info('.fokus-panel-body'), footer: info('.fokus-panel-footer'),
          button: info('.fokus-panel-footer > button'), overlay: info('#fokus-overlay')};
      })));
      throw error;
    }
    changed = await state();
    assert.deepEqual(changed.data.proben, before.data.proben.map((p, i) => i === 1 ? {...p, z2: 'OG gezielt bearbeitet', notiz: 'Nur diese Probe ändern'} : p));
    for (const key of ['chloridProben', 'asbestProben', 'sonstigeProben']) assert.deepEqual(changed.data[key], before.data[key]);
    assert.equal(changed.nextId, before.nextId); assert.deepEqual(changed.undo, before.undo);
    assert.equal(changed.status.dirty, true);
    // Auch Leertaste aktiviert den nativen Button.
    await edits.nth(1).focus(); await page.keyboard.press('Space');
    await page.waitForFunction(() => document.activeElement.id === 'fp-z2');
    assert.equal(await page.locator('#fp-z2').inputValue(), 'OG gezielt bearbeitet');
    await panel.locator('#fp-prev-btn').click();
    assert.equal(await page.locator('#fokus-titel').textContent(), 'Probe 7 bearbeiten');
    await panel.locator('#fp-next-btn').click();
    assert.match(await page.locator('#fokus-untertitel').textContent(), /OG gezielt bearbeitet/);
    await closePanel();
    // Zwischenstand: reale UI-Speicherung mit synthetischem Ordner an der Browsergrenze.
    await page.evaluate(() => {
      window.testWritten = null;
      window.showDirectoryPicker = async () => ({name: 'Testordner', async getFileHandle(name) {
        return {async createWritable() {return {async write(content) {window.testWritten = {name, content};}, async close() {}};}};
      }});
      letzterSpeicherOrdner = null;
    });
    const save = page.locator('#btn-zwischenstand-speichern');
    const status = page.locator('#header-save-status');
    before = await state(); await save.click();
    await page.waitForFunction(() => !speichernAktiv);
    assert.equal(await page.evaluate(() => projektStatus.dirty), false);
    assert.match(await status.textContent(), /^Gespeichert:/);
    const file = await page.evaluate(() => testWritten);
    const written = JSON.parse(file.content); delete written.gespeichertAm;
    assert.deepEqual(written, before.data);
    await edits.nth(1).click(); await page.locator('#fp-notiz').fill('Nach Speicherung geändert'); await closePanel();
    assert.match(await status.textContent(), /Änderungen noch nicht gespeichert/);
    importExpected = true;
    await page.locator('#import-file').setInputFiles({name: file.name, mimeType: 'application/json', buffer: Buffer.from(file.content)});
    await page.waitForFunction(() => !projektStatus.dirty);
    assert.equal(importExpected, false);
    assert.deepEqual((await state()).data, written);
    if (!(await edits.count())) await page.locator('#btn-karten-ansicht').click();
    await edits.nth(1).click();
    assert.equal(await page.locator('#fp-z2').inputValue(), 'OG gezielt bearbeitet');
    assert.equal(await page.locator('#fp-notiz').inputValue(), 'Nur diese Probe ändern');
    await closePanel();
    // Entfernen, Hinzufügen, Startnummer ändern: Karte und Panel bleiben an derselben Probe.
    await page.evaluate(() => {removeProbe(proben[0].id); addProbe({z2: 'Neue Testprobe'});});
    await page.locator('#probe-startnr').fill('20');
    assert.equal(await cards.first().locator('.karte-nr').textContent(), 'Probe 20');
    await edits.first().click();
    assert.equal(await page.locator('#fokus-titel').textContent(), 'Probe 20 bearbeiten');
    assert.equal(await page.locator('#fp-z2').inputValue(), 'OG gezielt bearbeitet');
    assert.equal(await page.evaluate(() => proben[fokusIdx].id), 83);
    await closePanel();
    // Bestehendes Undo bleibt gleich: Startnummer, Hinzufügen und Entfernen rückgängig.
    await page.locator('#btn-karten-ansicht').focus();
    await page.keyboard.press('Control+z');
    assert.equal(await cards.first().locator('.karte-nr').textContent(), 'Probe 7');
    await page.keyboard.press('Control+z');
    assert.equal(await cards.count(), 2);
    await page.keyboard.press('Control+z');
    assert.equal(await cards.count(), 3);
    await edits.nth(1).click();
    assert.equal(await page.evaluate(() => proben[fokusIdx].id), 83);
    assert.equal(await page.locator('#fokus-titel').textContent(), 'Probe 8 bearbeiten');
    await closePanel();
    // Lange und fehlende Ortsangaben; alle neuen Bedienelemente bei beiden Bürobreiten.
    await page.evaluate(() => {proben[0].z2 = 'SynthetischerRaum'.repeat(12); renderTable();});
    const inViewport = async locator => {
      const box = await locator.boundingBox(), width = page.viewportSize().width;
      assert.ok(box && box.width > 0 && box.x >= -1 && box.x + box.width <= width + 1,
        `${await locator.getAttribute('class')}: ${JSON.stringify(box)} bei ${width}px`);
    };
    for (const width of [1280, 390]) {
      await page.setViewportSize({width, height: 900});
      await page.evaluate(() => window.scrollTo({left: 0, top: scrollY}));
      await start.scrollIntoViewIfNeeded(); await inViewport(start);
      for (let i = 0; i < 3; i++) {
        await cards.nth(i).scrollIntoViewIfNeeded();
        await inViewport(cards.nth(i)); await inViewport(edits.nth(i));
      }
      if (process.env.SCREENSHOT_DIR) {
        fs.mkdirSync(process.env.SCREENSHOT_DIR, {recursive: true});
        await edits.first().scrollIntoViewIfNeeded();
        await page.screenshot({path: path.join(process.env.SCREENSHOT_DIR, `pak-karten-${name}-${width}.png`)});
      }
      await edits.first().click();
      await page.waitForFunction(() => document.activeElement.id === 'fp-z2');
      // Auf dem Panel liegen weiterhin bestehende Übergänge; deren Ende für Geometrie abwarten.
      await page.waitForTimeout(400);
      for (const locator of [panel, panel.locator('.fokus-panel-header'), page.locator('#fokus-untertitel'), panel.getByRole('button', {name: '✓ Speichern & Schließen', exact: true})]) await inViewport(locator);
      assert.equal(await panel.evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
      if (process.env.SCREENSHOT_DIR) await page.screenshot({path: path.join(process.env.SCREENSHOT_DIR, `pak-panel-${name}-${width}.png`)});
      await closePanel();
      await start.click();
      await page.waitForFunction(() => document.activeElement.id === 's-datum');
      await inViewport(guided.locator('.modal'));
      for (const id of ['s-z2', 'schnell-prev-btn', 'schnell-next-btn']) await inViewport(page.locator('#' + id));
      if (process.env.SCREENSHOT_DIR) await page.screenshot({path: path.join(process.env.SCREENSHOT_DIR, `gefuehrte-eingabe-${name}-${width}.png`)});
      await page.keyboard.press('Escape');
    }
    assert.equal(downloads.length, 0, 'Keine unerwarteten Downloads/Exporte');
    assert.deepEqual(errors, []); assert.deepEqual(dialogs, []);
    console.log(`Geführte Eingabe/Karten (${name}): Einstieg, Tastatur, Feldübernahme, richtige Probe/Nummer, Klick/Doppelklick, Datenerhalt, JSON-Roundtrip, Undo und 1280/390px bestanden.`);
  } finally {if (browser) await browser.close(); server.close();}
})().catch(e => {console.error(e);process.exitCode = 1;});
