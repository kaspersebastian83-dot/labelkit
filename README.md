# LabelKit

Deutschsprachige Browser-App für Probenerfassung, Etiketten und Laborübergaben – Schritt ① der Büro-App-Suite **Spektron** (Projektzentrale, LabelKit, FotoKit, PlanKit, BelegKit, SpesenKit; Übersicht im [README der Projektzentrale](https://github.com/kaspersebastian83-dot/Projektzentrale#readme)).

**App öffnen:** https://kaspersebastian83-dot.github.io/labelkit/ · aktuelle Version **4.50.0** (Änderungen in `CHANGELOG.md`)

## Neu in 4.37.0 · 24.10.2026

PN 98 einmal erfassen statt dreimal: Im Reiter PN 98 legt **„→ Laborproben anlegen“** aus den Protokollen die Proben für Etikett und Laborauftrag an (Matrix und Untersuchung einmal wählen). Ein ausgefüllter **PN 98-Feldbogen** wird mit „Als PN 98-Protokolle übernehmen“ zu Protokollen im Reiter PN 98 – das Word-Protokoll entsteht ohne Abtippen.

## Neu in 4.36.0 · 24.10.2026

Reiter **Textbausteine** entfernt (nie fertig entwickelt). „Alle EOL + Projektdatei speichern“ fragt keine Textbaustein-Freigabe mehr ab und legt keine Datei „…_Probenahmetexte_….docx“ mehr an; sonst speichert es dieselben Dateien wie bisher. Die vier früheren Angaben (Prüfberichtsnummer, Labor, zwei Häkchen) bleiben in der Projektdatei erhalten und werden unverändert zurückgeschrieben. Titel und Versionsknopf zeigen die Version jetzt automatisch.

## Neu in 4.35.0 · 24.10.2026

- **Wandblatt Bohrkerne** (Reiter „Feldbögen“): Blatt 1 mit Untersuchung, Tiefenstufen und Begehung, danach ein Blatt je Wand. Vor Ort ergibt sich die Probenbezeichnung von selbst: Wandkennung + vorgedruckte Endung + Tiefe, z. B. `EG-WZ-B-7-T2` (Regeln: AidKit). Am Schreibtisch übertragen, dann „Proben anlegen“ – alle Segmente stehen im Reiter „Sonstige“, mit Bezeichnung auf Etikett und Laborübergabe. Neuer Reiter **Bohrkerne** führt Wandblätter, Übertragung, Übersicht je Wand, Schnittpläne (je Kern, mit „analysieren“ / „nur sägen und aufbewahren“), Etiketten und Übergabe zusammen.

## Neu in 4.34.0 · 24.10.2026

„Raum / Ort“ schlägt zuerst die Räume des Projekts vor, in der Schreibweise der bisherigen Proben – damit gleiche Räume gleich heißen (Raumbuch in PlanKit). Gemerkt wird ein Raum erst beim Verlassen des Feldes.

## Neu in 4.33.0 · 23.10.2026

Asbestproben sind jetzt auf Materialproben nach Brand zugeschnitten: Bauteil / Material, Bindung und Zustand (mit Vorschlägen) statt der PAK-Spalten, keine Asbest-Wischprobe mehr, Raumluft mit VDI 3492. Neuer Feldbogen „Materialprobe Asbest“ zum Ausfüllen vor Ort mit derselben Erfassung und Scan-Ablage wie die anderen Bögen.

## Funktionen

- PAK- und Chlorid-Wischproben, Asbestproben und sonstige Proben erfassen
- Etiketten und Laborübergaben erstellen
- Brandgeruch-Bewertungen erfassen
- PN-98-Probenahmeprotokolle erstellen
- Feldbögen für Raumluftmessungen (Asbest/KMF, Schimmelpilze), Materialproben Asbest und Probenahmen nach PN 98 zum Ausdrucken und Ausfüllen von Hand, mit Projektdaten vorgedruckt (ab 4.25)
- Ausgefüllte Feldbögen am Schreibtisch erfassen, Scans mit Prüfsumme im Projektordner unter „Feldprotokolle“ ablegen, Prüfung der Übertragung durch eine zweite Person und Änderungsprotokoll (ab 4.26)
- Feldbogen Probenahme Feststoffe nach LAGA PN 98 zum Ausfüllen vor Ort, mit derselben Erfassung und Scan-Ablage (ab 4.27)
- Projektdaten als JSON speichern und wieder importieren
- Gemeinsamer Export der Laborübergaben und der Projektdatei
- Projektdaten aus der Projektzentrale (`_Projekt.json`: Objekt, Auftraggeber, Schaden-Nr.) im Schritt „Projektnummer“ anzeigen; das Objekt steht auch auf dem Auftragsschein (ab 4.28)
- „Ihr Kürzel“ gemeinsam mit BelegKit: einmal eintragen, gilt in beiden Apps (ab 4.27.2)
- Schmale Leiste oben wie in FotoKit, ResultKit, PlanKit und BelegKit: Projekt mit Wechsel zu den zuletzt geöffneten, die fünf Arbeitsschritte (ResultKit ab 4.42) mit Haken und „Weiter: …“ zum nächsten offenen Schritt (ab 4.29)
- Immer im klassischen Design – ohne „Liquid Glass“, Konfetti und Töne (ab 4.30)

## Starten

Im Büro die Adresse oben in Microsoft Edge oder Google Chrome öffnen – am einfachsten aus der Projektzentrale über „Proben erfassen → LabelKit“. Es ist keine Installation und kein eigener Server erforderlich.

Alternativ läuft die App auch als einzelne Datei: Repository herunterladen und `index.html` in Edge oder Chrome öffnen. Für die Ordnerauswahl wird ein unterstützter Browser benötigt; bei einer Bereitstellung als Website HTTPS verwenden.

## Projektordner (ab 4.24)

In der **Projektzentrale** ein Projekt wählen und **„Proben erfassen → LabelKit“** klicken – oder in LabelKit oben **„📁 Projekt“** und den Projektordner (z. B. `26.0123 Köln`) wählen. Danach:

- Jeder Ordnerdialog entfällt: Speichern (auch Strg+S), Laborübergaben und Protokolle landen direkt im Unterordner **„Laboraufträge“** des Projekts.
- Die Projektdatei `<Nr>_Daten.json` (ab 4.50.0 ohne Datum, siehe unten) wird beim Öffnen automatisch geladen – liegt keine feste Datei da, wie bisher die neueste `…_Daten.json`.
- Projektnummer (z. B. `26.0123`) und Schadenort kommen aus dem Ordnernamen; die Kennung steht oben in der Kopfzeile.
- Der Archivordner wird aus dem gemeinsamen Browser-Speicher der Projektzentrale übernommen (IndexedDB `mosaik-suite`, Schlüssel `archiv`). Nach einem Browserneustart genügt „Zugriff erlauben und öffnen“.
- „← Projektzentrale“ führt zurück zur Projektübersicht.

## PAK-Proben vorbelegen (ab 4.30.7)

- **Neue Proben hinzufügen** legt ausschließlich die angegebene Anzahl neuer PAK-Wischproben mit Projektnummer, Datum und Fläche aus der Vorbelegung an. Bestehende Angaben werden nicht verändert. Ohne Fläche gilt für neue Wischproben wie bisher 600 cm².
- **Leere Angaben ergänzen** ergänzt nur fehlende Projektnummern, Datumsangaben und Flächen vorhandener PAK-Proben (Fläche nur bei Wischproben). Es entstehen keine neuen Proben.
- **Bestehende Angaben ändern …** zeigt zuerst je Feld die betroffenen PAK-Probennummern, den neuen Wert und die Anzahl der Überschreibungen. Leere Angaben bleiben dabei leer. Erst **Genannte Angaben jetzt ändern** führt die Sammeländerung aus. Häkchen in der Probenliste schränken diese Aktion nicht ein.

Leere Vorbelegungsfelder lassen bestehende Angaben unverändert. Eine ausgefüllte ungültige Datums- oder Flächenangabe wird vor der Aktion zurückgewiesen; neue Proben erfordern eine ganze Anzahl von 1 bis 96. Abbrechen, Escape und Enter auf der vorausgewählten Abbrechen-Schaltfläche verändern weder Daten noch Rückgängig-Historie oder Speicherstatus. Jede tatsächliche Aktion lässt sich mit Strg/⌘+Z in einem Schritt rückgängig machen. Andere Probenarten bleiben erhalten; beim Hinzufügen verschieben sich ihre fortlaufenden Nummern nach der bestehenden gemeinsamen Nummerierung.

## Geführte Eingabe und PAK-Karten (ab 4.30.9)

**Geführte Eingabe** (bisher „Schnelleingabe“) führt mit denselben Feldern Probe für Probe durch die vorhandene PAK-Liste. Starten über die Schaltfläche oder **Strg+Umschalt+E**; ohne PAK-Proben wird wie bisher eine Probe angelegt. **Weiter** bzw. Enter und **Zurück** übernehmen die Felder der aktuellen Probe. **Beenden** und Escape schließen wie bisher ohne zusätzliche Übernahme der noch nicht mit Weiter/Zurück bestätigten Felder.

In der **Kartenansicht** öffnet **Bearbeiten** das vorhandene Seitenpanel für genau diese Probe. Die Schaltfläche ist per Tab erreichbar und mit Enter oder Leertaste bedienbar. Doppelklick auf Karte bzw. Tabellenzeile bleibt möglich. Der Panelkopf zeigt die bestehende fortlaufende Probennummer sowie Raum/Ort und Matrix, sofern vorhanden. Die Nummer entspricht auch nach Hinzufügen, Entfernen, Startnummeränderung und Ansichtswechsel der Karte und Tabelle.

Das Panel übernimmt Feldeingaben weiterhin direkt; **Speichern & Schließen** bestätigt sie und schließt das Panel. Die Projektdatei wird anschließend über **Zwischenstand speichern** gesichert. Das bloße Öffnen legt keine Probe an und verändert weder Daten noch Speicherstatus oder Rückgängig-Historie. Das bestehende Schließverhalten bleibt erhalten: Beim Schließen werden Felder übernommen und der Stand als ungespeichert markiert, auch ohne bewusste Änderung. Einzelne Feldänderungen in Eingabe und Panel erzeugen wie bisher keinen eigenen Rückgängig-Schritt; bestehende Rückgängig-Aktionen wie Hinzufügen, Entfernen oder Startnummeränderung bleiben erhalten.

## Projektdatei und Sicherungen (ab 4.50.0)

- Eine feste Datei `<Nr>_Daten.json` am Ort aus `spektron-ordner.js` (`_Spektron/LabelKit` oder `Laboraufträge`). Beim Öffnen merkt sich LabelKit ihren Inhalt und den der noch liegenden datierten Dateien; beim Speichern wird dagegen geprüft, auch an einem späteren Tag – geändert → Rückfrage.
- Sicherungen in `_LabelKit_Sicherungen` daneben: `<Nr>_<JJJJ-MM-TT>_Sicherung.json` (letzter Stand je Arbeitstag) und `<Nr>_<JJJJ-MM-TT_HHMM>_Sicherung.json` (ersetzter fremder Stand). Neueste 30 bleiben. Endet nicht auf `_Daten.json` – keine andere App sieht sie.
- Übergang: Datierte `<Nr>_<TT.MM.JJJJ>_Daten.json` desselben Projekts werden beim ersten Speichern geprüft in die Sicherungen verschoben (kopieren, zurücklesen, Original nur löschen, wenn unverändert).
- Nach „Archiv“ oder „JSON laden“: „Geladen – noch nicht im Projektordner“, Warnung beim Schließen bis zum Speichern.

## Feste Probennummern und Storno (ab 4.49.0)

- Eine Probennummer wird fest (🔒), sobald die Probe auf Etiketten, im Etiketten-PDF oder in einer Laborübergabe erscheint (Excel, Kopieren, Übergabe drucken, Abschluss). Feste Nummern ändern sich nie mehr; neue Proben bekommen die nächste freie Nummer.
- ✕ an einer festen Probe storniert sie: Nummer bleibt vergeben, Probe bleibt durchgestrichen sichtbar, fehlt aber auf Etiketten, in Übergaben und Zählungen. „Storno aufheben“ holt sie zurück.
- In der Projektdatei: `nrFest: {am, anlass}` und `storniert: {am, kuerzel, grund}` je Probe, oben `nrSchutz: 1`. Ältere Dateien gelten beim Öffnen als fest, wenn in „Laboraufträge“ schon eine Laborübergabe liegt (im Zweifel fest).

## Zwischenstand speichern (ab 4.30.8)

Oben steht in jedem Reiter **Zwischenstand speichern**. Die Schaltfläche und **Strg/⌘+S** verwenden denselben Speicherweg und speichern ausschließlich die JSON-Projektdatei – auch wenn Pflichtangaben fehlen. Es entstehen keine Laboraufträge, Druckdokumente oder Textbausteine.

- Mit geöffnetem Projekt wird wie bisher in **Laboraufträge** gespeichert. Sonst wird ein Speicherordner gewählt und für weitere Speicherungen wiederverwendet.
- Ohne Ordnerzugriff startet ausschließlich der bestehende JSON-Download. Bitte den Download prüfen; der Browser kann dessen erfolgreiche Ablage nicht bestätigen. Ungespeicherte Änderungen bleiben entsprechend gekennzeichnet.
- Der Status neben der Schaltfläche zeigt ungespeicherte Änderungen, laufendes Speichern, Erfolg, Abbruch oder Fehler. Erfolg wird erst nach abgeschlossenem Schreiben angezeigt. Änderungen während des Schreibens bleiben ungespeichert; gleichzeitige weitere Aufrufe werden abgefangen.
- Zwischenstand und Abschluss teilen sich die Speichersperre. Während einer Speicherung bitte deren Ende abwarten und danach erneut speichern. Ein älterer Vorgang kann dadurch keinen neueren gespeicherten Stand überschreiben. Nach Änderungen oder Projekt-/Zielordnerwechseln bestätigt er den aktuellen Stand nicht als gespeichert.
- Zum Weiterarbeiten die JSON-Datei über **Laden** importieren oder das Projekt öffnen (lädt die neueste Projektdatei).

## Probenerfassung abschließen und Laborunterlagen speichern

Zwischenspeichern ist keine Freigabe für Laborunterlagen. Der Abschluss prüft weiterhin unter anderem Projektnummer, Datum, Raum/Ort und Probennummern. Der bestehende ausdrücklich bestätigte Ausnahmeweg bleibt erhalten.

1. Proben erfassen und unter **Probenerfassung abschließen** die Vollständigkeit prüfen.
2. **Alle EOL + Projektdatei speichern** anklicken.
3. Den Projektordner auswählen. Die passenden Laborübergaben, zusätzliche Protokolle und die JSON-Projektdatei werden gemeinsam gespeichert.
4. Zum Weiterarbeiten die JSON-Projektdatei über den Projektimport laden.

Die Ordnerauswahl kann abgebrochen werden. Bei einem Fehler startet der Sammel-Export keine automatischen Downloads. Bereits vollständig gespeicherte Dateien werden in der Fehlermeldung gezählt.

## Firefox und Browserwechsel

Firefox unterstützt die direkte Speicherordner-Auswahl nicht. Ein Hinweisfenster erklärt dies beim Start und empfiehlt Chrome oder Edge. Exporte als Downloads und der Import von Projektdateien bleiben möglich.

Bei einer lokalen HTML-Datei hilft **Adresse kopieren** beim Wechsel. Für eine Webadresse unter Windows wird außerdem **In Edge öffnen** angeboten; das Betriebssystem kann eine Bestätigung verlangen.

Projektdaten und Browser-Speicher werden beim Browserwechsel nicht automatisch übertragen. Vorher die JSON-Projektdatei speichern und im anderen Browser importieren.

## Daten und Internetverbindung

Die App verarbeitet die Probendaten im Browser. Einige Einstellungen, Vorlagen und ein Projektarchiv liegen im lokalen Browser-Speicher. Eine gespeicherte JSON-Projektdatei dient zur Übertragung und Sicherung.

Die Schriftarten (IBM Plex, DM Sans/Mono) sind in `index.html` eingebettet; die App lädt nichts von fremden Servern (Content Security Policy mit `connect-src 'self'`) und funktioniert auch ohne Internet mit gleichem Druckbild. Das Erscheinungsbild-Panel funktioniert ohne React, Babel oder zusätzliche lokale Dateien.

Keine echten Projektdaten, Laboraufträge oder Exporte in das öffentliche Repository hochladen. Die `.gitignore` schließt typische Daten- und Exportdateien aus. Diese Regeln schützen nicht vor einem manuellen Upload über die GitHub-Webseite.

## Entwicklung und Prüfungen

Die App steht in `index.html` (`APP_VERSION`, derzeit 4.50.0). Ausgangsversion dieses Repositorys war 4.23.5; alle Änderungen seitdem stehen in `CHANGELOG.md`.

Mit Node.js aus dem Repository-Ordner ausführen:

```sh
node tests/export-flow.cjs
node tests/browser-hint.cjs
node tests/feldboegen.cjs
node tests/feldprotokolle.cjs
node tests/kuerzel.cjs
node tests/pak-reset.cjs
node tests/pak-vorbelegung.cjs
```

Zusätzlich gibt es Browsertests für die Feldbögen (Vorschau, Blattüberlauf, Druckfenster mit Schrift und Logo), für die Anzeige der Projektdaten (`tests/projektdaten-browser.cjs`), für die Leiste mit Projekt und Arbeitsschritten (`tests/leiste-browser.cjs`) und für die Erfassung mit Scan-Ablage (in Chromium mit nachgebildetem Projektordner, in WebKit nur die Erfassung). Er braucht Playwright, das nicht im Repository geführt wird:

```sh
npm install --no-save playwright && npx playwright install chromium webkit
node tests/feldboegen-browser.cjs chromium
node tests/feldboegen-browser.cjs webkit
node tests/feldprotokolle-browser.cjs chromium
node tests/feldprotokolle-browser.cjs webkit
node tests/projektdaten-browser.cjs chromium
node tests/leiste-browser.cjs chromium
node tests/pak-reset-browser.cjs chromium
node tests/pak-reset-browser.cjs webkit
node tests/pak-vorbelegung-browser.cjs chromium
node tests/pak-vorbelegung-browser.cjs webkit
node tests/zwischenstand-browser.cjs chromium
node tests/zwischenstand-browser.cjs webkit
node tests/speicher-races-browser.cjs chromium
node tests/speicher-races-browser.cjs webkit
node tests/gefuehrte-eingabe-browser.cjs chromium
node tests/gefuehrte-eingabe-browser.cjs webkit
node tests/raumorte-browser.cjs chromium
```

GitHub führt alle Prüfungen bei jedem Pull Request automatisch aus (`.github/workflows/tests.yml`, Chromium; die WebKit-Aufrufe oben sind lokal optional). Es gibt nur diesen einen Test-Workflow; zusätzliche Kompatibilitäts- und Integrations-Workflows wurden am 23.10.2026 entfernt.

Die Prüfungen decken den Sammel-Export mit simulierten Browser-Schnittstellen, Abbruch, Schreibfehler und Browserhinweise sowie die Feldbögen (Blattzahl, Formular-ID, Vorbelegung, Maskierung von Eingaben, Leerformular) und die Erfassung (Änderungsprotokoll, Prüfung, Plausibilitätshinweise, Scan-Dateinamen, Prüfsummen) ab. Die Prüfungen für geführte Eingabe und PAK-Karten verwenden ausschließlich synthetische Daten und prüfen Tastatur, eindeutige Probenauswahl, Datenerhalt, JSON-Speichern/Laden, bestehendes Undo und die Darstellung bei 1280 und 390 px. Optional schreibt `SCREENSHOT_DIR` Bildschirmfotos außerhalb des Repositorys. Echte Ordnerdialoge, Druckausgaben und die Darstellung in Office müssen zusätzlich praktisch geprüft werden.

## Firmenspezifische Inhalte und Lizenz

Die aktuelle App enthält Firmierung, Adresse und ein eingebettetes Bild der bisherigen Fassung. Vor der öffentlichen Bereitstellung müssen diese Inhalte für die Veröffentlichung freigegeben oder angepasst werden.

Es wurde bisher keine Open-Source-Lizenz festgelegt. Eine Lizenzdatei kann nach Entscheidung des Rechteinhabers ergänzt werden.
