const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.slice(html.indexOf('let browserHinweisGezeigt=false;'), html.indexOf('function schließeWillkommen(){'));

function scenario({supported = false, url = 'file:///C:/LabelKit.html', ua = 'Windows Firefox/143.0'} = {}) {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      style: {}, classList: {add() {}}, removeAttribute(key) {delete this[key];},
      addEventListener() {}, showModal() {this.open = true;}, close() {this.open = false;},
      focus() {this.focused = true;}
    });
    return elements.get(id);
  }
  const context = {
    window: {location: new URL(url)}, navigator: {userAgent: ua},
    document: {getElementById: element}, localStorage: {getItem: () => '1'}
  };
  if (supported) context.window.showDirectoryPicker = () => {};
  vm.createContext(context);
  vm.runInContext(code, context);
  context.zeigWillkommen();
  return {context, element, elements};
}

const firefox = scenario();
assert.equal(firefox.element('modal-browser-hinweis').open, true);
assert.ok(firefox.element('browser-hinweis-titel').textContent.includes('Firefox'));
assert.equal(firefox.element('browser-hinweis-edge').style.display, 'none');
assert.ok(firefox.element('browser-hinweis-anleitung').textContent.includes('HTML-Datei'));
assert.equal(firefox.element('browser-hinweis-weiter').focused, true);
firefox.context.schliesseBrowserHinweis();
assert.equal(firefox.element('modal-browser-hinweis').open, false);
firefox.context.zeigWillkommen();
assert.equal(firefox.element('modal-browser-hinweis').open, false);

const hosted = scenario({url: 'https://example.com/labelkit/'});
assert.equal(hosted.element('browser-hinweis-edge').href, 'microsoft-edge:https://example.com/labelkit/');
assert.equal(hosted.element('browser-hinweis-edge').style.display, '');
const linux = scenario({url: 'https://example.com/', ua: 'Linux Firefox/143.0'});
assert.equal(linux.element('browser-hinweis-edge').style.display, 'none');
const supported = scenario({supported: true, ua: 'Windows Chrome/143.0'});
assert.equal(supported.elements.size, 0);

// Die öffentliche Startdatei darf keine fehlende Panel-Datei mehr benötigen.
assert.ok(!html.includes('src="tweaks-panel.jsx"'));
assert.ok(!html.includes('unpkg.com/'));
const panelScript = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
const controls = {
  'appearance-color': {value: '#2f6fbf'},
  'appearance-density': {value: 'standard'}
};
for (const control of Object.values(controls)) {
  control.addEventListener = (name, callback) => {control[name] = callback;};
}
const properties = {}, dataset = {};
vm.runInNewContext(panelScript, {document: {
  getElementById: id => controls[id], body: {dataset},
  documentElement: {style: {setProperty: (name, value) => {properties[name] = value;}}}
}});
assert.equal(properties['--accent'], '#2f6fbf');
assert.equal(properties['--gf'], undefined, 'kein Glas-Frost mehr (Liquid Glass entfernt)');
controls['appearance-color'].value = '#3d7a4e';
controls['appearance-color'].change();
assert.equal(properties['--accent'], '#3d7a4e');
controls['appearance-density'].value = 'kompakt';
controls['appearance-density'].change();
assert.equal(dataset.density, 'kompakt');
controls['appearance-density'].value = 'standard';
controls['appearance-density'].change();
assert.equal(dataset.density, undefined);
for (const gone of ['lg-toggle', 'pak_liquid_glass', 'cf-canvas', 'body.lg', 'appearance-frost', 'lgMovePill', 'snd-toggle', 'AudioContext', 'pak_sound_muted']) assert.ok(!html.includes(gone), gone + ' ist entfernt');
console.log('Browser-Hinweis geprüft: Firefox, lokale Datei, Webadresse, Windows und unterstützte Browser.');
console.log('Erscheinungsbild geprüft: Akzentfarbe und Dichte ohne externe Panel-Abhängigkeiten.');
