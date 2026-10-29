const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const exportCode = html.slice(html.indexOf('async function alleUebergabenSpeichernMitWord(options){'), html.indexOf('\nrenderTable();\nupdateMainTabBadges();\ninitApp();'));
const saveGuardCode = html.slice(html.indexOf('function projektSpeichernStarten(){'), html.indexOf('\nfunction formatZeit('));

async function scenario({picker = 'ok', writeFailure = false, downloadApproval = false} = {}) {
  const events = [], written = [], alerts = [];
  const sample = {matrix: 'Wischprobe', datum: '2026-10-01'};
  const dir = {name: 'Projektordner', async getFileHandle(name) {
    return {async createWritable() {
      if (writeFailure && written.length === 1) throw new Error('Kein Schreibzugriff');
      return {async write(content) { written.push({name, content}); }, async close() {}};
    }};
  }};
  const context = {
    proben: [sample], chloridProben: [sample], asbestProben: [sample], sonstigeProben: [sample],
    brandgeruchProben: [], pn98Proben: [], bgBlind: false,
    letzterSpeicherOrdner: null,
    speichernAktiv: false, speicherHinweis: '', speicherKontextRevision: 0,
    window: {}, document: {
      getElementById: () => ({value: 'Testprojekt', checked: false}),
      createElement: () => ({click() {events.push('download');}})
    },
    safeFilename: s => s, validierungsCheck: () => true,
    eolExcelHeader: h => h, eolExcelCells: c => c,
    probeNr: () => 1, fmtDatum: d => d,
    beschreibung: () => 'PAK', beschreibungChlorid: () => 'Chlorid',
    beschreibungAsbest: () => 'Asbest', beschreibungSonstige: () => 'Sonstige',
    chloridUntersuchungsparameter: () => 'Chlorid',
    buildProjektSaveData: () => ({filename: 'Projekt.json', content: '{"test":true}'}),
    markSaved: (...args) => events.push(['saved', ...args]),
    markUnsaved() {context.projektStatus.dirty = true;},
    flash: message => events.push(message), alert: message => alerts.push(message),
    projektArchivAutoSave: () => events.push('archive'), projektStatus: {}, updateProjektStatus() {},
    confirm: () => downloadApproval, setTimeout: fn => fn(),
    Blob, URL: {createObjectURL: () => 'blob:test'}
  };
  if (picker !== 'unsupported') context.window.showDirectoryPicker = async options => {
    events.push('picker');
    assert.equal(options.mode, 'readwrite');
    if (picker !== 'ok') throw Object.assign(new Error(picker), {name: picker});
    return dir;
  };
  context.sicherSpeichern=async(dir,name,content)=>{const w=await(await dir.getFileHandle(name,{create:true})).createWritable();await w.write(content);await w.close();};
  vm.createContext(context);
  vm.runInContext(saveGuardCode, context);
  vm.runInContext(exportCode, context);
  await context.alleUebergabenSpeichernMitWord({skipValidation: true});
  return {events, written, alerts, context};
}

(async () => {
  const ok = await scenario();
  assert.equal(ok.events[0], 'picker');
  assert.equal(ok.written.length, 5, 'vier Laborübergaben + Projektdatei');
  assert.equal(ok.written.filter(f => f.name.endsWith('.xls')).length, 4);
  assert.ok(!ok.written.some(f => /Probenahmetexte/.test(f.name)), 'keine Textbaustein-Datei mehr (Funktion entfernt)');
  assert.ok(ok.written.some(f => f.name === 'Projekt.json'));
  assert.ok(ok.events.some(e => Array.isArray(e) && e[0] === 'saved' && e[2] === 'Projektordner'));
  assert.equal(ok.context.letzterSpeicherOrdner.name, 'Projektordner');
  for (const picker of ['AbortError', 'SecurityError']) {
    const result = await scenario({picker});
    assert.equal(result.written.length, 0);
    assert.ok(!result.events.includes('download'));
  }
  const failure = await scenario({writeFailure: true});
  assert.equal(failure.written.length, 1);
  assert.ok(failure.alerts[0].includes('1 von 5'));
  assert.ok(!failure.events.includes('download'));
  assert.ok(!failure.events.includes('archive'));
  assert.ok(!failure.events.some(e => Array.isArray(e) && e[0] === 'saved'));
  const declined = await scenario({picker: 'unsupported'});
  assert.ok(!declined.events.includes('download'));
  const downloads = await scenario({picker: 'unsupported', downloadApproval: true});
  assert.equal(downloads.events.filter(e => e === 'download').length, 5);

  let checked = 0;
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (/\bsrc\s*=|text\/babel/i.test(match[1])) continue;
    new vm.Script(match[2]); checked++;
  }
  console.log(`Export-Prüfungen bestanden; ${checked} JavaScript-Blöcke syntaktisch geprüft.`);
})().catch(error => {console.error(error); process.exitCode = 1;});
