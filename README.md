# LabelKit

Deutschsprachige Browser-App für Probenerfassung, Etiketten und Laborübergaben – Schritt ① der Büro-App-Suite **Spektron** (Projektzentrale, LabelKit, FotoKit, PlanKit, BelegKit, SpesenKit; Übersicht im [README der Projektzentrale](https://github.com/kaspersebastian83-dot/Projektzentrale#readme)).

**App öffnen:** https://kaspersebastian83-dot.github.io/labelkit/ · aktuelle Version **4.30.8** (Änderungen in `CHANGELOG.md`)

## Funktionen

- PAK- und Chlorid-Wischproben, Asbestproben und sonstige Proben erfassen
- Etiketten und Laborübergaben erstellen
- Brandgeruch-Bewertungen erfassen
- PN-98-Probenahmeprotokolle und Textbausteine erstellen
- Feldbögen für Raumluftmessungen (Asbest/KMF, Schimmelpilze) und Probenahmen nach PN 98 zum Ausdrucken und Ausfüllen von Hand, mit Projektdaten vorgedruckt (ab 4.25)
- Ausgefüllte Feldbögen am Schreibtisch erfassen, Scans mit Prüfsumme im Projektordner unter „Feldprotokolle“ ablegen, Prüfung der Übertragung durch eine zweite Person und Änderungsprotokoll (ab 4.26)
- Feldbogen Probenahme Feststoffe nach LAGA PN 98 zum Ausfüllen vor Ort, mit derselben Erfassung und Scan-Ablage (ab 4.27)
- Projektdaten als JSON speichern und wieder importieren
- Gemeinsamer Export der Laborübergaben, Projektdatei und freigegebenen Textbausteine
- Projektdaten aus der Projektzentrale (`_Projekt.json`: Objekt, Auftraggeber, Schaden-Nr.) im Schritt „Projektnummer“ anzeigen; das Objekt steht auch auf dem Auftragsschein (ab 4.28)
- „Ihr Kürzel“ gemeinsam mit BelegKit: einmal eintragen, gilt in beiden Apps (ab 4.27.2)
- Schmale Leiste oben wie in FotoKit, PlanKit und BelegKit: Projekt mit Wechsel zu den zuletzt geöffneten, die vier Arbeitsschritte mit Haken und „Weiter: …“ zum nächsten offenen Schritt (ab 4.29)
- Immer im klassischen Design – ohne „Liquid Glass“, Konfetti und Töne (ab 4.30)

## Starten

Im Büro die Adresse oben in Microsoft Edge oder Google Chrome öffnen – am einfachsten aus der Projektzentrale über „Proben erfassen → LabelKit“. Es ist keine Installation und kein eigener Server erforderlich.

Alternativ läuft die App auch als einzelne Datei: Repository herunterladen und `index.html` in Edge oder Chrome öffnen. Für die Ordnerauswahl wird ein unterstützter Browser benötigt; bei einer Bereitstellung als Website HTTPS verwenden.

## Projektordner (ab 4.24)

In der **Projektzentrale** ein Projekt wählen und **„Proben erfassen → LabelKit“** klicken – oder in LabelKit oben **„📁 Projekt“** und den Projektordner (z. B. `26.0123 Köln`) wählen. Danach:

- Jeder Ordnerdialog entfällt: Speichern (auch Strg+S), Laborübergaben, Protokolle und Textbausteine landen direkt im Unterordner **„Laboraufträge“** des Projekts.
- Die neueste `…_Daten.json` aus „Laboraufträge“ wird beim Öffnen automatisch geladen.
- Projektnummer (z. B. `26.0123`) und Schadenort kommen aus dem Ordnernamen; die Kennung steht oben in der Kopfzeile.
- Der Archivordner wird aus dem gemeinsamen Browser-Speicher der Projektzentrale übernommen (IndexedDB `mosaik-suite`, Schlüssel `archiv`). Nach einem Browserneustart genügt „Zugriff erlauben und öffnen“.
- „← Projektzentrale“ führt zurück zur Projektübersicht.

## PAK-Proben vorbelegen (ab 4.30.7)

- **Neue Proben hinzufügen** legt ausschließlich die angegebene Anzahl neuer PAK-Wischproben mit Projektnummer, Datum und Fläche aus der Vorbelegung an. Bestehende Angaben werden nicht verändert. Ohne Fläche gilt für neue Wischproben wie bisher 600 cm².
- **Leere Angaben ergänzen** ergänzt nur fehlende Projektnummern, Datumsangaben und Flächen vorhandener PAK-Proben (Fläche nur bei Wischproben). Es entstehen keine neuen Proben.
- **Bestehende Angaben ändern …** zeigt zuerst je Feld die betroffenen PAK-Probennummern, den neuen Wert und die Anzahl der Überschreibungen. Leere Angaben bleiben dabei leer. Erst **Genannte Angaben jetzt ändern** führt die Sammeländerung aus. Häkchen in der Probenliste schränken diese Aktion nicht ein.

Leere Vorbelegungsfelder lassen bestehende Angaben unverändert. Eine ausgefüllte ungültige Datums- oder Flächenangabe wird vor der Aktion zurückgewiesen; neue Proben erfordern eine ganze Anzahl von 1 bis 96. Abbrechen, Escape und Enter auf der vorausgewählten Abbrechen-Schaltfläche verändern weder Daten noch Rückgängig-Historie oder Speicherstatus. Jede tatsächliche Aktion lässt sich mit Strg/⌘+Z in einem Schritt rückgängig machen. Andere Probenarten bleiben erhalten; beim Hinzufügen verschieben sich ihre fortlaufenden Nummern nach der bestehenden gemeinsamen Nummerierung.

## Zwischenstand speichern (ab 4.30.8)

Oben steht in jedem Reiter **Zwischenstand speichern**. Die Schaltfläche und **Strg/⌘+S** verwenden denselben Speicherweg und speichern ausschließlich die JSON-Projektdatei – auch wenn Pflichtangaben fehlen. Es entstehen keine Laboraufträge, Druckdokumente oder Textbausteine.

- Mit geöffnetem Projekt wird wie bisher in **Laboraufträge** gespeichert. Sonst wird ein Speicherordner gewählt und für weitere Speicherungen wiederverwendet.
- Ohne Ordnerzugriff startet ausschließlich der bestehende JSON-Download. Bitte den Download prüfen; der Browser kann dessen erfolgreiche Ablage nicht bestätigen. Ungespeicherte Änderungen bleiben entsprechend gekennzeichnet.
- Der Status neben der Schaltfläche zeigt ungespeicherte Änderungen, laufendes Speichern, Erfolg, Abbruch oder Fehler. Erfolg wird erst nach abgeschlossenem Schreiben angezeigt. Änderungen während des Schreibens bleiben ungespeichert; gleichzeitige weitere Aufrufe werden abgefangen.
- Zwischenstand und Abschluss teilen sich die Speichersperre. Während einer Speicherung bitte deren Ende abwarten und danach erneut speichern. Ein älterer Vorgang kann dadurch keinen neueren gespeicherten Stand überschreiben. Nach Änderungen oder Projekt-/Zielordnerwechseln bestätigt er den aktuellen Stand nicht als gespeichert.
- Zum Weiterarbeiten die JSON-Datei über **Laden** importieren oder das Projekt öffnen (lädt die neueste Projektdatei).

## Probenerfassung abschließen und Laborunterlagen speichern

Zwischenspeichern ist keine Freigabe für Laborunterlagen. Der Abschluss prüft weiterhin unter anderem Projektnummer, Datum, Raum/Ort und Probennummern sowie die erforderliche Textbausteinfreigabe. Der bestehende ausdrücklich bestätigte Ausnahmeweg bleibt erhalten.

1. Proben erfassen und unter **Probenerfassung abschließen** die Vollständigkeit prüfen.
2. **Alle EOL + Projektdatei inkl. Textbausteine speichern** anklicken.
3. Falls angefordert, die Textbausteine prüfen und freigeben.
4. Den Projektordner auswählen. Die passenden Laborübergaben, zusätzliche Protokolle, freigegebene Word-Textbausteine und die JSON-Projektdatei werden gemeinsam gespeichert.
5. Zum Weiterarbeiten die JSON-Projektdatei über den Projektimport laden.

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

Die App steht in `index.html` (`APP_VERSION`, derzeit 4.30.8). Ausgangsversion dieses Repositorys war 4.23.5; alle Änderungen seitdem stehen in `CHANGELOG.md`.

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
```

GitHub führt alle Prüfungen bei jedem Pull Request automatisch aus (`.github/workflows/tests.yml`, Chromium und WebKit).

Die Prüfungen decken den Sammel-Export mit simulierten Browser-Schnittstellen, Abbruch, Schreibfehler und Browserhinweise sowie die Feldbögen (Blattzahl, Formular-ID, Vorbelegung, Maskierung von Eingaben, Leerformular) und die Erfassung (Änderungsprotokoll, Prüfung, Plausibilitätshinweise, Scan-Dateinamen, Prüfsummen) ab. Echte Ordnerdialoge, Druckausgaben und die Darstellung in Office müssen zusätzlich praktisch geprüft werden.

## Firmenspezifische Inhalte und Lizenz

Die aktuelle App enthält Firmierung, Adresse und ein eingebettetes Bild der bisherigen Fassung. Vor der öffentlichen Bereitstellung müssen diese Inhalte für die Veröffentlichung freigegeben oder angepasst werden.

Es wurde bisher keine Open-Source-Lizenz festgelegt. Eine Lizenzdatei kann nach Entscheidung des Rechteinhabers ergänzt werden.
