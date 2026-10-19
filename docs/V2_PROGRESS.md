# Rhythm PADD 2.0 – Fortschrittsprotokoll

| Schritt | Status | Beleg / Nächster Schritt |
|---|---|---|
| Branch `develop/v2-rhythm-padd` aus v0.5.15 | ERLEDIGT | Basis-Commit `17ae97c` |
| Architektur-/Implementierungsinventur | ERLEDIGT | `ARCHITECTURE.md`, `src/app.js`, `src/interface.js`, `src/linear-layout.js`, `src/number-control.js`, `src/tempo-control.js`, CSS v0.5.15 gesichtet |
| Roadmap, Design, QA | ERLEDIGT | Diese V2-Dokumente |
| Test-Sicherheitsnetz + CI | ERLEDIGT | [Erster GitHub-Actions-Lauf erfolgreich](https://github.com/DT-S/LCARSmetronome/actions/runs/39332554154); `tests/module-integrity.test.js` prüft Import-/PWA-Integrität |
| P1 Universelles Layout | IN ARBEIT | Neues `v2-layout.css` für >640px, Shell/Navigation/Footer/erste Inhaltsraster; Browser- und Nutzerabnahme offen |
| P2 Alle Seiten | OFFEN | Metronome, Audio, Presets, Diary, Stats, System |
| P3 Präzisions-Fader | OFFEN | Zoom-Bubble + feiner Touch-Drag |
| P4 Zahlenleiter | OFFEN | BPM + Parameter |
| P5 Linear-Drag | OFFEN | stabile Pointer-Capture |
| P6 Motion / Plots | OFFEN | dezente Transitions |
| P7 Release-Freigabe | OFFEN | reale Geräte, PWA, Audio, Lizenzen |

**Abmachung:** Hier werden Testnachweise und bekannte offene Punkte nach jedem V2-Commit ergänzt. V0.5.15 auf `main` bleibt produktiv; V2 ist experimentell, bis die Geräteabnahme erfolgt.

## Beobachtungen aus dem Bestand
- Die iPhone-Optik ist als `@media (max-width:640px)` spät in `style.css` ergänzt; Desktop/Tablet nutzen deutlich ältere Regeln.
- Layout-/Skalierungscode in `src/app.js` und `src/linear-layout.js` ist mit dem Phone-Viewport gekoppelt.
- Number-Drag lebt in `src/number-control.js`, Tempo-Drag in `src/tempo-control.js`, Circular-Drag im `src/app.js`; Linear hat derzeit nur `button.onclick` für Akzente.
- Dynamische Buttongruppen bekommen Rundungen durch `installSegmentCorners`.
- Audio-Stereo-Panner hat bereits -1/0/+1 Presets; kein Audio-Rewrite nötig.

## P0: technische Absicherung
- Import-/Service-Worker-Graph wird im Node-Test-Runner geprüft, bevor ein PWA-Update veröffentlicht wird.
- GitHub Actions führt `npm test` bei Push auf den V2-Branch und bei PRs nach `main` aus.
- Browser- und Geräteprüfung stehen weiter aus; ein CI-Status kann diese nicht ersetzen.

## Erster verifizierter CI-Nachweis
- Workflow: [Rhythm PADD V2 checks / Run 39332554154](https://github.com/DT-S/LCARSmetronome/actions/runs/39332554154).
- Status: `completed`, Conclusion: `success`; Checkout, Node.js 22, `npm test` erfolgreich.
- Dieser Nachweis umfasst **Node-Tests**, keine realen Safari-/Firefox-/Tablet-Screenshots.
\n- P1b Implementierung der Tablet-/Desktop-Shell und responsiver Metronom-/Audio-Container in isolierter CSS-Migrationsdatei; Phone-CSS bleibt unverändert.\n- Browser-Layout, Geräte-Gegenprobe und CSS-Konsolidierung stehen weiterhin aus.\n
## P1b – Automatisierte Browserprüfung am 19.10.2026

- Commit: `e943fe729f974f0c8b3d5ecd77b76cddb7932a4c`.
- [GitHub Actions / Chromium-Smoke-Test](https://github.com/DT-S/LCARSmetronome/actions/runs/39334206528): beide Jobs `node-regressions` und `browser-smoke` erfolgreich.
- Fünf geprüfte Auflösungen: 390×844 (iPhone-ähnlich), 768×1024 (Tablet Portrait), 1024×768 (Tablet Landscape), 1440×900 und 1920×1080 (Desktop).
- Browser-Checks: Boot ohne JS-/Asset-Fehler; 8 Modes; sichtbare Header-/Sidebar-/Contentbereiche; Circular/Linear-Switch; Audio Matrix mit sechs L/C/R-Buttons und Werten `+1` / `0`.
- Zehn Screenshots (Metronome + Audio Matrix pro Auflösung) sind im Workflow als 7-Tage-Artefakt `rhythm-padd-v2-layout-screenshots` hinterlegt.
- Erste manuelle Sichtung dieser Chromium-Screenshots: Header/Fascia/Footer sichtbar und konsistent, Metronom auf Tablet sinnvoll skaliert, Audio Matrix auf Desktop zweispaltig. Tablet-Seitennavigation recht eng, hier folgt Feintuning.
- **Offen:** Safari auf echtem iPhone/iPad, Firefox auf Arch Linux, volle Seiten Presets/Diary/Stats/System, 70–110%-Zoom, sehr schmale/extrem breite Fenster, Scroll/Focus, visuelle Endabnahme. Browser-Screenshots allein sind kein Release-Gate.

