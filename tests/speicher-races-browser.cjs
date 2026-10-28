// Nur synthetische Daten; Dateiinhalte werden erst beim Schließen des Schreibstroms ersetzt.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const playwright = require('playwright');
const browserName = process.argv[2] || 'chromium';
(async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'));
  const server = http.createServer((req, res) => {if (req.url.split('?')[0] === '/spektron-ordner.js') { res.writeHead(200, {'content-type': 'application/javascript; charset=utf-8'}); res.end(require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'spektron-ordner.js'))); return; } res.writeHead(200, {'content-type': 'text/html; charset=utf-8'});res.end(html);});
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  let browser;
  try {
    browser = await playwright[browserName].launch();
    const errors = [], dialogs = [];
    let expectedFailure = false;
    async function setup() {
      const context = await browser.newContext();
      await context.addInitScript(() => localStorage.setItem('willkommen-gelesen', '1'));
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      page.on('dialog', d => {
        if (!expectedFailure) dialogs.push(d.message());
        d.dismiss();
      });
      await page.goto(`http://127.0.0.1:${server.address().port}/`);
      await page.evaluate(() => {
        zeigWillkommen();
        document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
        applyProjektData({projekt: {nr: '26.0999'}, proben: [{id: 1, z1: '26.0999', datum: '2026-10-19', z2: 'Testraum', matrix: 'Wischprobe', cm2: '600', notiz: 'A'}]});
        window.disk = {};window.openWriters = 0;window.maxWriters = 0;window.jsonWrites = 0;
        window.pauseJson = true;window.resumeJson = null;window.failure = '';window.pickerCount = 0;
        window.dir = {name: 'Laboraufträge', async *values() {}, async getFileHandle(name) {
          if (failure === 'handle') throw new DOMException('Kein Zugriff', 'NotAllowedError');
          return {async createWritable() {
            if (failure === 'create') throw new DOMException('Kein Schreibrecht', 'NotAllowedError');
            openWriters++;maxWriters = Math.max(maxWriters, openWriters);
            let contents;
            return {async write(content) {
              if (failure === 'write') {openWriters--;throw new Error('Datenträger voll');}
              contents = content;
            }, async close() {
              if (name.endsWith('.json')) {
                jsonWrites++;
                if (pauseJson) {pauseJson = false;await new Promise(r => {resumeJson = r;});}
              }
              openWriters--;
              if (failure === 'close') throw new Error('Schließen fehlgeschlagen');
              disk[name] = contents;
            }};
          }};
        }};
        window.showDirectoryPicker = async () => {
          pickerCount++;
          if (failure === 'cancel') throw new DOMException('Abbruch', 'AbortError');
          if (failure === 'denied') throw new DOMException('Kein Zugriff', 'NotAllowedError');
          if (failure === 'picker-delay') await new Promise(r => {window.resumePicker = r;});
          return dir;
        };
        letzterSpeicherOrdner = dir;
        window.startSave = kind => {
          const promise = kind === 'abschluss' ? alleUebergabenSpeichernMitWord({skipValidation: true}) : schnellSpeichern();
          window.lastSave = promise;return promise;
        };
        window.beginSave = kind => {window.firstSave = startSave(kind);};
      });
      return {page, context};
    }
    const kinds = process.env.RACE_FIRST ? [process.env.RACE_FIRST] : ['abschluss', 'zwischenstand'];
    for (const first of kinds) {
      const {page, context} = await setup(), second = first === 'abschluss' ? 'zwischenstand' : 'abschluss';
      await page.evaluate(first => beginSave(first), first);
      await page.waitForFunction(() => !!resumeJson);
      await page.evaluate(async second => {proben[0].notiz = 'B';markUnsaved();await startSave(second);}, second);
      assert.match(await page.locator('#flash').textContent(), /Speichern läuft bereits/);
      const overlaps = await page.evaluate(() => maxWriters);
      await page.evaluate(async () => {resumeJson();await firstSave;});
      const outcome = await page.evaluate(() => ({
        file: Object.values(disk).filter(c => typeof c === 'string' && c.startsWith('{')).map(c => JSON.parse(c).proben[0].notiz),
        dirty: projektStatus.dirty, status: document.getElementById('header-save-status').textContent
      }));
      console.log(`${first} zuerst: ${JSON.stringify({overlaps, ...outcome})}`);
      assert.equal(overlaps, 1, 'Zwischenstand und Abschluss dürfen nicht gleichzeitig schreiben');
      assert.equal(outcome.dirty, true, 'Stand B darf nicht als gespeichert gelten');
      assert.doesNotMatch(outcome.status, /^Gespeichert:/);
      // Der abgewiesene Auftrag wird bewusst erneut ausgelöst und speichert jetzt B.
      await page.evaluate(second => startSave(second), second);
      const final = await page.evaluate(() => ({
        data: JSON.parse(disk[buildProjektSaveData().filename]), dirty: projektStatus.dirty,
        status: document.getElementById('header-save-status').textContent, undo: undoStack.length, enabled: !document.getElementById('btn-zwischenstand-speichern').disabled
      }));
      assert.equal(final.data.proben[0].notiz, 'B');assert.equal(final.dirty, false);
      assert.match(final.status, /^Gespeichert:/);assert.equal(final.undo, 0);assert.equal(final.enabled, true);
      assert.equal(await page.evaluate(() => maxWriters), 1);
      await context.close();
    }
    // Daten-/Projekt-/Ordnerwechsel während eines Schreibens: alte Datei darf nur A enthalten,
    // der inzwischen aktive Stand erhält keine Erfolgsbestätigung oder den alten Zielordner.
    for (const kind of ['abschluss', 'zwischenstand']) {
      for (const change of ['daten', 'projekt', 'ordner', 'neu-laden']) {
        const {page, context} = await setup();
        await page.evaluate(kind => beginSave(kind), kind);await page.waitForFunction(() => !!resumeJson);
        await page.evaluate(change => {
          if (change === 'daten') {proben[0].notiz = 'B';markUnsaved();}
          if (change === 'ordner') letzterSpeicherOrdner = {name: 'Anderer Ordner'};
          if (change === 'projekt') PROJEKTORDNER.state.proj = {name: 'Anderes Projekt'};
          if (change === 'neu-laden') {applyProjektData(JSON.parse(buildProjektSaveData().content));markSaved('geladen.json', 'geladen');}
        }, change);
        await page.evaluate(async () => {resumeJson();await firstSave;});
        const result = await page.evaluate(() => ({dirty: projektStatus.dirty, folder: letzterSpeicherOrdner.name, enabled: !document.getElementById('btn-zwischenstand-speichern').disabled, data: JSON.parse(disk[buildProjektSaveData().filename])}));
        assert.equal(result.data.proben[0].notiz, 'A');assert.equal(result.dirty, true);assert.equal(result.enabled, true);
        if (change === 'ordner') assert.equal(result.folder, 'Anderer Ordner');
        assert.doesNotMatch(await page.locator('#header-save-status').textContent(), /^Gespeichert:/);
        await context.close();
      }
      // Änderungen schon während der Ordnerauswahl dürfen keine veraltete Freigabe verwenden.
      for (const change of ['daten', 'projekt', 'ordner']) {
        const {page, context} = await setup();
        await page.evaluate(kind => {failure = 'picker-delay';letzterSpeicherOrdner = null;beginSave(kind);}, kind);
        await page.waitForFunction(() => !!window.resumePicker);
        await page.evaluate(async change => {
          if (change === 'daten') {proben[0].datum = '';markUnsaved();}
          if (change === 'projekt') PROJEKTORDNER.state.proj = {name: 'Anderes Projekt'};
          if (change === 'ordner') letzterSpeicherOrdner = {name: 'Anderer Ordner'};
          resumePicker();await firstSave;
        }, change);
        assert.equal(await page.evaluate(() => Object.keys(disk).length), 0);
        assert.equal(await page.evaluate(() => projektStatus.dirty), true);
        assert.match(await page.locator('#header-save-status').textContent(), /bitte erneut speichern/);
        await context.close();
      }
      for (const mode of ['cancel', 'denied', 'handle', 'create', 'write', 'close']) {
        const {page, context} = await setup();
        expectedFailure = true;
        await page.evaluate(async ({kind, mode}) => {
          failure = mode;pauseJson = false;letzterSpeicherOrdner = null;await startSave(kind);
        }, {kind, mode});
        assert.equal(await page.evaluate(() => projektStatus.dirty), true);
        assert.equal(await page.evaluate(() => speichernAktiv), false);
        assert.equal(await page.locator('#btn-zwischenstand-speichern').isEnabled(), true);
        assert.doesNotMatch(await page.locator('#header-save-status').textContent(), /^Gespeichert:/);
        // Nach jedem Abbruch/Fehler muss derselbe Weg wieder erfolgreich nutzbar sein.
        await page.evaluate(async kind => {failure = '';await startSave(kind);}, kind);
        assert.equal(await page.evaluate(() => JSON.parse(disk[buildProjektSaveData().filename]).proben[0].notiz), 'A');
        assert.equal(await page.evaluate(() => projektStatus.dirty), false);
        assert.match(await page.locator('#header-save-status').textContent(), /^Gespeichert:/);
        expectedFailure = false;await context.close();
      }
    }
    assert.deepEqual(errors, []);assert.deepEqual(dialogs, []);
    console.log(`Speicher-Races (${browserName}): beide Startrichtungen, Dateiinhalte, Status, Projekt-/Ordnerwechsel, Abbruch, Rechte und Schreibfehler mit Wiederholung bestanden.`);
  } finally {if (browser) await browser.close();server.close();}
})().catch(e => {console.error(e);process.exitCode = 1;});
