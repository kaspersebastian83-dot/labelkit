// Feldprotokolle erfassen & Scans ablegen im echten Browser: node tests/feldprotokolle-browser.cjs [chromium|webkit]
// Der Projektordner wird im Origin Private File System nachgebildet (gleiche Schnittstelle wie ein echter Ordner).
// Scan-Ablage braucht Schreibzugriff auf Dateien (Chrome/Edge); in WebKit wird nur die Erfassung geprüft.
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
  const ctx = await browser.newContext({viewport: {width: 1500, height: 950}});
  await ctx.addInitScript(() => { try { localStorage.setItem('willkommen-gelesen', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  const errors = [], dialoge = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('dialog', d => { dialoge.push(d.message()); d.accept(d.type() === 'prompt' ? 'falscher Bogen' : undefined); });
  await page.goto(url);
  await page.waitForSelector('#modal-browser-hinweis[open]', {timeout: 3000}).catch(() => {});
  await page.evaluate(() => {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    document.querySelectorAll('dialog[open]').forEach(d => d.close());
  });

  const breiteVorher = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const kannAblegen = await page.evaluate(async () => {
    try {
      const root = await navigator.storage.getDirectory();
      const probe = await root.getFileHandle('probe.txt', {create: true});
      if (!probe.createWritable) return false;
      const w = await probe.createWritable(); await w.write('x'); await w.close();
      await root.removeEntry('probe.txt');
      return true;
    } catch (e) { return false; }
  });
  if (kannAblegen) {
    // Projektordner „26.0142 Teststadt“ öffnen (legt „Laboraufträge“ nach Rückfrage an)
    await page.evaluate(async () => {
      const root = await navigator.storage.getDirectory();
      for await (const [n] of root.entries()) await root.removeEntry(n, {recursive: true});
      const dir = await root.getDirectoryHandle('26.0142 Teststadt', {create: true});
      await dir.getFileHandle('_Projekt.json', {create: true}).then(async h => { const w = await h.createWritable(); await w.write(JSON.stringify({objekt: 'EFH, Musterweg 7', auftraggeber: 'Beispiel AG', ortstermin: '2026-10-21'})); await w.close(); });
      await PROJEKTORDNER.oeffnen(dir);
    });
    assert.equal(await page.evaluate(() => PROJEKTORDNER.state.proj && PROJEKTORDNER.state.proj.nr), '26.0142', 'Projekt geöffnet');
  }

  // Zum Unterreiter „Erfassen & Scans“
  await page.locator('#main-feldboegen').click();
  await page.locator('#fb-preview .fb-page').first().waitFor();
  if (kannAblegen) await page.waitForFunction(() => document.getElementById('fb-nr').value !== '');
  await page.locator('#sub-tabs-feldboegen .sub-tab', {hasText: 'Erfassen'}).click();
  await page.locator('#fbe-neu-id').waitFor();

  // Ohne Kürzel kein Anlegen
  await page.locator('#tab-feldboegen-erfassen button', {hasText: 'Erfassung beginnen'}).click();
  assert.equal(await page.evaluate(() => feldprotokolle.length), 0, 'ohne Kürzel nichts angelegt');
  await page.locator('#fbe-kuerzel').fill('SK');
  await page.locator('#fbe-neu-n').fill('2');
  if (!kannAblegen) await page.locator('#fbe-neu-nr').fill('26.0142');
  assert.equal(await page.locator('#fbe-neu-id').textContent(), '26.0142-AS-01');
  await page.locator('#tab-feldboegen-erfassen button', {hasText: 'Erfassung beginnen'}).click();
  await page.locator('#fbe-mp-1').waitFor();
  let rec = await page.evaluate(() => feldprotokolle[0]);
  assert.equal(rec.formularId, '26.0142-AS-01');
  assert.equal(rec.erfasstVon, 'SK');
  assert.equal(rec.mp.length, 2);
  if (kannAblegen) assert.equal(rec.kopf.objekt, 'EFH, Musterweg 7', 'Objekt aus _Projekt.json vorbelegt');

  // Eingabe wie vom Bogen: Text bleibt Text, Auswahl per Knopf, Hinweis bei unstimmigem Volumen
  const feld = p => page.locator(`#fbe-inhalt input[data-p="${p}"], #fbe-inhalt textarea[data-p="${p}"]`).first();
  await feld('kopf.messtechniker').fill('Müller');
  await feld('mp.0.start').fill('08:00');
  await feld('mp.0.ende').fill('16:00');
  await feld('mp.0.flussStart').fill('8');
  await feld('mp.0.flussEnde').fill('8');
  await feld('mp.0.volumen').fill('38,4');
  await page.locator('#fbe-inhalt button[data-p="kopf.anblasen"][data-v="nein"]').click();
  await page.locator('#fbe-inhalt input[type=checkbox][data-p="kopf.unterschrift"]').check();
  rec = await page.evaluate(() => feldprotokolle[0]);
  assert.equal(rec.mp[0].w.volumen, '38,4');
  assert.equal(rec.kopf.anblasen, 'nein');
  assert.equal(rec.kopf.unterschrift, true);
  const hint = page.locator('.fbe-hint[data-hint="mp.0.volumen"]');
  assert.match(await hint.textContent(), /passt nicht zu Volumenstrom × Dauer/);
  assert.ok(await hint.isVisible());
  // Auswahl lässt sich wieder abwählen (nichts angekreuzt auf dem Bogen)
  await page.locator('#fbe-inhalt button[data-p="kopf.anblasen"][data-v="nein"]').click();
  assert.equal(await page.evaluate(() => feldprotokolle[0].kopf.anblasen), '');
  // unleserlich
  await page.locator('#fbe-inhalt button[data-unl="mp.1.temp"]').click();
  assert.equal(await page.evaluate(() => feldprotokolle[0].unl['mp.1.temp']), true);
  assert.ok(await page.locator('.fbe-f[data-p="mp.1.temp"]').evaluate(el => el.classList.contains('ist-unl')));
  // Hinweisliste springt zum Feld
  await page.locator('#fbe-hinweise a[data-geh="mp.0.volumen"]').click();
  await page.waitForFunction(() => document.activeElement && document.activeElement.dataset.p === 'mp.0.volumen');

  if (kannAblegen) {
    // Scan ablegen: kleines PNG, Kopie im Ordner „Feldprotokolle“, Prüfsumme, Ablage-Protokoll, Projektdaten gespeichert
    const erg = await page.evaluate(async () => {
      const c = document.createElement('canvas'); c.width = 400; c.height = 560;
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 400, 560); g.fillStyle = '#000'; g.fillText('Feldprotokoll 26.0142-AS-01', 20, 30);
      const blob = await new Promise(r => c.toBlob(r, 'image/png'));
      const file = new File([blob], 'Scan 0001.PNG', {type: 'image/png', lastModified: Date.UTC(2026, 9, 21)});
      await fbeScansAblegen([file, file]);
      const proj = PROJEKTORDNER.state.proj, ordner = await proj.dir.getDirectoryHandle('Feldprotokolle');
      const namen = []; for await (const [n] of ordner.entries()) namen.push(n);
      const erste = await (await ordner.getFileHandle(feldprotokolle[0].scans[0].datei)).getFile();
      const sha = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await erste.arrayBuffer())), b => b.toString(16).padStart(2, '0')).join('');
      const protokoll = await (await (await ordner.getFileHandle('_Ablage-Protokoll.txt')).getFile()).text();
      const daten = []; for await (const [n, h] of proj.lab.entries()) if (/_Daten\.json$/.test(n)) daten.push(JSON.parse(await (await h.getFile()).text()));
      return {namen: namen.sort(), scans: feldprotokolle[0].scans, sha, protokoll, daten, orig: await file.arrayBuffer().then(b => b.byteLength)};
    });
    const heute = new Date().toISOString().slice(0, 10);
    assert.deepEqual(erg.namen, ['26-0142-AS-01_Scan_' + heute + '.png', '26-0142-AS-01_Scan_' + heute + '_2.png', '_Ablage-Protokoll.txt'], 'zwei Dateien, nichts überschrieben');
    assert.equal(erg.scans.length, 2);
    assert.equal(erg.scans[0].sha256, erg.sha, 'Prüfsumme der abgelegten Kopie');
    assert.equal(erg.scans[0].bytes, erg.orig);
    assert.equal(erg.scans[0].original, 'Scan 0001.PNG');
    assert.equal(erg.scans[0].abgelegtVon, 'SK');
    assert.match(erg.protokoll, /^Ablage-Protokoll/);
    assert.equal(erg.protokoll.trim().split(/\r?\n/).length, 3, 'Kopfzeile + zwei Einträge');
    assert.ok(erg.protokoll.includes('SHA-256 ' + erg.sha));
    assert.equal(erg.daten.length, 1, 'Projektdaten automatisch gespeichert');
    assert.equal(erg.daten[0].feldprotokolle[0].scans.length, 2);
    // Scan wird neben den Feldern angezeigt
    await page.waitForFunction(() => { const i = document.querySelector('#fbe-blick img'); return i && i.complete && i.naturalWidth === 400; });
    // Ablage prüfen: unverändert ✓, nach Manipulation ✗
    await page.locator('#tab-feldboegen-erfassen button', {hasText: 'Ablage prüfen'}).click();
    await page.waitForFunction(() => document.querySelectorAll('.fbe-scanzeile').length === 2 && [...document.querySelectorAll('.fbe-scanzeile')].every(z => z.textContent.includes('✓')));
    await page.evaluate(async () => {
      const o = await PROJEKTORDNER.state.proj.dir.getDirectoryHandle('Feldprotokolle');
      const w = await (await o.getFileHandle(feldprotokolle[0].scans[1].datei)).createWritable(); await w.write('manipuliert'); await w.close();
    });
    await page.locator('#tab-feldboegen-erfassen button', {hasText: 'Ablage prüfen'}).click();
    await page.waitForFunction(() => document.querySelectorAll('.fbe-scanzeile')[1].textContent.includes('verändert'));
    // Zweiten Scan als ungültig vermerken (Datei bleibt)
    await page.locator('.fbe-scanzeile').nth(1).locator('button[title^="Als ungültig"]').click();
    assert.equal(await page.evaluate(() => feldprotokolle[0].scans[1].ungueltig.grund), 'falscher Bogen');
  }

  // Abschließen → Änderungen werden protokolliert; Prüfung durch zweite Person; Änderung hebt Prüfung auf
  await page.locator('#tab-feldboegen-erfassen button', {hasText: 'Erfassung abschließen'}).click();
  await page.locator('.fbe-pill.abgeschlossen').waitFor();
  await feld('mp.0.volumen').fill('3,84');
  await feld('mp.0.volumen').press('Tab');
  rec = await page.evaluate(() => feldprotokolle[0]);
  const ae = rec.aenderungen.find(a => a.feld === 'MP 1 · Probenvolumen');
  assert.deepEqual([ae.alt, ae.neu, ae.von], ['38,4', '3,84', 'SK'], 'eine Protokollzeile je Änderung, nicht je Tastendruck');
  assert.equal(rec.aenderungen.filter(a => a.feld === 'MP 1 · Probenvolumen').length, 1);
  assert.equal(await page.locator('.fbe-hint[data-hint="mp.0.volumen"]').isVisible(), false, 'Hinweis verschwindet bei stimmigem Wert');
  await page.locator('#fbe-kuerzel').fill('AB');
  await page.locator('#tab-feldboegen-erfassen button', {hasText: 'Übertragung geprüft'}).click();
  await page.locator('.fbe-pill.geprueft').waitFor();
  rec = await page.evaluate(() => feldprotokolle[0]);
  assert.equal(rec.pruefung.von, 'AB');
  assert.equal(rec.pruefung.selbst, false);
  await feld('kopf.auftragsNr').fill('A-77');
  await feld('kopf.auftragsNr').press('Tab');
  await page.locator('.fbe-pill.abgeschlossen').waitFor();
  rec = await page.evaluate(() => feldprotokolle[0]);
  assert.equal(rec.pruefung, null, 'Änderung hebt Prüfung auf');
  assert.ok(await page.locator('details.fbe-sek summary', {hasText: 'Änderungsprotokoll'}).isVisible());

  // Messpunkt hinzufügen
  await page.locator('#tab-feldboegen-erfassen button', {hasText: '+ Messpunkt'}).click();
  await page.locator('#fbe-mp-2').waitFor();

  // Speichern und Laden: Erfassung kommt vollständig zurück
  const json = await page.evaluate(() => buildProjektSaveData().content);
  const daten = JSON.parse(json);
  assert.equal(daten.feldprotokolle.length, 1);
  await page.evaluate(() => { applyProjektData({proben: []}); });
  assert.equal(await page.evaluate(() => feldprotokolle.length), 0);
  await page.evaluate(j => applyProjektData(JSON.parse(j)), json);
  rec = await page.evaluate(() => feldprotokolle[0]);
  assert.equal(rec.mp.length, 3);
  assert.equal(rec.mp[0].w.volumen, '3,84');
  assert.equal(await page.locator('#fbe-wahl option').count(), 1);
  // Rückgängig nach Entfernen
  await page.locator('#tab-feldboegen-erfassen button', {hasText: 'Protokoll entfernen'}).click();
  assert.equal(await page.evaluate(() => feldprotokolle.length), 0);
  await page.evaluate(() => undoLetzteAktion());
  assert.equal(await page.evaluate(() => feldprotokolle.length), 1, 'Entfernen lässt sich rückgängig machen');

  // Keine Seite der Eingabe ragt horizontal heraus
  const breit = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(breit <= breiteVorher + 1, 'Erfassung verbreitert die Seite nicht (' + breit + ' px, vorher ' + breiteVorher + ' px)');

  assert.deepEqual(errors, [], 'keine Fehler in der Konsole');
  await browser.close(); server.close();
  console.log(`OK (${name}${kannAblegen ? ', mit Scan-Ablage' : ', nur Erfassung'})`);
})().catch(e => {
  console.error(e);
  const text = String(e && e.stack || e).slice(0, 1500).replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A');
  console.log(`::error title=Browsertest Feldprotokolle ${name}::${text}`);
  process.exit(1);
});
