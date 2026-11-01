// Einfache Oberfläche (LabelKit 5.0, Spektron Schritt 3) im echten Browser: node tests/oberflaeche-browser.cjs [chromium]
// Kopfband, drei Schritte, Kacheln mit Zählern, eine Tabelle mit zusammengefassten Spalten, PAK → Chlorid, Fußleiste mit einer
// Hauptaktion und „Mehr …“, Schritt 2/3 nur mit Arten, die Proben haben, Dialoge, Feldbögen-Umschalter, PN 98-Rechner, Breiten.
// Nur erfundene Testdaten.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const playwright = require('playwright');
const ui = require('./lk-ui.cjs');

const name = process.argv[2] || 'chromium';
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'));

(async () => {
  const server = http.createServer((req, res) => {
    if (req.url.split('?')[0] === '/spektron-ordner.js') { res.writeHead(200, {'content-type': 'application/javascript; charset=utf-8'}); res.end(fs.readFileSync(path.join(__dirname, '..', 'spektron-ordner.js'))); return; }
    res.writeHead(200, {'content-type': 'text/html; charset=utf-8'}); res.end(html);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await playwright[name].launch();
  try {
    const ctx = await browser.newContext({viewport: {width: 1280, height: 800}});
    await ctx.addInitScript(() => { try { localStorage.setItem('willkommen-gelesen', '1'); } catch (e) {} });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    page.on('dialog', d => d.accept());
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
    await page.waitForSelector('#mosaikLeiste.ml-band', {timeout: 8000});
    await page.evaluate(() => { document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open')); document.querySelectorAll('dialog[open]').forEach(d => d.close()); });

    // Kopfband, keine alte Kopfzeile, keine Reiter, kein Workflow-Begleiter
    assert.equal(await page.locator('#lk-altkopf').isVisible(), false, 'alte Kopfzeile unsichtbar');
    assert.equal(await page.locator('.main-tabs').isVisible(), false, 'Haupt-Reiter unsichtbar');
    assert.equal(await page.locator('#lk-flow, #appearance-panel').count(), 0);
    // drei Schritte, Schritt 1 aktiv, eine Frage
    assert.deepEqual(await page.locator('.lk-schritt').allInnerTexts(), ['1\nProben erfassen', '2\nEtiketten drucken', '3\nLaborauftrag abschließen']);
    assert.equal(await page.locator('.lk-schritt[aria-current="step"]').getAttribute('data-schritt'), '1');
    assert.equal(await page.locator('#lk-s1-frage').innerText(), 'Welche Proben hast du genommen?');
    // Kacheln: vier feste + „Weitere Art …“; Projektnummer fehlt
    assert.deepEqual(await page.locator('.lk-kachel[data-art]').evaluateAll(b => b.map(x => x.dataset.art)), ['pak', 'chlorid', 'asbest', 'brandgeruch']);
    assert.match(await page.locator('.lk-kachel[data-weitere]').innerText(), /Sonstige Proben · Bohrkerne · PN 98 · Feldbögen/);
    assert.equal(await page.locator('#lk-projnr-fehlt').isVisible(), true, 'Hinweis „Projektnummer fehlt“');
    // Fußleiste: Mehr …, Stand, eine Hauptaktion
    assert.equal(await page.locator('#lk-haupt').innerText(), 'Weiter zu Etiketten →');
    assert.equal(await page.locator('#lk-neben').isVisible(), false);
    assert.equal(await page.locator('#btn-zwischenstand-speichern').innerText(), 'Speichern');

    // Projektnummer über den Dialog; PAK-Proben anlegen
    await ui.projNr(page, '26.0911');
    assert.equal(await page.locator('#lk-projnr-fehlt').isVisible(), false);
    await page.locator('#tab-eingabe .lk-artknoepfe button', {hasText: '+ 5'}).click();
    await page.evaluate(() => { proben.forEach((p, i) => { p.z2 = i ? '' : 'EG Testraum'; p.z3 = BEAUFSCHLAGUNG[0]; p.z4 = OBERFLAECHEN[0]; }); renderTable(); });
    const pak = page.locator('.lk-kachel[data-art="pak"]');
    assert.match(await pak.innerText(), /5 erfasst/); assert.match(await pak.innerText(), /4 unvollständig/);
    // E3: Datum, Projekt, Matrix gleich → einmal über der Tabelle, Spalten eingeklappt; „Spalten zeigen“
    const gleich = page.locator('#lk-z-gleich-pak');
    assert.match(await gleich.innerText(), /Für alle Proben gleich: Probenahme .* · Projekt 26\.0911 · Matrix Wischprobe/);
    const datumSpalte = page.locator('#tab-eingabe thead th').nth(3);
    assert.equal(await datumSpalte.isVisible(), false, 'Datumsspalte eingeklappt');
    await gleich.getByRole('button', {name: 'Spalten zeigen'}).click();
    assert.equal(await datumSpalte.isVisible(), true, 'Datumsspalte wieder da');
    await gleich.getByRole('button', {name: 'Spalten zusammenfassen'}).click();
    await page.evaluate(() => { proben[1].datum = '2026-10-02'; renderTable(); });
    assert.equal(await datumSpalte.isVisible(), true, 'abweichendes Datum → Spalte sichtbar');
    assert.doesNotMatch(await gleich.innerText(), /Probenahme/);
    // Zeilen: Wörter statt Symbole, Ampel unsichtbar
    assert.equal(await page.locator('#proben-tbody tr').first().locator('.btn-dup').innerText(), 'kopieren');
    assert.equal(await page.locator('#proben-tbody tr').first().locator('.btn-ghost').innerText(), 'löschen');
    assert.equal(await page.locator('#proben-tbody .ampel').first().isVisible(), false);
    // Pille springt zur nächsten gelben Stelle
    const pille = page.locator('#lk-pille');
    assert.match(await pille.innerText(), /4 Proben unvollständig/);
    await pille.click();
    assert.equal(await page.evaluate(() => document.activeElement.closest('td') !== null && document.activeElement.classList.contains('invalid')), true, 'Fokus auf gelbem Feld');
    // E7: angehakt → als Chlorid übernehmen
    await page.locator('#proben-tbody tr').nth(0).locator('.col-check input').check();
    await page.locator('#proben-tbody tr').nth(2).locator('.col-check input').check();
    const bar = page.locator('#lk-z-chlorid');
    await bar.waitFor();
    assert.match(await bar.innerText(), /2 angehakt/);
    await bar.getByRole('button', {name: '→ Als Chlorid-Wischproben übernehmen'}).click();
    assert.equal(await page.evaluate(() => chloridProben.length), 2);
    assert.equal(await bar.count(), 0, 'Leiste weg, Haken entfernt');
    assert.match(await page.locator('.lk-kachel[data-art="chlorid"]').innerText(), /2 erfasst/);
    await ui.art(page, 'chlorid');
    assert.match(await page.locator('#lk-z-pak').innerText(), /3 PAK-Proben sind noch nicht als Chlorid-Wischprobe da/);
    assert.equal(await page.locator('#tab-chlorid').isVisible(), true);
    assert.equal(await page.locator('#tab-eingabe').isVisible(), false);

    // Vorbelegung (Asbest) als Dialog: Aktion schließt den Dialog
    await ui.art(page, 'asbest');
    await page.locator('#tab-asbest .lk-artknoepfe button', {hasText: 'Vorbelegung …'}).click();
    assert.equal(await page.locator('#lk-dlg-vb-asbest').evaluate(d => d.open), true);
    await page.locator('#avb-anzahl').fill('2');
    await page.locator('#avb-matrix').selectOption('Kitte');
    await page.locator('#lk-dlg-vb-asbest button', {hasText: '✓ Übernehmen'}).click();
    assert.equal(await page.locator('#lk-dlg-vb-asbest').evaluate(d => d.open), false);
    assert.equal(await page.evaluate(() => asbestProben.length), 2);
    assert.match(await page.evaluate(() => asbestProben[0].notiz), /Nachweisgrenze|VDI/i, 'Matrix setzt den Untersuchungsparameter');

    // „+ Weitere Art …“: Sonstige mit Bohrmehl-Schalter, Bohrkerne-Überblick, PN 98-Rechner, Feldbögen-Umschalter
    await ui.art(page, 'sonstige');
    assert.equal(await page.locator('#svb-bohrmehl').isVisible(), true, 'Chlorid-Bohrmehl sichtbar über der Tabelle');
    await ui.art(page, 'bohrkerne');
    assert.equal(await page.locator('#bk-inhalt').isVisible(), true);
    assert.equal(await page.locator('#tab-bohrkerne button', {hasText: '+ Bohrkern einzeln anlegen'}).isVisible(), true);
    await ui.art(page, 'pn98');
    const rechner = page.locator('#lk-pn98-rechner');
    assert.equal(await rechner.isVisible(), true);
    await rechner.locator('summary').click();
    assert.equal(await page.locator('#pn98r-volumen').isVisible(), true, 'Probenrechner klappt auf');
    await ui.art(page, 'feldboegen');
    assert.equal(await page.locator('#lk-fb-umschalter').isVisible(), true);
    assert.equal(await rechner.isVisible(), false, 'Rechner nur bei PN 98');
    await ui.fbErfassen(page);
    assert.equal(await page.locator('#tab-feldboegen-erfassen').isVisible(), true);
    await ui.fbDrucken(page);
    assert.equal(await page.locator('#fb-preview').isVisible(), true);
    // Mehr …: Einträge je Art, Handbuch/Rückmeldung/Alle Projekte von der Leiste
    await ui.art(page, 'pak');
    await page.locator('#lk-mehr').click();
    const mehr = page.locator('#mosaikMehrPop');
    for (const id of ['lk-m-vb', 'lk-m-gefuehrt', 'lk-m-karten', 'lk-m-vorlagen', 'lk-m-als-vorlage', 'lk-m-loeschen', 'lk-m-projnr', 'lk-m-nr-alle', 'lk-m-heute', 'lk-m-laden', 'lk-m-archiv', 'lk-m-reset', 'lk-m-druck', 'lk-m-hilfe', 'lk-m-version'])
      assert.equal(await mehr.locator('#' + id).count(), 1, id + ' in „Mehr …“');
    assert.match(await mehr.innerText(), /Handbuch ↗[\s\S]*Rückmeldung ↗[\s\S]*Alle Projekte ↗/);
    await page.keyboard.press('Escape');
    await ui.art(page, 'brandgeruch');
    await page.locator('#lk-mehr').click();
    assert.equal(await mehr.locator('#lk-m-gefuehrt').count(), 0, 'Geführte Eingabe nur bei PAK');
    assert.match(await mehr.locator('#lk-m-loeschen').innerText(), /Alle Brandgeruch-Proben löschen/);
    await page.keyboard.press('Escape');

    // Schritt 2: nur Arten mit Proben; Hauptaktion „Alle Etiketten drucken“
    await ui.schritt(page, 2);
    const zeigen = ids => page.evaluate(ids => ids.map(id => getComputedStyle(document.getElementById(id)).display !== 'none'), ids);
    assert.deepEqual(await zeigen(['tab-etiketten', 'tab-chlorid-etiketten', 'tab-asbest-etiketten', 'tab-sonstige-etiketten']), [true, true, true, false]);
    assert.equal(await page.locator('#lk-schnittplaene').isVisible(), false, 'ohne Bohrkerne keine Schnittpläne');
    assert.equal(await page.locator('#lk-haupt').innerText(), 'Alle Etiketten drucken →');
    assert.equal(await page.locator('#lk-neben').innerText(), 'Weiter zum Laborauftrag');
    assert.match(await page.locator('#etiketten-output').innerText(), /26\.0911/);
    // Strg+Enter legt außerhalb von Schritt 1 keine (unsichtbare) PAK-Probe an
    const vorher = await page.evaluate(() => proben.length);
    await page.locator('#lk-mehr').focus(); await page.keyboard.press('Control+Enter');
    assert.equal(await page.evaluate(() => proben.length), vorher, 'Strg+Enter nur in Schritt 1');
    // „Alle Etiketten drucken“: blockiertes Fenster zählt nicht; gedruckt gilt nur für genau diesen Stand der Proben
    await page.evaluate(() => { window.__open = window.open; window.open = () => null; window.alert = () => {}; });
    await page.locator('#lk-haupt').click();
    assert.equal(await page.locator('#lk-haupt').innerText(), 'Alle Etiketten drucken →', 'blockiertes Druckfenster: noch nicht gedruckt');
    await page.evaluate(() => { window.open = () => ({document: {open() {}, write() {}, close() {}}, focus() {}, print() {}, close() {}}); });
    await page.locator('#lk-haupt').click();
    assert.equal(await page.locator('#lk-haupt').innerText(), 'Weiter zum Laborauftrag →', 'nach dem Druck weiter');
    await ui.schritt(page, 1);
    await page.evaluate(() => { proben[0].z2 = 'EG Testraum geändert'; renderTable(); });
    await ui.schritt(page, 2);
    assert.equal(await page.locator('#lk-haupt').innerText(), 'Alle Etiketten drucken →', 'geänderte Probe: Etiketten wieder offen');
    await page.evaluate(() => { window.open = window.__open; });
    // Schritt 3: Prüfung, Übergaben je Art, Weitere Unterlagen; kritische Probleme → „Erst … beheben“ + „Trotzdem speichern …“
    await page.locator('#lk-neben').click();
    await page.waitForFunction(() => document.body.dataset.lkSchritt === '3');
    assert.deepEqual(await zeigen(['tab-uebergabe', 'tab-chlorid-uebergabe', 'tab-asbest-uebergabe', 'tab-sonstige-uebergabe', 'tab-brandgeruch-export', 'tab-pn98-export']), [true, true, true, false, false, false]);
    assert.equal(await page.locator('#tab-uebergabe button', {hasText: 'Kopieren (für Eurofins)'}).isVisible(), true);
    assert.match(await page.locator('#lk-haupt').innerText(), /^Erst \d+ Probleme? beheben$/);
    assert.equal(await page.locator('#lk-neben').innerText(), 'Trotzdem speichern …');
    await page.evaluate(() => { proben.forEach((p, i) => { p.z2 = 'Raum ' + i; }); chloridProben.forEach((p, i) => { p.z2 = 'Raum C' + i; p.z3 = BEAUFSCHLAGUNG[0]; p.z4 = OBERFLAECHEN[0]; }); asbestProben.forEach((p, i) => { p.z2 = 'Raum A' + i; p.z3 = 'Kleber'; p.z4 = 'fest'; p.zustand = 'intakt'; }); });
    await ui.schritt(page, 1); await ui.schritt(page, 3);
    const haupt = await page.locator('#lk-haupt').innerText();
    assert.ok(haupt === 'Laborauftrag speichern →' || /^Erst \d+ Probleme? beheben$/.test(haupt), haupt);
    // Drucken einer einzelnen Übergabe: nur dieser Abschnitt (Druck-Klasse wird nach dem Druck entfernt)
    await page.evaluate(() => { window.print = () => {}; localStorage.setItem('druckprofil-skip', '1'); });
    await page.locator('#tab-chlorid-uebergabe button', {hasText: 'Drucken'}).click();
    assert.equal(await page.evaluate(() => document.body.classList.contains('lk-druck-teil') && document.getElementById('tab-chlorid-uebergabe').classList.contains('lk-druck-ziel')), true);
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    assert.equal(await page.evaluate(() => document.body.classList.contains('lk-druck-teil')), false);
    // Kachel führt zurück zu Schritt 1 dieser Art
    await ui.schritt(page, 1);
    assert.equal(await page.locator('.lk-schritt[aria-current="step"]').getAttribute('data-schritt'), '1');

    // Breiten: keine waagrechte Überbreite (Kopfband bei 320 px ist eine bekannte Grenze der gemeinsamen Leiste – nicht geprüft)
    for (const width of [1920, 1280, 768, 390]) {
      await page.setViewportSize({width, height: 900});
      await page.waitForTimeout(250);
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      assert.ok(sw <= width + 1, `keine Überbreite bei ${width}px (${sw})`);
      const h = await page.locator('#lk-haupt').boundingBox();
      assert.ok(h && h.x >= 0 && h.x + h.width <= width + 1, `Hauptaktion erreichbar bei ${width}px`);
      const k = await page.locator('.lk-kachel').first().boundingBox();
      assert.ok(k && k.x >= 0 && k.x + k.width <= width + 1, `Kacheln erreichbar bei ${width}px`);
    }
    // Fußleiste wird nach schmalem Fenster wieder niedrig
    await page.setViewportSize({width: 1920, height: 900}); await page.waitForTimeout(300);
    assert.ok((await page.locator('#lk-fuss').boundingBox()).height < 100, 'Fußleiste wieder niedrig bei 1920px');
    assert.deepEqual(errors, []);
    console.log(`OK ${name}: einfache Oberfläche – Kopfband, drei Schritte, Kacheln/Zähler, Spalten zusammengefasst, PAK→Chlorid, Vorbelegung, Sonderarten, „Mehr …“, Schritt 2/3, Teil-Druck, Breiten 1920–390`);
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
