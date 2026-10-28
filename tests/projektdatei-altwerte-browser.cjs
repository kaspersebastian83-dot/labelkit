// Projektdatei nach Entfernen der Textbausteine (4.36.0): die vier früheren Angaben werden weiter gelesen und
// unverändert zurückgeschrieben; ohne Angaben bleiben sie leer; „Projekt zurücksetzen“ leert sie. Synthetische Daten.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const playwright = require('playwright');
const name = process.argv[2] || 'chromium';
(async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'));
  const server = http.createServer((req, res) => { if (req.url.split('?')[0] === '/spektron-ordner.js') { res.writeHead(200, {'content-type': 'application/javascript; charset=utf-8'}); res.end(require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'spektron-ordner.js'))); return; } res.writeHead(200, {'content-type': 'text/html; charset=utf-8'}); res.end(html); });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  let browser;
  try {
    browser = await playwright[name].launch();
    const context = await browser.newContext();
    await context.addInitScript(() => localStorage.setItem('willkommen-gelesen', '1'));
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
    const ALT = {pakPruefberichtNr: 'AR-26-0001-01', textblockLabor: 'Beispiellabor', textblockHeadings: true, textblockBrandTabelle: true};
    const speichern = d => page.evaluate(d => { if (d) applyProjektData(d, '26.0999'); return JSON.parse(buildProjektSaveData().content).ui; }, d);
    const nur = ui => Object.fromEntries(Object.keys(ALT).map(k => [k, ui[k]]));

    const mit = await speichern({format: 'labelkit', projekt: {nr: '26.0999'}, ui: {...ALT, auftragsscheinNotiz: 'Notiz'}, proben: []});
    assert.deepEqual(nur(mit), ALT, 'frühere Angaben bleiben beim Speichern erhalten');
    assert.equal(mit.auftragsscheinNotiz, 'Notiz');
    const alt = await speichern({format: 'labelkit', projekt: {nr: '26.0998'}, ...ALT, proben: []});
    assert.deepEqual(nur(alt), ALT, 'auch aus älteren Dateien (Angaben auf oberster Ebene)');
    const ohne = await speichern({format: 'labelkit', projekt: {nr: '26.0997'}, proben: []});
    assert.deepEqual(nur(ohne), {pakPruefberichtNr: '', textblockLabor: '', textblockHeadings: false, textblockBrandTabelle: false});
    await speichern({format: 'labelkit', projekt: {nr: '26.0996'}, ui: ALT, proben: []});
    await page.evaluate(() => projektZuruecksetzen());
    assert.deepEqual(nur(await speichern(null)), {pakPruefberichtNr: '', textblockLabor: '', textblockHeadings: false, textblockBrandTabelle: false}, 'neues Projekt startet leer');

    assert.equal(await page.locator('#main-textbausteine').count(), 0, 'Reiter entfernt');
    assert.equal(await page.locator('#btn-abschluss-speichern').innerText(), 'Alle EOL + Projektdatei speichern');
    assert.equal(await page.title(), await page.evaluate(() => 'LabelKit v' + APP_VERSION), 'Titel folgt APP_VERSION');
    assert.deepEqual(errors, []);
    console.log(`OK ${name}: Projektdatei behält frühere Textbaustein-Angaben, Reiter entfernt`);
  } finally { if (browser) await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
