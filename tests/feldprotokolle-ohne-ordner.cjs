// Erfassung ohne Ordnerzugriff (Safari-Verhalten): node tests/feldprotokolle-ohne-ordner.cjs [chromium|webkit]
// Speichern lädt die Projektdatei herunter, Scan ablegen erklärt den Grund, die laufende Nummer folgt dem Formular.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const playwright = require('playwright');
const name = process.argv[2] || 'chromium';
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'));
(async () => {
  const server = http.createServer((req, res) => { res.writeHead(200, {'content-type': 'text/html; charset=utf-8'}); res.end(html); });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}/index.html`;
  const browser = await playwright[name].launch();
  const ctx = await browser.newContext({viewport: {width: 1400, height: 900}, acceptDownloads: true});
  await ctx.addInitScript(() => { try { localStorage.setItem('willkommen-gelesen', '1'); } catch (e) {} try { delete window.showDirectoryPicker; window.showDirectoryPicker = undefined; } catch (e) {} });
  const page = await ctx.newPage();
  const errors = [], dialoge = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => { dialoge.push(d.message()); d.accept(); });
  await page.goto(url);
  await page.waitForSelector('#modal-browser-hinweis[open]', {timeout: 3000}).catch(() => {});
  await page.evaluate(() => { document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open')); document.querySelectorAll('dialog[open]').forEach(d => d.close()); });
  assert.equal(await page.evaluate(() => typeof window.showDirectoryPicker), 'undefined');
  await page.locator('#main-feldboegen').click();
  await page.locator('#sub-fbe').click();
  await page.locator('#fbe-kuerzel').fill('SK');
  await page.locator('#fbe-neu-nr').fill('26.0123');
  // laufende Nummer folgt dem Formular: AS-01 vergeben, dann Schimmelpilze wählen → 01, nicht 02
  await page.locator('#tab-feldboegen-erfassen button', {hasText: 'Erfassung beginnen'}).click();
  await page.locator('#fbe-mp-0').waitFor();
  await page.locator('#fbe-inhalt input[data-p="mp.0.raum"]').fill('Küche');
  await page.locator('#tab-feldboegen-erfassen button', {hasText: 'Neues Feldprotokoll'}).click();
  assert.equal(await page.locator('#fbe-neu-lfd').inputValue(), '02', 'Asbest: 01 ist belegt');
  await page.locator('input[name=fbe-neu-typ][value=schimmel]').check();
  assert.equal(await page.locator('#fbe-neu-lfd').inputValue(), '01', 'Schimmelpilze: 01 ist frei');
  assert.equal(await page.locator('#fbe-neu-id').textContent(), '26.0123-SP-01');
  await page.locator('#tab-feldboegen-erfassen .fbe-neu button', {hasText: 'Abbrechen'}).click();
  // Speichern: nur Feldprotokolle vorhanden → Projektdatei wird heruntergeladen und enthält die Erfassung
  const dl = page.waitForEvent('download', {timeout: 8000});
  await page.locator('#tab-feldboegen-erfassen button', {hasText: 'Speichern'}).click();
  const d = await dl;
  const json = JSON.parse(fs.readFileSync(await d.path(), 'utf8'));
  assert.equal(json.feldprotokolle.length, 1);
  assert.equal(json.feldprotokolle[0].mp[0].w.raum, 'Küche');
  // Scan ablegen: ehrliche Meldung
  await page.locator('#tab-feldboegen-erfassen button', {hasText: 'Scan ablegen'}).click();
  await page.waitForTimeout(300);
  assert.ok(dialoge.some(m => /keine Ordner beschreiben/.test(m)), 'Meldung ohne Ordnerzugriff');
  assert.match(await page.locator('#fbe-scan .fbe-meta').textContent(), /keine Ordner beschreiben/);
  assert.deepEqual(errors, []);
  console.log(`OK (${name}, ohne Ordnerzugriff)`);
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
