// Ausschließlich synthetische Daten, Ordnerzugriff an der Browsergrenze nachgebildet.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const playwright = require('playwright');
const name = process.argv[2] || 'chromium';
(async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'));
  const server = http.createServer((req, res) => {if (req.url.split('?')[0] === '/spektron-ordner.js') { res.writeHead(200, {'content-type': 'application/javascript; charset=utf-8'}); res.end(require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'spektron-ordner.js'))); return; } res.writeHead(200, {'content-type': 'text/html; charset=utf-8'});res.end(html);});
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  let browser;
  try {
    browser = await playwright[name].launch();
    const context = await browser.newContext({viewport: {width: 1280, height: 900}, acceptDownloads: true});
    await context.addInitScript(() => localStorage.setItem('willkommen-gelesen', '1'));
    const page = await context.newPage(), errors = [], downloads = [], dialogs = [];
    let importExpected = false;
    page.on('pageerror', e => errors.push(e.message));
    page.on('download', d => downloads.push(d));
    page.on('dialog', d => {
      if (importExpected && d.message().startsWith('Diese JSON ersetzt')) {importExpected = false;d.accept();}
      else {dialogs.push(d.message());d.dismiss();}
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
    await page.evaluate(() => {
      zeigWillkommen();
      document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
      document.querySelectorAll('dialog[open]').forEach(d => d.close());
      document.getElementById('proj-nr').value = '26.0999'; updateProjekt();
      probenStartNr = 7;
      addProbe({z1: '', datum: '', z2: '', notiz: 'Synthetischer Zwischenstand'});
      addChloridProbe(); addAsbest(); addSonstige(); addBrandgeruchProbe(); addPn98Probe();
      renderTable();
      // Keine tatsächlichen Dateien oder gespeicherten Ordnerhandles verwenden.
      window.testDisk={};window.testFiles = []; window.testClosed = []; window.testMode = 'ok'; window.testPickers = 0;
      window.testDir = {name: 'Laboraufträge', async *values(){for(const name of Object.keys(testDisk))yield {name,kind:'file',getFile:async()=>new File([testDisk[name]],name)};}, async getFileHandle(name,o={}) {
        if (testMode === 'handle-error') throw new DOMException('Zugriff verweigert', 'NotAllowedError');
        if(!(name in testDisk)){if(!o.create)throw new DOMException('Missing','NotFoundError');testDisk[name]='';}
        return {getFile:async()=>new File([testDisk[name]],name),async createWritable() {
          if (testMode === 'create-error') throw new DOMException('Schreibrecht verweigert', 'NotAllowedError');
          let pending;return {
            async write(content) {
              if (testMode === 'write-error') throw new Error('Datenträger voll');
              pending=content;testFiles.push({name, content});
              if (testMode === 'delayed') await new Promise(resolve => {window.finishTestWrite = resolve;});
            },
            async close() {
              if (testMode === 'close-error') throw new Error('Abschluss fehlgeschlagen');
              testDisk[name]=pending;testClosed.push(name);
            },async abort(){}
          };
        }};
      }};
      window.showDirectoryPicker = async () => {
        testPickers++;
        if (testMode === 'cancel') throw new DOMException('Abgebrochen', 'AbortError');
        if (testMode === 'denied') throw new DOMException('Zugriff verweigert', 'NotAllowedError');
        return testDir;
      };
      letzterSpeicherOrdner = null;
      window.testPicker = window.showDirectoryPicker;
    });
    const button = page.locator('#btn-zwischenstand-speichern');
    const status = page.locator('#header-save-status');
    const snapshot = () => page.evaluate(() => {
      const data = JSON.parse(buildProjektSaveData().content);delete data.gespeichertAm;
      return {data, undo: [...undoStack]};
    });
    const before = await snapshot();
    assert.ok(await page.evaluate(() => pruefeAbschlussKonsistenz().kritisch.length > 0));
    await button.click();
    await page.waitForFunction(() => !speichernAktiv);
    assert.match(await status.textContent(), /^Gespeichert:/);
    assert.deepEqual(await snapshot(), before, 'Speichern verändert weder Daten, Nummerierung noch Undo');
    const savedFile = await page.evaluate(() => testFiles[0]);
    const saved = JSON.parse(savedFile.content); delete saved.gespeichertAm;
    assert.deepEqual(saved, before.data);
    assert.match(savedFile.name, /_Daten\.json$/);
    assert.deepEqual(await page.evaluate(() => testClosed), [savedFile.name]);
    assert.equal(downloads.length, 0);
    if (process.env.SCREENSHOT_DIR) await page.screenshot({path: path.join(process.env.SCREENSHOT_DIR, `zwischenstand-${name}-desktop.png`), fullPage: false});
    // Echte UI-Änderung wird ungespeichert, anschließender Dateiimport stellt den Stand wieder her.
    await page.locator('#proben-tbody input[type="text"]').first().fill('Geändert');
    assert.match(await status.textContent(), /Änderungen noch nicht gespeichert/);
    importExpected = true;
    await page.locator('#import-file').setInputFiles({name: savedFile.name, mimeType: 'application/json', buffer: Buffer.from(savedFile.content)});
    await page.waitForFunction(() => !projektStatus.dirty);
    assert.deepEqual((await snapshot()).data, before.data);
    // Abbruch und Fehler dürfen nie als erfolgreiche Speicherung erscheinen.
    for (const mode of ['cancel', 'denied', 'handle-error', 'create-error', 'write-error', 'close-error']) {
      await page.evaluate(mode => {testMode = mode;letzterSpeicherOrdner = null;markUnsaved();}, mode);
      const baseline = await snapshot();
      await button.click();await page.waitForFunction(() => !speichernAktiv);
      assert.match(await status.textContent(), mode === 'cancel' ? /Speichern abgebrochen/ : /Speichern fehlgeschlagen/);
      assert.equal(await page.evaluate(() => projektStatus.dirty), true);
      assert.equal(await button.isEnabled(), true);
      assert.deepEqual(await snapshot(), baseline);
    }
    // Während des Schreibens sichtbar beschäftigt; Mehrfachaufrufe erzeugen keinen zweiten Schreibvorgang.
    await page.evaluate(() => {testMode = 'delayed';letzterSpeicherOrdner = null;window.finishTestWrite = null;});
    await button.click();await page.waitForFunction(() => !!window.finishTestWrite);
    assert.match(await status.textContent(), /Wird gespeichert/);assert.equal(await button.isDisabled(), true);
    const fileCount = await page.evaluate(() => testFiles.length);
    await page.keyboard.press('Control+s');await page.evaluate(() => schnellSpeichern());
    assert.equal(await page.evaluate(() => testFiles.length), fileCount);
    await page.evaluate(() => {proben[0].notiz = 'Während Schreiben geändert';markUnsaved();finishTestWrite();});
    await page.waitForFunction(() => !speichernAktiv);
    assert.match(await status.textContent(), /aktuelle Änderungen noch nicht gespeichert/);
    assert.equal(await page.evaluate(() => projektStatus.dirty), true);
    // Auch ein inzwischen gewechselter Zielordner darf keine aktuelle Speicherbestätigung erhalten.
    await page.evaluate(() => {testMode = 'delayed';window.finishTestWrite = null;});
    await button.click();await page.waitForFunction(() => !!window.finishTestWrite);
    await page.evaluate(() => {letzterSpeicherOrdner = {...testDir, name: 'Anderer Testordner'};finishTestWrite();});
    await page.waitForFunction(() => !speichernAktiv);
    assert.equal(await page.evaluate(() => projektStatus.dirty), true);
    assert.match(await status.textContent(), /aktuelle Änderungen noch nicht gespeichert/);
    // Wiederholung via Strg+S und ⌘+S nutzt denselben reinen JSON-Weg und das vorhandene Handle.
    for (const modifier of ['Control', 'Meta']) {
      await page.evaluate(() => {testMode = 'ok';markUnsaved();});
      const count = await page.evaluate(() => testFiles.length);
      const pickers = await page.evaluate(() => testPickers);
      await button.focus();await page.keyboard.press(`${modifier}+s`);
      await page.waitForFunction(count => !speichernAktiv && testFiles.length === count + 1, count);
      assert.match(await status.textContent(), /^Gespeichert:/);
      assert.equal(await page.evaluate(() => testPickers), pickers);
    }
    // Bestehende Projektordnerintegration liefert direkt den Unterordner „Laboraufträge“.
    await page.evaluate(async () => {
      const dir = {name: '26.0999 Testort', async queryPermission() {return 'granted';},
        async getDirectoryHandle() {return testDir;}, async getFileHandle() {throw new Error('Keine _Projekt.json');}};
      await PROJEKTORDNER.oeffnen(dir);
      markUnsaved();
    });
    const pickers = await page.evaluate(() => testPickers);
    await button.click();await page.waitForFunction(() => !speichernAktiv);
    assert.equal(await page.evaluate(() => testPickers), pickers);
    assert.match(await status.textContent(), /Gespeichert:.*Laboraufträge/);
    assert.ok((await page.evaluate(() => testFiles)).every(f => /_Daten\.json$/.test(f.name)), 'Keine Laborunterlagen');
    // Ohne Ordnerschnittstelle: nur eine JSON-Datei, auch bei unvollständigen Proben.
    await page.evaluate(() => {window.showDirectoryPicker = undefined;markUnsaved();});
    const noFolder = await snapshot(), downloadCount = downloads.length;
    const [download] = await Promise.all([page.waitForEvent('download'), button.click()]);
    const json = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));delete json.gespeichertAm;
    assert.deepEqual(json, noFolder.data);
    await page.waitForFunction(() => !speichernAktiv);
    assert.match(await status.textContent(), /Download gestartet.*bitte Datei prüfen/);
    assert.equal(await page.evaluate(() => projektStatus.dirty), true);
    assert.deepEqual(await snapshot(), noFolder);
    // Abschluss bleibt gesperrt.
    await page.evaluate(() => abschlussSpeichernGeprueft(false));
    assert.equal(await page.locator('#btn-abschluss-speichern').isDisabled(), true);
    assert.match(await page.locator('#flash').textContent(), /Speichern gesperrt/);
    await page.waitForTimeout(500);
    assert.equal(downloads.length, downloadCount + 1);
    // In allen Reitern erreichbar; auch die Statusmeldung bleibt bei 390px vollständig lesbar.
    for (const group of ['pak','chlorid','asbest','sonstige','bohrkerne','brandgeruch','pn98','feldboegen','auftrag']) {
      await page.evaluate(group => switchMainTab(group), group);assert.equal(await button.isVisible(), true);
    }
    await page.setViewportSize({width: 390, height: 844});
    for (const locator of [button, status]) {
      const box = await locator.boundingBox();assert.ok(box.x >= 0 && box.x + box.width <= 391);
    }
    if (process.env.SCREENSHOT_DIR) await page.screenshot({path: path.join(process.env.SCREENSHOT_DIR, `zwischenstand-${name}.png`), fullPage: false});
    // Regulärer Abschluss mit identifizierenden Pflichtangaben erzeugt weiterhin Laborübergabe + JSON.
    await page.evaluate(() => {
      applyProjektData({projekt: {nr: '26.0999'}, proben: [{id: 1, z1: '26.0999', datum: '2026-10-19', z2: 'Synthetischer Raum', z3: '', z4: '', matrix: 'Wischprobe', cm2: '600'}]});
      window.showDirectoryPicker = testPicker;testMode = 'ok';testFiles = [];testClosed = [];
      abschlussSpeichernGeprueft(false);
    });
    await page.waitForFunction(() => testClosed.length === 2);
    assert.deepEqual(await page.evaluate(() => testFiles.map(f => f.name.split('.').pop()).sort()), ['json','xls']);
    assert.deepEqual(errors, []);assert.deepEqual(dialogs, []);
    console.log(`Zwischenstand (${name}): unvollständig speichern/laden, Status, Abbruch/Rechte/Schreibfehler, konkurrierende Änderungen, Strg/⌘+S, Projektordner, JSON-Fallback, Abschlussgrenze und Datenerhalt bestanden.`);
  } finally {if (browser) await browser.close();server.close();}
})().catch(e => {console.error(e);process.exitCode = 1;});
