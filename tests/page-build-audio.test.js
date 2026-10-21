import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioEngine,LCARS_MENU_BUILD_SLOT,LCARS_MENU_BUILD_ASSET} from '../src/audio.js';
import {activationSound} from '../src/interface.js';

test('LCARS page-build cue resolves to the new offline sprite without changing its event name',()=>{
 assert.equal(LCARS_MENU_BUILD_SLOT,'lcars-menu-build');
 assert.equal(LCARS_MENU_BUILD_ASSET,'./assets/audio/ui/lcars-ui-20261021.mp3');
 assert.equal(activationSound({
  dataset:{tab:'audio'},classList:{contains:()=>false}
 }),LCARS_MENU_BUILD_SLOT);
});

test('page-build sound falls back once to switchingmenus and uses existing UI mix',()=>{
 const engine=new AudioEngine();
 const existing={id:'menu-cue'},dedicated={id:'future-menu-build'};
 engine.buffers.set('switchingmenus',existing);
 const playback=[];
 engine.uiGain={id:'ui-gain'};
 engine.ctx={state:'running',createBufferSource:()=>{
  const item={buffer:null,connect:target=>{item.output=target;},start:()=>playback.push(item),
   disconnect:()=>{}};
  return item;
 }};
 engine.ui(LCARS_MENU_BUILD_SLOT,{uiEnabled:true});
 assert.equal(playback.length,1);
 assert.equal(playback[0].buffer,existing);
 assert.equal(playback[0].output,engine.uiGain);
 engine.uiPack=dedicated;
 engine.ui(LCARS_MENU_BUILD_SLOT,{uiEnabled:true});
 assert.equal(playback[1].buffer,dedicated,
  'decoded LCARS sprite takes precedence over old fallback once loaded');
 engine.ui(LCARS_MENU_BUILD_SLOT,{uiEnabled:false});
 assert.equal(playback.length,2,'UI mute applies to all menu sounds');
 engine.ctx.state='suspended';
 engine.ui(LCARS_MENU_BUILD_SLOT,{uiEnabled:true});
 assert.equal(playback.length,2,'never schedules UI samples into a suspended context');
});
