# LabelKit

Deutschsprachige Browser-App für Probenerfassung, Etiketten und Laborübergaben.

## Funktionen

- PAK- und Chlorid-Wischproben, Asbestproben und sonstige Proben erfassen
- Etiketten und Laborübergaben erstellen
- Brandgeruch-Bewertungen erfassen
- PN-98-Probenahmeprotokolle und Textbausteine erstellen
- Projektdaten als JSON speichern und wieder importieren
- Gemeinsamer Export der Laborübergaben, Projektdatei und freigegebenen Textbausteine

## Starten

Das Repository herunterladen und entpacken. Die Datei `index.html` in Microsoft Edge oder Google Chrome am Computer öffnen. Es ist keine Installation und kein eigener Server erforderlich.

Für die Ordnerauswahl wird ein unterstützter Browser benötigt. Bei einer Bereitstellung als Website HTTPS verwenden.

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

Schriftarten werden von Google Fonts geladen. Ohne Internet können Ersatzschriftarten verwendet werden; dadurch kann sich das Druckbild ändern. Das Erscheinungsbild-Panel funktioniert ohne React, Babel oder zusätzliche lokale Dateien.

Keine echten Projektdaten, Laboraufträge oder Exporte in das öffentliche Repository hochladen. Die `.gitignore` schließt typische Daten- und Exportdateien aus. Diese Regeln schützen nicht vor einem manuellen Upload über die GitHub-Webseite.

## Entwicklung und Prüfungen

Die App steht in `index.html`. Die vorhandene Versionsbezeichnung der Ausgangsversion ist 4.23.5; die Änderungen sind in `CHANGELOG.md` beschrieben.

Mit Node.js aus dem Repository-Ordner ausführen:

```sh
node tests/export-flow.cjs
node tests/browser-hint.cjs
```

Die Prüfungen decken den Sammel-Export mit simulierten Browser-Schnittstellen, Abbruch, Schreibfehler und Browserhinweise ab. Echte Ordnerdialoge, Druckausgaben und die Darstellung in Office müssen zusätzlich praktisch geprüft werden.

## Firmenspezifische Inhalte und Lizenz

Die aktuelle App enthält Firmierung, Adresse und ein eingebettetes Bild der bisherigen Fassung. Vor der öffentlichen Bereitstellung müssen diese Inhalte für die Veröffentlichung freigegeben oder angepasst werden.

Es wurde bisher keine Open-Source-Lizenz festgelegt. Eine Lizenzdatei kann nach Entscheidung des Rechteinhabers ergänzt werden.
