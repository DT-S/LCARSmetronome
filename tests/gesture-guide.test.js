import test from 'node:test';
import assert from 'node:assert/strict';
import {ladderSteps,ladderPlacement} from '../src/gesture-guide.js';
test('P4 ladder shows 13 one-unit rungs with current marker and major steps',()=>{
 const steps=ladderSteps(120,20,400);
 assert.equal(steps.length,13);
 assert.deepEqual(steps.map(x=>x.value),Array.from({length:13},(_,i)=>126-i));
 assert.equal(steps.filter(x=>x.active).length,1);
 assert.equal(steps.find(x=>x.active).value,120);
 assert.equal(steps.find(x=>x.value===125).major,true);
});
test('P4 guide respects integer boundaries and hides invalid rungs',()=>{
 const steps=ladderSteps(1,1,20);
 assert.equal(steps.filter(x=>x.available).length,7);
 assert.equal(steps.filter(x=>x.active)[0].value,1);
 assert.equal(ladderSteps(400,20,400).filter(x=>x.available).length,7);
});
test('P4 ladder stays within visual viewport on either side',()=>{
 const onRight=ladderPlacement({left:40,right:70,top:200,height:40},390,844);
 assert.equal(onRight.left,82);
 const onLeft=ladderPlacement({left:290,right:345,top:500,height:40},390,844);
 assert.equal(onLeft.left,174);
 const short=ladderPlacement({left:10,right:30,top:25,height:30},320,280);
 assert.ok(short.top>=8&&short.top<=12);
});
