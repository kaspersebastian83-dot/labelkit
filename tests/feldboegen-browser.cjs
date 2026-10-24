// Feldbögen im echten Browser: node tests/feldboegen-browser.cjs [chromium|webkit|firefox]
// Playwright wird nicht im Repository geführt; lokal und in CI über NODE_PATH bereitgestellt.
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const playwright = require('playwright');

const name = process.argv[2] || 'chromium';
const url = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;

(async () => {
  const browser = await playwright[name].launch();
  const ctx = await browser.newContext({viewport: {width: 1400, height: 900}});
  await ctx.addInitScript(() => { try { localStorage.setItem('willkommen-gelesen', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !(url.startsWith('file:') && /Access-Control-Allow-Origin/.test(m.text()))) errors.push('console: ' + m.text()); });
  await page.goto(url);
  // Browser ohne Ordner-Zugriff (WebKit/Safari) zeigen verzögert den Browserhinweis; erst abwarten, dann schließen.
  await page.waitForSelector('#modal-browser-hinweis[open]', {timeout: 3000}).catch(() => {});
  await page.evaluate(() => {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    document.querySelectorAll('dialog[open]').forEach(d => d.close());
  });

  await page.locator('#proj-nr').fill('26.0142');
  await page.locator('#main-feldboegen').click();
  await page.locator('#fb-preview .fb-page').first().waitFor();
  const state = () => page.evaluate(() => ({
    pages: document.querySelectorAll('#fb-preview .fb-page').length,
    info: document.getElementById('fb-info').textContent,
    nr: document.getElementById('fb-nr').value,
    // Inhalt darf das Blatt nicht überragen (1 px Toleranz für Rundung)
    over: [...document.querySelectorAll('#fb-preview .fb-page')].map(p => p.scrollHeight - p.clientHeight),
  }));

  let s = await state();
  assert.equal(s.nr, '26.0142', 'Projektnummer übernommen');
  assert.equal(s.pages, 2, 'Asbest, 3 Messpunkte: zwei Blätter');
  // Layout: Auswahlkästchen klein (nicht durch die Feldstile der Leiste aufgebläht), Text in normaler Schrift
  const opt = await page.evaluate(() => [...document.querySelectorAll('#tab-feldboegen .opt-lab')].map(l => {
    const i = l.querySelector('input').getBoundingClientRect();
    return {w: i.width, h: i.height, up: getComputedStyle(l).textTransform};
  }));
  assert.equal(opt.length, 6, 'fünf Formulartypen und Leerformular');
  for (const o of opt) { assert.ok(o.w <= 22 && o.h <= 22, 'Auswahlkästchen höchstens 22 px, ist ' + o.w + 'x' + o.h); assert.equal(o.up, 'none'); }
  // Druck: Bogenhöhe knapp unter A4 (Safari rundet die druckbare Höhe ab) und Umbruch nur zwischen den Bögen, nie danach
  const pr = await page.evaluate(() => { const el = document.createElement('div'); el.innerHTML = fbSeiten(fbOptionen()).join(''); document.body.appendChild(el);
    const pg = el.querySelectorAll('.fb-page'); const r = {h: pg[0].getBoundingClientRect().height, a4: 297 * 96 / 25.4,
      after: getComputedStyle(pg[0]).breakAfter, beforeNext: getComputedStyle(pg[1]).breakBefore, afterLast: getComputedStyle(pg[pg.length - 1]).breakAfter}; el.remove(); return r; });
  assert.ok(pr.h < pr.a4 - 1, 'Bogen höher als druckbare Fläche: ' + pr.h + ' von ' + pr.a4);
  assert.notEqual(pr.after, 'page', 'kein Umbruch nach dem Bogen'); assert.equal(pr.beforeNext, 'page'); assert.notEqual(pr.afterLast, 'page');
  assert.match(s.info, /26\.0142-AS-01/);
  for (const n of [1, 2, 3, 4, 5, 40]) {
    await page.locator('#fb-mp').fill(String(n));
    s = await state();
    assert.equal(s.pages, 1 + Math.ceil((n - 1) / 2), `Asbest n=${n}`);
    assert.ok(s.over.every(x => x <= 1), `Asbest n=${n}: Inhalt ragt über das Blatt ${s.over}`);
  }
  await page.locator('input[name="fb-typ"][value="schimmel"]').check();
  for (const n of [1, 2, 3, 4, 5]) {
    await page.locator('#fb-mp').fill(String(n));
    s = await state();
    assert.equal(s.pages, 1 + Math.ceil(n / 2), `Schimmel n=${n}`);
    assert.ok(s.over.every(x => x <= 1), `Schimmel n=${n}: Inhalt ragt über das Blatt ${s.over}`);
  }

  // Eingaben werden maskiert; Leerformular druckt keine Projektdaten.
  await page.locator('#fb-objekt').fill('EFH, Musterweg 7 <b>&</b>');
  assert.match(await page.locator('#fb-preview').innerHTML(), /Musterweg 7 &lt;b&gt;&amp;&lt;\/b&gt;/);
  await page.locator('#fb-objekt').fill('EFH, Musterweg 7, 52525 Heinsberg');
  await page.locator('#fb-leer').check();
  assert.match(await page.locator('#fb-info').textContent(), /leer/);
  assert.doesNotMatch(await page.locator('#fb-preview').innerHTML(), /Musterweg/);
  await page.locator('#fb-leer').uncheck();

  // Druckfenster: Blätter, Schrift und Logo müssen geladen sein, bevor gedruckt wird.
  for (const typ of ['asbest', 'schimmel']) {
    await page.locator(`input[name="fb-typ"][value="${typ}"]`).check();
    await page.locator('#fb-mp').fill('3');
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.evaluate(() => { window.print = () => {}; fbDrucken(); }),
    ]);
    await popup.waitForLoadState();
    await popup.evaluate(() => document.fonts.ready);
    const info = await popup.evaluate(() => ({
      pages: document.querySelectorAll('.fb-page').length,
      plex: [...document.fonts].filter(f => /IBM Plex/.test(f.family) && f.status === 'loaded').length,
      logo: document.querySelector('.fb-wm') ? document.querySelector('.fb-wm').naturalWidth : 0,
    }));
    assert.equal(info.pages, typ === 'asbest' ? 2 : 3, `${typ}: Blätter im Druckfenster`);
    assert.ok(info.plex > 0, `${typ}: IBM Plex geladen`);
    assert.ok(info.logo > 0, `${typ}: Logo geladen`);
    await popup.close();
  }

  assert.deepEqual(errors, [], 'keine Fehler in der Konsole');
  await browser.close();
  console.log(`OK (${name})`);
})().catch(e => {
  console.error(e);
  // GitHub-Annotation, damit die Ursache auch ohne Protokoll-Download sichtbar ist
  const text = String(e && e.stack || e).slice(0, 1500).replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A');
  console.log(`::error title=Browsertest ${name}::${text}`);
  process.exit(1);
});
