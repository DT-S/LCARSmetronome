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
   // Large-screen stage: the circle is square, footer and transport remain
   // inside the independently scrolling workspace, without occluding controls.
   if(width>=1440&&height>=960){
    const stage=await page.evaluate(()=>{
     const box=q=>{const r=document.querySelector(q).getBoundingClientRect();
      return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
     const main=document.querySelector('main');
     return {dial:box('#dial'),transport:box('#metronome .transport'),legend:box('#metronome .legend'),
       instrument:box('#metronome .instrument'),side:box('#metronome .side-controls'),
       footer:box('.app-shell > main > footer'),mainScroll:main.scrollHeight-main.clientHeight,
       stageRule:getComputedStyle(document.querySelector('#metronome .instrument')).borderLeftWidth};
    });
    assert.ok(stage.instrument.width>stage.dial.width, `${label}: dial leaves no room for its frame`);
    assert.ok(Math.abs(stage.dial.width-stage.dial.height)<12,`${label}: ring lost its square ratio ${JSON.stringify(stage.dial)}`);
    assert.ok(stage.transport.top>stage.dial.top && stage.transport.bottom<=stage.instrument.bottom+3,
      `${label}: transport escaped the LCARS stage ${JSON.stringify(stage)}`);
    assert.ok(stage.side.bottom>stage.side.top+350,`${label}: short side frame`);
    assert.ok(parseFloat(stage.stageRule)>=18,`${label}: desktop cheek rail is missing`);
    assert.ok(stage.mainScroll<210,`${label}: unnecessarily tall main overflow ${JSON.stringify(stage)}`);
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
   assert.equal(await page.locator('#mixer .matrix-segment').count(),96); // 24 capsules × 4 controls
   assert.equal(await page.locator('#mixer .matrix-tick').count(),140);
   assert.equal(await page.locator('#mixer .matrix-pan-micro').count(),2);
   assert.equal(await page.locator('#mixer .matrix-pan-coords').count(),2);
   assert.equal(await page.locator('#mixer .matrix-readout').count(),4);
   assert.equal(await page.locator('#mixer .matrix-native').count(),4);
   assert.equal(await page.locator('#audio .lcars-slide-volume').count(),2); // RC4 master + UI volume
   assert.equal(await page.locator('#audio .lcars-bracket').count(),2);
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
   assert.equal(await guide.locator('.gesture-guide-heading').textContent(),'OUTER BEATS');
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
 // P5: Real touch-driven Linear View length gestures on BOTH channels.
 // Confirm stable pointer-capturing rows survive re-render/wrapping, tap stays
 // an accent cycle, and drag never emits a phantom accent click.
 {
  const page=await browser.newPage({viewport:{width:390,height:844},
    hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.goto(origin,{waitUntil:'networkidle'});
   await page.locator('#view').click();
   const outer=page.locator('#linear .pattern-row[data-channel="0"]');
   const inner=page.locator('#linear .pattern-row[data-channel="1"]');
   assert.equal(await outer.locator('.step').count(),4);
   assert.equal(await inner.locator('.step').count(),2);
   await outer.evaluate(row=>row.dataset.persistentTest='outer-original');
   await inner.evaluate(row=>row.dataset.persistentTest='inner-original');
   const session=await page.context().newCDPSession(page);
   const touch=async(type,points)=>session.send('Input.dispatchTouchEvent',{
    type,touchPoints:points.map(([x,y])=>({x,y}))});
   async function swipe(row,index,distance,{cancel=false}={}){
    const button=row.locator(`button.step[data-index="${index}"]`);
    await button.scrollIntoViewIfNeeded();
    const rect=await button.boundingBox(),x=rect.x+rect.width/2,y=rect.y+rect.height/2;
    await touch('touchStart',[[x,y]]);
    if(distance!==0){
     const sign=Math.sign(distance);
     await touch('touchMove',[[x,y+sign*10]]);
     assert.equal(await page.locator('.gesture-guide').evaluate(el=>el.classList.contains('is-visible')),true,
       'P5 morphing guide did not activate');
     await touch('touchMove',[[x,y+distance]]);
    }
    await touch(cancel?'touchCancel':'touchEnd',[]);
   }
   await swipe(outer,1,0); // tap, accents only
   assert.equal(await outer.locator('button.step[data-index="1"]').getAttribute('class'),'step state3');
   assert.equal(await outer.locator('.step').count(),4,'tap changed outer beat count');
   await swipe(outer,0,-49); // threshold + 39px -> 3 new beats
   assert.equal(await outer.locator('.step').count(),7);
   assert.equal(await outer.locator('button.step[data-index="1"]').getAttribute('class'),'step state3',
    'length drag incorrectly cycled accent');
   assert.equal(await outer.getAttribute('data-persistent-test'),'outer-original','outer row replaced while dragging');
   assert.equal(await page.locator('#beats').inputValue(),'7');
   await swipe(inner,0,-75); // from 2 to 7
   assert.equal(await inner.locator('.step').count(),7);
   assert.equal(await inner.getAttribute('data-persistent-test'),'inner-original','inner row replaced');
   assert.equal(await page.locator('#subdivisions').inputValue(),'7');
   assert.equal(await outer.locator('.step').count(),7,'inner swipe changed outer count');
   await page.screenshot({path:path.join(screenshots,'linear-p5-polyrhythm-7-7.png')});
   await swipe(outer,0,49,{cancel:true});
   assert.equal(await outer.locator('.step').count(),7,'cancelled drag changed count unexpectedly');
   assert.ok(!await outer.evaluate(el=>el.classList.contains('linear-dragging')),'cancel left row locked');
   assert.equal(await page.locator('.gesture-guide').evaluate(el=>el.classList.contains('is-visible')),false);
   await swipe(outer,0,62);
   assert.equal(await outer.locator('.step').count(),3);
   assert.equal(await outer.getAttribute('data-persistent-test'),'outer-original');
   assert.equal(await inner.locator('.step').count(),7,'3:7 polyrhythm damaged');
   // Directly exercise the mixed-length layout using the same state-setting
   // path as manual input. The 3:5 and 3:7 examples must stay full width.
   for(const count of [5,7]){
    await page.locator('#subdivisions').evaluate((input,value)=>{
     input.value=String(value);input.dispatchEvent(new Event('change',{bubbles:true}));
    },count);
    assert.equal(await outer.locator('.step').count(),3);
    assert.equal(await inner.locator('.step').count(),count);
    assert.equal(await outer.getAttribute('data-persistent-test'),'outer-original');
    assert.equal(await inner.getAttribute('data-persistent-test'),'inner-original');
   }
   await page.screenshot({path:path.join(screenshots,'linear-p5-polyrhythm-3-7.png')});
   // Stress the maximum supported 20:20 combination and mobile wrapping.
   for(const field of ['beats','subdivisions']){
    await page.locator(`#${field}`).evaluate(input=>{
     input.value='20';input.dispatchEvent(new Event('change',{bubbles:true}));
    });
   }
   for(const row of [outer,inner]){
    assert.equal(await row.locator('.step').count(),20);
    assert.ok(await row.locator('.pattern-line').count()>=2,'20 notes failed to wrap');
    const sizes=await row.locator('.pattern-line').evaluateAll(lines=>lines.map(x=>x.querySelectorAll('.step').length));
    assert.equal(sizes.reduce((a,b)=>a+b,0),20);
    assert.ok(Math.max(...sizes)-Math.min(...sizes)<=1,'unbalanced 20-beat rows');
   }
   await page.screenshot({path:path.join(screenshots,'linear-p5-polyrhythm-20-20.png')});
   // Verify numerical limits through the production input/model, not through
   // mock state: the gesture must clamp without adding/removing phantom steps.
   for(const [count,distance,expectCount] of [[20,-62,20],[1,62,1]]){
    await page.locator('#beats').evaluate((input,value)=>{
     input.value=String(value);input.dispatchEvent(new Event('change',{bubbles:true}));
    },count);
    assert.equal(await outer.locator('.step').count(),count);
    await swipe(outer,0,distance);
    assert.equal(await outer.locator('.step').count(),expectCount,'P5 drag passed 1–20 bound');
   }
   await page.locator('#view').click();
   assert.ok(await page.locator('#rings [data-index]').count()>0,
    'Circular View broken after linear gesture changes');
   assert.deepEqual(errors,[]);
   console.log('PASS P5 Linear View touch, row persistence, tap/drag, 1–20 boundaries');
  }catch(error){
   fail++;console.error('FAIL P5 Linear View touch:',error);
   await page.screenshot({path:path.join(screenshots,'linear-p5-touch-FAILED.png')}).catch(()=>{});
  }finally{await page.close();}
 }
 // Keyboard and mouse still operate the direct beat surfaces on desktop.
 {
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.goto(origin,{waitUntil:'networkidle'});
   await page.locator('#view').click();
   const outer=page.locator('#linear .pattern-row[data-channel="0"]');
   const first=outer.locator('button.step').first();
   await first.focus();
   await page.keyboard.press('Enter');
   assert.equal(await outer.locator('button.step').first().getAttribute('class'),'step state1');
   assert.equal(await outer.locator('button.step').count(),4,'keyboard accent changed pattern count');
   assert.equal(await outer.locator('button.step').first().evaluate(el=>document.activeElement===el),true,
     'keyboard focus lost during step re-render');
   await page.mouse.move(0,0);
   const rect=await outer.locator('button.step').first().boundingBox();
   const x=rect.x+rect.width/2,y=rect.y+rect.height/2;
   await page.mouse.move(x,y);await page.mouse.down();
   await page.mouse.move(x,y-11);await page.mouse.move(x,y-50);
   await page.mouse.up();
   assert.equal(await outer.locator('button.step').count(),7,'desktop vertical mouse drag not counted');
   assert.deepEqual(errors,[]);
   console.log('PASS P5 desktop keyboard focus and mouse count gestures');
  }catch(error){
   fail++;console.error('FAIL P5 desktop keyboard/mouse:',error);
  }finally{await page.close();}
 }
 // P6 explicit navigation, mode, view transitions. Nothing animates just
 // because the scheduler renders frames; same-tab re-entry is inert.
 {
  const page=await browser.newPage({viewport:{width:1440,height:900},
    reducedMotion:'no-preference'});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(origin,{waitUntil:'networkidle'});
   const audio=page.locator('#audio');
   await page.locator('[data-tab="audio"]').click();
   assert.equal(await audio.evaluate(el=>el.classList.contains('lcars-page-enter')),true,
    'different tab did not trigger LCARS page reveal');
   assert.equal(await audio.evaluate(el=>getComputedStyle(el).animationName),'lcars-page-build');
   await page.screenshot({path:path.join(screenshots,'p6-audio-page-build.png')});
   await page.waitForTimeout(280);
   assert.equal(await audio.evaluate(el=>el.classList.contains('lcars-page-enter')),false,
    'page transition continued after 210 ms');
   await page.locator('[data-tab="audio"]').click();
   assert.equal(await audio.evaluate(el=>el.classList.contains('lcars-page-enter')),false,
    'clicking active tab restarted page animation');
   await page.locator('[data-tab="metronome"]').click();
   const mode=page.locator('#modeButtons button[data-mode="polyrhythm"]');
   await mode.click();
   assert.equal(await mode.getAttribute('aria-pressed'),'true');
   assert.equal(await mode.evaluate(el=>getComputedStyle(el).animationName),'lcars-mode-confirm',
    'mode change lacked status acknowledgement');
   await page.waitForTimeout(300);
   await mode.click();
   assert.notEqual(await mode.evaluate(el=>getComputedStyle(el).animationName),'lcars-mode-confirm',
    'clicking selected mode repeated transition');
   await page.locator('#view').click();
   assert.equal(await page.locator('#linear').evaluate(el=>getComputedStyle(el).animationName),'lcars-view-build');
   await page.locator('#view').click();
   assert.ok(await page.locator('#rings [data-index]').count()>0,'circular view broke');
   // Charts get REAL measurement probes. This fixture is ephemeral test-only
   // DOM, not stored in the diary or included in a shipped demo.
   await page.locator('[data-tab="diary"]').click();
   await page.evaluate(async()=>{
    const {sessionChart}=await import('./src/charts.js');
    const fixture=document.createElement('div');fixture.id='p6-chart-test';
    document.querySelector('#diary').append(fixture);
    fixture.append(sessionChart({seconds:20,history:[
     {at:0,bpm:120},{at:10,bpm:145}
    ]}));
   });
   const plot=page.locator('#p6-chart-test .xy-plot');
   assert.equal(await plot.locator('.chart-dot').count(),4);
   assert.equal(await plot.locator('.chart-probe-line').count(),2);
   const mark=plot.locator('.chart-dot').first();
   await mark.focus();
   assert.equal(await mark.evaluate(el=>el.classList.contains('chart-inspected')),true,
    'focus did not select measured point');
   assert.equal(await plot.locator('.chart-probe-line.is-visible').count(),2);
   const positions=await page.evaluate(()=>{
    const plot=document.querySelector('#p6-chart-test .xy-plot');
    const circle=plot.querySelector('.chart-dot');
    const vertical=plot.querySelector('.chart-probe-line');
    return {x:Number(circle.getAttribute('cx')),probe:Number(vertical.getAttribute('x1'))};
   });
   assert.equal(positions.x,positions.probe,'crosshair is not linked to measured x');
   assert.match(await page.locator('#p6-chart-test .chart-readout').textContent(),/120 BPM/);
   await page.screenshot({path:path.join(screenshots,'p6-chart-real-point-probe.png')});
   await mark.blur();
   assert.equal(await plot.locator('.chart-probe-line.is-visible').count(),0);
   assert.deepEqual(errors,[]);
   console.log('PASS P6 state-driven page/view/mode motion and factual chart crosshair');
  }catch(error){
   fail++;console.error('FAIL P6 motion/chart:',error);
   await page.screenshot({path:path.join(screenshots,'p6-motion-FAILED.png')}).catch(()=>{});
  }finally{await page.close();}
 }
 {
  const page=await browser.newPage({viewport:{width:390,height:844},
    reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(origin,{waitUntil:'networkidle'});
   await page.locator('[data-tab="audio"]').click();
   assert.equal(await page.locator('#audio').evaluate(el=>getComputedStyle(el).animationName),'none',
    'reduced-motion setting failed for page animation');
   await page.locator('[data-tab="metronome"]').click();
   await page.locator('#view').click();
   assert.equal(await page.locator('#linear').evaluate(el=>getComputedStyle(el).animationName),'none',
    'reduced-motion setting failed for view animation');
   assert.deepEqual(errors,[]);
   console.log('PASS P6 reduced-motion disablement');
  }catch(error){fail++;console.error('FAIL P6 reduced motion:',error);
  }finally{await page.close();}
 }
 // P7: cached PWA must relaunch with network disabled and preserve
 // user preferences in IndexedDB across a full browser page reload.
 {
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(origin,{waitUntil:'networkidle'});
   await page.waitForSelector('#rings [data-channel="0"][data-index]');
   await page.waitForFunction(async()=>Boolean(await navigator.serviceWorker?.ready.then(r=>r.active)));
   await page.waitForFunction(async()=>Boolean(await caches.match('./index.html')));
   // Change real user preferences, then wait for the existing async save chain
   // to finish before closing the tab.
   await page.locator('[data-tab="settings"]').click();
   await page.locator('#uiEnabled').uncheck();
   await page.locator('#uiVolume').evaluate(input=>{
    input.value='0.42';input.dispatchEvent(new Event('input',{bubbles:true}));
   });
   await page.waitForFunction(()=>document.querySelector('#saveStatus')?.textContent==='SAVED ON THIS DEVICE',
    {timeout:15000});
   const snapshot=await page.evaluate(async()=>{
    const {read}=await import('./src/storage.js');
    const state=await read();
    return {uiEnabled:state.uiEnabled,uiVolume:state.uiVolume,version:state.version};
   });
   assert.equal(snapshot.uiEnabled,false);
   assert.equal(snapshot.uiVolume,.42);
   await context.setOffline(true);
   await page.reload({waitUntil:'load'});
   await page.waitForSelector('#rings [data-channel="0"][data-index]',{timeout:15000});
   await page.locator('[data-tab="settings"]').click();
   assert.equal(await page.locator('#uiEnabled').isChecked(),false,
     'P7 offline relaunch lost UI sound preference');
   assert.equal(await page.locator('#uiVolume').inputValue(),'0.42',
     'P7 offline relaunch lost volume preference');
   assert.equal(await page.locator('#connection').textContent(),'OFFLINE SYSTEM');
   const restored=await page.evaluate(async()=>{
    const {read}=await import('./src/storage.js');return read();
   });
   assert.equal(restored.version,snapshot.version,'P7 offline launch migrated schema unexpectedly');
   assert.deepEqual(errors,[]);
   console.log('PASS P7 cached offline relaunch + IndexedDB persistence');
  }catch(error){
   fail++;console.error('FAIL P7 offline PWA persistence:',error);
   await page.screenshot({path:path.join(screenshots,'p7-offline-FAILED.png')}).catch(()=>{});
  }finally{await context.close();}
 }
 // V2 release candidate: iPhone double-tap stability, contextual typography,
 // actual touch tempo tapping and fixed midpoint for every numeric ladder.
 {
  const context=await browser.newContext({viewport:{width:390,height:844},
   isMobile:true,hasTouch:true,reducedMotion:'reduce',deviceScaleFactor:3});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(origin,{waitUntil:'networkidle'});
   await page.waitForSelector('#rings [data-channel="0"][data-index]');
   const gestures=await page.evaluate(()=>{
    return {html:getComputedStyle(document.documentElement).touchAction,
      body:getComputedStyle(document.body).touchAction,
      shell:getComputedStyle(document.querySelector('.app-shell')).touchAction,
      font:getComputedStyle(document.documentElement).webkitTextSizeAdjust,
      scale:window.visualViewport?.scale??1};
   });
   for(const name of ['html','body','shell'])assert.equal(gestures[name],'pan-x pan-y',
    `P7 iOS pinch/double-tap zoom guard missing on ${name}`);
   // Send actual touch events: three quick TAP TEMPO taps and two taps in
   // empty content. This must not be replaced by a preventDefault click hack.
   const session=await page.context().newCDPSession(page);
   const tap=async(x,y)=>{
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',
      touchPoints:[{x,y}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   };
   const button=page.locator('#tap');
   const rect=await button.boundingBox();
   for(let i=0;i<3;i++)await tap(rect.x+rect.width/2,rect.y+rect.height/2);
   const blank=await page.locator('#metronome .section-heading h2').boundingBox();
   for(let i=0;i<2;i++)await tap(blank.x+blank.width/2,blank.y+blank.height/2);
   assert.ok(Math.abs((await page.evaluate(()=>window.visualViewport?.scale??1))-gestures.scale)<.02,
    'touch interactions changed visual viewport zoom');
   const pre=await page.evaluate(async()=>{
    const {createGestureGuide}=await import('./src/gesture-guide.js');
    const anchor=document.createElement('button');
    anchor.textContent='BEATS';anchor.style.cssText='position:fixed;left:155px;top:330px;width:75px;height:50px';
    document.body.append(anchor);
    const guide=createGestureGuide(document);
    const result=[];
    for(const value of [1,2,15,16,17,18,19,20]){
     guide.show(anchor,value,1,20,'OUTER BEATS');
     const root=guide.element,track=root.querySelector('.gesture-guide-rungs');
     const active=root.querySelector('.gesture-guide-rung.is-current');
     const tr=track.getBoundingClientRect(),ar=active.getBoundingClientRect();
     result.push({value,relative:(ar.top+ar.height/2-tr.top)/tr.height,
       outside:root.querySelectorAll('.gesture-guide-rung.is-outside').length,
       rows:root.querySelectorAll('.gesture-guide-rung').length});
     guide.hide();
    }
    rootCleanup();
    function rootCleanup(){guide.element.remove();anchor.remove();}
    return result;
   });
   for(const row of pre){
    assert.equal(row.rows,13,'ladder lost track count');
    assert.ok(Math.abs(row.relative-.5)<.06,
      `gold indicator left center at ${row.value}: ${JSON.stringify(row)}`);
   }
   assert.equal(pre.find(x=>x.value===20).outside,6);
   console.log('PASS RC double-tap, tempo taps, centered ladder limits 1–20');
   await page.locator('[data-tab="settings"]').click();
   const settings=await page.evaluate(()=>{
    const size=selector=>parseFloat(getComputedStyle(document.querySelector(selector)).fontSize);
    return {
      backup:size('#settings .lcars-info summary'),
      export:size('#settings #export'),
      import:size('#settings .file-button')
    };
   });
   assert.deepEqual([settings.backup,settings.export,settings.import],[14,14,14],
    'system backup controls have inconsistent typography');
   await page.locator('[data-tab="diary"]').click();
   const fonts=await page.evaluate(()=>{
    const size=sel=>parseFloat(getComputedStyle(document.querySelector(sel)).fontSize);
    const entry=document.createElement('article');
    entry.className='panel log-entry';
    entry.innerHTML='<h3>TEST SESSION</h3><div class="session-data"><div class="stat-tile"><span>START</span><strong>19/10/26</strong></div></div>';
    document.querySelector('#diaryList').append(entry);
    const result={category:size('#diary .diary-categories button'),
      recording:size('#diary .lcars-info summary'),
      label:size('#diaryList .stat-tile span'),
      value:size('#diaryList .stat-tile strong'),
      panelWidth:entry.getBoundingClientRect().width};
    entry.remove();return result;
   });
   assert.ok(fonts.category>=12&&fonts.recording>=13);
   assert.ok(fonts.value<=15&&fonts.value>=13,'diary entry values are oversized');
   await page.locator('[data-tab="analytics"]').click();
   const contrast=await page.evaluate(()=>{
    const row=document.createElement('div');row.className='session-choices';
    const item=document.createElement('button');item.textContent='DAY 19/10/26 · OPEN PRACTICE';
    row.append(item);document.querySelector('#analyticsContent').append(row);
    const color=getComputedStyle(item).color,bg=getComputedStyle(item).backgroundColor;
    row.remove();return {color,bg};
   });
   assert.equal(contrast.color,'rgb(0, 0, 0)','stats session selection text is not black');
   assert.equal(contrast.bg,'rgb(153, 201, 239)','stats session selection must be readable on ice blue');
   assert.deepEqual(errors,[]);
   await page.screenshot({path:path.join(screenshots,'rc-mobile-type-scale.png')});
   console.log('PASS RC uniform System/Diary typography and high-contrast Stats');
  }catch(error){
   fail++;console.error('FAIL RC iOS/typography/ladder:',error);
   await page.screenshot({path:path.join(screenshots,'rc-mobile-regression-FAILED.png')}).catch(()=>{});
  }finally{await context.close();}
 }
}finally{
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
if(fail)process.exitCode=1;
