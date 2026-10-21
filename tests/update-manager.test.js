import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installUpdateManager,waitForActivation} from '../src/update-manager.js';

function emitter(base={}){
 const events=new Map();
 return Object.assign(base,{
  addEventListener(name,listener){const list=events.get(name)||[];list.push(listener);events.set(name,list);},
  removeEventListener(name,listener){events.set(name,(events.get(name)||[]).filter(x=>x!==listener));},
  emit(name){for(const fn of events.get(name)||[])fn();}
 });
}
function fixture({waiting=null,online=true,busy=false}={}){
 let reloads=0,updates=0;
 const notice=[],button={hidden:true,disabled:false,textContent:''},status={textContent:''};
 const reg=emitter({waiting,installing:null,update:async()=>{updates++;}});
 const sw=emitter({ready:Promise.resolve(reg),register:async()=>reg});
 const manager=installUpdateManager({
  serviceWorker:sw,button,status,notify:(...args)=>notice.push(args),
  isBusy:()=>busy,reload:()=>reloads++,online:()=>online
 });
 return {reg,sw,button,status,notice,manager,reloads:()=>reloads,updates:()=>updates};
}

test('explicit update button is visible and reloads even when no waiting worker exists',async()=>{
 const f=fixture();await f.manager.ready;
 assert.equal(f.button.hidden,false);
 assert.equal(f.button.textContent,'CHECK FOR UPDATES / RELOAD');
 await f.button.onclick();
 assert.equal(f.reloads(),1);
 assert.ok(f.updates()>=2); // Startup + explicit update check
});
test('waiting worker activates and reloads just once',async()=>{
 const worker=emitter({state:'installed',postMessage(message){
  assert.equal(message,'ACTIVATE');this.state='activated';this.emit('statechange');
 }});
 const f=fixture({waiting:worker});await f.manager.ready;
 assert.equal(f.button.textContent,'INSTALL UPDATE & RELOAD');
 await f.button.onclick();
 assert.equal(f.reloads(),1);
});
test('background activation never interrupts the current page; reload is explicit',async()=>{
 const f=fixture();await f.manager.ready;
 f.sw.emit('controllerchange');
 assert.equal(f.reloads(),0);
 assert.equal(f.button.textContent,'RELOAD TO APPLY');
 await f.button.onclick();
 assert.equal(f.reloads(),1);
});
test('update checks report offline and busy states without reloading',async()=>{
 const a=fixture({online:false});await a.manager.ready;
 await a.button.onclick();assert.equal(a.reloads(),0);
 assert.match(a.notice.at(-1)[0],/internet/i);
 const b=fixture({busy:true});await b.manager.ready;
 await b.button.onclick();assert.equal(b.reloads(),0);
 assert.match(b.notice.at(-1)[0],/Stop playback/i);
});
test('waitForActivation resolves when worker activates',async()=>{
 const worker=emitter({state:'installed'});
 const awaited=waitForActivation(worker,1000);
 worker.state='activated';worker.emit('statechange');
 assert.equal(await awaited,true);
});
test('service worker precaches update manager and bypasses stale navigation HTML',()=>{
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 assert.match(sw,/\.\/src\/update-manager\.js/);
 assert.match(sw,/cache:'reload'/);
 assert.match(sw,/cache:'no-store'/);
 assert.match(sw,/self\.skipWaiting\(\)/);
});

test('RC22 PWA source assets refresh online and retain offline fallback',()=>{
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 assert.match(sw,/Source files are network-first/);
 assert.match(sw,/c.put\(e.request,fresh.clone\(\)\)/);
 assert.match(sw,/return cached\|\|new Response\('Offline code resource unavailable'/);
 assert.match(sw,/v2-boot-reveal\.css/);
});
