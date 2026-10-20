import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldTransition} from '../src/motion.js';
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
 assert.doesNotMatch(css,/infinite|scanline|sidebar-node/);
 assert.doesNotMatch(js,/requestAnimationFrame|setInterval|AudioContext|Math.random/);
});
