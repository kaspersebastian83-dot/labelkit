// PN 98 (4.37.0): Feldbogen → Protokolle im Reiter PN 98 → Laborproben unter „Sonstige“. Erneut ausführen ersetzt statt verdoppelt.
// Synthetische Daten. Aufruf: node tests/pn98-bruecke-browser.cjs chromium
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
    const context = await browser.newContext({viewport: {width: 1440, height: 1000}});
    await context.addInitScript(() => { localStorage.setItem('willkommen-gelesen', '1'); localStorage.setItem('mosaik-kuerzel', 'SK'); });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
    await page.evaluate(() => { document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open')); });

    // Übertragener PN 98-Bogen (Werte wie auf dem Papier) → Protokolle
    await page.evaluate(() => {
      const rec = fbeNeu({typ: 'pn98', formularId: '26.0999-PN-01', n: 3, von: 'SK', jetzt: new Date().toISOString(),
        vor: {projektNr: '26.0999', datum: '21.10.2026', objekt: 'Lagerhalle, Musterweg 1', labor: 'Beispiellabor'}});
      Object.assign(rec.kopf, {probenehmer: 'SK', grund: ['Entsorgung / Deklaration'], schadstoffe: ['PAK', 'Asbest'], witterung: ['trocken'],
        material: ['Haufwerk innen'], gelagertTage: '3', geraet: ['Schaufel'], gefaess: ['PE-Eimer'], kuehl: true});
      Object.assign(rec.mp[0].w, {probenNr: 'MP1', uhrzeit: '09:15', stelle: 'Haufwerk A', material: 'Brandschutt', art: 'Mischprobe', einzelproben: '5',
        volumen: '12', menge: '2', farbe: 'grau', geruch: 'brandtypisch', konsistenz: ['stückig'], feuchte: 'trocken', foto: '17', anmerkung: 'mit Holzresten'});
      Object.assign(rec.mp[1].w, {probenNr: 'MP2', stelle: 'Haufwerk B', material: 'Estrich', art: 'Einzelprobe / Hot-Spot', geruch: 'anders', geruchAnders: 'ölig'});
      rec.unl['mp.1.farbe'] = true;
      feldprotokolle.push(rec); fbZurErfassung(); fbeWaehle(rec.id);
    });
    assert.match(await page.locator('#fbe-pn98-panel').innerText(), /2 Proben auf dem Bogen/, 'leere dritte Probe zählt nicht');
    await page.locator('#fbe-pn98-panel button').click();
    const prot = await page.evaluate(() => ({p: JSON.parse(JSON.stringify(pn98Proben)), proj: {...pn98Projekt}}));
    assert.equal(prot.p.length, 2);
    const [a, b] = prot.p;
    assert.equal(a.probennr, 'MP1'); assert.equal(a.probenahmestelle, 'Haufwerk A'); assert.equal(a.probenart, 'Brandschutt');
    assert.equal(a.einzelproben, '5'); assert.equal(a.mischproben, '1'); assert.equal(a.haufwerk, '12 m³'); assert.equal(a.menge, '2');
    assert.equal(a.beschaffenheit, 'stückig; trocken'); assert.equal(a.gefahrstoffe, 'PAK, Asbest'); assert.equal(a.lagerungDauer, '3');
    assert.equal(a.gefaess, 'PE-Eimer · Transport kühl und dunkel'); assert.equal(a.sonstige, 'mit Holzresten · Foto-Nr. 17');
    assert.equal(b.geruch, "ölig"); assert.equal(b.einzelproben, "1"); assert.equal(b.mischproben, "0");
    assert.match(b.farbe, /\[unleserlich\]/);
    assert.equal(a.witterungseinfluss, ''); assert.equal(a.hinweis, '', 'nicht auf dem Bogen → leer, nicht erfunden');
    assert.deepEqual([prot.proj.schaden, prot.proj.pndatum, prot.proj.ort, prot.proj.labor, prot.proj.grund], ['26.0999', '21.10.2026', 'Lagerhalle, Musterweg 1', 'Beispiellabor', 'Entsorgung / Deklaration']);
    // Erneut: ersetzt, Projektangaben von Hand bleiben
    await page.evaluate(() => { setPn98ProjektFeld('ort', 'von Hand geändert'); });
    await page.locator('#fbe-pn98-panel button', {hasText: 'aktualisieren'}).click();
    assert.equal(await page.evaluate(() => pn98Proben.length), 2);
    assert.equal(await page.evaluate(() => pn98Projekt.ort), 'von Hand geändert', 'von Hand Eingetragenes wird nicht überschrieben');

    // Protokolle → Laborproben unter „Sonstige“
    await page.evaluate(() => switchMainTab('pn98'));
    await page.getByRole('button', {name: '→ Laborproben anlegen'}).click();
    await page.locator('#modal-pn98-labor.open').waitFor();
    await page.locator('#modal-pn98-labor .btn-primary').click();
    assert.match(await page.locator('#pn98-labor-fehler').innerText(), /Matrix/, 'Matrix wird nicht geraten');
    await page.locator('#pn98-labor-matrix').selectOption('Mischprobe');
    await page.locator('#pn98-labor-param').fill('DepV');
    await page.locator('#modal-pn98-labor .btn-primary').click();
    const lab = await page.evaluate(() => sonstigeProben.map(p => ({z1: p.z1, z2: p.z2, z3: p.z3, matrix: p.matrix, notiz: p.notiz, datum: p.datum, text: beschreibungSonstige(p)})));
    assert.equal(lab.length, 2);
    assert.deepEqual(lab[0], {z1: '26.0999', z2: 'Haufwerk A', z3: 'Brandschutt · PN 98 Nr. MP1', matrix: 'Mischprobe', notiz: 'DepV', datum: '2026-10-21', text: lab[0].text});
    assert.match(lab[0].text, /Haufwerk A, Brandschutt · PN 98 Nr\. MP1/);
    // Erneut: ersetzt, nimmt die zuletzt gewählte Matrix vor
    await page.getByRole('button', {name: '→ Laborproben anlegen'}).click();
    assert.equal(await page.locator('#pn98-labor-matrix').inputValue(), 'Mischprobe');
    await page.locator('#modal-pn98-labor .btn-primary').click();
    assert.equal(await page.evaluate(() => sonstigeProben.length), 2);
    // Projektdatei: Verweise bleiben erhalten
    const saved = await page.evaluate(() => JSON.parse(buildProjektSaveData().content));
    assert.ok(saved.sonstigeProben.every(p => p.pn98Quelle !== undefined) && saved.pn98Proben.every(p => p.pn98Quelle === '26.0999-PN-01'));

    // 4.43.0: Erneutes Anlegen ersetzt an derselben Stelle – eine später angelegte Probe schiebt sich nicht vor die etikettierten
    const vorher = await page.evaluate(() => { addSonstige({z2: 'Keller', matrix: 'Wischprobe', notiz: 'PAK'}); renummerieren();
      return {lab: sonstigeProben.map(p => [p._nr, p.id, p.z3 || p.z2]), prot: pn98Proben.map(p => [p.id, p.probennr])}; });
    assert.deepEqual(vorher.lab.map(x => x[2]), ['Brandschutt · PN 98 Nr. MP1', 'Estrich · PN 98 Nr. MP2', 'Keller']);
    await page.getByRole('button', {name: '→ Laborproben anlegen'}).click();
    await page.locator('#modal-pn98-labor .btn-primary').click();
    assert.deepEqual(await page.evaluate(() => sonstigeProben.map(p => [p._nr, p.id, p.z3 || p.z2])), vorher.lab, 'Nummern unverändert nach erneutem Anlegen');
    // Feldbogen erneut übernehmen: gleiche Proben-Nr. behalten Platz und id, die Laborproben bleiben zugeordnet
    await page.evaluate(() => { switchMainTab('feldboegen'); fbZurErfassung(); fbeWaehle(feldprotokolle[0].id); fbePn98Uebernehmen(); });
    assert.deepEqual(await page.evaluate(() => pn98Proben.map(p => [p.id, p.probennr])), vorher.prot, 'Protokolle behalten id und Reihenfolge');
    await page.evaluate(() => { switchMainTab('pn98'); pn98LaborDialog(); pn98LaborAnlegen(); });
    assert.deepEqual(await page.evaluate(() => sonstigeProben.map(p => [p._nr, p.id, p.z3 || p.z2])), vorher.lab, 'auch nach erneutem Übernehmen des Bogens');
    // Ersetzen: wirklich neue kommen ans Ende, entfallene verschwinden
    assert.deepEqual(await page.evaluate(() => { let n = 50; const a = {id: 1, k: 'a'}, x = {id: 2, k: 'x'}, b = {id: 3, k: 'b'}, c = {id: 4, k: 'c'};
      return anPlatzErsetzen([a, x, b, c], [a, b, c], [{k: 'c'}, {k: 'neu'}, {k: 'a'}], p => p.k, () => n++).map(p => p.k + p.id).join(' '); }),
      'a1 x2 c4 neu50');

    // Probenahmedatum mit zweistelliger Jahreszahl (wie auf dem Bogen); nicht lesbar → leer statt heute
    assert.equal(await page.evaluate(() => { pn98Projekt.pndatum = '24.10.26'; return pn98LaborProben('Mischprobe', 'DepV')[0].datum; }), '2026-10-24');
    assert.equal(await page.evaluate(() => { pn98Projekt.pndatum = '24.10.2026'; return pn98LaborProben('Mischprobe', 'DepV')[0].datum; }), '2026-10-24');
    assert.equal(await page.evaluate(() => { pn98Projekt.pndatum = 'Ende Oktober'; return pn98LaborProben('Mischprobe', 'DepV')[0].datum; }), '');
    assert.equal(await page.evaluate(() => { pn98Projekt.pndatum = '31.02.2026'; return pn98LaborProben('Mischprobe', 'DepV')[0].datum; }), '');
    assert.equal(await page.evaluate(() => { pn98Projekt.pndatum = ''; return pn98LaborProben('Mischprobe', 'DepV')[0].datum === today(); }), true, 'leer → heute wie bisher');
    assert.equal(await page.evaluate(() => { pn98Projekt.pndatum = '24.13.26'; return pn98LaborProben('Mischprobe', 'DepV')[0].datum; }), '', 'Monat 13 wird nicht umgerechnet');

    // Schadendatum „nicht bekannt“ (Knopf neben dem Kalender): Text bleibt so, Kalender leer, steht so auf dem Protokoll
    await page.locator('#pn98-schadendatum').fill('03.10.2026');
    assert.equal(await page.locator('#pn98-schadendatum-picker').inputValue(), '2026-10-03');
    await page.locator('#pn98-schadendatum-unbekannt').click();
    assert.equal(await page.locator('#pn98-schadendatum').inputValue(), 'nicht bekannt');
    assert.equal(await page.evaluate(() => pn98Projekt.schadendatum), 'nicht bekannt');
    assert.equal(await page.locator('#pn98-schadendatum-picker').inputValue(), '');
    await page.evaluate(() => { pn98OpenDatePicker('schadendatum'); setPn98ProjektFelderUi(); renderPn98Export(); });
    assert.match(await page.locator('#pn98-export-preview').innerText(), /Schadendatum:\s*nicht bekannt/);
    assert.equal(JSON.parse(await page.evaluate(() => buildProjektSaveData().content)).pn98Projekt.schadendatum, 'nicht bekannt');
    assert.deepEqual(errors, []);
    console.log(`OK ${name}: PN 98 Feldbogen → Protokolle → Laborproben`);
  } finally { if (browser) await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
