// Hilfen für die Browsertests der einfachen Oberfläche (LabelKit 5.0): Probenart (Kachel), Schritt, „Mehr …“.
// Leitfaden alt → neu:
//   #main-<art>.click()            → art(page, '<art>')          (Kachel; Sonstige/Bohrkerne/PN 98/Feldbögen ggf. über „+ Weitere Art …“)
//   Unter-Reiter „Etiketten“         → schritt(page, 2)            (alle Arten untereinander)
//   Unter-Reiter „Übergabe“/Abschluss → schritt(page, 3)
//   #proj-nr füllen                  → projNr(page, '26.0142')      (Dialog „Projektnummer und Startnummer“ unter „Mehr …“)
//   „Geführte Eingabe“, „Laden“, …   → mehr(page, 'lk-m-gefuehrt') (Einträge mit fester id, siehe mehrOeffnen in index.html)
//   #projekt-ordner, #pj-refresh     → versteckt(page, '#projekt-ordner') (Knöpfe liegen im unsichtbaren alten Kopf; „Mehr …“ löst sie aus)
//   Feldbögen ② erfassen            → art(page, 'feldboegen') + fbErfassen(page)
'use strict';

async function art(page, k) {
  let kachel = page.locator(`.lk-kachel[data-art="${k}"]`);
  if (!(await kachel.count())) await page.locator('.lk-kachel[data-weitere]').click();
  kachel = page.locator(`.lk-kachel[data-art="${k}"]`);
  if ((await kachel.getAttribute('aria-pressed')) !== 'true') await kachel.click();
  await page.waitForFunction(k => document.body.dataset.lkSchritt === '1' && document.querySelector(`.lk-kachel[data-art="${k}"]`)?.getAttribute('aria-pressed') === 'true', k);
}

async function schritt(page, n) {
  await page.locator(`.lk-schritt[data-schritt="${n}"]`).click();
  await page.waitForFunction(n => document.body.dataset.lkSchritt === String(n), n);
}

async function mehr(page, id) {
  await page.locator('#lk-mehr').click();
  await page.locator('#mosaikMehrPop #' + id).click();
}

async function projNr(page, nr) {
  await mehr(page, 'lk-m-projnr');
  const feld = page.locator('#proj-nr');
  await feld.fill(nr);
  await feld.dispatchEvent('change');
  await page.locator('#lk-dlg-projekt [data-zu]').click();
  await page.waitForFunction(() => document.getElementById('lk-projnr-fehlt').hidden === !!document.getElementById('proj-nr').value.trim());   // neu gezeichnet
}

async function versteckt(page, sel) {
  await page.evaluate(sel => document.querySelector(sel).click(), sel);
}

async function fbErfassen(page) {
  await page.locator('#lk-fb-umschalter [data-fb="feldboegen-erfassen"]').click();
  await page.waitForFunction(() => document.getElementById('tab-feldboegen-erfassen').classList.contains('active'));
}

async function fbDrucken(page) {
  await page.locator('#lk-fb-umschalter [data-fb="feldboegen"]').click();
  await page.waitForFunction(() => document.getElementById('tab-feldboegen').classList.contains('active'));
}

module.exports = { art, schritt, mehr, projNr, versteckt, fbErfassen, fbDrucken };
