# Rhythm PADD 2.0 – Release Candidate / Sign-off

## Stand
Der V2-Entwicklungsbranch ist funktional implementiert. **Es liegt noch keine vollständige Release-Freigabe vor.** Stand: 20.10.2026. `main` bleibt stabil; nicht automatisch zusammenführen oder deployen. Die Versionsnummer wird bis zur tatsächlichen Freigabe **nicht** auf 2.0.0 gesetzt.

## Bereits automatisiert nachgewiesen
- Node-Tests, Modulimport-/Syntaxchecks und Chromium-Browser-Smoke in 9 Auflösungen.
- Touch-/Keyboard-/Maus-Gesten in Circular/Linear und Audio-Matrix, inklusive Mehrfachrhythmen 3:5 / 3:7 / 20:20.
- LCARS-Morph/Transition, Reduced Motion und faktenbasierte Diagrammpunkte.
- Zusätzlicher P7-Browsercheck für lokale Service-Worker-Cache-Installation, Offline-Neustart und IndexedDB-Einstellungen: auf Erfolg des neu gestarteten CI-Laufs warten.

## Release-Blocker, die echte manuelle Abnahme erfordern
- **iPhone 13 / Safari PWA**: Installation (Zum Home-Bildschirm), Start mit Flugmodus, Safe Areas, Touch-Fader/Beats, horizontal/vertikal, Audio.
- **Tablet**: Safari oder vergleichbarer Touchbrowser, Navigation und beide Kanäle, Rotation/Scroll und PWA.
- **Arch Linux Firefox**: Browsergröße, Eingaben per Maus/Tastatur, IndexedDB, Export/Import, Neustart und Audio.
- **Kopfhörer-Audio**: Outer und Inner mit L/C/R, CENTER exakt, Pan fein, SOLO/MUTE, eigene Sounds, Swing, Ramp, Polyrhythmus, Start/Stop. Keine im Browser testbare Behauptung über hörbare Audio-Latenz machen.
- **PWA-Update und Daten**: Backup vor Installation, Speichereinstellungen/Presets/Übungstagebuch sichern; Offline-Start, Update mit Stop-Freigabe, Neustart, JSON-Export und Import-**Bestätigung**. Nie Nutzerdaten ohne Testkopie ersetzen.
- **Bekannter kleiner Bug**: Nutzer hat einen Fehler entdeckt, Details noch nicht spezifiziert. Vor dem öffentlichen Release reproduzieren und beheben.
- **Accessibility**: VoiceOver/Screenreader, Screenreaderwert der Audio-Slider, Tastaturfokus und Reduced Motion auf echten Geräten.

## Asset-/Lizenzprüfung
- Repository enthält eine MIT-Lizenz für den eigenen Softwarecode. Das **beweist nicht automatisch** Rechte an fremden Sounds, Marken, Grafiken oder Samples.
- Offline-PWA lädt sechs lokale UI-MP3-Dateien: `Acceptsound.mp3`, `Warningsound.mp3`, `buttonpress.mp3`, `hoversound.mp3`, `invalidsound.mp3`, `switchingmenus.mp3`. Für die Veröffentlichung Herkunft und Rechte dokumentieren oder durch eigene lizenzfreie Aufnahmen ersetzen.
- App-Icons: `assets/icon.svg`, `assets/icon-192.png`, `assets/icon-512.png`. Urheber und Nutzungsrechte verifizieren; die Lizenzdatei allein genügt als Nachweis nicht.
- Die Starfleet-/LCARS-Anmutung darf nicht als offiziell von Star Trek/Paramount/CBS lizenziert dargestellt werden. Produktname und Grafik vor öffentlicher Verbreitung gesondert prüfen.
- Keine externen Schrift- oder Runtime-CDNs in der V2-PWA erforderlich.

## Veröffentlichungsvorgang (nach Freigabe)
1. Testbackup sicher außerhalb der PWA aufbewahren; alle manuellen Gates dokumentieren.
2. Bekannten Bug und weitere Abweichungen beseitigen; komplette CI neu starten.
3. Erst dann Versionssprung auf `2.0.0`, SW-Cache aktualisieren, `CHANGELOG` und Release Notes finalisieren.
4. Explizite Freigabe zum Merge nach `main` einholen; Deploy nach Merge auf reale URLs prüfen.
5. Alte IndexedDB-Daten und Offline-Updatepfad ohne Verlust prüfen.

**Status: RELEASE BLOCKED – Geräte-/Audio-/Lizenzabnahme und Bugbearbeitung offen.**
