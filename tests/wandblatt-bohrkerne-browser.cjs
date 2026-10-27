// Wandblatt Bohrkerne im Browser: Druckvorschau, Übertragung einer Wand, Proben mit Probenbezeichnung, Etikett/Laborübergabe.
// AidKit (Raumkürzel, ID-Regeln) wird wie auf GitHub Pages unter ../aidkit/ bereitgestellt (AIDKIT_DIR, sonst ../aidkit neben dem Repo).
// Aufruf: node tests/wandblatt-bohrkerne-browser.cjs chromium   · SHOT=pfad legt Bildschirmfotos ab. Synthetische Daten.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const playwright = require('playwright');
const name = process.argv[2] || 'chromium';
const roots = {'/labelkit/': path.join(__dirname, '..'), '/aidkit/': path.resolve(process.env.AIDKIT_DIR || path.join(__dirname, '..', '..', 'aidkit'))};
assert.ok(fs.existsSync(path.join(roots['/aidkit/'], 'konventionen.js')), 'AidKit gefunden unter ' + roots['/aidkit/']);
(async () => {
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]), pre = Object.keys(roots).find(p => u.startsWith(p));
    const file = pre && path.join(roots[pre], u.slice(pre.length) || 'index.html');
    if (!file || !file.startsWith(roots[pre]) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, {'content-type': file.endsWith('.js') ? 'application/javascript' : 'text/html; charset=utf-8'}); res.end(fs.readFileSync(file));
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  let browser;
  try {
    browser = await playwright[name].launch();
    const context = await browser.newContext({viewport: {width: 1440, height: 1000}});
    await context.addInitScript(() => { localStorage.setItem('willkommen-gelesen', '1'); localStorage.setItem('mosaik-kuerzel', 'SK'); });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
    await page.goto(`http://127.0.0.1:${server.address().port}/labelkit/index.html`);
    await page.waitForFunction(() => typeof SpektronKonventionen !== 'undefined');
    await page.evaluate(() => { document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open')); document.querySelectorAll('dialog[open]').forEach(d => d.close()); });

    // Druck: Blatt 1 + ein Wandblatt je Wand, Raumkürzel aus AidKit, Endungen vorgedruckt
    await page.evaluate(() => switchMainTab('feldboegen'));
    await page.locator('input[name="fb-typ"][value="bohrkern"]').check();
    await page.locator('#fb-mp').fill('2'); await page.locator('#fb-nr').fill('26.0999');
    await page.locator('#fb-tiefen').fill('0-2, 2-6, 6-12');
    const seiten = await page.locator('#fb-preview .fb-page').count();
    assert.equal(seiten, 3, 'Blatt 1 und zwei Wandblätter');
    const druck = await page.locator('#fb-preview').innerText();
    assert.match(druck, /26\.0999-BK-01/); assert.match(druck, /T1 0–2 · T2 2–6 · T3 6–12 cm/);
    assert.match(druck, /KUE Küche/, 'Raumkürzel aus AidKit auf Blatt 1');
    assert.match(await page.locator('#fb-preview .fb-page').nth(1).innerText(), /-7[\s\S]*-8[\s\S]*-9[\s\S]*-____/);

    // Übertragung: eine Wand, zwei Kerne
    await page.evaluate(() => fbZurErfassung());
    await page.locator('input[name="fbe-neu-typ"][value="bohrkern"]').check();
    await page.locator('#fbe-neu-n').fill('1');
    await page.getByRole('button', {name: 'Erfassung beginnen'}).click();
    await page.locator('#fbe-bk-panel').waitFor();
    assert.equal(await page.locator('input[data-p="mp.0.punkte.6.endung"]').inputValue(), '7', 'Endungen 1–9 vorbelegt wie auf dem Bogen');
    assert.equal(await page.locator('input[data-p="kopf.tiefen"]').inputValue(), '0-2, 2-6, 6-12', 'Tiefenstufen wie vorgedruckt');
    const set = async (p, v) => { const el = page.locator(`input[data-p="${p}"]`); await el.fill(v); await el.press('Tab'); };
    await page.locator('button[data-p="mp.0.geschoss"][data-v="EG"]').click();
    await set('mp.0.raum', 'wz');
    await page.locator('button[data-p="mp.0.flaeche"][data-v="B"]').click();
    assert.match(await page.locator('#fbe-mp-0 h4').innerText(), /EG-WZ-B/, 'Wandkennung im Titel');
    for (const [k, v] of Object.entries({kern: '14', m1: 'P', m2: 'Z', m3: 'Z', geruch: '++', s1: 'A', s2: 'A', s3: 'A'})) await set('mp.0.punkte.6.' + k, v);
    for (const [k, v] of Object.entries({kern: '5', m1: 'P', s1: 'A', s2: 'r', s3: 'R'})) await set('mp.0.punkte.0.' + k, v);
    assert.match(await page.locator('[data-hint="mp.0.punkte.0.s3"]').innerText(), /T3 beginnt bei 6 cm, der Kern ist nur 5 cm lang/, 'T3 gibt es bei 5 cm nicht');
    assert.match(await page.locator('#fbe-bk-panel').innerText(), /1 Zeile noch unklar/);
    assert.equal(await page.locator('#fbe-bk-panel button').isDisabled(), true, 'erst klären, dann anlegen');
    await set('mp.0.punkte.0.s3', '');
    const panel = await page.locator('#fbe-bk-panel').innerText();
    assert.match(panel, /5 Segmente aus 2 Kernen · 4 analysieren · 1 Rückstellung/);
    if (process.env.SHOT) await page.locator('#fbe-inhalt').screenshot({path: process.env.SHOT + '-erfassung.png'});
    await page.locator('#fbe-bk-panel button').click();

    const proben = await page.evaluate(() => sonstigeProben.map(p => ({id: p.bkId, kern: p.bkBez, von: p.bkVon, bis: p.bkBis, notiz: p.notiz, z2: p.z2, z1: p.z1, quelle: p.bkQuelle, text: beschreibungSonstige(p)})));
    assert.deepEqual(proben.map(p => p.id), ['EG-WZ-B-1-T1', 'EG-WZ-B-1-T2', 'EG-WZ-B-7-T1', 'EG-WZ-B-7-T2', 'EG-WZ-B-7-T3'], 'in der Reihenfolge des Bogens');
    assert.deepEqual(proben.map(p => [p.von, p.bis]), [[0, 2], [2, 5], [0, 2], [2, 6], [6, 12]], 'letztes Segment endet am Kernende');
    assert.equal(proben[1].notiz, 'Rückstellprobe – nicht analysieren', 'kleines r gilt als R'); assert.match(proben[0].notiz, /MKW/);
    assert.equal(proben[0].z2, 'EG Wohnzimmer', 'Raum für PlanKit/Raumbuch'); assert.equal(proben[0].z1, '26.0999');
    assert.equal(proben[2].text, 'EG-WZ-B-7-T1 · 0–2 cm · Putz · Gesamtl. 14 cm', 'Beschreibung für Laborübergabe');
    assert.ok(proben.every(p => p.quelle === '26.0999-BK-01'));

    // Erneut anlegen ersetzt statt zu verdoppeln – an derselben Stelle: etikettierte Proben behalten ihre Nummer,
    // auch wenn danach eine weitere Probe (Material) angelegt wurde (4.43.0)
    const nrVorher = await page.evaluate(() => { addSonstige({z2: 'Keller Putz', matrix: 'Material (mineralisch)', notiz: 'PAK'}); renummerieren();
      return sonstigeProben.map(p => [p._nr, p.id, p.bkId || p.z2]); });
    assert.equal(nrVorher.at(-1)[2], 'Keller Putz');
    await page.locator('#fbe-bk-panel button', {hasText: 'aktualisieren'}).click();
    assert.deepEqual(await page.evaluate(() => sonstigeProben.map(p => [p._nr, p.id, p.bkId || p.z2])), nrVorher, 'Nummern und ids unverändert, Materialprobe bleibt hinten');
    await page.evaluate(() => { sonstigeProben = sonstigeProben.filter(p => p.z2 !== 'Keller Putz'); renummerieren(); renderSonstigeTable(); });
    assert.equal(await page.evaluate(() => sonstigeProben.length), 5);

    // Schnittplan je Kern (Eurofins-Form): Tiefenstufe, Probe, Auftrag; halber Kern ohne Angabe nicht angekreuzt
    const plan = await page.evaluate(() => { const g = bohrkernGruppen().get('EG-WZ-B-1'); return schnittplanSvg('EG-WZ-B-1', g, '26.0999', 5, g[0].bkRueck || ''); });
    assert.match(plan, /T1: 0–2 cm → P\d+[\s\S]*analysieren/); assert.match(plan, /T2: 2–5 cm → P\d+[\s\S]*nur sägen und aufbewahren/);
    assert.match(plan, /Untersuchung „analysieren“:<\/tspan> MKW/); assert.doesNotMatch(plan, /✓/, 'halber Kern: keine Angabe, kein Kreuz');

    // Reiter „Bohrkerne“: Zahlen, Wand mit Kernen, Hinweis bei nachträglich geändertem Bogen
    await page.evaluate(() => switchMainTab('bohrkerne'));
    const bk = await page.locator('#bk-inhalt').innerText();
    assert.match(bk, /1\s*Wand\s[\s\S]*2\s*Kerne[\s\S]*5\s*Segmente[\s\S]*4\s*analysieren[\s\S]*1\s*Rückstellprobe\b/);
    assert.match(bk, /EG-WZ-B · EG Wohnzimmer/); assert.match(bk, /T2 2–5 cm · P\d+ · R/);
    assert.match(bk, /26\.0999-BK-01[\s\S]*1 Wand · in Erfassung · 5 Proben/);
    assert.doesNotMatch(bk, /nach dem Anlegen der Proben geändert/);
    await page.locator('[data-bk-bogen]').click();
    await set('mp.0.punkte.6.s3', 'R');
    await page.evaluate(() => switchMainTab('bohrkerne'));
    assert.match(await page.locator('#bk-inhalt').innerText(), /26\.0999-BK-01 wurde nach dem Anlegen der Proben geändert/);
    if (process.env.SHOT) await page.locator('#bk-inhalt').screenshot({path: process.env.SHOT + '-reiter.png'});
    assert.deepEqual(errors, []);
    console.log(`OK ${name}: Wandblatt drucken, übertragen, Proben mit Probenbezeichnung anlegen`);
  } finally { if (browser) await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
