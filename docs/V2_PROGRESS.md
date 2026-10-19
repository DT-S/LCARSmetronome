# Rhythm PADD 2.0 – Fortschrittsprotokoll

| Schritt | Status | Beleg / Nächster Schritt |
|---|---|---|
| Branch `develop/v2-rhythm-padd` aus v0.5.15 | ERLEDIGT | Basis-Commit `17ae97c` |
| Architektur-/Implementierungsinventur | ERLEDIGT | `ARCHITECTURE.md`, `src/app.js`, `src/interface.js`, `src/linear-layout.js`, `src/number-control.js`, `src/tempo-control.js`, CSS v0.5.15 gesichtet |
| Roadmap, Design, QA | ERLEDIGT | Diese V2-Dokumente |
| Test-Sicherheitsnetz + CI | OFFEN | Import-Graph/SW-Precache prüfen |
| P1 Universelles Layout | OFFEN | zuerst Shell / Breakpoints |
| P2 Alle Seiten | OFFEN | Metronome, Audio, Presets, Diary, Stats, System |
| P3 Präzisions-Fader | OFFEN | Zoom-Bubble + feiner Touch-Drag |
| P4 Zahlenleiter | OFFEN | BPM + Parameter |
| P5 Linear-Drag | OFFEN | stabile Pointer-Capture |
| P6 Motion / Plots | OFFEN | dezente Transitions |
| P7 Release-Freigabe | OFFEN | reale Geräte, PWA, Audio, Lizenzen |

**Abmachung:** Hier werden Testnachweise und bekannte offene Punkte nach jedem V2-Commit ergänzt. V1.0.5.15 auf `main` bleibt produktiv; V2 ist experimentell, bis die Geräteabnahme erfolgt.

## Beobachtungen aus dem Bestand
- Die iPhone-Optik ist als `@media (max-width:640px)` spät in `style.css` ergänzt; Desktop/Tablet nutzen deutlich ältere Regeln.
- Layout-/Skalierungscode in `src/app.js` und `src/linear-layout.js` ist mit dem Phone-Viewport gekoppelt.
- Number-Drag lebt in `src/number-control.js`, Tempo-Drag in `src/tempo-control.js`, Circular-Drag im `src/app.js`; Linear hat derzeit nur `button.onclick` für Akzente.
- Dynamische Buttongruppen bekommen Rundungen durch `installSegmentCorners`.
- Audio-Stereo-Panner hat bereits -1/0/+1 Presets; kein Audio-Rewrite nötig.
