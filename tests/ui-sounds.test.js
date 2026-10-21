import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {AudioEngine,LCARS_MENU_BUILD_ASSET,LCARS_MENU_BUILD_SLOT} from '../src/audio.js';
import {UI_CUES,UI_SPRITE_URL,resolveUiCue,fallbackUiSound} from '../src/ui-cues.js';

test('RC17 includes all fifteen original cues as real verified offline MP3 bytes',()=>{
 const cues=Object.entries(UI_CUES);
 assert.equal(cues.length,15);
 assert.equal(UI_SPRITE_URL,'./assets/audio/ui/lcars-ui-20261021.mp3');
 assert.equal(LCARS_MENU_BUILD_ASSET,UI_SPRITE_URL);
 assert.equal(LCARS_MENU_BUILD_SLOT,'lcars-menu-build');
 let end=0;
 for(const [name,[offset,duration]] of cues){
  assert.ok(offset>=end-.0001,'Cues overlap: '+name);
  assert.ok(duration>.05&&duration<2,'Invalid duration: '+name);
  end=offset+duration+.085;
 }
 assert.ok(end<9.4);
 const buffer=readFileSync(new URL('../assets/audio/ui/lcars-ui-20261021.mp3',import.meta.url));
 assert.ok(buffer.length>50000);
 assert.equal(createHash('sha256').update(buffer).digest('hex'),
  'f82ec92e9cd6c20803bf9a233e91a5e52849c1d0555aa91e95dfa1ec6dc3cbcb');
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 assert.match(sw,/src\/ui-cues\.js/);
 assert.match(sw,/assets\/audio\/ui\/lcars-ui-20261021\.mp3/);
});
test('RC17 maps old sound events and new actions to exactly one meaningful cue',()=>{
 for(const name of ['lcars-menu-build','switchingmenus','hoversound','buttonpress',
  'Acceptsound','invalidsound','Warningsound'])
  assert.ok(resolveUiCue(name),'Legacy sound without LCARS pack cue: '+name);
 assert.deepEqual(resolveUiCue('lcars-menu-build'),UI_CUES.menu_or_window_change);
 assert.deepEqual(resolveUiCue('Warningsound'),UI_CUES.caution);
 assert.deepEqual(resolveUiCue('modechange'),UI_CUES.modechange);
 assert.equal(resolveUiCue('missing'),null);
 for(const [original,expected] of [
  ['switchingmenus','switchingmenus'],['hoversound','hoversound'],
  ['buttonpress','buttonpress'],['Acceptsound','Acceptsound'],
  ['invalidsound','invalidsound'],['Warningsound','Warningsound'],
  ['lcars-menu-build','switchingmenus'],['consolewarning','Warningsound']
 ])assert.equal(fallbackUiSound(original),expected);
});
test('RC17 Web Audio uses precise sprite cuts, current gain bus, and never plays UI when disabled',()=>{
 const engine=new AudioEngine(),starts=[],nodes=[];
 engine.ctx={state:'running',createBufferSource(){
  const node={connect:destination=>{node.destination=destination;},start:(...args)=>starts.push(args),
   disconnect:()=>{},onended:null};nodes.push(node);return node;
 }};
 engine.uiGain={name:'ui-gain'};
 engine.uiPack={duration:9.294};
 engine.ui('modechange',{uiEnabled:true});
 assert.deepEqual(starts[0],[0,...UI_CUES.modechange]);
 assert.equal(nodes[0].destination,engine.uiGain);
 engine.ui('lcars-menu-build',{uiEnabled:true});
 assert.deepEqual(starts[1],[0,...UI_CUES.menu_or_window_change]);
 engine.ui('erase_accepted',{uiEnabled:true});
 assert.deepEqual(starts[2],[0,...UI_CUES.erase_accepted]);
 const previous=starts.length;
 engine.ui('caution',{uiEnabled:false});
 assert.equal(starts.length,previous);
 engine.uiPack=null;
 const original={name:'original-menu'};engine.buffers.set('switchingmenus',original);
 engine.ui('lcars-menu-build',{uiEnabled:true});
 assert.deepEqual(starts.at(-1),[],'Fallback should play complete old sound');
 assert.equal(nodes.at(-1).buffer,original);
});
test('RC17 exposes all sounds in the System diagnostics and never changes instrument click sounds',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const sound=readFileSync(new URL('../src/synth.js',import.meta.url),'utf8');
 assert.match(app,/for\(const cue of Object\.keys\(UI_CUES\)\)/);
 assert.match(app,/motion\.replayBoot\(\)/);
 assert.match(html,/id="uiSoundPreviewButtons"/);
 assert.match(html,/LCARS AUDIO DIAGNOSTICS/);
 assert.match(sound,/export const SOUNDS=/);
 assert.match(app,/mountLcarsSlider/);
});
