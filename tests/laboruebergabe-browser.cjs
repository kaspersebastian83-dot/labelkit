// Laborübergabe (4.43.0): Datum aus einer Projektdatei wird in Tabellen, Etiketten, Übergabe und Excel maskiert;
// die kopierte (tabulatorgetrennte) Übergabe bleibt Klartext, Zeilenumbrüche in „Untersuchungsparameter“ erzeugen keine Zeilen.
// Spaltenreihenfolge der Übergabe unverändert. Synthetische Daten. Aufruf: node tests/laboruebergabe-browser.cjs chromium
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const playwright = require('playwright');
const name = process.argv[2] || 'chromium';
(async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'));
  const server = http.createServer((req, res) => { res.writeHead(200, {'content-type': 'text/html; charset=utf-8'}); res.end(html); });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  let browser;
  try {
    browser = await playwright[name].launch();
    const context = await browser.newContext({viewport: {width: 1440, height: 1000}});
    await context.addInitScript(() => { localStorage.setItem('willkommen-gelesen', '1'); localStorage.setItem('mosaik-kuerzel', 'SK'); });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
    await page.evaluate(() => { document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open')); document.querySelectorAll('dialog[open]').forEach(d => d.close()); });

    const boese = '"><img src=x onerror="window.__xss=(window.__xss||0)+1">';
    const r = await page.evaluate(async boese => {
      const kopiert = [], blobs = [];
      Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText: async t => { kopiert.push(t); }}});
      const createObjectURL = URL.createObjectURL;
      URL.createObjectURL = b => { blobs.push(b); return createObjectURL.call(URL, b); };
      HTMLAnchorElement.prototype.click = function () {};
      const probe = (id, extra) => ({id, datum: boese, z1: '26.0999', z2: 'KUECHE', matrix: 'Wischprobe', cm2: '100', ...extra});
      applyProjektData({projekt: {nr: '26.0999'},
        proben: [probe(1)], chloridProben: [probe(2)],
        asbestProben: [probe(3, {matrix: 'Material', notiz: 'Asbest\nKMF '})],
        sonstigeProben: [probe(4, {matrix: 'Material (mineralisch)', notiz: 'PAK\r\n  Metalle\nPCB'}), probe(5, {datum: '2026-10-01', matrix: 'Wischprobe', notiz: 'PAK'})]});
      renderEtiketten(); renderChloridEtiketten(); renderSonstigeEtiketten(); renderAsbestEtiketten();
      renderUebergabe(); renderChloridUebergabe(); renderSonstigeUebergabe(); renderAsbestUebergabe();
      const karten = document.createElement('div'); document.body.append(karten); renderKartenAnsicht(karten);
      exportSonstigeExcel(); exportAsbestExcel();
      await new Promise(res => setTimeout(res, 300));
      const eingabe = document.querySelector('#sonstige-tbody input[placeholder="TT.MM.JJJJ"]');
      copySonstigeUebergabe(); copyAsbestUebergabe(); copyUebergabe();
      await new Promise(res => setTimeout(res, 50));
      return {xss: window.__xss || 0, imgs: document.querySelectorAll('img[src="x"]').length, eingabe: eingabe && eingabe.value,
        excel: await Promise.all(blobs.map(b => b.text())), kopiert};
    }, boese);
    assert.equal(r.xss, 0, 'kein Skript aus dem Datum der Projektdatei');
    assert.equal(r.imgs, 0);
    assert.equal(r.eingabe, boese, 'Eingabefeld zeigt den Text unverändert');
    for (const x of r.excel) { assert.doesNotMatch(x, /<img/); assert.match(x, /&lt;img/); }

    const [sonstige, asbest, pak] = r.kopiert.map(t => t.split('\n').map(z => z.split('\t')));
    assert.deepEqual(sonstige[0], ['Probenreferenz', 'Probenbeschreibung', 'Matrix', 'Probenahmedatum', 'Untersuchungsparameter'], 'Spalten unverändert');
    assert.equal(sonstige.length, 3, 'eine Zeile je Probe – Zeilenumbrüche erzeugen keine zusätzlichen Zeilen');
    assert.equal(sonstige[1][4], 'PAK, Metalle, PCB');
    assert.equal(sonstige[2][4], 'PAK');
    assert.equal(sonstige[1][3], boese, 'kopierte Übergabe ist Klartext, keine HTML-Entities');
    assert.equal(sonstige[2][3], '01.10.2026');
    assert.equal(asbest.length, 2); assert.equal(asbest[1][4], 'Asbest, KMF');
    assert.equal(pak.length, 2); assert.equal(pak[1][3], boese);
    assert.deepEqual(errors, []);
    console.log(`OK ${name}: Laborübergabe – Datum maskiert, Kopie als Klartext ohne zusätzliche Zeilen`);
  } finally { if (browser) await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
