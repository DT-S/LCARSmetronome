// 15 original user-supplied LCARS audio cues, packed into one short MP3
// with 90 ms of silence between sounds to prevent sample bleed.
// Times are in decoded audio seconds (not MP3 file byte offsets).
export const UI_SPRITE_URL='./assets/audio/ui/lcars-ui-20261021.mp3';
export const UI_CUES=Object.freeze({
 launchsound_Staggered_Entrance_Animation:[0,1.608005],
 menu_or_window_change:[1.698005,.575986],
 modechange:[2.363991,.215986],
 option_toggle_or_secondary_menu_pops_up:[2.669977,.24],
 windowcloses:[2.999977,.575986],
 hovering:[3.665964,.144014],
 keypress_standart:[3.899977,.095986],
 keypress_increase:[4.085964,.144014],
 keypress_decrease:[4.319977,.144014],
 caution:[4.553991,.48],
 consolewarning:[5.123991,.6],
 denied:[5.813991,.648005],
 invalid_input:[6.551995,.264014],
 erase_accepted:[6.906009,1.104014],
 'update&restart':[8.100023,1.104014]
});
export const UI_CUE_ALIASES=Object.freeze({
 'lcars-menu-build':'menu_or_window_change',
 switchingmenus:'menu_or_window_change',
 hoversound:'hovering',
 buttonpress:'keypress_standart',
 Acceptsound:'keypress_standart',
 invalidsound:'invalid_input',
 Warningsound:'caution'
});
export const UI_FALLBACKS=Object.freeze({
 'lcars-menu-build':'switchingmenus',
 menu_or_window_change:'switchingmenus',
 modechange:'switchingmenus',
 option_toggle_or_secondary_menu_pops_up:'buttonpress',
 windowcloses:'buttonpress',
 hovering:'hoversound',
 keypress_standart:'buttonpress',
 keypress_increase:'buttonpress',
 keypress_decrease:'buttonpress',
 caution:'Warningsound',
 consolewarning:'Warningsound',
 denied:'invalidsound',
 invalid_input:'invalidsound',
 erase_accepted:'Acceptsound',
 'update&restart':'switchingmenus',
 launchsound_Staggered_Entrance_Animation:'switchingmenus'
});
export function resolveUiCue(name){
 const key=UI_CUE_ALIASES[name]||name;
 return Object.hasOwn(UI_CUES,key)?UI_CUES[key]:null;
}
export function fallbackUiSound(name){
 const key=UI_CUE_ALIASES[name]||name;
 return UI_FALLBACKS[name]||UI_FALLBACKS[key]||name;
}
