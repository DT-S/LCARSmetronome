# Rhythm PADD 2.0 – Fortschrittsprotokoll

| Schritt | Status | Beleg / Nächster Schritt |
|---|---|---|
| Branch `develop/v2-rhythm-padd` aus v0.5.15 | ERLEDIGT | Basis-Commit `17ae97c` |
| Architektur-/Implementierungsinventur | ERLEDIGT | `ARCHITECTURE.md`, `src/app.js`, `src/interface.js`, `src/linear-layout.js`, `src/number-control.js`, `src/tempo-control.js`, CSS v0.5.15 gesichtet |
| Roadmap, Design, QA | ERLEDIGT | Diese V2-Dokumente |
| Test-Sicherheitsnetz + CI | ERLEDIGT | [Erster GitHub-Actions-Lauf erfolgreich](https://github.com/DT-S/LCARSmetronome/actions/runs/39332554154); `tests/module-integrity.test.js` prüft Import-/PWA-Integrität |
| P1 Universelles Layout | BROWSER-QA ERFOLGREICH; GERÄTE OFFEN | Shell, P1c Detailraster, Navigation und Zoom für 9 Viewports erfolgreich; CSS-Konsolidierung und echte iPhone/iPad/Firefox-Tests offen |
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


## P1c: Zweiteilige responsiv gestaltete Seiten (Implementierung)
- `v2-layout.css`: Preset-Formular und Karten; Diary-Session-Setup/Editor/History; Stats-Filters/Plots/Kalender; System-Karten/Skalierung; Tablet-Navigation mit Kurzlabels. Ohne geänderten Audio- oder Speicher-Code.
- Noch offen: automatisierte Browserprüfung **aller sechs** Seiten inkl. Zoom und echte Geräteabnahme. Erst nach Resultaten Status aktualisieren.

- **Skalierungsregression gefunden:** Der erste Volltest deckte bei `0.7` Desktop-/Tablet-Zoom rechts abgeschnittene Rahmen auf. Doppelte Breitenkompensation in `v2-layout.css` entfernt; Browser-Neutest ausstehend. Der erste Fehltest zuvor war nur ein falsch geschachtelter Playwright-Selektor, bereits korrigiert.

- [Chromium CI-Erfolg: Lauf 39336109612](https://github.com/DT-S/LCARSmetronome/actions/runs/39336109612): 5/5 Auflösungen, sechs Tabs, Diary-Editor, L/C/R-Panorama, Interface-Skalen 70 % und 110 %. Zoomfehler der vorigen Tests behoben. Vier zusätzliche Grenzauflösungen sind als P1d-Regression eingerichtet und noch nicht abgenommen.

- Screenshot-Sichtung nach 9/9 grünem Chromium-Lauf ergab eine Navigationsschwäche: bei Tablet/Desktop blieb die alte Main-Scrollposition erhalten. `src/app.js` setzt jetzt bei **jedem** Tabwechsel `main.scrollTop=0`; Browser-Regressionstest und SW-Cache-Update ergänzt. Erneute CI-Abnahme ausstehend.

## P1c/P1d – Letzter erfolgreicher Browser-Nachweis (19.10.2026)

- **[GitHub Actions: 39336610055](https://github.com/DT-S/LCARSmetronome/actions/runs/39336610055) – SUCCESS**, beide Jobs `node-regressions` und `browser-smoke`.
- **9/9 Headless-Chromium-Viewports:** 320×740, 390×844, 641×820, 768×1024, 900×600, 1024×768, 1280×800, 1440×900, 1920×1080.
- Jeder Viewport: Start, Circular/Linear, Audio Matrix mit Center/Right-Panorama, Presets, Diary und dessen Editor/Cancel, Stats, System, Interface-Skalen 70 %/110 %, und nach Tab-Wechsel wieder am Seitenanfang.
- Alle Screenshots im Workflow-Artefakt `rhythm-padd-v2-layout-screenshots` (Aufbewahrung 7 Tage).
- **Sichtprüfung:** Für Tablet/PC sind die Hauptbereiche plausibel angeordnet, beide Audiokanäle auf breitem Desktop nebeneinander. Der 641-px-Grenzfall und kurzhohes 900×600-Landscape sind funktional, ein angeschnittener unterer Inhalt ist wegen des gezielt scrollbaren `main` zulässig.
- **Noch offen:** iOS Safari/echte iPhone/iPad-PWA, Arch-Firefox, Keyboard-Fokus/Accessibility, reale Audio-Latenz und volle Diagramme mit vielen Sessions. Diese Punkte sind keine bestandenen Tests.

**P1c = Layout-Implementierung + grundlegende Browser-QA erledigt; P1 Gesamtphase = weiterhin offen** (CSS-Konsolidierung und reale Geräteabnahme). Kein Merge nach `main` ohne Freigabe.
