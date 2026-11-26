// LabelKit 5.4.0 – Brandgeruch › Export: Weg zur Anlage für den Bericht (Rückmeldung R-20261126-135349-SK,
// Plan claude/brandgeruch-tabelle-plan.md Teil A) im echten Browser: node tests/brandgeruch-anlage-browser.cjs [chromium]
// - ohne Projektordner: kein Knopf, nur „Die Anlage für den Bericht erstellt die Projektzentrale.“; RTF-Dialog ohne startIn
// - mit Projektordner (Umlaut, ß, Leerzeichen): Blind-Modus → gesperrt, Blind-Satz (auch wenn zugleich ungespeichert);
//   aufgedeckt, ungespeichert → gesperrt, „Erst speichern …“; nach „Speichern“ ohne Neuladen aktiv, normaler Satz;
//   Klick → ../Projektzentrale/#projekt=<Ordnername> im Fenster „projektzentrale“; neue Änderung → wieder gesperrt
// - „Nur Tabelle (RTF)“: Zusatz, startIn = „Laboraufträge“ (sonst Projektordner), Meldung nennt den Ordner, Dateiname wie bisher,
//   abgelehnter Startordner → Dialog ohne startIn
// Projektordner im Origin Private File System, nur erfundene Daten.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const playwright = require('playwright');
const ui = require('./lk-ui.cjs');

const name = process.argv[2] || 'chromium';
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'));
const P = '26.0613 Köln Süd Teststraße Dr.Ka';
const SATZ = {
  ohne: 'Die Anlage für den Bericht erstellt die Projektzentrale.',
  blind: 'Erst „Ergebnisse aufdecken“ und speichern – verdeckt kann die Projektzentrale keine Anlage erstellen.',
  offen: 'Erst speichern – die Projektzentrale liest nur den gespeicherten Stand.',
  bereit: 'Die Projektzentrale erstellt daraus die Word-Anlage in „Mitteilungen“ – BerichtKit hängt sie an den Bericht.'
};
const SHOT = process.env.SCREENSHOT_DIR;

(async () => {
  const server = http.createServer((req, res) => {
    if (req.url.split('?')[0] === '/spektron-ordner.js') { res.writeHead(200, {'content-type': 'application/javascript; charset=utf-8'}); res.end(fs.readFileSync(path.join(__dirname, '..', 'spektron-ordner.js'))); return; }
    if (req.url.startsWith('/Projektzentrale/')) { res.writeHead(200, {'content-type': 'text/html; charset=utf-8'}); res.end('<!DOCTYPE html><title>Projektzentrale (Test)</title>'); return; }
    res.writeHead(200, {'content-type': 'text/html; charset=utf-8'}); res.end(html);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await playwright[name].launch();
  const ctx = await browser.newContext({viewport: {width: 1300, height: 900}});
  await ctx.addInitScript(() => { try { localStorage.setItem('willkommen-gelesen', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  const errors = [], dialoge = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('dialog', d => { dialoge.push(d.message()); d.accept(); });
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await page.evaluate(() => { document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open')); document.querySelectorAll('dialog[open]').forEach(d => d.close()); });
  const kann = await page.evaluate(async () => { try { const r = await navigator.storage.getDirectory(); const h = await r.getFileHandle('p', {create: true}); if (!h.createWritable) return false; const w = await h.createWritable(); await w.write('x'); await w.close(); await r.removeEntry('p'); return !!window.showDirectoryPicker; } catch (e) { return false; } });
  if (!kann) { console.log(`SKIP (${name}): kein schreibbarer Ordnerzugriff`); await browser.close(); server.close(); return; }

  const knopf = page.locator('#bg-anlage-knopf'), satz = page.locator('#bg-anlage-satz'), rtf = page.locator('#bg-rtf-knopf');
  const stand = async () => ({sichtbar: await knopf.isVisible(), aktiv: await knopf.isEnabled(), satz: (await satz.textContent()).trim()});
  // Speicherdialog nachbilden: Optionen merken; liefert eine Datei im Projekt (Unterordner rel) oder bricht ab
  const pickerStub = (modus, rel) => page.evaluate(([modus, rel, proj]) => {
    window.__picker = [];
    window.showSaveFilePicker = async o => {
      window.__picker.push({suggestedName: o.suggestedName, startIn: o.startIn ? o.startIn.name : null});
      if (modus === 'abbrechen') { const e = new Error('abgebrochen'); e.name = 'AbortError'; throw e; }
      if (modus === 'startAbgelehnt' && o.startIn) throw new TypeError('startIn nicht erlaubt');
      let d = await (await navigator.storage.getDirectory()).getDirectoryHandle(proj);
      for (const t of rel.split('/').filter(Boolean)) d = await d.getDirectoryHandle(t, {create: true});
      return d.getFileHandle(o.suggestedName, {create: true});
    };
  }, [modus, rel || '', P]);
  const picker = () => page.evaluate(() => window.__picker);
  const flash = () => page.locator('#flash').textContent();
  const bgProben = blind => page.evaluate(blind => {
    brandgeruchProben = [];
    addBrandgeruchProbe({z1: 'EG Wohnzimmer', z2: 'Sofa, Stoffbezug', p1: '+', p2: '++', p3: '+', p4: '(+)', p5: '+'}, true);
    addBrandgeruchProbe({z1: 'OG Kinderzimmer', z2: 'Teppich', p1: '-', p2: '-', p3: '(+)', p4: '-', p5: '-'}, true);
    bgBlind = !!blind; bgUnlocked = new Set(); renderBrandgeruchTable(); updateBgBlindUi();
  }, blind);
  const zumExport = async () => {
    await ui.art(page, 'brandgeruch');
    await ui.schritt(page, 3);
    await page.locator('#tab-brandgeruch-export').waitFor({state: 'visible'});
  };

  // ── 1 · ohne Projektordner ──────────────────────────────────────────────
  await bgProben(false);
  await zumExport();
  assert.deepEqual(await stand(), {sichtbar: false, aktiv: false, satz: SATZ.ohne}, 'ohne Projektordner: kein Knopf, nur der Satz');
  assert.equal(await rtf.evaluate(b => b.firstChild.textContent), 'Nur Tabelle (RTF)');
  assert.equal((await rtf.locator('small').textContent()).trim(), 'nicht die Anlage für den Bericht');
  assert.equal(await page.locator('#tab-brandgeruch-export button', {hasText: 'Als Word (RTF)'}).count(), 0, 'alter Knopftext ist weg');
  await pickerStub('abbrechen');
  await rtf.click();
  await page.waitForFunction(() => window.__picker.length === 1);
  const ohneP = (await picker())[0];
  assert.equal(ohneP.startIn, null, 'ohne Projektordner: Dialog wie bisher (kein startIn)');
  assert.match(ohneP.suggestedName, /^Projekt_Brandgeruch_\d{2}-\d{2}-\d{4}\.rtf$/, 'Dateiname wie bisher');

  // ── 2 · Projektordner mit Umlaut, ß und Leerzeichen ─────────────────────
  await page.evaluate(async proj => {
    const root = await navigator.storage.getDirectory();
    for await (const [n] of root.entries()) await root.removeEntry(n, {recursive: true});
    const dir = await root.getDirectoryHandle(proj, {create: true});
    await dir.getDirectoryHandle('Laboraufträge', {create: true});
    await dir.getDirectoryHandle('_Spektron', {create: true});
    brandgeruchProben = []; renderBrandgeruchTable();   // Teil 1 ohne Projektnummer: sonst fragt LabelKit nach der Zugehörigkeit
    await PROJEKTORDNER.oeffnen(dir);
  }, P);
  assert.equal(await page.evaluate(() => PROJEKTORDNER.state.proj && PROJEKTORDNER.state.proj.name), P);
  await bgProben(true);   // neue Proben, Blind-Modus aktiv (Vorgabe) und ungespeichert
  await zumExport();
  assert.deepEqual(await stand(), {sichtbar: true, aktiv: false, satz: SATZ.blind}, 'Blind-Modus geht vor „ungespeichert“');
  assert.equal(await page.evaluate(() => projektStatus.dirty), true);
  if (SHOT) await page.locator('#tab-brandgeruch-export .lk-block').screenshot({path: path.join(SHOT, `brandgeruch-export-blind-${name}.png`)});

  // Speichern im Blind-Modus: weiter gesperrt (verdeckt)
  await page.locator('#btn-zwischenstand-speichern').click();
  await page.waitForFunction(() => !projektStatus.dirty);
  assert.deepEqual(await stand(), {sichtbar: true, aktiv: false, satz: SATZ.blind}, 'gespeichert, aber verdeckt: gesperrt');

  // Aufdecken → ungespeichert
  await page.evaluate(() => bgAufdecken());
  assert.equal(await page.evaluate(() => bgBlind), false);
  assert.deepEqual(await stand(), {sichtbar: true, aktiv: false, satz: SATZ.offen}, 'aufgedeckt, ungespeichert: gesperrt');
  assert.match(await satz.getAttribute('class'), /lk-warn/);
  if (SHOT) await page.locator('#tab-brandgeruch-export .lk-block').screenshot({path: path.join(SHOT, `brandgeruch-export-ungespeichert-${name}.png`)});
  // gesperrter Knopf öffnet nichts
  let neu = 0; ctx.on('page', () => neu++);
  await knopf.click({force: true});
  await page.waitForTimeout(300);
  assert.equal(neu, 0, 'gesperrt: kein Fenster');

  // Speichern → ohne Neuladen aktiv
  const geladenSeit = await page.evaluate(() => performance.timeOrigin);
  await page.locator('#btn-zwischenstand-speichern').click();
  await page.waitForFunction(() => !projektStatus.dirty);
  await page.waitForFunction(() => !document.getElementById('bg-anlage-knopf').disabled);
  assert.equal(await page.evaluate(() => performance.timeOrigin), geladenSeit, 'nicht neu geladen');
  assert.deepEqual(await stand(), {sichtbar: true, aktiv: true, satz: SATZ.bereit}, 'gespeichert: aktiv, normaler Satz');
  assert.doesNotMatch(await satz.getAttribute('class'), /lk-warn/);
  if (SHOT) await page.locator('#tab-brandgeruch-export .lk-block').screenshot({path: path.join(SHOT, `brandgeruch-export-bereit-${name}.png`)});

  // Sprung: Ziel-Adresse und Fenster
  const [pz] = await Promise.all([ctx.waitForEvent('page'), knopf.click()]);
  await pz.waitForURL(/\/Projektzentrale\//);
  const ziel = new URL(pz.url());
  assert.equal(ziel.pathname, '/Projektzentrale/');
  assert.equal(ziel.hash, '#projekt=' + encodeURIComponent(P), 'Ordnername wörtlich und kodiert');
  assert.equal(new URLSearchParams(ziel.hash.slice(1)).get('projekt'), P);
  assert.equal(await pz.evaluate(() => window.name), 'projektzentrale', 'eigenes Fenster wie die Sprünge der Leiste');
  assert.equal(await page.evaluate(() => projektStatus.dirty), false, 'nichts verändert');
  await pz.close();

  // neue Änderung → wieder gesperrt; Blind-Modus an + ungespeichert → Blind-Satz
  await page.evaluate(() => setBrandgeruchVal(brandgeruchProben[0].id, 'p3', '++'));
  assert.deepEqual(await stand(), {sichtbar: true, aktiv: false, satz: SATZ.offen}, 'neue Änderung: gesperrt');
  await page.evaluate(() => toggleBgBlind(true));
  assert.deepEqual(await stand(), {sichtbar: true, aktiv: false, satz: SATZ.blind});
  await page.evaluate(() => toggleBgBlind(false));
  await page.locator('#btn-zwischenstand-speichern').click();
  await page.waitForFunction(() => !document.getElementById('bg-anlage-knopf').disabled);

  // ── 3 · „Nur Tabelle (RTF)“ im Projekt ──────────────────────────────────
  await pickerStub('speichern', 'Laboraufträge');
  await rtf.click();
  await page.waitForFunction(() => /RTF\) gespeichert/.test(document.getElementById('flash').textContent));
  let p = (await picker())[0];
  assert.equal(p.startIn, 'Laboraufträge', 'startIn = „Laboraufträge“ des Projekts');
  assert.match(p.suggestedName, /^26\.0613_Brandgeruch_\d{2}-\d{2}-\d{4}\.rtf$/, 'Dateiname wie bisher');
  assert.equal(await flash(), 'Brandgeruch-Tabelle (RTF) gespeichert in „Laboraufträge“ ✓');
  const rtfText = await page.evaluate(async ([proj, n]) => {
    const d = await (await (await navigator.storage.getDirectory()).getDirectoryHandle(proj)).getDirectoryHandle('Laboraufträge');
    return (await (await d.getFileHandle(n)).getFile()).text();
  }, [P, p.suggestedName]);
  assert.match(rtfText, /^\{\\rtf1\\ansi/);
  assert.match(rtfText, /Sensorische Pr\\u252\?fung auf Brandgeruch/);
  assert.match(rtfText, /EG Wohnzimmer\\line Sofa, Stoffbezug/);
  assert.equal(await page.evaluate(() => projektStatus.dirty), false, 'RTF ändert den Speicherstand nicht');

  // anderer Ordner im Projekt: Meldung nennt ihn
  await pickerStub('speichern', 'Sonstiges');
  await rtf.click();
  await page.waitForFunction(() => window.__picker.length === 1 && /Sonstiges/.test(document.getElementById('flash').textContent));
  assert.equal(await flash(), 'Brandgeruch-Tabelle (RTF) gespeichert in „' + P + '/Sonstiges“ ✓');

  // ohne „Laboraufträge“-Griff: Start im Projektordner
  await page.evaluate(() => { window.__lab = PROJEKTORDNER.state.proj.lab; PROJEKTORDNER.state.proj.lab = null; });
  await pickerStub('abbrechen');
  await rtf.click();
  await page.waitForFunction(() => window.__picker.length === 1);
  assert.equal((await picker())[0].startIn, P, 'sonst der Projektordner');
  await page.evaluate(() => { PROJEKTORDNER.state.proj.lab = window.__lab; });

  // Browser lehnt den Startordner ab → Dialog wie bisher, Datei trotzdem gespeichert
  await pickerStub('startAbgelehnt', 'Laboraufträge');
  await rtf.click();
  await page.waitForFunction(() => window.__picker.length === 2 && /RTF\) gespeichert/.test(document.getElementById('flash').textContent));
  assert.deepEqual((await picker()).map(x => x.startIn), ['Laboraufträge', null]);

  assert.deepEqual(dialoge.filter(m => !/aufdecken/i.test(m)), [], 'keine weiteren Rückfragen');
  assert.deepEqual(errors, []);
  await browser.close(); server.close();
  console.log(`OK (${name}): Brandgeruch › Export – Anlage-Knopf, Hinweiszeile, Sprung, RTF-Startordner`);
})().catch(e => { console.error(e); process.exit(1); });
