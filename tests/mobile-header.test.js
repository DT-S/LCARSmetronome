import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('RC13 keeps the PADD wordmark on the colored iPhone chassis bar',()=>{
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 const start=css.indexOf('RC13 · Compact iPhone PADD header');
 assert.ok(start>0,'RC13 mobile design layer missing');
 const patch=css.slice(start);
 assert.match(patch,/@media \(max-width:640px\)/);
 assert.match(patch,/grid-template-rows:40px minmax\(0,1fr\) 29px/);
 assert.match(patch,/\.app-shell > header \.heading/);
 assert.match(patch,/\.app-shell > header \.heading h1 \.mobile-title/);
 assert.match(patch,/color:#000/);
 assert.match(patch,/\.app-shell > header::after/);
 assert.match(patch,/#metronome \.instrument:has\(> #linear:not\(\[hidden\]\)\) > \.transport/);
 assert.match(patch,/order:0/);
 assert.doesNotMatch(patch,/@media \(min-width:/,'unchanged tablet and desktop layouts');
});

test('RC13 view-specific transport order does not move Circular controls',()=>{
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 const block=css.slice(css.indexOf('RC13 · Compact iPhone PADD header'));
 assert.doesNotMatch(block,/#metronome #dial:not\(\[hidden\]\)\s*\{/);
 assert.doesNotMatch(block,/#metronome \.transport\s*\{\s*order:0/);
 assert.match(block,/#linear:not\(\[hidden\]\)/);
});
