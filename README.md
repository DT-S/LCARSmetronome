# LCARS METRONOME — Version 0.5.0

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

Bei späteren Codeänderungen Cache-Version in `sw.js` erhöhen, aktuell `lcars-core-v5.0.0`. Updates warten auf manuelle Aktivierung und löschen keine IndexedDB-Daten.

## Tests und offener Umfang

`npm test`: **73 Tests bestanden**, darunter alte/neue Backups, getrennte Klangzuordnung, Drag-/Winkelberechnung, audiozeitgenaue Ramp-Metadaten, Viertel-/Tupletlogik bis 20 × 20, Polyrhythmik, Polymetrik, Gap, Offbeat, Displacement, Ramp, Swing und 100 simulierte Takte ohne kumulativen Drift. JavaScript-Syntax, statische DOM-IDs und Modulpfade wurden geprüft.

Die Basisversionen wurden von dir auf Firefox erprobt. Version 0.5 ist hier nicht visuell oder akustisch im Browser bzw. auf einem echten iPhone getestet worden; die neuen Tagebuch- und Statistikseiten brauchen diesen Praxistest.

Weiterhin offen: Voice Count, Sticking-/Paradiddle-Trainer, Ziele, Routinen sowie weitere Statistikansichten. Die aktuelle Etappe ergänzt Übungstagebuch, CSV und eine erste interaktive Auswertung.
