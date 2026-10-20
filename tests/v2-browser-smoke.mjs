// Run via: node tests/v2-browser-smoke.mjs (requires Playwright + Chromium).
// This is a real headless-browser smoke check, separate from the fast Node suite.
import {createServer} from 'node:http';
import {createReadStream,existsSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const screenshots=path.join(root,'artifacts','v2-smoke');
mkdirSync(screenshots,{recursive:true});
const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json',
 '.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.mp3':'audio/mpeg'};
const server=createServer((req,res)=>{
 const requestUrl=new URL(req.url,'http://localhost');
 const rel=decodeURIComponent(requestUrl.pathname)==='/'?'index.html':decodeURIComponent(requestUrl.pathname).slice(1);
 const full=path.resolve(root,rel);
 if(!full.startsWith(root+path.sep)||!existsSync(full)){
  res.writeHead(404);res.end('Not found');return;
 }
 res.writeHead(200,{'Content-Type':mime[path.extname(full)]||'application/octet-stream'});
 createReadStream(full).pipe(res);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true});
const targets=[
 {width:320,height:740,label:'phone-narrow'},
 {width:390,height:844,label:'iphone-compact'},
 {width:641,height:820,label:'compact-tablet-boundary'},
 {width:768,height:1024,label:'tablet-portrait'},
 {width:900,height:600,label:'tablet-short-landscape'},
 {width:1024,height:768,label:'tablet-landscape'},
 {width:1280,height:800,label:'desktop-small'},
 {width:1440,height:900,label:'desktop'},
 {width:1920,height:1080,label:'desktop-wide'}
];
let fail=0;
try{
 for(const {width,height,label} of targets){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
  try{
   await page.goto(origin,{waitUntil:'networkidle'});
   await page.waitForSelector('#rings [data-channel="0"][data-index]',{timeout:20000});
   assert.equal(await page.locator('#modeButtons button').count(),8,`${label}: operating modes`);
   const dims=await page.evaluate(()=>{
    const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();
      return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    return {shell:rect('.app-shell'),header:rect('.app-shell > header'),aside:rect('.app-shell > aside'),main:rect('.app-shell > main'),dial:rect('#dial'),
      display:getComputedStyle(document.querySelector('.app-shell')).display,
      css:getComputedStyle(document.querySelector('.app-shell > main')).overflowY,
      mobileTitle:getComputedStyle(document.querySelector('.mobile-title')).display,
      layoutSheet:[...document.styleSheets].some(s=>s.href?.endsWith('/v2-layout.css'))};
   });
   assert.equal(dims.layoutSheet,true,`${label}: missing V2 stylesheet`);
   assert.equal(dims.display,'grid',`${label}: app-shell must be a grid`);
   assert.ok(dims.shell.left>=-2 && dims.shell.right<=width+2,`${label}: horizontal shell clipping ${JSON.stringify(dims.shell)}`);
   assert.ok(dims.shell.top>=-2 && dims.shell.bottom<=height+2,`${label}: vertical shell clipping ${JSON.stringify(dims.shell)}`);
   assert.ok(dims.dial.width>120,`${label}: dial not visible`);
   assert.ok(dims.main.width>130,`${label}: content well too narrow`);
   assert.notEqual(dims.mobileTitle,'none',`${label}: RHYTHM PADD heading invisible`);
   if(width>640){
    assert.equal(dims.css,'auto',`${label}: main must scroll independently`);
    assert.ok(dims.aside.right<=dims.main.left,`${label}: fascia overlaps content`);
   }
   await page.screenshot({path:path.join(screenshots,`${label}-metronome.png`)});
   await page.locator('#view').click();
   assert.ok(await page.locator('#linear .step').count()>0,`${label}: Linear View missing steps`);
   await page.locator('#view').click();
   assert.ok(await page.locator('#rings [data-index]').count()>0,`${label}: Circular View missing beats after switch`);
   await page.locator('[data-tab="audio"]').click();
   await page.waitForSelector('#mixer .sound-choices button');
   assert.equal(await page.locator('#mixer .pan-scale button').count(),6,`${label}: pan presets missing`);
   await page.locator('#mixer .pan-scale').first().locator('button').last().click();
   assert.equal(await page.locator('#mixer input[data-field="pan"]').first().inputValue(),'1');
   await page.locator('#mixer .pan-scale').first().locator('button').nth(1).click();
   assert.equal(await page.locator('#mixer input[data-field="pan"]').first().inputValue(),'0');
   // Integrated Voyager module: two independent channels with accessible range values.
   const panInput=page.locator('#mixer input[data-field="pan"]').first();
   assert.equal(await panInput.getAttribute('aria-valuetext'),'CENTER');
   assert.equal(await page.locator('#mixer .matrix-module').count(),4);
   assert.equal(await page.locator('#mixer .matrix-segment').count(),80);
   assert.equal(await page.locator('#mixer .matrix-tick').count(),140);
   assert.equal(await page.locator('#mixer .matrix-pan-micro').count(),2);
   assert.equal(await page.locator('#mixer .matrix-pan-coords').count(),2);
   assert.equal(await page.locator('#mixer .matrix-readout').count(),4);
   assert.equal(await page.locator('#mixer .matrix-native').count(),4);
   assert.equal(await page.locator('#audio .precision-readout').count(),2);
   const volume=page.locator('#mixer input[data-field="volume"]').first();
   await volume.focus();
   const before=Number(await volume.inputValue());
   await page.keyboard.press('ArrowRight');
   assert.ok(Number(await volume.inputValue())>before,`${label}: native keyboard range failed`);
   await page.keyboard.press('ArrowLeft');
   assert.equal(Number(await volume.inputValue()),before);
   if(label==='desktop'){
    const track=page.locator('#mixer .matrix-volume .matrix-coarse').first(),bounds=await track.boundingBox();
    await page.mouse.move(bounds.x+bounds.width*.3,bounds.y+bounds.height/2);
    await page.mouse.down();
    assert.equal(await track.locator('xpath=..').evaluate(el=>el.classList.contains('matrix-active')),true);
    await page.mouse.move(bounds.x+bounds.width*.7,bounds.y+bounds.height/2);
    await page.mouse.up();
    assert.equal(await track.locator('xpath=..').evaluate(el=>el.classList.contains('matrix-active')),false);
    assert.equal(await volume.inputValue(),'0.7');
   }
   await page.locator('#mixer .pan-scale').last().locator('button').last().click();
   assert.equal(await page.locator('#mixer input[data-field="pan"]').last().inputValue(),'1');
   assert.equal(await panInput.inputValue(),'0');
   await page.locator('#mixer .pan-scale').last().locator('button').nth(1).click();
   await page.screenshot({path:path.join(screenshots,`${label}-audio.png`)});
   // P1c: navigate all secondary pages and verify that interactive content
   // remains reachable in the scrollable well, even on portrait tablets.
   for(const tab of ['presets','diary','analytics','settings']){
    await page.locator(`[data-tab="${tab}"]`).click();
    const view=page.locator(`#${tab}`);
    assert.equal(await view.isVisible(),true,`${label}: ${tab} failed to open`);
    const scrollPosition=await page.locator('main').evaluate(el=>el.scrollTop);
    assert.ok(scrollPosition<=1,`${label}: ${tab} retained previous page scroll position ${scrollPosition}`);
    const shell=await page.evaluate(id=>{
      const main=document.querySelector('main'),section=document.getElementById(id);
      const a=main.getBoundingClientRect(),r=section.getBoundingClientRect();
      return {left:r.left,right:r.right,mainLeft:a.left,mainRight:a.right,width:r.width,
        scrollHeight:main.scrollHeight,clientHeight:main.clientHeight};
    },tab);
    assert.ok(shell.width>125 && shell.left>=shell.mainLeft-3 && shell.right<=shell.mainRight+3,
      `${label}: ${tab} overflows the main content well: ${JSON.stringify(shell)}`);
    await page.screenshot({path:path.join(screenshots,`${label}-${tab}.png`)});
    if(tab==='presets'){
     assert.ok(await page.locator('#presetForm input#presetName').isVisible());
     assert.ok(await page.locator('#presetForm button').count()>0);
    }
    if(tab==='diary'){
     assert.ok(await page.locator('#diaryControls .diary-field').count()>0);
     await page.locator('#manualEntry').click();
     assert.ok(await page.locator('#diaryEditor .diary-form').isVisible(),`${label}: diary editor missing`);
     if(label==='desktop'||label==='tablet-portrait')await page.screenshot({path:path.join(screenshots,`${label}-diary-editor.png`)});
     await page.locator('#diaryEditor .preset-actions button').last().click();
     assert.ok(!await page.locator('#diaryEditor').isVisible(),`${label}: diary cancel failed`);
    }
    if(tab==='analytics'){
     assert.ok(await page.locator('#analyticsContent .analytics-filters').count()>=2);
     assert.ok(await page.locator('#analyticsContent .stat-grid').count()===1);
    }
    if(tab==='settings'){
     const scaleButtons=page.locator('#scaleButtons button');
     assert.equal(await scaleButtons.count(),5,`${label}: UI scale controls`);
     const scaleSamples=width===390?[.7,1.1,.9]:[.7,1.1,1];
     for(const scale of scaleSamples){
      await page.locator(`#scaleButtons button[data-ui-scale="${scale}"]`).click({timeout:8000});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const bounds=await page.evaluate(()=>{
       const rect=document.querySelector('.app-shell').getBoundingClientRect();
       const view=document.querySelector('main').getBoundingClientRect();
       return {left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,
        mainWidth:view.width,screenW:innerWidth,screenH:innerHeight};
      });
      assert.ok(bounds.left>=-3&&bounds.right<=bounds.screenW+4&&bounds.top>=-3&&bounds.bottom<=bounds.screenH+4,
       `${label}: UI scale ${scale} clips fixed LCARS frame: ${JSON.stringify(bounds)}`);
      assert.ok(bounds.mainWidth>120,`${label}: UI scale ${scale} makes content too narrow`);
     }
    }
   }
   assert.deepEqual(errors,[],`${label}: errors or missing assets`);
   console.log(`PASS ${label} (${width}x${height})`);
  }catch(error){
   fail++;
   console.error(`FAIL ${label} (${width}x${height}):`,error);
   await page.screenshot({path:path.join(screenshots,`${label}-FAILED.png`)}).catch(()=>{});
  }finally{await page.close();}
 }
 // Real Chromium synthetic touch gestures (not just calling a helper).
 // A 40px move near the rail must be coarser than the same move after the
 // finger shifts away vertically; each must update the channel's range.
 {
  const page=await browser.newPage({viewport:{width:390,height:844},
    hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try {
   await page.goto(origin,{waitUntil:'networkidle'});
   await page.locator('[data-tab="audio"]').click();
   await page.waitForSelector('#mixer .pan-scale button',{timeout:15000});
   const pan=page.locator('#mixer input[data-field="pan"]').first();
   const center=page.locator('#mixer .pan-scale').first().locator('button').nth(1);
   const coarse=page.locator('#mixer .matrix-pan .matrix-coarse').first();
   const fine=page.locator('#mixer .matrix-pan .matrix-vernier').first();
   const housing=page.locator('#mixer .matrix-pan .matrix-housing').first();
   const session=await page.context().newCDPSession(page);
   const touch=async(type,points)=>session.send('Input.dispatchTouchEvent',{
    type,touchPoints:points.map(([px,py])=>({x:px,y:py}))});
   async function gesture(surface,delta,name){
    await center.click();
    const rect=await surface.boundingBox();
    assert.ok(rect&&rect.width>25,'LCARS segment too narrow to scrub');
    const x=rect.x+rect.width/2,y=rect.y+rect.height/2;
    await touch('touchStart',[[x,y]]);
    assert.equal(await housing.evaluate(el=>el.classList.contains('matrix-active')),true,'scrub did not activate');
    await touch('touchMove',[[x+delta,y]]);
    const value=Number(await pan.inputValue());
    assert.ok(await pan.getAttribute('aria-valuetext'),'missing accessible value');
    await page.screenshot({path:path.join(screenshots,`touch-pan-${name}-active.png`)});
    await touch('touchEnd',[]);
    assert.equal(await housing.evaluate(el=>el.classList.contains('matrix-active')),false,'scrub lock stuck');
    return value;
   }
   const coarseValue=await gesture(coarse,28,'coarse');
   const fineValue=await gesture(fine,28,'vernier');
   assert.ok(coarseValue>.1&&fineValue>.03&&fineValue<coarseValue,
    `Vernier less precise than coarse: coarse=${coarseValue}, fine=${fineValue}`);
   await center.click();
   assert.equal(await pan.inputValue(),'0');
   const rect=await fine.boundingBox(),x=rect.x+rect.width/2,y=rect.y+rect.height/2;
   await touch('touchStart',[[x,y]]);
   await touch('touchCancel',[]);
   assert.equal(await housing.evaluate(el=>el.classList.contains('matrix-active')),false,'cancel lock stuck');
   await page.locator('#mixer .matrix-pan .matrix-step-up').first().click();
   assert.equal(await pan.inputValue(),'0.05');
   await page.locator('#mixer .matrix-pan .matrix-micro-left').first().click();
   assert.equal(await pan.inputValue(),'0.04');
   await center.click();
   assert.equal(await pan.inputValue(),'0');
   assert.deepEqual(errors,[]);
   console.log(`PASS Voyager touch, coarse=${coarseValue}, fine=${fineValue}`);
  }catch(error){fail++;console.error('FAIL P3 touch precision:',error);
   await page.screenshot({path:path.join(screenshots,'touch-pan-FAILED.png')}).catch(()=>{});
  }finally{await page.close();}
 }
 // P4: real touch gestures must reveal the visual ladder without altering
 // existing tempo or number-control state management.
 {
  const page=await browser.newPage({viewport:{width:390,height:844},
    hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.goto(origin,{waitUntil:'networkidle'});
   const guide=page.locator('.gesture-guide');
   assert.equal(await guide.count(),1,'P4 guide not installed');
   const session=await page.context().newCDPSession(page);
   const touch=async(type,points)=>session.send('Input.dispatchTouchEvent',{
    type,touchPoints:points.map(([x,y])=>({x,y}))});
   const tempo=page.locator('#tempoValue');
   await tempo.scrollIntoViewIfNeeded();
   let rect=await tempo.boundingBox(),x=rect.x+rect.width/2,y=rect.y+rect.height/2;
   const bpmBefore=Number(await tempo.textContent());
   await touch('touchStart',[[x,y]]);
   await touch('touchMove',[[x,y-13]]);
   assert.equal(await guide.evaluate(el=>el.classList.contains('is-visible')),true,
     'tempo drag did not reveal visual ladder');
   assert.equal(await tempo.evaluate(el=>el.classList.contains('gesture-source-active')),true,
     'tempo button is not visually replaced by the morph');
   // The expanded guide should cover the ORIGINAL button center, not appear beside it.
   const expectedTempoCenter={x:rect.x+rect.width/2,y:rect.y+rect.height/2};
   const morph=await guide.boundingBox();
   assert.ok(Math.abs(morph.x+morph.width/2-expectedTempoCenter.x)<3,
     'tempo guide opens beside the button instead of beneath the finger');
   assert.ok(Math.abs(morph.y+morph.height/2-expectedTempoCenter.y)<3,
     'tempo guide is not vertically centered on the button');
   await touch('touchMove',[[x,y-43]]);
   assert.ok(Number(await tempo.textContent())>bpmBefore,'tempo drag no longer works');
   assert.equal(await guide.locator('.gesture-guide-rung.is-current').count(),1);
   await page.screenshot({path:path.join(screenshots,'touch-tempo-ladder-active.png')});
   await touch('touchEnd',[]);
   assert.equal(await guide.evaluate(el=>el.classList.contains('is-visible')),false);
   assert.equal(await tempo.evaluate(el=>el.classList.contains('gesture-source-active')),false,
     'reduced-motion tempo must restore immediately after release');
   const beats=page.locator('#beats');
   const beatDial=beats.locator('xpath=..').locator('button.value-dial');
   await beatDial.scrollIntoViewIfNeeded();
   rect=await beatDial.boundingBox();x=rect.x+rect.width/2;y=rect.y+rect.height/2;
   const before=Number(await beats.inputValue());
   await touch('touchStart',[[x,y]]);
   await touch('touchMove',[[x,y-13]]);
   assert.equal(await guide.evaluate(el=>el.classList.contains('is-visible')),true,
     'beat drag did not reveal visual ladder');
   assert.equal(await beatDial.evaluate(el=>el.classList.contains('gesture-source-active')),true);
   const beatBox=await guide.boundingBox();
   assert.ok(Math.abs(beatBox.x+beatBox.width/2-(rect.x+rect.width/2))<3,
     'beat ladder opens to the side instead of over the beat button');
   await touch('touchMove',[[x,y-43]]);
   assert.ok(Number(await beats.inputValue())>before,
     'beat drag no longer updates pattern length');
   await page.screenshot({path:path.join(screenshots,'touch-beats-ladder-active.png')});
   await touch('touchCancel',[]);
   assert.equal(await guide.evaluate(el=>el.classList.contains('is-visible')),false,
     'cancelled beat drag left guide open');
   assert.equal(await beatDial.evaluate(el=>el.classList.contains('gesture-source-active')),false,
     'cancelled beat drag failed to restore its original button');
   assert.deepEqual(errors,[]);
   console.log('PASS P4 touch ladder for tempo and beat controls');
  }catch(error){
   fail++;console.error('FAIL P4 touch ladder:',error);
   await page.screenshot({path:path.join(screenshots,'touch-p4-FAILED.png')}).catch(()=>{});
  }finally{await page.close();}
 }
 // Verify the real motion path separately from reduced-motion touch tests.
 // The source button must grow into the guide, then shrink back after release.
 {
  const page=await browser.newPage({viewport:{width:390,height:844},
    reducedMotion:'no-preference'});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(origin,{waitUntil:'networkidle'});
   const button=page.locator('#tempoValue'),guide=page.locator('.gesture-guide');
   await button.scrollIntoViewIfNeeded();
   const source=await button.boundingBox();
   const x=source.x+source.width/2,y=source.y+source.height/2;
   await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y-27,{steps:3});
   assert.equal(await guide.evaluate(el=>el.classList.contains('is-visible')),true);
   assert.ok((await guide.evaluate(el=>parseFloat(getComputedStyle(el).transitionDuration)))>.05,
     'motion-enabled morph lost its CSS transition');
   await page.waitForTimeout(250);
   const expanded=await guide.boundingBox();
   assert.ok(expanded.height>=255&&expanded.width>=100,'guide did not morph to full ladder');
   assert.ok(Math.abs(expanded.x+expanded.width/2-x)<3,
     'expanded ladder not centered under original tempo button');
   await page.screenshot({path:path.join(screenshots,'tempo-morph-animated-expanded.png')});
   await page.mouse.up();
   await page.waitForFunction(()=>!document.querySelector('.gesture-guide').classList.contains('is-morphing'));
   assert.ok(await button.isVisible(),'original tempo button not restored');
   assert.equal(await button.evaluate(el=>el.classList.contains('gesture-source-active')),false);
   const restored=await button.boundingBox();
   assert.ok(Math.abs(restored.width-source.width)<1&&Math.abs(restored.height-source.height)<1,
     'morph shifted its source button layout');
   assert.deepEqual(errors,[]);
   console.log('PASS P4 reversible button-to-ladder morph');
  }catch(error){
   fail++;console.error('FAIL P4 reversible morph:',error);
   await page.screenshot({path:path.join(screenshots,'tempo-morph-FAILED.png')}).catch(()=>{});
  }finally{await page.close();}
 }
}finally{
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
if(fail)process.exitCode=1;
