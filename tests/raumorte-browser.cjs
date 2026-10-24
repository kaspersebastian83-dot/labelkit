// Raum / Ort: Vorschläge zuerst aus dem Projekt; gemerkt wird erst beim Verlassen des Feldes. Synthetische Daten.
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
    const context = await browser.newContext({viewport: {width: 1280, height: 900}});
    await context.addInitScript(() => { localStorage.setItem('willkommen-gelesen', '1'); localStorage.setItem('raumorte-history', JSON.stringify(['Altprojekt Keller', 'EG Küche'])); });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.dismiss());
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
    await page.evaluate(() => {
      zeigWillkommen();
      document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
      document.querySelectorAll('dialog[open]').forEach(d => d.close());
      switchMainTab('pak');
      addProbe({z2: 'EG Küche'}); addProbe({z2: 'EG Flur'}); addChloridProbe(); chloridProben[0].z2 = 'OG Bad'; addProbe({});
      renderTable();
    });
    const options = () => page.evaluate(() => [...document.querySelectorAll('#raumorte-list option')].map(o => o.value));
    const feld = page.locator('#proben-tbody tr').nth(2).locator('input[list="raumorte-list"]');
    await feld.focus();
    assert.deepEqual(await options(), ['EG Küche', 'EG Flur', 'OG Bad', 'Altprojekt Keller'], 'Projekträume zuerst, ohne Doppelte, dann ältere');
    await feld.pressSequentially('EG Kü');
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('raumorte-history'))), ['Altprojekt Keller', 'EG Küche'], 'beim Tippen wird nichts gemerkt');
    await feld.fill('EG Wohnen'); await feld.blur();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('raumorte-history'))[0]), 'EG Wohnen', 'beim Verlassen gemerkt');
    await page.locator('#proben-tbody tr').nth(0).locator('input[list="raumorte-list"]').focus();
    assert.deepEqual((await options()).slice(0, 4), ['EG Küche', 'EG Flur', 'EG Wohnen', 'OG Bad']);
    // Geführte Eingabe: Enter springt sofort zur nächsten Probe – der eingegebene Raum wird trotzdem gemerkt.
    await page.evaluate(() => openSchnell());
    await page.locator('#s-z2').fill('DG Studio'); await page.locator('#s-z2').press('Enter');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('raumorte-history'))[0] === 'DG Studio');
    assert.equal(await page.locator('#s-z2').inputValue(), 'EG Flur', 'nächste Probe geladen');
    await page.waitForFunction(() => document.activeElement.id === 's-datum'); await page.waitForTimeout(100);
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('raumorte-history')).slice(0, 2)), ['DG Studio', 'EG Wohnen'], 'der Wert der nächsten Probe wird nicht als getippt gemerkt');
    assert.deepEqual(errors, []);
    console.log(`OK ${name}: Raum/Ort-Vorschläge aus dem Projekt, gemerkt erst beim Verlassen`);
  } finally { if (browser) await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
