// Feldbögen (4.25.0, PN 98 ab 4.27.0): Blattzahl, Formular-ID, Vorbelegung, Escaping und Leerformular – ohne Browser.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('const FB_CSS=`'), end = html.indexOf('/** Zahlenangabe aus ISO');
assert.ok(start > 0 && end > start, 'Feldbogen-Code gefunden');
const context = {};
vm.runInNewContext(html.slice(start, end) + '\nthis.api={fbSeiten,fbBlattzahl,fbFormularId,FB_TYPEN};', context);
const {fbSeiten, fbBlattzahl, fbFormularId} = context.api;
const base = {n: 3, lfd: '1', nr: '26.0142', datum: '21.10.2026', objekt: 'EFH, Musterweg 7', auftraggeber: 'Beispiel Versicherung AG', leer: false, logo: 'data:image/png;base64,AAAA'};

// Blattzahl: Asbest = Blatt 1 mit MP 1 + je zwei MP; Schimmel = Blatt 1 ohne MP + je zwei Messstellen.
for (const [n, as, sp] of [[1, 1, 2], [2, 2, 2], [3, 2, 3], [4, 3, 3], [5, 3, 4], [40, 21, 21]]) {
  assert.equal(fbBlattzahl('asbest', n), as, `Asbest n=${n}`);
  assert.equal(fbBlattzahl('schimmel', n), sp, `Schimmel n=${n}`);
  assert.equal(fbSeiten({...base, typ: 'asbest', n}).length, as);
  assert.equal(fbSeiten({...base, typ: 'schimmel', n}).length, sp);
}
assert.equal(fbBlattzahl('asbest', 0), 1, 'mindestens ein Messpunkt');
assert.equal(fbBlattzahl('asbest', 999), 21, 'höchstens 40 Messpunkte');

// Formular-ID und „Blatt x von n“ auf jedem Blatt, Messpunkte durchnummeriert.
assert.equal(fbFormularId('asbest', '26.0142', '1'), '26.0142-AS-01');
assert.equal(fbFormularId('schimmel', '', ''), '____-SP-__');
const as = fbSeiten({...base, typ: 'asbest', n: 5});
as.forEach((seite, i) => { assert.match(seite, /26\.0142-AS-01/); assert.match(seite, new RegExp(`Blatt ${i + 1} von 3`)); });
const mps = as.join('').match(/MP-Nr\.<\/span><span class="fb-pre">(\d+)</g).map(m => m.match(/(\d+)<$/)[1]);
assert.deepEqual(mps, ['1', '2', '3', '4', '5']);

// Projektdaten vorgedruckt; Auftraggeber nur beim Asbest-Formular.
assert.match(as[0], /EFH, Musterweg 7/);
assert.match(as[0], /Beispiel Versicherung AG/);
assert.doesNotMatch(fbSeiten({...base, typ: 'schimmel'}).join(''), /Beispiel Versicherung AG/);

// Eingaben werden maskiert, nicht als HTML übernommen.
const boese = fbSeiten({...base, typ: 'asbest', objekt: '<img src=x onerror=alert(1)>', nr: '"><u>X'}).join('');
assert.doesNotMatch(boese, /<img src=x/);
assert.match(boese, /&lt;img src=x onerror=alert\(1\)&gt;/);
assert.doesNotMatch(boese, /<u>X/);
assert.match(boese, /&quot;&gt;&lt;u&gt;X/);

// Leerformular: keine Projektdaten, Platzhalter-ID.
const leer = fbSeiten({...base, typ: 'asbest', leer: true}).join('');
assert.doesNotMatch(leer, /Musterweg|26\.0142|Versicherung/);
assert.match(leer, /____-AS-__/);

// Logo im Kopf und als Wasserzeichen; ohne Logo kein leeres Bild.
assert.equal((as[0].match(/data:image\/png;base64,AAAA/g) || []).length, 2);
assert.doesNotMatch(fbSeiten({...base, typ: 'asbest', logo: ''}).join(''), /<img/);
// PN 98 (4.27.0): Blatt 1 mit Probe 1, Folgeblätter mit je drei Proben; Labor vorgedruckt, Auftraggeber auch.
for (const [n, pn] of [[1, 1], [2, 2], [4, 2], [5, 3], [7, 3], [8, 4], [40, 14]]) {
  assert.equal(fbBlattzahl('pn98', n), pn, `PN 98 n=${n}`);
  assert.equal(fbSeiten({...base, typ: 'pn98', n}).length, pn);
}
const pn = fbSeiten({...base, typ: 'pn98', n: 5, labor: 'Labor <X>'});
assert.equal(fbFormularId('pn98', '26.0142', '2'), '26.0142-PN-02');
pn.forEach((seite, i) => { assert.match(seite, /26\.0142-PN-01/); assert.match(seite, new RegExp(`Blatt ${i + 1} von 3`)); });
assert.deepEqual(pn.join('').match(/<b>Probe (\d+)<\/b>/g).map(m => m.match(/\d+/)[0]), ['1', '2', '3', '4', '5']);
assert.match(pn[0], /Beispiel Versicherung AG/);
assert.match(pn[0], /Labor &lt;X&gt;/);
assert.match(pn[0], /LAGA PN 98/);
assert.match(pn[0], /Anwesende \/ Zeugen/, 'Unterschrift Anwesende/Zeugen wie Anhang C');
assert.match(pn[0], /mind\. 4/);
assert.doesNotMatch(fbSeiten({...base, typ: 'pn98', leer: true, labor: 'Labor X'}).join(''), /Labor X|26\.0142/);

console.log('feldboegen: OK');

// Materialprobe Asbest: Blatt 1 mit zwei Proben, Folgeblätter mit je vier
assert.equal(fbBlattzahl('asbestmat', 1), 1);
assert.equal(fbBlattzahl('asbestmat', 2), 1);
assert.equal(fbBlattzahl('asbestmat', 3), 2);
assert.equal(fbBlattzahl('asbestmat', 6), 2);
assert.equal(fbBlattzahl('asbestmat', 7), 3);
assert.equal(fbFormularId('asbestmat', '26.0142', '1'), '26.0142-AM-01');
{
  const am = fbSeiten({...base, typ: 'asbestmat', n: 7});
  assert.equal(am.length, 3);
  assert.equal((am.join('').match(/<b>Probe \d+<\/b>/g) || []).length, 7, 'jede Probe genau einmal');
  assert.match(am[0], /Materialprobe Asbest/);
}
console.log('Materialprobe Asbest: ok');
