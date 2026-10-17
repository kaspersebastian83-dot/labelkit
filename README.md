# LabelKit

Deutschsprachige Browser-App für Probenerfassung, Etiketten und Laborübergaben.

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

## Starten

Das Repository herunterladen und entpacken. Die Datei `index.html` in Microsoft Edge oder Google Chrome am Computer öffnen. Es ist keine Installation und kein eigener Server erforderlich.

Für die Ordnerauswahl wird ein unterstützter Browser benötigt. Bei einer Bereitstellung als Website HTTPS verwenden.

## Projektordner (ab 4.24)

In der **Projektzentrale** ein Projekt wählen und **„Proben erfassen → LabelKit“** klicken – oder in LabelKit oben **„📁 Projekt“** und den Projektordner (z. B. `26.0123 Köln`) wählen. Danach:

- Jeder Ordnerdialog entfällt: Speichern (auch Strg+S), Laborübergaben, Protokolle und Textbausteine landen direkt im Unterordner **„Laboraufträge“** des Projekts.
- Die neueste `…_Daten.json` aus „Laboraufträge“ wird beim Öffnen automatisch geladen.
- Projektnummer (z. B. `26.0123`) und Schadenort kommen aus dem Ordnernamen; die Kennung steht oben in der Kopfzeile.
- Der Archivordner wird aus dem gemeinsamen Browser-Speicher der Projektzentrale übernommen (IndexedDB `mosaik-suite`, Schlüssel `archiv`). Nach einem Browserneustart genügt „Zugriff erlauben und öffnen“.
- „← Projektzentrale“ führt zurück zur Projektübersicht.

## Speichern und wieder öffnen

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

Die App steht in `index.html`. Die vorhandene Versionsbezeichnung der Ausgangsversion ist 4.23.5; die Änderungen sind in `CHANGELOG.md` beschrieben.

Mit Node.js aus dem Repository-Ordner ausführen:

```sh
node tests/export-flow.cjs
node tests/browser-hint.cjs
node tests/feldboegen.cjs
node tests/feldprotokolle.cjs
node tests/kuerzel.cjs
```

Zusätzlich gibt es Browsertests für die Feldbögen (Vorschau, Blattüberlauf, Druckfenster mit Schrift und Logo) und für die Erfassung mit Scan-Ablage (in Chromium mit nachgebildetem Projektordner, in WebKit nur die Erfassung). Er braucht Playwright, das nicht im Repository geführt wird:

```sh
npm install --no-save playwright && npx playwright install chromium webkit
node tests/feldboegen-browser.cjs chromium
node tests/feldboegen-browser.cjs webkit
node tests/feldprotokolle-browser.cjs chromium
node tests/feldprotokolle-browser.cjs webkit
```

GitHub führt alle Prüfungen bei jedem Pull Request automatisch aus (`.github/workflows/tests.yml`, Chromium und WebKit).

Die Prüfungen decken den Sammel-Export mit simulierten Browser-Schnittstellen, Abbruch, Schreibfehler und Browserhinweise sowie die Feldbögen (Blattzahl, Formular-ID, Vorbelegung, Maskierung von Eingaben, Leerformular) und die Erfassung (Änderungsprotokoll, Prüfung, Plausibilitätshinweise, Scan-Dateinamen, Prüfsummen) ab. Echte Ordnerdialoge, Druckausgaben und die Darstellung in Office müssen zusätzlich praktisch geprüft werden.

## Firmenspezifische Inhalte und Lizenz

Die aktuelle App enthält Firmierung, Adresse und ein eingebettetes Bild der bisherigen Fassung. Vor der öffentlichen Bereitstellung müssen diese Inhalte für die Veröffentlichung freigegeben oder angepasst werden.

Es wurde bisher keine Open-Source-Lizenz festgelegt. Eine Lizenzdatei kann nach Entscheidung des Rechteinhabers ergänzt werden.
