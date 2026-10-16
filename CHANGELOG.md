# Änderungen

## 4.26.0 – Oktober 2026

- Neuer Unterreiter „Erfassen & Scans“ im Reiter „Feldbögen Raumluft“: ausgefüllte Feldbögen am Schreibtisch übertragen, Eingabemaske in der Reihenfolge des Papierbogens, Scan daneben (JPEG/PNG direkt, PDF im eigenen Fenster).
- Scans werden in den Unterordner „Feldprotokolle“ des Projektordners kopiert: Dateiname aus Formular-ID und Datum (ERVV-tauglich), nie überschreibend, SHA-256-Prüfsumme der zurückgelesenen Kopie, fortlaufendes `_Ablage-Protokoll.txt`; Projektdaten werden danach gespeichert. „Ablage prüfen“ vergleicht die Prüfsummen erneut; falsche Scans werden als ungültig vermerkt statt gelöscht.
- Werte bleiben Text wie auf dem Bogen; leere Felder bleiben leer; Vermerk „unleserlich“ je Feld. Plausibilitätshinweise (Volumen gegen Volumenstrom × Dauer, Schließzeit vor Messbeginn, Luftfeuchte, Sammelhöhe, Versandtag) ändern keine Werte.
- „Erfassung abschließen“: danach wird jede Änderung mit altem und neuem Wert, Kürzel und Zeit protokolliert. „Übertragung geprüft“ durch eine zweite Person; eine spätere Änderung hebt die Prüfung auf. Messtechniker lt. Bogen und Erfasser werden getrennt geführt.
- Erfasste Feldprotokolle sind Teil der Projektdatei (`feldprotokolle` in `…_Daten.json`), inklusive Rückgängig.

## 4.25.0 – Oktober 2026

- Neuer Reiter „Feldbögen Raumluft“: druckfertige Feldprotokolle zum Ausfüllen von Hand für Raumluftmessungen auf Asbest/KMF (VDI 3492, TRGS 519) und auf Schimmelpilze (in Anlehnung an DIN ISO 16000-18/-19 und UBA-Schimmelleitfaden, Stand 2024).
- Blatt 1 mit Kopfdaten (beim Asbest zusätzlich Messpunkt 1), Folgeblätter mit je zwei Messpunkten; Anzahl der Messpunkte wählbar, Messpunkt-Nummern vorgedruckt.
- Projekt-Nr., Objekt, Auftraggeber und Ortstermin aus `_Projekt.json` des Projektordners (sonst aus den LabelKit-Angaben) in Schreibmaschinenschrift vorgedruckt; Formular-ID (z. B. `26.0142-AS-01`) und „Blatt x von n“ auf jedem Blatt; Leerformular möglich.
- Firmenlogo im Kopf und als Wasserzeichen; Druck mit den eingebetteten Schriften, ohne Nachladen.
- Automatische Tests auf GitHub bei jedem Pull Request (Node-Prüfungen sowie Browsertest der Feldbögen in Chromium und WebKit).

## 4.24.1 – Oktober 2026

- Sicherheit: Schriften (IBM Plex, DM Sans/Mono) in die Datei eingebettet statt von Google Fonts geladen – keine Übermittlung der IP-Adresse an Google, Druckbild auch offline gleich.
- Sicherheit: strenge Content Security Policy (`connect-src 'self'`) – kein fremder Code, keine Verbindungen zu anderen Servern.
- Die Etiketten-Druckfenster luden bisher IBM Plex, verwendeten aber „DM Sans“; der unnötige Abruf entfällt, das Druckbild bleibt unverändert.

## 4.24.0 – Oktober 2026

- Projektordner: Öffnen aus der Projektzentrale (`?projekt=<Ordnername>`) oder über „📁 Projekt“.
- Im Projekt ersetzt „Laboraufträge“ jeden Ordnerdialog (Speichern, Strg+S, Laborübergaben, Protokolle, Textbausteine).
- Neueste `…_Daten.json` aus „Laboraufträge“ wird beim Öffnen geladen; Projektnummer und Schadenort aus dem Ordnernamen.
- Kopfzeile: Projektkennung und „← Projektzentrale“ statt des alten Dashboard-Links.

## In Vorbereitung

- `index.html` als zentrale Startdatei für das Repository eingeführt.
- Sammel-Export öffnet die Ordnerauswahl vor der Dateierstellung.
- Textbaustein-Freigabe setzt den Export direkt im Klick-Ablauf fort.
- Fehler bei Ordnerauswahl oder Speichern starten keine automatischen Downloads.
- Browser ohne Ordnerauswahl bieten Downloads erst nach Bestätigung an.
- Browserhinweis mit Empfehlung für Chrome oder Edge hinzugefügt.
- Kopierbare App-Adresse und Edge-Link für Webadressen unter Windows ergänzt.
- Unvollständiges React-Erscheinungsbild-Panel durch native Browser-Steuerelemente ersetzt; Akzentfarbe, Dichte und Glas-Frost bleiben einstellbar.
- Automatische Prüfungen für Sammel-Export und Browserhinweis ergänzt.

## Ausgangsversion

LabelKit 4.23.5, bereitgestellt als einzelne HTML-Datei.
