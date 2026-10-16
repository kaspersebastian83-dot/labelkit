// Feldprotokolle erfassen (4.26.0): Datenmodell, Änderungsprotokoll, Prüfung, Plausibilität, Scan-Dateinamen – ohne Browser.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('/* FBE-LOGIK-START */'), end = html.indexOf('/* FBE-LOGIK-ENDE */');
assert.ok(start > 0 && end > start, 'Erfassungs-Logik gefunden');
const ctx = {};
vm.runInNewContext(html.slice(start, end) + `
this.api={FBE_SCHEMA,fbeNeu,fbeSetze,fbeSetzeUnleserlich,fbeAbschliessen,fbePruefen,fbePlausi,fbeScanName,fbeZahl,fbeZeit,
  fbeDatumLesen,fbeFeldLabel,fbeMpHinzu,fbeMpEntfernen,fbeMpLeer,fbeStatus,fbeAblageZeile,fbeHex,fbeFeld};`, ctx);
const A = ctx.api;
const plain = x => JSON.parse(JSON.stringify(x));
const T = '2026-10-21T08:00:00.000Z';

// Neues Protokoll: vorgedruckte Werte übernommen, alles andere leer (nicht 0), Messpunkte nummeriert.
const rec = A.fbeNeu({typ: 'asbest', formularId: '26.0142-AS-01', n: 3, von: 'SK', jetzt: T,
  vor: {projektNr: '26.0142', objekt: 'EFH, Musterweg 7', auftraggeber: 'Beispiel AG', ortstermin: '21.10.2026', unbekannt: 'x'}});
assert.equal(rec.kopf.projektNr, '26.0142');
assert.equal(rec.kopf.objekt, 'EFH, Musterweg 7');
assert.equal(rec.kopf.unbekannt, undefined, 'nur Felder aus dem Schema');
assert.equal(rec.kopf.messtechniker, '');
assert.equal(rec.kopf.unterschrift, false);
assert.deepEqual(plain(rec.mp.map(m => m.nr)), [1, 2, 3]);
assert.equal(rec.mp[0].w.volumen, '');
assert.equal(rec.erfasstVon, 'SK');
const sp = A.fbeNeu({typ: 'schimmel', formularId: '26.0142-SP-01', n: 2, von: 'AB', jetzt: T});
assert.equal(sp.kopf.refProben.length, 3, 'Referenztabelle mit 3 Zeilen wie auf dem Bogen');
assert.equal(sp.mp[0].w.proben.length, 6, 'Probentabelle mit 6 Zeilen wie auf dem Bogen');
assert.deepEqual(plain(sp.kopf.anlass), []);
assert.throws(() => A.fbeNeu({typ: 'radon'}), /Unbekannter Formulartyp/);

// Alle Felder des Papierbogens sind im Schema und jede Feldkennung ist eindeutig.
for (const typ of ['asbest', 'schimmel']) {
  const s = A.FBE_SCHEMA[typ];
  const kopf = s.kopf.flatMap(a => a.felder).map(f => f.k), mp = s.mp.map(f => f.k);
  assert.equal(new Set(kopf).size, kopf.length, typ + ': Kopffelder eindeutig');
  assert.equal(new Set(mp).size, mp.length, typ + ': Messpunktfelder eindeutig');
  assert.ok(kopf.includes(s.person), typ + ': Person lt. Bogen vorhanden');
}

// Vor dem Abschluss: Werte ändern ohne Protokoll; Werte bleiben Text wie auf dem Bogen.
assert.equal(A.fbeSetze(rec, 'mp.0.volumen', '3,839', {von: 'SK', jetzt: T}), true);
assert.equal(rec.mp[0].w.volumen, '3,839');
assert.equal(A.fbeSetze(rec, 'mp.0.volumen', '3,839', {von: 'SK'}), false, 'gleicher Wert ist keine Änderung');
assert.equal(rec.aenderungen.length, 0);

// Abschluss → jede Änderung wird mit alt/neu/Kürzel/Zeit protokolliert.
A.fbeAbschliessen(rec, {von: 'SK', jetzt: T});
assert.equal(A.fbeStatus(rec).klasse, 'abgeschlossen');
A.fbeSetze(rec, 'mp.0.volumen', '3,893', {von: 'SK', jetzt: '2026-10-22T09:00:00.000Z'});
assert.deepEqual(plain(rec.aenderungen[0]), {am: '2026-10-22T09:00:00.000Z', von: 'SK', feld: 'MP 1 · Probenvolumen', alt: '3,839', neu: '3,893'});

// Prüfung durch zweite Person; eine spätere Änderung hebt sie auf (protokolliert).
assert.throws(() => A.fbePruefen(A.fbeNeu({typ: 'asbest', formularId: 'x', n: 1}), {von: 'AB'}), /abschließen/);
A.fbePruefen(rec, {von: 'AB', jetzt: '2026-10-22T10:00:00.000Z'});
assert.equal(rec.pruefung.selbst, false);
assert.equal(A.fbeStatus(rec).klasse, 'geprueft');
A.fbeSetze(rec, 'kopf.anblasen', 'ja', {von: 'SK', jetzt: '2026-10-22T11:00:00.000Z'});
assert.equal(rec.pruefung, null, 'Prüfung durch Änderung aufgehoben');
assert.equal(rec.aenderungen.at(-1).feld, 'Prüfung der Übertragung');
assert.match(rec.aenderungen.at(-1).alt, /geprüft von AB/);
A.fbePruefen(rec, {von: 'sk'});
assert.equal(rec.pruefung.selbst, true, 'Prüfung durch Erfasser wird erkannt (ohne Groß/Klein)');

// „unleserlich“ ist ein eigener Vermerk; nach Abschluss protokolliert.
const n0 = rec.aenderungen.length;
A.fbeSetzeUnleserlich(rec, 'mp.1.temp', true, {von: 'SK'});
assert.equal(rec.unl['mp.1.temp'], true);
assert.equal(rec.aenderungen.length, n0 + 2, 'Vermerk + aufgehobene Prüfung');
assert.equal(A.fbeSetzeUnleserlich(rec, 'mp.1.temp', true, {von: 'SK'}), false);
A.fbeSetzeUnleserlich(rec, 'mp.1.temp', false, {von: 'SK'});
assert.equal(rec.unl['mp.1.temp'], undefined);

// Mehrfachauswahl und Tabellenzellen.
A.fbeSetze(sp, 'kopf.anlass', ['Beschwerden der Nutzer'], {});
A.fbeSetze(sp, 'mp.1.proben.2.volumen', '100', {});
assert.equal(sp.mp[1].w.proben[2].volumen, '100');
assert.equal(A.fbeFeldLabel(sp, 'mp.1.proben.2.volumen'), 'Messstelle 2 · Proben Zeile 3 · Volumen l');
assert.equal(A.fbeFeldLabel(sp, 'kopf.refProben.0.uhrzeit'), 'Referenzproben Zeile 1 · Uhrzeit');
assert.equal(A.fbeFeld('schimmel', 'mp.0.proben.1.volumen').t, 'zahl');
assert.deepEqual(plain(A.fbeFeld('schimmel', 'kopf.anlass').o.slice(0, 1)), ['Verdacht auf verdeckten Befall']);

// Messpunkte hinzufügen/entfernen (protokolliert nach Abschluss).
const r2 = A.fbeNeu({typ: 'asbest', formularId: 'y', n: 1});
assert.equal(A.fbeMpEntfernen(r2, {}), false, 'mindestens ein Messpunkt bleibt');
assert.equal(A.fbeMpHinzu(r2, {}), 2);
assert.equal(A.fbeMpLeer(r2, 1), true);
A.fbeSetze(r2, 'mp.1.raum', 'Küche', {});
assert.equal(A.fbeMpLeer(r2, 1), false);
A.fbeAbschliessen(r2, {von: 'SK'});
A.fbeMpEntfernen(r2, {von: 'SK'});
assert.equal(r2.mp.length, 1);
assert.match(r2.aenderungen.at(-1).alt, /Küche/, 'Inhalt des entfernten Messpunkts bleibt im Protokoll');

// Zahlen, Uhrzeiten, Daten wie handschriftlich üblich.
assert.equal(A.fbeZahl('3,839'), 3.839);
assert.equal(A.fbeZahl(' 8 '), 8);
assert.equal(A.fbeZahl(''), null);
assert.ok(Number.isNaN(A.fbeZahl('ca. 8')));
assert.ok(Number.isNaN(A.fbeZahl('1.300,5')), 'keine Tausenderpunkte raten');
assert.equal(A.fbeZeit('8:15'), 495);
assert.equal(A.fbeZeit('08.15'), 495);
assert.equal(A.fbeZeit('0815'), 495);
assert.equal(A.fbeZeit('16:30 Uhr'), 990);
assert.ok(Number.isNaN(A.fbeZeit('25:00')));
assert.equal(A.fbeDatumLesen('21.10.26').toISOString().slice(0, 10), '2026-10-21');
assert.ok(Number.isNaN(A.fbeDatumLesen('31.02.2026')));

// Plausibilität: nur Hinweise, Werte unverändert.
const p = A.fbeNeu({typ: 'asbest', formularId: 'z', n: 2});
Object.assign(p.kopf, {messtechniker: 'Müller', unterschrift: true, geschlossenSeit: '22:00'});
Object.assign(p.mp[0].w, {start: '08:00', ende: '16:00', flussStart: '8', flussEnde: '8', volumen: '3,84', rf: '45', temp: '21'});
assert.deepEqual(plain(A.fbePlausi(p)), [], 'stimmige Messung ohne Hinweise');
const vorher = JSON.stringify(p);
Object.assign(p.mp[0].w, {volumen: '38,4', flussEnde: '9,5', rf: '145'});
Object.assign(p.mp[1].w, {start: '17:00', ende: '01:00', temp: 'warm'});
p.kopf.geschlossenSeit = '07:00';
const h = A.fbePlausi(p), at = pf => h.filter(x => x.pfad === pf).map(x => x.text).join(' ');
assert.match(at('mp.0.volumen'), /passt nicht zu Volumenstrom × Dauer \(≈ 4,200 m³ bei 480 min\)/);
assert.match(at('mp.0.flussEnde'), /19 %/);
assert.match(at('mp.0.rf'), /0–100/);
assert.match(at('mp.1.ende'), /Mitternacht/);
assert.match(at('mp.1.temp'), /Keine Zahl/);
assert.match(at('kopf.geschlossenSeit'), /Nur 1,0 h/);
p.unl['mp.1.temp'] = true;
assert.equal(A.fbePlausi(p).filter(x => x.pfad === 'mp.1.temp').length, 0, 'unleserlich vermerkt → kein Zahl-Hinweis');
assert.notEqual(JSON.stringify(p), vorher);
const unveraendert = JSON.stringify(p); A.fbePlausi(p); assert.equal(JSON.stringify(p), unveraendert, 'Prüfung ändert nichts');
const leer = A.fbeNeu({typ: 'asbest', formularId: 'z', n: 1});
assert.match(A.fbePlausi(leer).map(x => x.text).join(' '), /Messtechniker ist nicht eingetragen.*Unterschrift/);

const s2 = A.fbeNeu({typ: 'schimmel', formularId: 's', n: 1});
Object.assign(s2.kopf, {probenehmer: 'AB', unterschrift: true, datum: '21.10.2026', versandAm: '23.10.2026', geschlossenSeit: '06:00', referenz: 'Referenzraum'});
s2.mp[0].w.hoehe = '0,8'; s2.mp[0].w.proben[0].uhrzeit = '09:00';
const hs = A.fbePlausi(s2).map(x => x.pfad + ': ' + x.text).join('\n');
assert.match(hs, /kopf\.versandAm: Versand an einem Freitag/);
assert.match(hs, /mp\.0\.hoehe: Sammelhöhe 0,80 m/);
assert.match(hs, /kopf\.geschlossenSeit: Nur 3,0 h/);
assert.match(hs, /kopf\.referenzraum/);
s2.kopf.versandAm = '27.10.2026';
assert.match(A.fbePlausi(s2).map(x => x.text).join(' '), /Versand 6 Tage nach der Messung/);

// Scan-Dateinamen: ERVV-tauglich, nie überschreibend, nur erlaubte Typen.
assert.equal(A.fbeScanName('26.0142-AS-01', '2026-10-21T08:00:00Z', 'PDF', []), '26-0142-AS-01_Scan_2026-10-21.pdf');
assert.equal(A.fbeScanName('26.0142-AS-01', '2026-10-21', 'jpg', ['26-0142-AS-01_Scan_2026-10-21.JPG']), '26-0142-AS-01_Scan_2026-10-21_2.jpg');
assert.equal(A.fbeScanName('26.0142-AS-01', '2026-10-21', 'jpg', ['26-0142-AS-01_Scan_2026-10-21.jpg', '26-0142-AS-01_Scan_2026-10-21_2.jpg']), '26-0142-AS-01_Scan_2026-10-21_3.jpg');
assert.throws(() => A.fbeScanName('x', '2026-10-21', 'exe', []), /nicht abgelegt/);
const lang = A.fbeScanName('Ä'.repeat(200) + ' / ?', '2026-10-21', 'tiff', []);
assert.match(lang, /^[A-Za-z0-9_-]+\.[a-z]+$/, 'nur Buchstaben, Ziffern, _ und - und ein Punkt');
assert.ok(lang.length <= 90);
assert.equal(A.fbeHex(new Uint8Array([0, 15, 255]).buffer), '000fff');
assert.match(A.fbeAblageZeile({abgelegtAm: T, datei: 'a.jpg', sha256: 'ab', bytes: 3, original: 'scan 1.jpg', abgelegtVon: 'SK'}, '26.0142-AS-01'),
  /^2026-10-21T08:00:00.000Z \| 26\.0142-AS-01 \| a\.jpg \| SHA-256 ab \| 3 Byte \| Original: scan 1\.jpg \| abgelegt von: SK$/);

console.log('Feldprotokolle: alle Prüfungen bestanden');
