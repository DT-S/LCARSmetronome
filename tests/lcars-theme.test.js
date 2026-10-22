import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,validate,loadPreset} from '../src/model.js';
import {THEMES,normalizeTheme,applyTheme} from '../src/lcars-theme.js';
test('theme defaults to Voyager and older backups validate',()=>{
 assert.deepEqual(THEMES,['voyager','elite','redalert']);
 const old=fresh();delete old.theme;
 assert.equal(validate(old).theme,'voyager');
 assert.equal(fresh().theme,'voyager');
});
test('all saved palettes survive roundtrips and rhythm presets preserve device choice',()=>{
 for(const theme of THEMES){
  const state=fresh();state.theme=theme;
  assert.equal(validate(JSON.parse(JSON.stringify(state))).theme,theme);
  const preset={name:'test',settings:{...fresh(),theme:'voyager'}};
  assert.equal(loadPreset(state,preset).theme,theme);
 }
 assert.throws(()=>validate({...fresh(),theme:'other'}),/LCARS display theme/);
});
test('theme follows selection on startup and settings',()=>{
 const buttons=THEMES.map(theme=>({dataset:{setTheme:theme},setAttribute(k,v){this[k]=v;}}));
 const setting={value:'voyager'},overlay={dataset:{}};
 const root={documentElement:{dataset:{}},querySelector:s=>s==='#lcarsStartup'?overlay:s==='#appTheme'?setting:null,querySelectorAll:()=>buttons};
 assert.equal(applyTheme(root,'elite'),'elite');
 assert.equal(root.documentElement.dataset.appTheme,'elite');
 assert.equal(overlay.dataset.theme,'elite');
 assert.equal(setting.value,'elite');
 assert.deepEqual(buttons.map(b=>b['aria-pressed']),['false','true','false']);
 assert.equal(normalizeTheme(undefined),'voyager');
});
