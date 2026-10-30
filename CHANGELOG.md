# Änderungen

## 4.48.1 – 30. Oktober 2026

- **Projektnummer mit Adresse:** Steht im Feld „Projektnummer“ zusätzlich die Adresse (ältere Projekte, z. B. „26.0512 Stegerwaldstraße Leverkusen“), wurde die Projektdatei beim Öffnen aus dem Projektordner, beim JSON-Import und aus dem Archiv als „fremdes Projekt“ blockiert, und „Speichern“ in den Projektordner meldete „Nicht gespeichert“. Verglichen wird jetzt nur die Projektnummer; eine andere Nummer blockiert weiter, Freitext ohne Nummer wie bisher. Gleiche Regel in ResultKit 1.12.1 und BerichtKit 1.4.1.

## 4.48.0 – 30. Oktober 2026

- **Probenehmer aus der Mitarbeiterliste:** In den Feldprotokollen (Probenehmer bzw. Messtechniker laut Bogen) und im PN-98-Probenprotokoll schlägt das Feld jetzt die Namen der aktiven Personen aus der Projektzentrale vor (`_Spektron-Mitarbeiter.json`). Freitext bleibt möglich (Fremdpersonen, mehrere Namen). Mit dem genauen Namen aus der Liste ordnet BerichtKit die Person sicher zu, statt zu raten.

## 4.47.0 – 30. Oktober 2026

- Spektron-Leiste: neuer Schritt „BerichtKit“ (Asbest-Untersuchungsbericht) zwischen PlanKit und BelegKit – Haken, sobald ein Bericht in „Mitteilungen“ liegt. Gemeinsames Modul spektron-ordner.js: neuer Bereich „BerichtKit“ (Angaben zum Bericht in „_Spektron/BerichtKit“).

## 4.46.0 – 29. Oktober 2026

- **Projektdatei:** Hat ein anderes LabelKit-Fenster oder ein anderer Rechner die …_Daten.json inzwischen geändert (oder wurde sie in dieser Sitzung nie von dort geladen), fragt LabelKit vor dem Speichern, statt still zu überschreiben. Abbrechen lässt die Datei unverändert, die Erfassung bleibt offen.
- **Übergaben (Excel, Auftragsübersicht, Schnittplan, RTF):** Gibt es die Datei schon (z. B. am selben Tag von Hand nachbearbeitet), fragt LabelKit einmal: ersetzen – oder die neue Fassung daneben als „… (2)“ speichern.
- **Projektwechsel:** Wird ein Projekt noch gelesen und inzwischen ein anderes geöffnet und bearbeitet, ersetzt das verspätete Laden die neuen Eingaben nicht mehr.
- Meldungen nennen den tatsächlichen Ort der Projektdatei („_Spektron/LabelKit“ oder „Laboraufträge“).

## 4.45.1 – 29. Oktober 2026

- Gemeinsames Modul spektron-ordner.js: Beim Umzug und bei der Ortswahl zählen in „Abrechnung“ nur noch die Dateien, die BelegKit selbst schreibt (Aufwand_<Kürzel>.json, _Abrechnung.json, <Nr>_Aufwand_<Datum>.json, _BelegKit_Sicherungen) – andere JSON dort bleiben liegen. Für LabelKit ändert sich nichts.

## 4.45.0 – 28. Oktober 2026

- **Spektron-Ordner ist da:** Neue Projekte (ab 26.0560) und per Projektzentrale umgezogene Projekte haben ihre Projektdatei (`…_Daten.json`) und das Ablage-Protokoll jetzt im Unterordner `_Spektron`. Noch nicht umgezogene Projekte werden weiter am bisherigen Ort gelesen und geschrieben (`spektron-ordner.js`, Umstellung aktiv). Excel-Übergaben, Protokolle und Scans bleiben, wo sie sind.

## 4.44.0 – 28. Oktober 2026

- **Vorbereitung „Spektron-Ordner“:** Die App-Daten eines Projekts ziehen später in den Unterordner `_Spektron`. LabelKit liest und schreibt die Projektdatei (`…_Daten.json`), liest die Projektdaten und schreibt das Ablage-Protokoll der Feldprotokolle jetzt über `spektron-ordner.js`. Excel-Übergaben, Protokolle und Scans bleiben in „Laboraufträge“ bzw. „Feldprotokolle“. Bis zum Umzug ändert sich nichts.

## 4.43.0 – 26. Oktober 2026

- **Probennummern bleiben beim Aktualisieren**: „Proben aktualisieren“ im Bohrkern-Bogen, erneutes „→ Laborproben anlegen“ im Reiter PN 98 und erneutes Übernehmen eines PN 98-Feldbogens setzten die ersetzten Proben bisher ans Ende – später angelegte Proben (z. B. Materialproben) rückten davor und bereits etikettierte Proben bekamen neue Nummern (Etikett und Laborbericht passten nicht mehr zusammen). Jetzt übernimmt eine neu berechnete Probe Platz und Nummer der alten mit derselben Probenbezeichnung (`bkId`) bzw. demselben Protokoll (`pn98Quelle`, Proben-Nr.); nur wirklich neue kommen ans Ende.
- **Rückgängig nur im geöffneten Projekt**: Beim Öffnen eines Projektordners und beim Laden einer Projektdatei wird der Rückgängig-Verlauf geleert. Bisher holte Strg+Z nach einem Projektwechsel die Proben des vorigen Projekts zurück, Strg+S schrieb sie dann in die Laboraufträge des neuen. Zusätzlich lehnt Strg+S das Speichern in den Laboraufträge-Ordner ab, wenn die Projektnummer der Daten nicht zum geöffneten Projektordner passt.
- **PN 98-Probenahmedatum**: „24.10.26“ (zweistellige Jahreszahl, wie auf dem Feldbogen) wird gelesen. Bisher wurde daraus beim Anlegen der Laborproben stillschweigend das heutige Datum; ein nicht lesbares Datum bleibt jetzt leer (gelbe Pflichtzelle).
- Probenahmedatum aus einer Projektdatei wird in Tabellen, Etiketten und Excel-Übergaben maskiert ausgegeben (kein HTML aus Dateiinhalt).
- Zeilenumbrüche in „Untersuchungsparameter“ (Sonstige, Asbest) werden in der kopierten Laborübergabe zu „, “ – bisher entstanden beim Einfügen ins Laborsystem zusätzliche Zeilen. Spaltenreihenfolge unverändert.
- **PN 98 – Schadendatum „nicht bekannt“**: Knopf neben dem Kalender trägt „nicht bekannt“ ein; so steht es auf den Protokollen.

## 4.42.0 – 26. Oktober 2026

- Spektron-Leiste mit fünftem Schritt **ResultKit** (zwischen FotoKit und PlanKit): Laborergebnisse des Projekts – was zur Laborübergabe zurück ist und was noch fehlt. Haken, sobald die Ergebnisse in ResultKit übernommen sind (`Laborergebnisse/_Ergebnisse.json`). Die Leiste ist in allen Apps gleich; an LabelKit selbst ändert sich nichts.

## 4.41.0 – 26. Oktober 2026

- Spektron-Leiste oben: rechts „💬 Rückmeldung“ (bei schmalem Fenster nur 💬, auf dem Handy im Projektmenü ▾). Öffnet das Rückmeldeformular in einem eigenen Fenster; Programm, Version und – bei geöffnetem Projekt – die Projektnummer sind schon eingetragen (nur die Nummer, kein Ort). Die Leiste ist in allen Apps gleich.

## 4.40.0 – 26. Oktober 2026

- Hilfe-Knöpfe ins Handbuch (AidKit), öffnen dasselbe Handbuch-Fenster direkt am Kapitel: oben „📘 Hilfe“ (LabelKit Schritt für Schritt); bei „Proben erfassen“ der PAK- und Chlorid-Wischproben „📘 Probenbezeichnung Wischproben“; bei den Sonstigen Proben und im Reiter Bohrkerne „📘 Probenbezeichnung Bohrkerne“ (im Reiter Bohrkerne zusätzlich „Schritt für Schritt“). Nur Links, an der Eingabe ändert sich nichts.

## 4.39.1 – 24. Oktober 2026

- Hilfetexte: Willkommen-Fenster und Chlorid-Reiter nennen die heutigen Knöpfe („→ Ausgewählte übertragen“, „→ Alle übertragen“) und beschreiben das Speichern wie es ist (Strg+S = Zwischenstand, „Alle EOL + Projektdatei speichern“ beim Abschluss).

## 4.39.0 – 24. Oktober 2026

- Pflichtangaben wie in Projektzentrale und FotoKit: leere Pflichtfelder je Probe sind gelb hervorgehoben – Projektnummer, Probenahmedatum, Raum/Ort (bei Bohrkernen die BK-Bezeichnung), bei „Sonstige Proben“ auch die Untersuchungsparameter (Labor und Abrechnung brauchen sie). Dieselben Felder wie die Prüfung „kritisch“ beim Abschluss. Ausgefüllt wieder normal; nichts wird blockiert.

## 4.38.1 – 24. Oktober 2026

- Leiste oben in allen Apps wieder identisch (FotoKit-Projektzuordnung und offenes Menü wie in FotoKit, aktuelle Projektdaten wie in LabelKit/PlanKit); Speicherkandidaten und Kopien von PlanKit zählen nicht als Plan.

## 4.38.0 – 24. Oktober 2026

- Bohrkerne: „Proben anlegen“ aus dem Wandblatt übernimmt Abstand zur linken Ecke (`bkEcke`), Höhe über OKFF (`bkOkff`), Wandlänge und -höhe (`bkWandL`, `bkWandH`, alle in m) und Geruch (`bkGeruch`) in die Probe – für die Wandansicht in PlanKit. Leere oder unlesbare Maße bleiben leer. Projektdatei nur ergänzt.

## 4.37.1 – 24. Oktober 2026

- Reiter „Probenprotokoll PN 98“ heißt kurz „PN 98“ (voller Name als Tooltip): Die Reiterleiste passt jetzt auch bei 1280 px Breite, „Probenerfassung abschließen“ wird nicht mehr abgeschnitten.
- Willkommen-Fenster: Schritt 1 „Projekt öffnen“ (über die Projektzentrale; ohne sie Projektnummer oben eintragen).

## 4.37.0 – 24. Oktober 2026

- **PN 98 → Laborproben**: Im Reiter „Probenprotokoll PN 98“ legt „→ Laborproben anlegen“ aus jedem Protokoll eine Probe unter „Sonstige Proben“ an (Etikett, Laborauftrag). Matrix und Untersuchungsparameter werden einmal für alle gewählt (nicht geraten; die letzte Wahl wird vorgeschlagen). Raum/Ort = Probenahmestelle, Beschreibung = Art der Probe · „PN 98 Nr. …“, damit Etikett, Laborauftrag und Protokoll zueinander passen. Datum = Probenahmedatum. Erneutes Anlegen ersetzt diese Proben (Verweis `pn98Quelle`) statt sie zu verdoppeln.
- **PN 98-Feldbogen → Protokolle**: Im übertragenen PN 98-Feldbogen übernimmt „Als PN 98-Protokolle übernehmen“ alle ausgefüllten Proben in den Reiter PN 98 (für das Word-Protokoll je Probe). Zuordnung: Proben-Nr., Uhrzeit, Entnahmestelle, Material, Mischprobe/Einzelprobe, Menge, Haufwerk, Farbe, Geruch, Konsistenz/Feuchte, Bemerkung und Foto-Nr.; aus Blatt 1 Schadstoffe, Witterung, Gerät, Gefäß/Transport, Lagerung. „unleserlich“ wird mitgeführt. Nicht auf dem Bogen und darum leer: Schadendatum, Witterungseinfluss, Hinweis an Untersuchungsstelle. Projektangaben (Schaden, Datum, Ort, Probenehmer, Grund, Labor) nur in leere Felder. Erneut ausführen ersetzt die Protokolle dieses Bogens.
- Bestehende Funktionen unverändert: direkte Eingabe im Reiter PN 98, Probenrechner, Word-Export, Feldbogen-Erfassung mit Prüfung und Scan-Ablage. Neue Felder in der Projektdatei nur ergänzend (`pn98Quelle`).
- Test: `tests/pn98-bruecke-browser.cjs`.

## 4.36.0 – 24. Oktober 2026

- Reiter **Textbausteine** entfernt (Funktion war nicht fertig entwickelt): Vorschau, Word-Export „Probenahmetexte“, Freigabe und Stile. Der Reiter „Probenerfassung abschließen“ passt wieder in die Leiste.
- **Alle EOL + Projektdatei speichern** (vorher „… inkl. Textbausteine …“): keine Textbaustein-Freigabe mehr vor dem Speichern, keine Datei `…_Probenahmetexte_….docx` mehr. Laborübergaben, Protokolle und Projektdatei werden unverändert gespeichert; die Prüfung kritischer Probleme bleibt.
- Projektdatei unverändert: Die vier früheren Angaben `pakPruefberichtNr`, `textblockLabor`, `textblockHeadings`, `textblockBrandTabelle` werden weiter gelesen (auch aus älteren Dateien) und beim Speichern unverändert zurückgeschrieben; ein neues Projekt startet leer. Geprüft: dieselbe Datei in 4.35.0 und 4.36.0 geladen und gespeichert ergibt denselben Inhalt (bis auf Zeitstempel und Version). Test: `tests/projektdatei-altwerte-browser.cjs`.
- Titel und Versionsknopf folgen jetzt `APP_VERSION` (zeigten seit 4.34.0 noch „v4.33.0“).

## 4.35.0 – 24. Oktober 2026

- Neuer Feldbogen **Bohrkerne (Wandblatt)** (Formular-ID …-BK-…) für systematische Bohrkerne aus Wänden, Böden und Decken, z. B. nach Heizölschäden. Blatt 1: Projekt, Untersuchung (Standard MKW C10–C40 und C10–C22), Tiefenstufen (bis drei, Standard 0–2 / 2–6 / 6–12 cm), Vorgabe Analyse/Rückstellung, Bohrung und Gefäß, Begehung mit Raumkürzeln und Wand A. Danach ein Wandblatt je Wand: Geschoss und Fläche zum Ankreuzen, Wandkennung, Raster 1–9 (Telefontastatur, von vorn gesehen), Tabelle mit vorgedruckten Endungen -1 … -9 und zwei freien Zeilen, je Kern Lage (Ecke, OKFF), Kernlänge, Material je Tiefe, Geruch und A/R je Tiefe.
- Probenbezeichnung nach AidKit: Wandkennung + Endung + Tiefe, z. B. `EG-WZ-B-7-T2`.
- Erfassung am Schreibtisch wie bei den anderen Bögen (Änderungsprotokoll, Prüfung, Scan-Ablage). Hinweise: Wandkennung unvollständig oder doppelt, Kernlänge fehlt, A/R unklar, Tiefenstufe länger als der Kern, Lage außerhalb der Wand, Raumkürzel nicht in der Liste.
- „Proben anlegen“ erzeugt aus dem übertragenen Bogen alle Segmente als Bohrkernproben im Reiter „Sonstige“: volle Bezeichnung, Tiefe (letztes Segment endet am Kernende), Material, Raum, Untersuchung bzw. „Rückstellung“. Erneutes Anlegen ersetzt die Proben dieses Bogens statt sie zu verdoppeln. Etikett, Beschreibung und Laborübergabe zeigen die volle Bezeichnung.
- Neuer Reiter **Bohrkerne**: Arbeitsplatz für alles rund um Bohrkerne – Wandblätter drucken, übertragene Bögen mit Status, Übersicht je Wand mit allen Kernen und Segmenten (A/R), Schnittpläne, Etiketten und Übergabe. Keine eigenen Daten: Proben bleiben unter „Sonstige Proben“, Bögen bei den Feldprotokollen. Hinweis, wenn ein Bogen nach dem Anlegen der Proben geändert wurde oder Proben noch fehlen.
- **Schnittplan** (je Kern, nach Eurofins-Vorlage): Segmente aus dem Wandblatt zeigen Tiefenstufe, Probe und Auftrag – „analysieren“ oder fett „nur sägen und aufbewahren“ –, dazu die Untersuchung. „Ungebrochene Rückstellung des halben Bohrkerns“ kommt aus dem Wandblatt (neue Frage auf Blatt 1); ohne Angabe bleibt sie leer statt „Nein“. Im Bogen: „Schnittpläne dieses Bogens“.
- Zurückgestellte Segmente heißen „Rückstellprobe – nicht analysieren“ (Untersuchungsparameter in der Laborübergabe), damit sie nicht mit dem halben Kern verwechselt werden.
- Tabellen in der Erfassung können eigene Spalten haben (bisher fest die Schimmel-Probentabelle).
- Raumkürzel und ID-Regeln lädt LabelKit aus AidKit (`../aidkit/konventionen.js`); ohne AidKit (offline) funktioniert alles, nur ohne diese Prüfungen.

## 4.34.0 – 24. Oktober 2026

- **Raum / Ort**: Die Vorschläge zeigen zuerst die Räume dieses Projekts (genau so geschrieben wie bei den bisherigen Proben), danach die zuletzt benutzten aus anderen Projekten. So heißt die Küche in allen Proben gleich – wichtig für das Raumbuch in PlanKit. Neue Räume lassen sich weiterhin frei eintippen.
- Gemerkt wird ein Raum erst beim Verlassen des Feldes; halb getippte Einträge wie „EG Kü“ landen nicht mehr in der Vorschlagsliste.

## 4.33.0 – 23. Oktober 2026

- Asbestproben: Die Spalten „Beaufschlagung“ und „Oberflächenart“ (aus der PAK-Wischprobe übernommen) sind ersetzt durch **Bauteil / Material**, **Bindung** (fest / schwach / unklar) und **Zustand** (intakt, brandbeaufschlagt, geplatzt / zerstört, Bruchstücke im Brandschutt). Alle drei sind Textfelder mit Vorschlägen; eigene Bauteile werden im Browser gemerkt. Gilt auch im Bearbeiten-Panel.
- Die Asbest-Matrix führt nur noch Materialien mit Nachweisgrenze nach VDI 3866-5, dazu Raumluft und „Sonstige“: Wischprobe, Material (mineralisch), Material (hoher org. Anteil), Bauschutt und Wasser entfallen (alte Werte bleiben in bestehenden Projekten sichtbar). „Wischprobe“ ist damit keine Asbest-Matrix mehr; neue Asbestproben starten ohne Matrix (Ampel rot, bis eine gewählt ist). Raumluft erhält „Asbestfasern REM/EDX · VDI 3492“, die neue Matrix „Kontaktprobe“ „Asbestfasern REM/EDX · VDI 3877-1“ als Untersuchungsparameter; Bindung und Zustand entfallen bei beiden.
- Etikett zeigt Raum und Bauteil, die Laborübergabe Raum, Bauteil und Bindung. Gespeichert wird weiter in z3/z4 (plus neues Feld `zustand`), daher übernimmt PlanKit die Beschreibung ohne Änderung. Ältere Projektdateien behalten ihre Werte, auch eine alte Matrix „Wischprobe“.
- Neuer Feldbogen **Materialprobe Asbest** (Formular-ID …-AM-…): Projekt, Anlass und Baujahr, Probenahme (Schutz, Entnahme, Verpackung, Versiegelung), je Probe Raum, Bauteil, Bindung, Zustand, „Gleiches Material auch in“ und Bemerkung. Blatt 1 mit zwei Proben, Folgeblätter mit je vier. Erfassung am Schreibtisch mit Scan-Ablage, Vier-Augen-Prüfung und Hinweisen (fehlende/doppelte Proben-Nr., fehlendes Bauteil oder Bindung).

## 4.32.0 – 23. Oktober 2026

- Projektordner „26.0123 Köln Nad“: Liegt im Archivordner die Mitarbeiterliste der Projektzentrale, steht der Ort ohne Kürzel – in der Kopfzeile und als Vorbelegung „Ort der Probenahme“ (PN 98) bei neuen Projekten. Bereits gespeicherte Angaben bleiben unverändert.
- „Ihr Kürzel“: Ist noch keines gespeichert und wurde in der Projektzentrale „Ich bin …“ gewählt, übernimmt LabelKit beim Öffnen eines Projekts das App-Kürzel aus der Mitarbeiterliste (Hinweis in der Meldung). Ein vorhandenes Kürzel wird nie überschrieben. Das Kürzelfeld bietet die Kürzel der Liste zur Auswahl an.

## 4.31.0 – 23. Oktober 2026

- Die Spektron-Leiste oben zeigt „Nr. Ort · zuständige Person“: Liegt im Archivordner die Mitarbeiterliste der Projektzentrale, wird das Kürzel am Ende des Projektordners erkannt und mit Namen angezeigt; eine in der Projektzentrale abweichend gewählte Person hat Vorrang.

## 4.30.10 – 20. Oktober 2026

- Projektzentrale und Spektron-Leiste übergeben Projekte jetzt über #projekt im Fragment. Sonderzeichen bleiben erhalten; alte ?projekt-Links funktionieren weiterhin und werden nach dem Laden bereinigt. Projektwechsel laden auch bereits geöffnete App-Fenster neu; eine Warnung vor ungesicherten Eingaben kann den Wechsel abbrechen.

## 4.30.9 – Oktober 2026

- „Schnelleingabe“ heißt in der Oberfläche konsistent „Geführte Eingabe“. Bestehende Felder, Strg+Umschalt+E sowie Weiter-/Zurück-/Beenden-Verhalten bleiben erhalten.
- Jede PAK-Karte bietet eine sichtbare, per Tastatur bedienbare Schaltfläche „Bearbeiten“ zum vorhandenen Panel; Klicks lösen keine zusätzliche Kartenaktion aus. Doppelklick bleibt möglich.
- Der PAK-Panelkopf zeigt dieselbe fortlaufende Nummer wie Karte/Tabelle sowie Raum/Ort und Matrix. Karten und Panel bleiben auch bei schmalen Fenstern nutzbar.
- Browserregressionen prüfen synthetische Proben, Tastatur, korrekte Auswahl nach Listen- und Nummerierungsänderungen, Daten-/Status-Erhalt beim Öffnen, gezielte Bearbeitung, JSON-Speichern/Laden und bestehendes Undo bei 1280/390 px. Datenformat und Speicher-/Bearbeitungslogik bleiben unverändert.

## 4.30.8 – Oktober 2026

- Zwischenstand und Abschluss verwenden eine gemeinsame Speichersperre. Veraltete Vorgänge nach Daten-, Projekt- oder Zielordnerwechseln bestätigen keinen aktuellen Speichererfolg; Regressionstests prüfen beide Startrichtungen und die tatsächlich geschriebenen Dateiinhalte.
- Gut sichtbares „Zwischenstand speichern“ in allen Reitern, über denselben Speicherweg wie Strg/⌘+S. Unvollständige Erfassungen werden ausschließlich als JSON-Projektdatei gespeichert.
- Ohne Ordnerzugriff verwendet Strg/⌘+S jetzt den bestehenden JSON-Download statt des Abschlusswegs; es entstehen keine Laborunterlagen. Abschlussprüfungen bleiben unverändert.
- Speicherstatus zeigt laufendes Speichern, Abbruch und Fehler. Änderungen während des Schreibens werden nicht als gespeichert gekennzeichnet; parallele Zwischenstand-Speicherungen werden verhindert. Datenformat, Ordnerstruktur, Nummerierung und Undo bleiben erhalten.

## 4.30.7 – Oktober 2026

- PAK-Vorbelegung: Hinzufügen neuer Proben, Ergänzen leerer Angaben und Ändern bestehender Angaben sind jetzt getrennte Aktionen. Hinzufügen überschreibt keine vorhandenen Angaben mehr.
- Vor Sammeländerungen zeigt eine Bestätigung die betroffenen PAK-Probennummern, Felder, neuen Werte und Überschreibungen. Abbrechen verändert keine Daten, Undo-Historie oder Speicherstatus; tatsächliche Änderungen bleiben in einem Schritt rückgängig machbar.
- Ungültige Anzahl, Datum und Fläche werden vor der Aktion abgefangen; wirkungslose Ergänzungen erzeugen keinen Undo-Eintrag und keinen geänderten Speicherstatus. Datenformat, andere Probenarten und gemeinsame Nummerierungsregel bleiben erhalten.

## 4.30.6 – Oktober 2026

- PAK-Erfassung: „Neue Proben“ heißt jetzt „PAK-Proben zurücksetzen …“ und steht getrennt von der Probenerfassung unter „Weitere Aktionen“. Ohne PAK-Proben ist die Aktion deaktiviert.
- Die Bestätigung nennt Anzahl und Projekt, erklärt den Verlust der PAK-Angaben und die bestehende Neunummerierung. „Abbrechen“ ist vorausgewählt; Abbrechen und Escape lassen alle Daten unverändert. Andere Probenarten und Projektangaben bleiben erhalten.

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
