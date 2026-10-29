// Sicher speichern (Prüfbericht 29.10., F05/F06/F09): Projektdatei nie still über einen fremden Stand schreiben, Übergaben nur
// nach Rückfrage ersetzen, ein verspätet geöffnetes Projekt ersetzt keine neueren Eingaben. Ordner im Speicher, synthetische Daten.
'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const stueck = (von, bis) => { const a = html.indexOf(von), b = html.indexOf(bis, a + von.length); assert.ok(a >= 0 && b > a, 'Abschnitt ' + von); return html.slice(a, b); };

/** Ordner im Speicher; vorOeffnen(name): läuft in createWritable – dort „schreibt ein anderer Rechner“. */
function ordner(name, dateien = {}, haken = {}){
  const d = {
    name, kind: 'directory', dateien,
    async *values(){ for (const n of Object.keys(dateien)) yield d.handle(n); },
    handle(n){
      return { name: n, kind: 'file',
        getFile: async () => ({ name: n, text: async () => dateien[n], lastModified: 1 }),
        createWritable: async () => {
          if (haken.vorOeffnen) await haken.vorOeffnen(n);
          if (haken.schreibFehler){ haken.schreibFehler = false; throw Object.assign(Error('Schreibfehler (synthetisch)'), { name: 'NotAllowedError' }); }
          let t = ''; return { write: async v => { t = v; }, close: async () => { dateien[n] = t; }, abort: async () => {} };
        } };
    },
    async getFileHandle(n, o){ if (!(n in dateien)){ if (!(o && o.create)) throw Object.assign(Error('fehlt'), { name: 'NotFoundError' }); dateien[n] = ''; } return d.handle(n); }
  };
  return d;
}
function laden(antworten = []){
  const fragen = [];
  const ctx = { console, navigator: {}, DOMException: class extends Error { constructor(m, n){ super(m); this.name = n; } },
    confirm: m => { fragen.push(m); assert.ok(antworten.length, 'unerwartete Rückfrage: ' + m); return antworten.shift(); } };
  vm.createContext(ctx); vm.runInContext(stueck('/* Sicher speichern', 'async function schnellSpeichern(){'), ctx);
  return { ctx, fragen };
}
const JSON_NAME = '99.9001_2026-10-29_Daten.json';

(async () => {
  // 1. Geladener Stand, inzwischen von einem anderen Fenster geändert → Rückfrage; Abbrechen lässt die Datei unverändert
  {
    const d = ordner('Laboraufträge', { [JSON_NAME]: '{"synthetisch":"A"}' }), { ctx, fragen } = laden([false]);
    ctx.jsonStandMerken(d, JSON_NAME, '{"synthetisch":"A"}');
    d.dateien[JSON_NAME] = '{"synthetisch":"B von woanders"}';
    await assert.rejects(ctx.sicherSpeichern(d, JSON_NAME, '{"synthetisch":"C alt"}'), e => e.name === 'AbortError');
    assert.match(fragen[0], /inzwischen geändert/); assert.equal(d.dateien[JSON_NAME], '{"synthetisch":"B von woanders"}');
  }
  // 2. … OK = bewusst überschreiben
  {
    const d = ordner('Laboraufträge', { [JSON_NAME]: '{"synthetisch":"B"}' }), { ctx } = laden([true]);
    ctx.jsonStandMerken(d, JSON_NAME, '{"synthetisch":"A"}');
    await ctx.sicherSpeichern(d, JSON_NAME, '{"synthetisch":"C"}'); assert.equal(d.dateien[JSON_NAME], '{"synthetisch":"C"}');
  }
  // 3. Eigene Folge-Speicherungen fragen nicht; nie geladene vorhandene Datei fragt; leere Datei (gescheitertes Anlegen) nicht
  {
    const d = ordner('Laboraufträge'), { ctx, fragen } = laden([true]);
    await ctx.sicherSpeichern(d, JSON_NAME, '{"n":1}'); await ctx.sicherSpeichern(d, JSON_NAME, '{"n":2}');
    assert.equal(d.dateien[JSON_NAME], '{"n":2}'); assert.equal(fragen.length, 0);
    const fremd = ordner('Laboraufträge', { [JSON_NAME]: '{"vorher":true}' });
    await ctx.sicherSpeichern(fremd, JSON_NAME, '{"n":3}'); assert.match(fragen[0], /nicht von dort geladen/);
    const h = { schreibFehler: true }, leer = ordner('Laboraufträge', {}, h);
    await assert.rejects(ctx.sicherSpeichern(leer, JSON_NAME, '{"n":4}'), /Schreibfehler/);
    assert.equal(leer.dateien[JSON_NAME], '', 'leere Datei bleibt nach dem Fehler');
    await ctx.sicherSpeichern(leer, JSON_NAME, '{"n":4}'); assert.equal(leer.dateien[JSON_NAME], '{"n":4}'); assert.equal(fragen.length, 1);
  }
  // 4. Ein anderer Rechner schreibt genau zwischen Prüfen und Schreiben → nicht gespeichert, sein Stand bleibt
  {
    const d = ordner('Laboraufträge', { [JSON_NAME]: '{"a":1}' }, { vorOeffnen: async n => { d.dateien[n] = '{"anderer":1}'; } }), { ctx } = laden();
    ctx.jsonStandMerken(d, JSON_NAME, '{"a":1}');
    await assert.rejects(ctx.sicherSpeichern(d, JSON_NAME, '{"a":2}'), /gerade eben geändert/); assert.equal(d.dateien[JSON_NAME], '{"anderer":1}');
  }
  // 5. Übergaben: vorhandene Datei (auch in anderer Schreibweise) → einmal fragen; behalten = „(2)“ daneben, ersetzen = überschreiben
  {
    const alt = '99.9001_PAK_2026-10-29_Laborübergabe.XLS'.normalize('NFD');
    const d = ordner('Laboraufträge', { [alt]: 'VON HAND KORRIGIERT' }), { ctx, fragen } = laden([false, true]);
    const neu = '99.9001_PAK_2026-10-29_Laborübergabe.xls';
    let ersetzen = await ctx.uebergabenFragen([{ dir: d, name: neu }]); assert.equal(ersetzen, false); assert.match(fragen[0], /gibt es im Ordner schon/);
    assert.equal(await ctx.sicherSpeichern(d, neu, 'NEU 1', { ersetzen }), '99.9001_PAK_2026-10-29_Laborübergabe (2).xls');
    assert.equal(d.dateien[alt], 'VON HAND KORRIGIERT');
    ersetzen = await ctx.uebergabenFragen([{ dir: d, name: neu }]); assert.equal(ersetzen, true);
    assert.equal(await ctx.sicherSpeichern(d, neu, 'NEU 2', { ersetzen }), alt); assert.equal(d.dateien[alt], 'NEU 2');
    assert.equal(await ctx.uebergabenFragen([{ dir: d, name: 'gibt-es-nicht.xls' }]), false, 'nichts vorhanden – keine Frage');
    assert.equal(fragen.length, 2);
  }
  console.log('OK Sicher speichern: fremder Stand nur nach Rückfrage überschrieben, Übergaben bleiben erhalten (5 Fälle)');

  // 6. Projekt A wird noch gelesen, inzwischen B geöffnet und bearbeitet → A ersetzt B nicht (F06)
  {
    let weiter; const halt = new Promise(r => { weiter = r; }); let angehalten; const erreicht = new Promise(r => { angehalten = r; });
    const datei = (nr, z2, warten) => ({ name: nr + '_Daten.json', lastModified: 1, text: async () => { if (warten){ angehalten(); await halt; } return JSON.stringify({ projekt: { nr }, proben: [{ z2 }] }); } });
    const lab = n => ({ name: 'Laboraufträge', projekt: n });
    const felder = new Map(), el = id => { if (!felder.has(id)) felder.set(id, { value: '' }); return felder.get(id); };
    const c = { console, state: { proj: null, pj: null }, permission: async () => true, maPersonenAus: async () => [], archiv: async () => null,
      parse: n => ({ nr: n.slice(0, 7), ort: 'Synthetisch' }), subdir: async d => lab(d.name), LAB_DIR: 'Laboraufträge',
      proben: [], chloridProben: [], asbestProben: [], sonstigeProben: [], brandgeruchProben: [], pn98Proben: [], feldprotokolle: [], projektStatus: { dirty: false },
      window: {}, document: { getElementById: el }, projektZuordnungPruefen: () => true, ladePj: async () => {}, updateProjekt: () => {}, kuerzelAuswahl: () => {},
      fbeKuerzel: () => 'AA', markSaved: () => {}, zeigen: () => {}, PROJEKT_URL: { setzen: () => {} }, flash: () => {}, alert: m => { throw Error(m); }, confirm: () => true, jsonStandMerken: () => {} };
    c.applyProjektData = (data, nr) => { c.proben = JSON.parse(JSON.stringify(data.proben)); el('proj-nr').value = nr; };
    vm.createContext(c); vm.runInContext(stueck('  async function neuesteDaten(lab){', '  async function ausZentrale(name){') + '\nthis.oeffnen = oeffnen;', c);
    c.neuesteDaten = async l => datei(l.projekt.slice(0, 7), 'Synthetisch ' + l.projekt.slice(8), l.projekt.startsWith('99.9001'));
    const a = c.oeffnen({ name: '99.9001 A' }); await erreicht;
    await c.oeffnen({ name: '99.9002 B' }); c.proben[0].z2 = 'B – noch nicht gespeichert'; c.projektStatus.dirty = true;
    weiter(); await a;
    assert.equal(c.state.proj.nr, '99.9002'); assert.equal(c.proben[0].z2, 'B – noch nicht gespeichert');
  }
  console.log('OK Projektwechsel: verspätet gelesenes Projekt ersetzt keine neueren Eingaben');
})().catch(e => { console.error(e); process.exitCode = 1; });
