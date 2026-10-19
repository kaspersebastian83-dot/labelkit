# Änderungen

## 4.30.5 – Oktober 2026

- Behoben: Die Leiste oben zeigt jetzt das Objekt aus der Projektzentrale neben dem Projekt. Sie suchte es bisher an einer Stelle in „_Projekt.json“, an der die Projektzentrale es nicht ablegt.

## 4.30.4 – Oktober 2026

- Behoben: In Browsern ohne Ordnerzugriff (Safari) speicherte „💾 Speichern“ im Reiter „Ausgefüllte Bögen erfassen“ nichts, solange nur Feldprotokolle vorhanden waren („Keine Proben vorhanden“). Jetzt wird die Projektdatei heruntergeladen und lässt sich über „Laden“ wieder öffnen.
- „📎 Scan ablegen“ nennt in Safari den wahren Grund (Browser darf keine Ordner beschreiben) statt „Projekt öffnen“.
- Neue Erfassung: Wechselt man das Formular (Asbest, Schimmelpilze, PN 98), springt die laufende Nummer auf die erste freie dieses Formulars statt auf die des zuvor gewählten.

## 4.30.3 – Oktober 2026

- Behoben: Feldbögen drucken in Safari (Mac) nicht mehr mit einer Leerseite nach jedem Bogen. Die Bögen sind 296 mm statt 297 mm hoch (Safari rundet die druckbare Höhe knapp unter A4), und der Seitenumbruch steht nur noch zwischen den Bögen.
- Feldbögen: Die Auswahl des Formulars (Radio-Knöpfe) und „Leerformular ohne Projektdaten“ wirken nicht mehr überdimensioniert. Die Kästchen sind klein und stehen sauber neben ihrem Text, der Text erscheint nicht mehr in Großbuchstaben.

## 4.30.2 – Oktober 2026

- Die Leiste oben zeigt links den Namen der App-Suite „Spektron“ (die Büro-Apps Projektzentrale, LabelKit, FotoKit, PlanKit, BelegKit und SpesenKit). Sonst unverändert.

## 4.30.1 – Oktober 2026

- Behoben: Das Projektmenü der Leiste oben („Anderes Projekt“) schloss sich von selbst, wenn die Leiste sich im Hintergrund aktualisierte (alle 20 Sekunden und beim Zurückkehren ins Fenster).

## 4.30.0 – Oktober 2026

- Schalter „Liquid Glass“ und der Glas-Look entfernt, ebenso „Glas-Frost“ unter „Erscheinungsbild“, das Konfetti bei Erfolgsmeldungen und alle Töne (Klick-/Erfolgstöne, Ton-Schalter unten links). LabelKit erscheint immer im klassischen Design (bisher bei ausgeschaltetem Schalter); sonst unverändert.

## 4.29.0 – Oktober 2026

- Neue schmale Leiste oben, in allen vier Apps gleich: Projekt mit Wechsel zu den zuletzt geöffneten, die vier Arbeitsschritte (LabelKit, FotoKit, PlanKit, BelegKit) mit Haken bei erledigten Schritten, und ein Knopf „Weiter: …“ zum nächsten offenen Schritt – öffnet die App mit demselben Projekt. Ohne geöffnetes Projekt bietet die Leiste „Weiter mit <zuletzt geöffnetes Projekt>“ an. Die Leiste liest den Projektordner nur und schreibt nie hinein; ohne Ordnerrecht (oder in Safari) fehlen nur die Haken.

## 4.28.0 – Oktober 2026

- Projektdaten aus der Projektzentrale (`_Projekt.json`) werden im Schritt „Projektnummer“ angezeigt: Objekt, Auftraggeber, Schaden-Nr. Nur Anzeige, wird beim Zurückkehren in die App neu gelesen.
- Auf dem Auftragsschein (Bildschirm und RTF) steht zusätzlich das Objekt. Auftraggeber und Schaden-Nr. werden bewusst nicht auf den Laborauftrag gedruckt.

## 4.27.2 – Oktober 2026

- „Ihr Kürzel“ wird mit BelegKit geteilt: einmal eintragen, gilt in beiden Apps. Bisher eingetragene Kürzel werden übernommen.

## 4.27.1 – Oktober 2026

- Feldbögen leichter zu finden: Unterreiter heißen „① Bögen drucken (für vor Ort)“ und „② Ausgefüllte Bögen erfassen & Scans ablegen“; Hinweis mit Knopf oben im Reiter „Feldbögen“ und im PN 98-Reiter.

## 4.27.0 – Oktober 2026

- Neuer Feldbogen „Probenahme Feststoffe (PN 98)“ im Reiter „Feldbögen“ (bisher „Feldbögen Raumluft“): Probenahmeprotokoll zum Ausfüllen vor Ort, angelehnt an LAGA PN 98 Anhang C und bewusst kurz gehalten. Blatt 1: Projekt, Anlass und vermutete Schadstoffe, Labor, Vor-Ort-Bedingungen für alle Proben (Material, Lagerung, Witterung, Gerät, Gefäß, Transport, Lage der Probenahmestellen) und Probe 1; Folgeblätter mit je drei Proben. Unterschrift Probenehmer und Anwesende/Zeugen. Das Labor wird aus dem PN 98-Reiter vorgedruckt.
- Übertragung am Schreibtisch unter „Erfassen & Scans“ wie bei Asbest und Schimmel (Scan-Ablage mit SHA-256, Abschluss, Prüfung durch zweite Person, Änderungsprotokoll).
- Plausibilitätshinweise PN 98: fehlende oder doppelte Proben-Nr., Mischprobe aus weniger als 4 Einzelproben, „Einzelprobe“ mit mehreren Einzelproben, weniger Mischproben je Entnahmestelle als die PN 98-Staffelung des Probenrechners für die angegebene Menge, Übergabe vor dem Probenahmedatum. Hinweise ändern keine Werte.
- Absprung zum Feldbogen aus dem PN 98-Reiter und aus dem Probenrechner (mit der berechneten Zahl der Laborproben). Das bisherige PN 98-Protokoll am Bildschirm bleibt unverändert nutzbar.

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
