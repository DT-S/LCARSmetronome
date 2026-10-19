# LCARS METRONOME — Version 0.5.9

## v0.5.9 · Mobile interface scaling and full-height frame

- Fresh iPhone/mobile sessions default to **90%** interface scale. Previously saved manual choices remain unchanged.
- The LCARS PADD compensates for CSS `zoom` so its outer rail and bottom band fill the full `100dvh` safe viewport instead of leaving a black gap.
- The width cap also accounts for zoom on wider phones. Desktop and iPad retain the original 100% default/layout.
- Audio engine, rhythm, storage schema and export formats are unchanged.

---

# LCARS METRONOME — Version 0.5.8

## v0.5.8 · iPhone header title positioning

- Anchored RHYTHM PADD directly below the top LCARS rail in the black header area.
- Removed the hidden 28px desktop text line that pushed the mobile title behind the content panel.
- No other visual or functional changes; previously corrected operating-mode corner radii are preserved.

---

# LCARS METRONOME — Version 0.5.7

## v0.5.7 · Mobile headline + precise mode corners

- `RHYTHM PADD` is now a real mobile HTML title with a stable Arial font, rather than an Impact pseudo-element that could display broken glyphs in iPhone Safari. The original desktop heading stays intact.
- The mobile 2×4 operating mode grid now rounds only **one corner per outermost button**: top-left (STANDARD), top-right (GAP CLICK), bottom-left (RANDOM GAP) and bottom-right (TEMPO RAMP). All touching corners remain square.
- iPhone-sized Chromium layout checks at 320, 375, 390 and 430 CSS pixels verified title geometry and all 32 corner radii. Desktop and iPad display unchanged. 85 existing Node tests passed.
- Audio, storage, timing and mode behavior remain unchanged. Service-worker cache updated to v5.7.0 for installed PWAs. Real iPhone Safari still needs user verification.

---

# LCARS METRONOME — Version 0.5.6

## v0.5.6 · Mobile LCARS polish

- Durchgehender, farblich segmentierter Kopf-Balken oberhalb von RHYTHM PADD, verbunden mit dem linken LCARS-Elbow.
- Runde Beat-Dots im Circular Sequencer durch echte, gekrümmte SVG-Arc-Segmente ersetzt. Vier Beat-Zustände, Pointer-Gesten, Tastaturzugriff, bis 20 Beats bleiben erhalten.
- Mobile Stats-Charts verwenden eine kompakte SVG-Plotgeometrie statt 520-Pixel-Mindestbreite: kein seitliches Scrollen innerhalb der Diagramme. Modus-/History-Buttons verkleinert.
- Diary-Category- und Analytics-Filtersegmente bilden durchgehende LCARS-Gruppen mit äußeren Rundungen. Details/Delete spiegelbildlich gestaltet.
- Practice Calendar verwendet proportional skalierte, abgerundete Tagesquadrate mit Tagesnummer, Monatswechselmarkierung und aktiver Auswahl.
- Panel-Titel rechtsbündig in ihrer tatsächlichen Inhaltsfläche verankert, kompaktere mobile Statistiktabellen.
- Desktop- und iPad-Layout unverändert; Audio-Engine, Timing und lokales Datenschema unverändert. Cache-Version für Offline-PWAs erhöht.
- 85 automatisierte Tests bestanden; Chromium-Checks bei 320, 375, 390, 430, 768 und 1440 CSS-Pixeln mit Beispiel-Einträgen; iPhone-Safari-Hardwaretest steht noch aus.

---

## v0.5.5 · Rhythm PADD (mobile)

- Komplett neue mobile TNG-PADD-Oberfläche für Smartphones bis 640 CSS-Pixel Breite: fester LCARS-Rahmen mit originalgetreuem Header-Elbow, sechs vertikalen Navigationsfeldern, farbiger linker Systemleiste, unterem Abschlussband und segmentierten Bedienelementen.
- Voll funktionsfähiger Circular Sequencer auf iPhone 13 jetzt 236 CSS-Pixel, bei sehr schmalen Geräten 207 CSS-Pixel. Linearansicht weiterhin umschaltbar.
- In der Metronomansicht: acht Modi als zweireihige LCARS-Schalter, Status- und Taktparameter-Felder sowie große TAP TEMPO / START-Schaltflächen mit beidseitigen Rundungen.
- Der Rahmen bleibt während des Scrollens im Inhaltsbereich sichtbar. Längere Trainings-, Audio-, Log-, Analyse- und Einstellungsseiten scrollen ausschließlich innerhalb des rechten Kontrollfeldes.
- Wechsel zwischen den sechs Ansichten setzt auf Smartphones die Inhaltsposition zurück an den Anfang der neuen Ansicht.
- Keine externen Fonts oder sonstige Netzabhängigkeiten hinzugefügt. Tablet/PC-Design unverändert, Audio-/Rhythmus-Engine und gespeicherte Daten unverändert.
- Service-Worker-Cache auf v5.6.0 angehoben, um die neue Oberfläche auch in installierten PWAs auszuliefern.
- 85 Node-Tests bestanden, Browserchecks bei 320, 375, 390, 768 und 1440 CSS-Pixeln: alle sechs Ansichten, acht Betriebsmodi, Circular/Linear-Umschaltung, keine horizontalen Überläufe oder Laufzeitfehler in Chromium. START ist im iPhone-13-Viewport ohne Scrollen erreichbar. Echter Safari-/iPhone-Gerätetest ausstehend.

---

# LCARS METRONOME — Version 0.5.4

## 0.5.4 · Authentisches mobiles LCARS-Brückendesign

- Größere zusammenhängende LCARS-Bögen: hohler orangefarbener Header, mehrfarbige durchlaufende Balken und ein breiter segmentierter Navigationssteg.
- Sechs navigierbare Ansichten in zwei Zeilen zu je drei Tasten mit gerundeten äußeren rechten Abschlüssen. Keine gewöhnlichen Web-App-Kacheln.
- Funktionsleiste und acht Betriebsmodi mit eigener geschwungener LCARS-Seitenschiene.
- Die komplette Metronom-Bediengruppe bildet ein zusammenhängendes rosafarbenes LCARS-Gehäuse mit oberem Bogen und unterem blau-violettem Abschluss; Circular Sequencer bewusst auf maximal 300 CSS-Pixel verkleinert.
- START und TAP TEMPO bleiben vor dem Sequencer; ausreichend große Berührungsflächen, auch bei 320 CSS-Pixeln.
- Nur mobile CSS-Regeln (max-width 640px) verändert. Metronom-Engine, Zustandsmodell, Audio und Desktop-/iPad-Layout unverändert.
- Service-Worker-Cache auf v5.4.0 aktualisiert, damit installierte PWAs die überarbeitete Stylesheet-Version laden.
- Automatisierte Node-Tests: 85 bestanden. Darstellung und Klickaktionen im Chromium-Browsermodell überprüft; echter iPhone-Safari-Test steht aus.

---

## Vorherige Version 0.5.3

## iPhone LCARS bridge layout (0.5.3)

- Exclusive phone-first visual layout on viewports up to 640 CSS pixels. Desktop and iPad use the existing layout.
- Six navigation tabs appear as a 3 × 2 LCARS console with a continuous left spine and rounded outer-right edges. Very narrow phones use 2 × 3 tabs.
- Clearly separated rows for eight rhythm modes; their outer buttons have LCARS caps.
- START and TAP TEMPO come before the circular sequencer on phones, so transport is accessible without scrolling past the dial. The dial stays large, and the four pattern states remain visible.
- Space-efficient header, title bars, information panels, readable labels and safe-area-aware padding.
- Only CSS layout and UI copy changed; no audio, state, gesture, storage or rhythm logic touched.
- Offline cache updated so installed PWAs receive the new CSS on update.
- 85 existing Node tests passed. Automated Chromium render/layout previews at 320, 375, 390, 768 and 1440 CSS pixels showed no horizontal overflow. Real iPhone Safari/PWA appearance must still be verified on the device.

---

## Previous version 0.5.2

## iPhone-Bedienung in 0.5.2

- **Touch-Feedback:** Auflegen des Fingers auf einen aktiven Bedienknopf oder eine Info-Klappe spielt den Hoverton. Loslassen/Aktivieren spielt den Tastenton. Wechsel zu einer anderen Hauptseite oder einem anderen Metronom-Modus verwendet den Wechselton; erneutes Drücken der aktiven Auswahl verwendet `buttonpress.mp3`. Sound-Auswahlknöpfe behalten ihre Instrumentenvorschau.
- **Info-Klappen:** Öffnen und Schließen per Summary-Fläche (inklusive Plus-/Minus-Symbol) erzeugt den Tastenton; funktioniert auch per Tastatur.
- **Kein verspäteter Hover:** Wird der Finger vor Abschluss der Audiofreigabe losgelassen oder zum Scrollen bewegt, entfällt ein noch ausstehender Hoverton. UI SOUNDS und HOVER / TOUCH SOUND bleiben abschaltbar. Beim allerersten Kontakt muss der Browser die Audioausgabe freigeben und Dateien laden.
- **SETTINGS → INTERFACE SIZE:** 70, 80, 90, 100 oder 110 Prozent. Empfehlung zum Ausprobieren auf dem iPhone: 80 oder 90 Prozent. Die Wahl wird lokal und im Backup gespeichert; Presetwechsel behalten sie bei. Bestehende Backups ohne diesen Wert starten unverändert bei 100 Prozent. Browser-Pinch-Zoom bleibt möglich.
- **Mobile Anordnung:** Metronom-Modi in zwei Reihen mit je vier Buttons, kompaktere Abstände zwischen Kopf, Instrument und Panels. Skalierungsfeld oben in Settings über die volle Breite.

85 Logiktests bestanden, einschließlich Touch-Feedback, Abbruch bei Scrollen/Loslassen, aktive Navigation und Skalierungs-Migration. Syntax, Modulpfade, statische IDs und Offline-Dateiliste geprüft. Kein echter iPhone-/Safari-Test in dieser Umgebung; Skalierung und Soundfreigabe auf dem Gerät gegenprüfen.

## Korrekturen in 0.5.1

- Erster Operating-Mode-Button links abgerundet; der zusätzliche linke Rand entfällt.
- Die große BPM-Zahl ist direkt eine Gestenfläche: vertikal ziehen oder mit seitlichem Beginn kreisförmig drehen. Doppeltippen/Doppelklick oder 600 ms halten öffnet die Tastatureingabe. Enter/Verlassen übernimmt, Escape verwirft. Pfeiltasten ändern das Tempo um 1 BPM. Plus/Minus bleiben separat bedienbar.
- 72 geometrisch gesetzte Teilstriche im Abstand von exakt 5°, inklusive der vier Hauptachsen, ersetzen die gestrichelte Kreislinie mit unpassender Naht.
- Metronomkanäle mit Faktor 2 (+6,02 dB) vor dem gemeinsamen Metronomkompressor. Der Kompressor reduziert starke Summenspitzen; UI-Töne und gespeicherte Reglerwerte bleiben unverändert. +6 dB Signalpegel bedeutet nicht zwingend doppelt wahrgenommene Lautheit. Gilt für Synth- und eigene Sounds.

79 Logiktests bestanden, darunter direkte Touchgesten, Doppeltippen, Doppelklick, Halten/Abbruch, Zahleneingabe, exakte Teilung und getrennte Pegel. Kein echter iPhone-Gesten-, visueller Browser- oder Hörtest dieser Version in dieser Umgebung. Bitte zunächst mit reduziertem Gerätepegel gegenprüfen.

## Neu in 0.5.0 – animierte Analyse und eigene Sounds

**ANALYTICS → VISUAL ANALYSIS:** Tempoentwicklung (höchstes BPM und separat selbst angegebenes sauberes BPM), Übungsminuten mit gleitendem 7-Tage-Mittel, Sessions pro Tag und Stufenverlauf einzelner Sessions. Eine Punktwolke zeigt Dauer gegen höchstes Tempo, farblich nach Kategorie; Auswahl eines Punktes öffnet den Tagebucheintrag. Alle Ansichten folgen den vorhandenen Filtern. Kurven zeichnen sich beim Öffnen auf, Balken wachsen ein. Punkte/Balken per Maus, Touch oder Tastatur auswählen, um exakte Werte zu lesen. Fehlende Tempo-Tage bleiben Lücken; bei Zeit/Sessions sind Nulltage enthalten. Reduzierte Bewegung im Betriebssystem deaktiviert die Animationen. Tagesplots zeigen bis zu zehn Jahre; Sessionauswahl die letzten 20 passenden Einträge. Auf schmalen Displays sind die Diagramme horizontal scrollbar.

**SETTINGS → CUSTOM SOUND MEMORY:** Audiodateien per Upload oder Drag & Drop hinzufügen, vorhören und löschen. Bis zu 16 Sounds, je 2 MB und 5 Sekunden, insgesamt 12 MB Base64-Daten. MP3/WAV und weitere vom jeweiligen Browser dekodierbare Formate. Anschließend in AUDIO MATRIX pro Kanal und Akzent auswählen. Kein Pitch-Shifting der Dateien, Lautstärke/Pan/Mute/Solo folgen dem Mixer. Der direkte Vorhörknopf nutzt Kanal 1. Upload und Löschen bei gestopptem Metronom.

Die Audiodaten werden lokal in IndexedDB gespeichert und im vollständigen JSON-Backup mitgeführt. Presets referenzieren Sounds ohne die Audiodaten zu duplizieren. Löschen ersetzt betroffene Zuweisungen auch in Presets durch Classic click. Backups der Versionen 1–4 werden weiter akzeptiert. Bei einem Restore werden eigene Sounds vor Übernahme vollständig dekodiert; ein nicht unterstütztes Audioformat verwirft den Import. Vor dem Schließen auf SAVED ON THIS DEVICE warten.

73 Logiktests bestanden. JavaScript-Syntax, Modulpfade, HTML-IDs und Offline-Dateiliste geprüft. Die neuen Diagramme und Datei-Uploads wurden hier nicht in einem echten Browser oder auf dem iPhone getestet.

## Neu in 0.4.0 – Übungstagebuch und Statistik

- **PRACTICE LOG:** automatische Aufzeichnung pro Start → Stop, optional abschaltbar. Übungsname und Kategorie vor Start festlegen. Eigene Kategorien, Notizen, freiwillige Bewertung (1–5) und selbst angegebenes sauberes BPM. Bearbeitung direkt in der Seite, manuelle Einträge und Löschen.
- **Audiozeit statt Bildschirmzeit:** Einzählen ausgeschlossen; stille Gap-Takte enthalten. Tempo-/Moduswechsel werden an den geplanten Taktgrenzen erfasst und beim Stop auf die tatsächlich erreichte Zeit gekürzt. Countdown endet exakt am Sollende. Ein Scheduler-Aussetzer zählt nicht als minutenlanges Training. Gemessene Zeit-/Tempoangaben bleiben bei der Bearbeitung unverändert.
- **ANALYTICS:** 7/30/90 Tage oder Gesamtzeit, Kategorie, Übungsname und gemessen/manuell als Filter. Gesamtminuten, Sessions, aktive Tage, BPM-Spitzen, anklickbarer Tageskalender, Kategorie-/Modusverteilung und BPM-Verlauf der letzten 20 passenden Sessions. Sauberes BPM ist ausdrücklich Selbstauskunft. Tageszuordnung nach lokalem Startdatum; Kalender maximal 366 Tage, Summen ohne diese Begrenzung.
- **CSV für Excel:** UTF-8 mit BOM, Semikolon, deutsche Datumsdarstellung, Notizen und Tempoverlauf. JSON enthält zusätzlich das vollständige Tagebuch. Bestehende Backups der Versionen 1–3 werden migriert. Presets speichern keine Übungsdaten und überschreiben sie beim Laden nicht.
- **LCARS:** große Farbflächen und Buttons, neue Seiten ohne Dropdowns oder Popup-Editor. Zahlen direkt eingeben; Pflichtzahlen im manuellen Editor zusätzlich ziehen/drehen.

Stop beendet eine Session; ein Neustart erzeugt eine neue. Zwischenzeiten zählen nicht mit, eine separate Pause-/Fortsetzen-Funktion ist noch nicht enthalten. Aufzeichnung misst die Laufzeit des Metronoms, nicht dein tatsächliches Spiel. Vor dem Schließen stoppen und auf **SAVED ON THIS DEVICE** warten: Beim Schließen wird ein letzter Speicherversuch unternommen, ein abrupter Browser-/Geräteabbruch kann die laufende Session verlieren. Maximal 10.000 Einträge, 100 Kategorien; regelmäßig exportieren.

## Design-Update 0.3.1

Trainingsparameter, Practice Clock, Mixer und Settings verwenden jetzt durchgehend große LCARS-Farbflächen: Beschriftung links, Wert/Option rechts, klare schwarze Trennfugen. Bereichstitel, Statusanzeigen und die Akzentnamen der Audio Matrix sind ebenfalls breite Felder. Settings-Schalter zeigen ON/OFF in großen Touchflächen. Erklärungen liegen hinter großen aufklappbaren Info-Tasten; wichtige Offline-/Speicherzustände bleiben sichtbar.

Die Bedienfunktionen und Audio-/Rhythmuslogik aus 0.3 bleiben erhalten. Keine neuen Features oder Datenmigration in diesem Design-Update. HTML-Struktur, DOM-IDs, geänderte JavaScript-Dateien und CSS-Klammern geprüft. Kein visueller Browser-/iPhone-Test dieser Version in der Entwicklungsumgebung. Die 51 Logiktests stammen aus 0.3; für diese reine Gestaltung wurden keine neuen Tests geschrieben.

## Änderungen aus 0.3 nach deinem Firefox-Test

- **Doppelakzent-Highlight repariert.** Der weiße aktive Ring hat jetzt höhere CSS-Priorität als alle normalen Akzentfarben. Beim Doppelakzent bleibt der Kern orange, umgeben von einem kräftigen weißen Abspielring.
- **Tempo Ramp im Zentrum:** Starttempo groß und editierbar; darunter NOW (aktuelles Tempo), Änderung zum Starttempo und TARGET. Live-Werte folgen den tatsächlich fälligen Audioereignissen, nicht der vorausgeplanten nächsten Stufe.
- **Operating Mode als horizontale LCARS-Buttonleiste.** Auf kleinen Displays umbrechend, ohne Dropdown.
- **Trainingsparameter rechts im Hauptbildschirm.** Keine zweite Trainingsseite und kein separater „Training Parameters“-Umweg. Practice Clock bleibt direkt darunter. Die kompakte Patternanzahl steht unter dem Instrument und funktioniert auch in Linear View.
- **Edit Patterns / Popup entfernt.** Linear View ist der direkte alternative Patterneditor; dessen Felder sind nun breite LCARS-Segmente.
- **Zahlensteuerung:** Tippen öffnet direkte Eingabe. Nach oben/unten ziehen verändert Werte; mit einer seitlichen Anfangsbewegung wird die Drehsteuerung aktiviert. Weiter weg vom Mittelpunkt ergibt eine feinere Winkeländerung. Pfeiltasten, Page Up/Down und Home/End funktionieren ebenfalls. Keine nativen Zahlen-Spinners.
- **Drei eigene Klangzuweisungen pro Kanal:** Double Accent, Accent und Normal erhalten jeweils eine Auswahl aus acht Instrumenten. Beide Kanäle sind unabhängig. Die Auswahlbuttons sind horizontal neben den Akzentbezeichnungen; mobil umbrechend.
- **Metronom-MP3-Slots entfernt.** Die Metronomklänge werden vollständig synthetisiert. Deine sechs Menü-MP3s bleiben unverändert. Voice Count ist weiterhin eine spätere Erweiterung.

## Update

1. Optional vor dem Austausch ein JSON-Backup exportieren.
2. Projektdateien durch den Inhalt dieses Ordners ersetzen; dieselbe URL, denselben Host und Port weiterverwenden.
3. Online öffnen und in SETTINGS **INSTALL UPDATE & RELOAD** aktivieren, sobald angeboten. Wiedergabe vorher stoppen.

Einstellungen und Presets aus Datenformat 1 und 2 werden automatisch in Format 3 überführt. Eine bisherige Klangfamilie wird auf alle drei Akzente des jeweiligen Kanals übertragen. Die alte Auswahl `auto` wird zu Classic Click. Eine vorhandene IndexedDB wird nicht gelöscht. Alte Dateien in `assets/audio/metronome/` werden nicht mehr geladen und können lokal entfernt werden.

## Bedienung

Äußerer Ring = Viertel pro Takt. Innerer Ring = Unterteilungen je Viertel. Der innere Ring durchläuft seine Punkte, bevor der äußere weitergeht. Beide Anzahlen: 1–20. BPM: 20–400.

Tippen auf einen Punkt wechselt Doppelakzent → Akzent → Normal → Stumm. Die drei hörbaren Zustände sind verschiedene Klanghöhen/-farben und keine bloßen Lautstärkeabstufungen. Doppelakzent ist ein einzelnes Klangereignis. Zwei gleichzeitig aktive Kanäle dürfen bewusst überlagern.

Ringe und BPM-Zentrum sind drehbar. Patternlängen lassen sich zusätzlich unter dem Instrument einstellen. Direkte zentrale BPM-Eingabe und Plus/Minus bleiben verfügbar. Tap Tempo und Leertaste starten/stoppen bzw. setzen das Tempo wie bisher.

In AUDIO MATRIX: Instrument antippen zum Zuweisen. Bei gestopptem Metronom wird der Klang sofort vorgehört. Während der Wiedergabe wird nur zugewiesen, damit kein zusätzlicher Klick außerhalb des Takts entsteht. Hörproben respektieren Lautstärke, Panorama, Mute und Solo.

**MUTE** schaltet diesen Kanal stumm. **SOLO** lässt nur solo geschaltete Kanäle hören; so kannst du beispielsweise bei einem Polyrhythmus die innere Stimme allein üben. Beide Funktionen bleiben unabhängig von den Akzentmustern.

## Instrumente

Classic Click, Glass Bell, Woodblock, Side Stick, Kick Drum, Snare Drum, Clave und Shaker. Alle werden lokal vorberechnet und brauchen keine Downloads. Akzentzustände sind auf gleichen Spitzenpegel normalisiert; Klangfarben können trotzdem unterschiedlich laut wirken.

## Trainingsmodi

| Modus | Rhythmus |
|---|---|
| Standard | Viertel mit gleichmäßigen Unterteilungen je Viertel. |
| Polyrhythm | Zwei Punktzahlen teilen dieselbe frei wählbare Zyklusdauer von 1–20 Vierteln. |
| Polymeter | Beide Patterns rücken pro Viertel vor und laufen unabhängig um; 3 gegen 4 trifft nach 12 Vierteln wieder zusammen. |
| Gap Click | Feste hörbare und stumme Taktblöcke. |
| Random Gap | Phasenlängen zufällig innerhalb eigener Minimal-/Maximalwerte. |
| Offbeat | Wechsel zwischen Downbeat und +1/2 oder +1/4 Viertel; innerer Kanal bleibt stumme Orientierung. |
| Displacement | Achtel-/Sechzehntelverschiebung automatisch oder manuell, vorwärts oder rückwärts. |
| Tempo Ramp | Starttempo → Zieltempo in Stufen alle X Takte; optional zurück und wiederholen. |

Swing 50:50 bis 75:25 gilt nur für passende gerade Unterteilungen in Standard, Gap, Random Gap und Ramp. Der Regler ist sonst deaktiviert. Count-in: 0–8 Zyklen. Countdown: 0–3600 Sekunden, wobei 0 offenes Üben bedeutet. Count-in ist aus der Übungszeit ausgeschlossen.

## Timing

AudioContext-Zeitstempel bestimmen die Ausgabe. Ein 25-ms-Timer füllt nur die 100-ms-Vorschau. Struktur-, Tempo-, Instrumenten- und Trainingsparameteränderungen gelten ab der nächsten noch nicht vorausgeplanten Zyklusgrenze. Mixerwerte gelten direkt. Modus-/Patternlängen-/Starttempo-/Trainingsparameteränderungen starten die lokale Trainerphase an dieser Grenze neu; gewöhnliche Akzentänderungen behalten sie bei.

Die große Ramp-Zahl ist weiterhin der editierbare Startwert. NOW zeigt das aktuell hörbare Tempo, der Wert daneben den Abstand zum Start, TARGET das Ziel. Es wird nicht durch vorzeitiges Anzeigen der nächsten Scheduler-Stufe vorgegriffen.

Bei suspendiertem AudioContext oder verpasster Scheduling-Frist wird gestoppt. Gesperrtes Display und Hintergrundwiedergabe sind nicht garantiert. Bluetooth kann Ausgabelatenz hinzufügen. Haptik funktioniert nur bei Browserunterstützung.

## Start / Hosting

```sh
python3 -m http.server 8080
```

Dann `http://localhost:8080` öffnen. Kein Build und keine npm-Installation nötig. Nicht per Doppelklick als `file://` öffnen.

Für GitHub Pages die **Inhalte** des Ordners veröffentlichen, inklusive `.nojekyll`. Relative Pfade unterstützen Repository-Unterpfade. Hier wurde nichts veröffentlicht.

Auf dem iPhone HTTPS-Adresse in Safari öffnen, zum Home-Bildschirm hinzufügen, unter SETTINGS auf „Offline resources cached“ warten und Audio testen. Anschließend offline neu öffnen und prüfen.

## Backups und Updates

JSON enthält Einstellungen, die sechs Akzent-Klangzuweisungen, Presets und das Übungstagebuch. Vor einem Import wird validiert und die Ersetzung bestätigt. Persistenz schützt nicht vor manuellem Löschen oder Geräteverlust; regelmäßig exportieren.

Bei späteren Codeänderungen Cache-Version in `sw.js` erhöhen, aktuell `lcars-core-v5.2.0`. Updates warten auf manuelle Aktivierung und löschen keine IndexedDB-Daten.

## Tests und offener Umfang

`npm test`: **73 Tests bestanden**, darunter alte/neue Backups, getrennte Klangzuordnung, Drag-/Winkelberechnung, audiozeitgenaue Ramp-Metadaten, Viertel-/Tupletlogik bis 20 × 20, Polyrhythmik, Polymetrik, Gap, Offbeat, Displacement, Ramp, Swing und 100 simulierte Takte ohne kumulativen Drift. JavaScript-Syntax, statische DOM-IDs und Modulpfade wurden geprüft.

Die Basisversionen wurden von dir auf Firefox erprobt. Version 0.5 ist hier nicht visuell oder akustisch im Browser bzw. auf einem echten iPhone getestet worden; die neuen Tagebuch- und Statistikseiten brauchen diesen Praxistest.

Weiterhin offen: Voice Count, Sticking-/Paradiddle-Trainer, Ziele, Routinen sowie weitere Statistikansichten. Die aktuelle Etappe ergänzt Übungstagebuch, CSV und eine erste interaktive Auswertung.
