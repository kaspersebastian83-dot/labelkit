// Hilfe-Knöpfe ins Handbuch: jeder Link ../aidkit/#… zeigt auf eine feste Kapiteladresse aus AidKit (hilfe-anker.json),
// öffnet im gemeinsamen Fenster „aidkit“ und erscheint an den vorgesehenen Stellen. Liegt AidKit daneben, wird dessen Liste gelesen.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const FEST = ['start', 'brandschaden', 'bohrkern-ablauf', 'app-projektzentrale', 'app-labelkit', 'app-fotokit', 'app-plankit', 'app-belegkit', 'app-spesenkit', 'app-datenarchiv', 'bohrkern', 'wischprobe', 'raumkuerzel'];
const neben = path.join(__dirname, '..', '..', 'aidkit', 'hilfe-anker.json');
const anker = fs.existsSync(neben) ? Object.keys(JSON.parse(fs.readFileSync(neben, 'utf8')).anker) : FEST;
if (fs.existsSync(neben)) assert.deepEqual([...anker].sort(), [...FEST].sort(), 'Liste hier = hilfe-anker.json in AidKit');
const links = [...html.matchAll(/<a\b[^>]*href=\\?"\.\.\/aidkit\/#([^"\\]+)\\?"[^>]*>/g)];
assert.ok(links.length >= 5, 'Hilfe-Links vorhanden');
for (const [tag, id] of links){
  assert.ok(anker.includes(id), `#${id} ist keine feste Handbuch-Adresse`);
  assert.match(tag, /target=\\?"aidkit\\?"/, `#${id}: öffnet im Fenster „aidkit“`);
  assert.match(tag, /rel=\\?"noopener\\?"/, `#${id}: rel="noopener"`);
}
const zaehl = id => links.filter(l => l[1] === id).length;
assert.equal(zaehl('app-labelkit'), 1, 'Kopfzeile: LabelKit Schritt für Schritt');
assert.equal(zaehl('wischprobe'), 2, 'PAK und Chlorid: Probenbezeichnung Wischproben');
assert.equal(zaehl('bohrkern'), 2, 'Sonstige und Reiter Bohrkerne: Probenbezeichnung Bohrkerne');
assert.equal(zaehl('bohrkern-ablauf'), 1, 'Reiter Bohrkerne: Schritt für Schritt');
// an der richtigen Stelle: Wischproben-Link in den Reitern PAK und Chlorid, Bohrkern-Link in Sonstige
const reiter = id => { const a = html.indexOf(`<div id="${id}" class="tab-content`), b = html.indexOf('<div id="tab-', a + 10); return html.slice(a, b); };
assert.match(reiter('tab-eingabe'), /#wischprobe/); assert.match(reiter('tab-chlorid'), /#wischprobe/); assert.match(reiter('tab-sonstige'), /#bohrkern"/);
assert.doesNotMatch(reiter('tab-asbest'), /\.\.\/aidkit\/#/, 'Asbest: kein Handbuch-Kapitel');
console.log(`OK Hilfe-Links: ${links.length} Links auf feste Handbuch-Adressen${fs.existsSync(neben) ? ' (mit AidKit-Liste geprüft)' : ''}`);
