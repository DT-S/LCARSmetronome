import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldTransition,shouldLaunchBoot,LCARS_BOOT_DURATION_MS,createMotionController} from '../src/motion.js';
import {readFileSync} from 'node:fs';

test('P6 page transitions occur for actual destination change only',()=>{
 assert.equal(shouldTransition('metronome','audio'),true);
 assert.equal(shouldTransition('audio','audio'),false);
 assert.equal(shouldTransition('audio',''),false);
 assert.equal(shouldTransition('audio',undefined),false);
});
test('P6 motion is event-triggered, reduced-motion safe and never runs on audio frames',()=>{
 const css=readFileSync(new URL('../v2-motion.css',import.meta.url),'utf8');
 const js=readFileSync(new URL('../src/motion.js',import.meta.url),'utf8');
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/lcars-page-build/);
 assert.match(css,/chart-probe-line/);
 assert.match(css,/chart-motion-static/);
 assert.doesNotMatch(css,/(?:animation|transition)\s*:[^;]*\binfinite\b|(?:^|\n)\s*\.scanline\b|(?:^|\n)\s*\.sidebar-node\b/);
 assert.doesNotMatch(js,/requestAnimationFrame|setInterval|AudioContext|Math.random/);
});

test('P6 navigation binds a collection and never calls .forEach on a single element',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(app,/document\.querySelectorAll\('\[data-tab\]'\)\.forEach/);
 assert.match(app,/document\.querySelectorAll\('\.page'\)\.forEach/);
 assert.match(app,/document\.querySelectorAll\('\.nav'\)\.forEach/);
});

test('Launch animation is one-shot, cancels on navigation and respects reduced motion',()=>{
 assert.equal(LCARS_BOOT_DURATION_MS,1450);
 assert.equal(shouldLaunchBoot(),true);
 assert.equal(shouldLaunchBoot({reducedMotion:true}),false);
 assert.equal(shouldLaunchBoot({metronomeVisible:false}),false);
 function element(id){
  const classes=new Set(),listeners=new Map();
  return {id,hidden:false,offsetWidth:250,isConnected:true,
   classList:{
    add:v=>classes.add(v),remove:v=>classes.delete(v),contains:v=>classes.has(v)
   },
   addEventListener:(name,fn)=>listeners.set(name,fn),
   removeEventListener:(name,fn)=>{if(listeners.get(name)===fn)listeners.delete(name);}
  };
 }
 const shell=element('shell'),metronome=element('metronome'),audio=element('audio');
 audio.hidden=true;
 const root={
  querySelectorAll:q=>q==='.page'?[metronome,audio]:[],
  querySelector:q=>q==='.app-shell'?shell:null,
  getElementById:id=>id==='metronome'?metronome:id==='audio'?audio:null
 };
 const old=globalThis.matchMedia;
 try{
  globalThis.matchMedia=()=>({matches:false});
  const motion=createMotionController(root);
  assert.equal(motion.boot(),true);
  assert.equal(shell.classList.contains('lcars-booting'),true);
  assert.equal(motion.boot(),false,'Boot never repeats for a controller instance');
  metronome.hidden=true;audio.hidden=false;
  assert.equal(motion.page('audio'),true);
  assert.equal(shell.classList.contains('lcars-booting'),false,
    'Navigation cancels launch and restores fully visible controls');
  motion.page('metronome');
  assert.equal(motion.boot(),false);
  const reduced=createMotionController(root);
  globalThis.matchMedia=()=>({matches:true});
  assert.equal(reduced.boot(),false);
  assert.equal(shell.classList.contains('lcars-booting'),false);
 }finally{
  if(old===undefined)delete globalThis.matchMedia;
  else globalThis.matchMedia=old;
 }
});

test('Launch choreography uses real circular geometry, has reduced-motion escape hatch and is not an idle loop',()=>{
 const css=readFileSync(new URL('../v2-motion.css',import.meta.url),'utf8');
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 for(const name of ['lcars-launch-elbow','lcars-launch-bar-x','lcars-launch-bar-y',
                    'lcars-launch-pop','lcars-launch-ring','lcars-launch-node']){
  assert.ok(css.includes(name),'Missing '+name);
 }
 assert.match(css,/\.app-shell\.lcars-booting #rings circle\.track/);
 assert.match(css,/\.app-shell\.lcars-booting #rings g\[data-index\]/);
 assert.match(css,/animation:lcars-launch-node/);
 assert.doesNotMatch(css,/#rings g\[data-index\][^{}]*\{[^}]*transform\s*:/,
   'Boot may not transform SVG hit targets');
 assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(css,/animation:[^;]*infinite/);
 assert.match(app,/\}render\(\);motion\.boot\(\);storageStatus/);
 assert.match(app,/--boot-delay:/);
 assert.match(sw,/lcars-core-v2-rc7-launch-sequence/);
});
