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
// Panel „Erscheinungsbild“ (Akzentfarbe, Dichte) ist mit der einfachen Oberfläche (5.0) entfallen – Farben kommen aus dem Spektron-Look.
assert.ok(!html.includes('appearance-panel') && !html.includes('appearance-color') && !html.includes('appearance-density'), 'Erscheinungsbild-Panel entfernt');
assert.match(html, /--sp-app:#5469b8; --sp-app-dunkel:#5469b8/, 'Leistenfarbe LabelKit nach dem Spektron-Look');
for (const gone of ['lg-toggle', 'pak_liquid_glass', 'cf-canvas', 'body.lg', 'appearance-frost', 'lgMovePill', 'snd-toggle', 'AudioContext', 'pak_sound_muted']) assert.ok(!html.includes(gone), gone + ' ist entfernt');
console.log('Browser-Hinweis geprüft: Firefox, lokale Datei, Webadresse, Windows und unterstützte Browser.');
console.log('Erscheinungsbild: Spektron-Look mit Leistenfarbe, kein eigenes Panel mehr.');
