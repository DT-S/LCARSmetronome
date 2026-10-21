# LCARS Interface Sound Pack · 2026-10-21

User-supplied UI sounds from `sounds_update21102026.7z`, integrated in RC17.

A compact ~56 KB mono MP3 sprite (`lcars-ui-20261021.mp3`) contains the exact fifteen named sound events below, in this order, with 90 ms silence between clips. `src/ui-cues.js` is the sample-offset manifest. The original 15 individual MP3s have been preserved in the user's submitted archive, and the six existing application sound files are kept as backward-compatible fallbacks. The sprite is re-encoded at 48 kbps for fast offline access. All sound loading is local and covered by `sw.js` precaching.

| Supplied sound | App event |
|---|---|
| launchsound_Staggered_Entrance_Animation.mp3 | User-triggered replay of actual staged PADD launch |
| menu_or_window_change.mp3 | Navigation between real tabs, including return to Metronome |
| modechange.mp3 | Metronome modes, Circular/Linear view selector |
| option_toggle_or_secondary_menu_pops_up.mp3 | Opening a details section, toggling options |
| windowcloses.mp3 | Closing an expanded details section |
| hovering.mp3 | Mouse hover, mobile touch preview and neutral fader movement |
| keypress_standart.mp3 | Buttons, Tap Tempo and successful ordinary operations |
| keypress_increase.mp3 | Tempo +, volume/pan right/up, slider increases |
| keypress_decrease.mp3 | Tempo −, volume/pan left/down, slider decreases |
| caution.mp3 | Noncritical warnings / ordinary notices requesting attention |
| consolewarning.mp3 | Destructive archive prompts, serious storage failures |
| denied.mp3 | Cancel a destructive action, browser denies persistent storage |
| invalid_input.mp3 | Invalid numeric/backup input and user errors |
| erase_accepted.mp3 | Explicitly confirmed diary deletion, exactly one cue |
| update&restart.mp3 | Check for Updates / Reload button |

## Behavior

- `UI SOUNDS` and `UI / VOLUME` govern these cues. Click-track/accent voices and user-imported instrument samples remain separate.
- All samples are decoded once by the browser's Web Audio API after a permitted user gesture. Individual actions play precise cuts from the loaded pack, never overlapping adjacent clips.
- The persistent service worker caches the sprite for offline use.
- If the sprite cannot load or decode, the six legacy sounds are used as fallbacks; no application function or audio clock depends on the pack.
- iOS browsers generally prohibit first-launch audible autoplay before the user interacts. Under **System → LCARS Audio Diagnostics**, users can audition all fifteen clips; **REPLAY LCARS LAUNCH** pairs the launch cue with the actual startup animation after a tap.
- The sprite has been transcoded from the user-provided recordings; no new sound effects were synthesized or substituted.
- Ensure you have rights to redistribute the original recordings before publishing the app publicly.
