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
    assert.ok(stage.footer.top>=stage.instrument.bottom-3,`${label}: controls intersect the footer ${JSON.stringify(stage)}`);
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
   if(label==='desktop-wide'){
    // User's large-monitor setup uses reduced in-app interface scale.
    // Capture the actual LCARS stage there as a release preview.
    await page.locator('[data-tab="settings"]').click();
    await page.locator('#scaleButtons button[data-ui-scale="0.7"]').click();
    await page.locator('[data-tab="metronome"]').click();
    await page.screenshot({path:path.join(screenshots,'desktop-wide-stage-70pct.png')});
    const frame=await page.evaluate(()=>{
      const rect=q=>{const r=document.querySelector(q).getBoundingClientRect();
        return {top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
      return {instrument:rect('#metronome .instrument'),dial:rect('#dial'),
        footer:rect('main > footer'),main:rect('main')};
    });
    assert.ok(frame.footer.top>=frame.instrument.bottom-4,
      `70% desktop: footer overlaps stage ${JSON.stringify(frame)}`);
    assert.ok(frame.dial.width>250,'70% desktop: circular ring too small');
   }
   assert.deepEqual(errors,[],`${label}: errors or missing assets`);
   console.log(`PASS ${label} (${width}x${height})`);
  }catch(error){
   fail++;
   console.error(`FAIL ${label} (${width}x${height}):`,error);
   await page.screenshot({path:path.join(screenshots,`${label}-FAILED.png`)}).catch(()=>{});
  }finally{await page.close();}
 }

 // RC12: real interactive Linear BPM, shared with Circular state; and an
 // iPad-ready fixed bottom LCARS fascia at 70-100% interface zoom.
 for(const [width,height,label] of [
  [390,844,'iphone-13'],[768,1024,'ipad-portrait'],
  [810,1080,'ipad-air'],[834,1194,'ipad-pro'],
  [1024,768,'ipad-landscape'],[1112,834,'ipad-pro-landscape']
 ]){
  const p=await browser.newPage({viewport:{width,height},
   hasTouch:true,isMobile:width<=640,reducedMotion:'reduce'});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  try{
   await p.goto(origin,{waitUntil:'networkidle'});
   const original=Number(await p.locator('#tempoValue').textContent());
   await p.locator('#view').click();
   assert.equal(await p.locator('#linearTempoValue').isVisible(),true,`${label}: Linear BPM missing`);
   await p.locator('#linearTempoPlus').click();
   assert.equal(Number(await p.locator('#linearTempoValue').textContent()),original+1);
   assert.equal(Number(await p.locator('#tempoValue').textContent()),original+1);
   await p.locator('#linearTempoMinus').click();
   assert.equal(Number(await p.locator('#linearTempoValue').textContent()),original);
   await p.locator('#linearTempoValue').focus();await p.keyboard.press('ArrowUp');
   assert.equal(Number(await p.locator('#tempoValue').textContent()),original+1);
   await p.locator('#linearTempoValue').dblclick();
   assert.equal(await p.locator('#linearBpm').isVisible(),true);
   await p.locator('#linearBpm').fill('187');await p.locator('#linearBpm').press('Enter');
   assert.equal(Number(await p.locator('#linearTempoValue').textContent()),187);
   assert.equal(Number(await p.locator('#tempoValue').textContent()),187);
   assert.equal(await p.locator('#linearTempoValue').getAttribute('aria-valuenow'),'187');
   await p.locator('#view').click();
   assert.equal(Number(await p.locator('#tempoValue').textContent()),187);
   if(width>640){
    for(const scale of [.7,.8,.9,1]){
     await p.locator('[data-tab="settings"]').click();
     await p.locator(`#scaleButtons button[data-ui-scale="${scale}"]`).click();
     await p.locator('[data-tab="metronome"]').click();
     if(await p.locator('#linear').isVisible())await p.locator('#view').click();
     await p.evaluate(()=>{document.querySelector('main').scrollTop=0;});
     await p.waitForTimeout(60);
     const g=await p.evaluate(()=>{
      const rect=q=>{const r=document.querySelector(q).getBoundingClientRect();
       return {top:r.top,bottom:r.bottom,width:r.width};};
      return {shell:rect('.app-shell'),main:rect('main'),
       dial:rect('#dial'),tap:rect('#tap'),start:rect('#start'),
       footerRail:getComputedStyle(document.querySelector('.app-shell'),'::after').content,
       scrollTop:document.querySelector('main').scrollTop};
     });
     assert.ok(g.shell.bottom<=height+3&&g.shell.top>=-3,
      `${label} scale ${scale}: bottom LCARS rail clipped ${JSON.stringify(g)}`);
     assert.notEqual(g.footerRail,'none',`${label}: no footer rail`);
     assert.ok(g.tap.top>=g.main.top-2&&g.tap.bottom<=g.main.bottom+2,
      `${label} scale ${scale}: Tap Tempo below the fold ${JSON.stringify(g)}`);
     assert.ok(g.start.top>=g.main.top-2&&g.start.bottom<=g.main.bottom+2,
      `${label} scale ${scale}: Start below the fold ${JSON.stringify(g)}`);
     assert.ok(g.dial.width>170&&g.dial.width<430,
      `${label} scale ${scale}: circular dial not tablet-sized ${JSON.stringify(g)}`);
     assert.equal(g.scrollTop,0);
     if(scale===.8&&(width===768||width===1024))
      await p.screenshot({path:path.join(screenshots,`rc12-${label}-80pct.png`)});
    }
   }
   assert.deepEqual(errors,[]);
   console.log(`PASS RC12 Linear BPM + iPad layout ${label}`);
  }catch(e){fail++;console.error(`FAIL RC12 ${label}`,e);
   await p.screenshot({path:path.join(screenshots,`rc12-${label}-FAILED.png`)}).catch(()=>{});
  }finally{await p.close();}
 }

 // RC13 mobile: the permanent RHYTHM PADD heading is readable INSIDE the
 // amber/orange top rail, and Linear Start/Tap never require scrolling.
 // Test scale changes too: CSS zoom changes visual and logical geometry.
 for(const [width,height,name] of [
  [320,640,'iphone-narrow'],[375,667,'iphone-short'],
  [390,844,'iphone-13'],[430,932,'iphone-large']
 ]){
  const mobile=await browser.newPage({viewport:{width,height},
   hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  const errors=[];mobile.on('pageerror',e=>errors.push(e.message));
  try{
   await mobile.goto(origin,{waitUntil:'networkidle'});
   for(const scale of [.7,.9,1.1]){
    await mobile.locator('[data-tab="settings"]').click();
    await mobile.locator(`#scaleButtons button[data-ui-scale="${scale}"]`).click();
    await mobile.locator('[data-tab="metronome"]').click();
    if(await mobile.locator('#dial').isVisible())await mobile.locator('#view').click();
    await mobile.evaluate(()=>{document.querySelector('main').scrollTop=0;});
    await mobile.waitForTimeout(55);
    const g=await mobile.evaluate(()=>{
     const rect=q=>{const r=document.querySelector(q).getBoundingClientRect();
      return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height,width:r.width};};
     const title=document.querySelector('.mobile-title');
     return {header:rect('.app-shell > header'),title:rect('.mobile-title'),
      main:rect('main'),tap:rect('#tap'),start:rect('#start'),
      linear:rect('#linear'),railColor:getComputedStyle(title).color,
      titleText:title.textContent,scrollTop:document.querySelector('main').scrollTop,
      layout:document.querySelector('#linear').hidden?'circular':'linear'};
    });
    assert.equal(g.layout,'linear');
    assert.match(g.titleText,/RHYTHM PADD/);
    assert.equal(g.railColor,'rgb(0, 0, 0)',
     `${name}/${scale}: upper bar title must be black on orange`);
    assert.ok(g.header.height<=40*scale+2,`${name}/${scale}: black header row was not reclaimed ${JSON.stringify(g)}`);
    assert.ok(g.title.top>=g.header.top-2&&g.title.bottom<=g.header.top+26*scale+2,
     `${name}/${scale}: RHYTHM PADD is not inside the top rail ${JSON.stringify(g)}`);
    assert.ok(g.title.right<=g.header.right+1,`${name}/${scale}: title clipped horizontally ${JSON.stringify(g)}`);
    assert.ok(g.tap.top>=g.main.top-2&&g.tap.bottom<=g.main.bottom+2,
     `${name}/${scale}: Tap Tempo requires scroll ${JSON.stringify(g)}`);
    assert.ok(g.start.top>=g.main.top-2&&g.start.bottom<=g.main.bottom+2,
     `${name}/${scale}: Start requires scroll ${JSON.stringify(g)}`);
    assert.equal(g.scrollTop,0,`${name}/${scale}: transport visibility forced scroll`);
    assert.ok(g.tap.top<g.linear.top,`${name}/${scale}: Linear transport not above beat view`);
    if(name==='iphone-13'&&scale===.9)
     await mobile.screenshot({path:path.join(screenshots,'rc13-iphone-linear-90pct.png')});
    // Neither the stable LCARS title nor this layout should change
    // when returning to the round sequencer view.
    await mobile.locator('#view').click();
    assert.equal(await mobile.locator('#dial').isVisible(),true);
    const y=await mobile.locator('.mobile-title').boundingBox();
    assert.ok(Math.abs(y.y-g.title.top)<3,`${name}/${scale}: title moved on view change`);
   }
   assert.deepEqual(errors,[]);
   console.log(`PASS RC13 compact LCARS title + always-visible Linear transport ${name}`);
  }catch(err){fail++;console.error(`FAIL RC13 iPhone viewport ${name}`,err);
   await mobile.screenshot({path:path.join(screenshots,`rc13-${name}-FAILED.png`)}).catch(()=>{});
  }finally{await mobile.close();}
 }
 // Launch choreography tested with real CSS motion, including 5 frame captures.
 {
  const page=await browser.newPage({viewport:{width:1920,height:1080},
   reducedMotion:'no-preference',deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.goto(origin,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('.app-shell')?.classList.contains('lcars-booting'),
    null,{timeout:12000});
   await page.waitForSelector('#rings [data-channel="0"][data-index]',{timeout:12000});
   const animations=await page.evaluate(()=>{
    const dial=document.querySelector('#dial').getBoundingClientRect();
    return {ring:getComputedStyle(document.querySelector('#rings circle.track')).animationName,
      nav:getComputedStyle(document.querySelector('aside nav .nav')).animationName,
      aspect:dial.width/dial.height};
   });
   assert.match(animations.ring,/lcars-launch-ring/);
   assert.match(animations.nav,/lcars-launch-pop/);
   assert.ok(Math.abs(animations.aspect-1)<.04,'Circular sequencer must remain round during launch');
   await page.screenshot({path:path.join(screenshots,'launch-01-structural.png')});
   await page.waitForTimeout(230);
   await page.screenshot({path:path.join(screenshots,'launch-02-navigation.png')});
   await page.waitForTimeout(230);
   await page.screenshot({path:path.join(screenshots,'launch-03-sequencer.png')});
   await page.waitForTimeout(260);
   await page.screenshot({path:path.join(screenshots,'launch-04-details.png')});
   await page.waitForFunction(()=>!document.querySelector('.app-shell').classList.contains('lcars-booting'),
    null,{timeout:4000});
   await page.screenshot({path:path.join(screenshots,'launch-05-ready.png')});
   await page.locator('[data-tab="audio"]').click();
   await page.locator('[data-tab="metronome"]').click();
   assert.equal(await page.locator('.app-shell.lcars-booting').count(),0,'Page navigation must not replay launch');
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('.app-shell')?.classList.contains('lcars-booting'),
    null,{timeout:12000});
   assert.deepEqual(errors,[]);
   console.log('PASS LCARS 5-phase launch, navigation guard and reload');
  }catch(error){fail++;console.error('FAIL LCARS launch',error);
   await page.screenshot({path:path.join(screenshots,'launch-FAILED.png')}).catch(()=>{});
  }finally{await page.close();}
 }
 {
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  try{
   await page.goto(origin,{waitUntil:'domcontentloaded'});
   await page.waitForSelector('#rings [data-channel="0"][data-index]',{timeout:12000});
   assert.equal(await page.locator('.app-shell.lcars-booting').count(),0,'Reduced motion skips launch');
   assert.ok(await page.locator('#start').isVisible());
   console.log('PASS reduced-motion launch skip');
  }catch(error){fail++;console.error('FAIL reduced-motion launch skip',error);}
  finally{await page.close();}
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
   assert.equal(await audio.evaluate(el=>getComputedStyle(el).animationName),'none',
    'RC8 never slides or fades the whole page');
   assert.equal(await page.locator('.app-shell.lcars-page-building').count(),0,
    'global LCARS chassis must never rebuild during navigation');
   assert.match(await audio.locator(':scope > .section-heading').evaluate(el=>getComputedStyle(el).animationName),
    /lcars-content-title/);
   assert.equal(await audio.evaluate(el=>getComputedStyle(el,'::before').animationName),'none',
    'fixed outside rails must not be recreated inside every tab');
   await page.screenshot({path:path.join(screenshots,'p6-audio-page-build.png')});
   const frame=page.locator('#audio .cards > .panel').first();
   assert.match(await frame.evaluate(el=>getComputedStyle(el).animationName),/lcars-content-frame/,
    'audio frame did not join the staggered launch');
   await page.waitForTimeout(300);
   assert.equal(await audio.evaluate(el=>el.classList.contains('lcars-page-enter')),true,
    'staged page construction ended before its details');
   assert.match(await audio.locator(':scope > .cards > .panel').first()
    .evaluate(el=>getComputedStyle(el).animationName),/lcars-content-frame/,
    'audio matrix panels never received their architectural build');
   await page.waitForFunction(()=>!document.querySelector('#audio').classList.contains('lcars-page-enter'),
    null,{timeout:1800});
   await page.locator('[data-tab="audio"]').click();
   assert.equal(await audio.evaluate(el=>el.classList.contains('lcars-page-enter')),false,
    'clicking active tab restarted page animation');
   for(const tab of ['presets','diary','analytics','settings']){
    await page.locator(`[data-tab="${tab}"]`).click();
    const target=page.locator('#'+tab);
    assert.equal(await target.evaluate(el=>el.classList.contains('lcars-page-enter')),true,
      tab+' did not receive the menu-build effect');
    assert.match(await target.locator(':scope > .section-heading').evaluate(el=>getComputedStyle(el).animationName),
      /lcars-content-title/,tab+' internal header not animated');
    await page.screenshot({path:path.join(screenshots,`menu-build-${tab}.png`)});
   }
   // Fast repeated navigation must cancel previous timers and classes.
   assert.equal(await page.locator('#analytics.lcars-page-enter').count(),0);
   assert.equal(await page.locator('#diary.lcars-page-enter').count(),0);
   assert.equal(await page.locator('.app-shell.lcars-page-building').count(),0,
    'fixed chrome must not rebuild during fast navigation');
   await page.locator('[data-tab="metronome"]').click();
   assert.equal(await page.locator('#metronome.lcars-page-enter').count(),1);
   assert.match(await page.locator('#rings circle.track').first().evaluate(el=>getComputedStyle(el).animationName),
     /lcars-launch-ring/,'metronome re-entry should replay traced rings');
   await page.waitForFunction(()=>!document.querySelector('#metronome').classList.contains('lcars-page-enter'),
     null,{timeout:1800});
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
   assert.equal(await page.locator('#linear').evaluate(el=>getComputedStyle(el).animationName),'none',
    'the static view container must not slide around');
   assert.match(await page.locator('#linear .step').first()
    .evaluate(el=>getComputedStyle(el).animationName),/lcars-view-beat/,
    'individual Linear beats must cascade into the view');
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

 // RC9: the permanent outer chassis never rebuilds. Capture real
 // computed animations in phone, tablet and desktop viewports on all 6 tabs.
 for(const [w,h] of [[320,640],[390,844],[768,1024],[1440,900],[1920,1080]]){
  const tabPage=await browser.newPage({viewport:{width:w,height:h},reducedMotion:'no-preference'});
  const failures=[];
  tabPage.on('pageerror',e=>failures.push(e.message));
  try{
   await tabPage.goto(origin,{waitUntil:'domcontentloaded'});
   await tabPage.waitForFunction(()=>!document.querySelector('.app-shell')?.classList.contains('lcars-booting'),
    null,{timeout:3500});
   const stable=await tabPage.evaluate(()=>{
    const css=(selector,pseudo)=>getComputedStyle(document.querySelector(selector),pseudo);
    const box=selector=>{const r=document.querySelector(selector).getBoundingClientRect();
     return [r.x,r.y,r.width,r.height].map(n=>Math.round(n));};
    return {
     header:css('header .elbow').animationName,
     top:css('header','::after').animationName,
     nav:css('aside nav .nav').animationName,
     side:css('aside .rail').animationName,
     footer:css('main > footer').animationName,
     headerRect:box('header .elbow'), navRect:box('aside nav'), footerRect:box('main > footer')
    };
   });
   assert.equal(stable.header,'none',`${w}x${h} startup never cleaned header animation`);
   for(const tab of ['audio','presets','diary','analytics','settings','metronome']){
    await tabPage.locator(`[data-tab="${tab}"]`).click({timeout:7500});
    const current=await tabPage.evaluate(id=>{
     const panel=document.getElementById(id),shell=document.querySelector('.app-shell');
     const css=(selector,pseudo)=>getComputedStyle(document.querySelector(selector),pseudo);
     const box=selector=>{const r=document.querySelector(selector).getBoundingClientRect();
      return [r.x,r.y,r.width,r.height].map(n=>Math.round(n));};
     const title=panel.querySelector(':scope > .section-heading');
     const a=panel.querySelector(':scope > .cards > .panel, :scope > .panel');
     return {
      active:!panel.hidden,building:panel.classList.contains('lcars-page-enter'),
      shell:shell.classList.contains('lcars-page-building'),
      title:getComputedStyle(title).animationName,
      internal:a?getComputedStyle(a).animationName:null,
      header:css('header .elbow').animationName,
      top:css('header','::after').animationName,
      nav:css('aside nav .nav').animationName,
      side:css('aside .rail').animationName,
      footer:css('main > footer').animationName,
      headerRect:box('header .elbow'),navRect:box('aside nav'),footerRect:box('main > footer')
     };
    },tab);
    assert.equal(current.active,true,`${w}x${h} ${tab} hidden`);
    assert.equal(current.building,true,`${w}x${h} ${tab} content build did not start`);
    assert.equal(current.shell,false,`${w}x${h} ${tab} fixed shell rebuilt`);
    assert.match(current.title,/lcars-content-title/,`${w}x${h} ${tab} title did not animate`);
    if(['audio','presets','diary','settings'].includes(tab))
     assert.match(current.internal,/lcars-content-frame/,`${w}x${h} ${tab} panel was not constructed`);
    for(const field of ['header','top','nav','side','footer'])
     assert.equal(current[field],stable[field],`${w}x${h} ${tab} static ${field} started animating`);
    // Geometry of static chrome is not modified by tab changes.
    // Footer is inside main and can move when page content changes, so
    // only header and navigation placement is required to remain identical.
    for(const field of ['headerRect','navRect'])
     assert.deepEqual(current[field],stable[field],`${w}x${h} ${tab} static ${field} shifted`);
    if((w===390||w===1920)&&(tab==='settings'||tab==='metronome')){
     await tabPage.screenshot({path:path.join(screenshots,`rc9-${w}-${tab}-content-only.png`)});
    }
   }
   await tabPage.waitForFunction(()=>!document.querySelector('.page.lcars-page-enter'),
    null,{timeout:2200});
   assert.deepEqual(failures,[],`${w}x${h} browser errors during navigation`);
   console.log(`PASS fixed LCARS shell + staggered tab content ${w}x${h}, all 6 tabs`);
  }catch(e){fail++;console.error(`FAIL RC9 fixed chassis ${w}x${h}`,e);
   await tabPage.screenshot({path:path.join(screenshots,`rc9-${w}-FAILED.png`)}).catch(()=>{});
  }finally{await tabPage.close();}
 }

 // RC10 view-only rebuild: all viewports, same staggered beat ordering.
 // Permanent LCARS chassis, transport and BPM must never blink or move.
 for(const [width,height] of [[320,640],[390,844],[768,1024],[1440,900],[1920,1080]]){
  const viewPage=await browser.newPage({viewport:{width,height},reducedMotion:'no-preference'});
  const errors=[];viewPage.on('pageerror',e=>errors.push(e.message));
  try{
   await viewPage.goto(origin,{waitUntil:'domcontentloaded'});
   await viewPage.waitForFunction(()=>!document.querySelector('.app-shell')?.classList.contains('lcars-booting'),
    null,{timeout:4000});
   const before=await viewPage.evaluate(()=>{
    const box=q=>{const r=document.querySelector(q).getBoundingClientRect();
      return [r.x,r.y,r.width,r.height].map(v=>Math.round(v));};
    return {header:box('.app-shell > header'),nav:box('.app-shell > aside'),
      start:document.querySelector('#start').textContent,
      tempo:document.querySelector('#tempoValue').textContent,
      outerPath:document.querySelector('#rings .track').getAttribute('r'),
      beatCount:document.querySelectorAll('#rings g[data-index]').length};
   });
   await viewPage.locator('#view').click();
   const linearData=await viewPage.evaluate(()=>{
    const view=document.querySelector('#linear');
    const buttons=[...view.querySelectorAll('.step')];
    const computed=e=>getComputedStyle(e);
    return {active:!view.hidden,building:view.classList.contains('lcars-view-enter'),
      wrapper:computed(view).animationName,
      title:computed(view.querySelector('h3')).animationName,
      first:computed(buttons[0]).animationName,
      next:computed(buttons[1]).animationName,
      firstDelay:parseFloat(computed(buttons[0]).animationDelay)*1000,
      nextDelay:parseFloat(computed(buttons[1]).animationDelay)*1000,
      count:buttons.length,
      beatIndices:buttons.map(b=>[b.dataset.channel,b.dataset.index])};
   });
   assert.equal(linearData.active,true);
   assert.equal(linearData.building,true);
   assert.equal(linearData.wrapper,'none');
   assert.match(linearData.title,/lcars-content-title/);
   assert.match(linearData.first,/lcars-view-beat/);
   assert.match(linearData.next,/lcars-view-beat/);
   assert.ok(linearData.nextDelay>linearData.firstDelay,
    `${width}x${height} Linear beat order is not staggered`);
   assert.ok(linearData.count>=2);
   await viewPage.screenshot({path:path.join(screenshots,`rc10-${width}-linear-beats.png`)});
   // Quick toggle: old animation cancels without touching audio settings.
   await viewPage.locator('#view').click();
   const circularData=await viewPage.evaluate(()=>{
    const view=document.querySelector('#dial');
    const ring=view.querySelector('#rings circle.track');
    const secondary=view.querySelector('#rings circle.track.inner-track');
    const beats=[...view.querySelectorAll('#rings g[data-index]')];
    const c=e=>getComputedStyle(e);
    return {active:!view.hidden,building:view.classList.contains('lcars-view-enter'),
      wrapper:c(view).animationName,outer:c(ring).animationName,
      inner:c(secondary).animationName,first:c(beats[0]).animationName,
      firstDelay:parseFloat(c(beats[0]).animationDelay)*1000,
      secondDelay:parseFloat(c(beats[1]).animationDelay)*1000,
      r:ring.getAttribute('r'),count:beats.length};
   });
   assert.equal(circularData.active,true);
   assert.equal(circularData.building,true);
   assert.equal(circularData.wrapper,'none');
   assert.match(circularData.outer,/lcars-launch-ring/);
   assert.match(circularData.inner,/lcars-launch-ring/);
   assert.match(circularData.first,/lcars-view-beat/);
   assert.ok(circularData.secondDelay>circularData.firstDelay,
    `${width}x${height} Circular beat order is not staggered`);
   assert.equal(circularData.r,before.outerPath);
   assert.equal(circularData.count,before.beatCount);
   await viewPage.screenshot({path:path.join(screenshots,`rc10-${width}-circular-rings.png`)});
   await viewPage.waitForFunction(()=>!document.querySelector('#dial').classList.contains('lcars-view-enter'),
    null,{timeout:2600});
   const after=await viewPage.evaluate(()=>{
    const box=q=>{const r=document.querySelector(q).getBoundingClientRect();
      return [r.x,r.y,r.width,r.height].map(v=>Math.round(v));};
    return {header:box('.app-shell > header'),nav:box('.app-shell > aside'),
      start:document.querySelector('#start').textContent,
      tempo:document.querySelector('#tempoValue').textContent,
      pageBuilding:document.querySelector('#metronome').classList.contains('lcars-page-enter'),
      shellBoot:document.querySelector('.app-shell').classList.contains('lcars-booting')};
   });
   assert.deepEqual(after.header,before.header,`${width}x${height} static header shifted`);
   assert.deepEqual(after.nav,before.nav,`${width}x${height} static navigation shifted`);
   assert.equal(after.start,before.start);
   assert.equal(after.tempo,before.tempo);
   assert.equal(after.pageBuilding,false);
   assert.equal(after.shellBoot,false);
   assert.deepEqual(errors,[]);
   console.log(`PASS RC10 staggered Circular/Linear beats ${width}x${height}`);
  }catch(err){
   fail++;console.error(`FAIL RC10 view assembly ${width}x${height}`,err);
   await viewPage.screenshot({path:path.join(screenshots,`rc10-${width}-FAILED.png`)}).catch(()=>{});
  }finally{await viewPage.close();}
 }
 {
  const reduced=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  try{
   await reduced.goto(origin,{waitUntil:'domcontentloaded'});
   await reduced.locator('#view').click();
   assert.equal(await reduced.locator('#linear.lcars-view-enter').count(),0,
    'reduced motion must not start Linear view assembly');
   await reduced.locator('#view').click();
   assert.equal(await reduced.locator('#dial.lcars-view-enter').count(),0,
    'reduced motion must not start Circular view assembly');
  }catch(err){fail++;console.error('FAIL RC10 view reduced motion',err);}
  finally{await reduced.close();}
 }

 // RC11 Audio Matrix: actual staggered instruments, not four blank panels
 // appearing at once. Capture computed CSS at mobile/tablet/desktop widths.
 for(const [w,h] of [[320,640],[390,844],[768,1024],[1920,1080]]){
  const audioPage=await browser.newPage({viewport:{width:w,height:h},reducedMotion:'no-preference'});
  const faults=[];audioPage.on('pageerror',e=>faults.push(e.message));
  try{
   await audioPage.goto(origin,{waitUntil:'domcontentloaded'});
   await audioPage.waitForFunction(()=>!document.querySelector('.app-shell')?.classList.contains('lcars-booting'),
    null,{timeout:4000});
   await audioPage.locator('[data-tab="audio"]').click();
   const info=await audioPage.evaluate(()=>{
    const d=q=>document.querySelector(q),all=q=>[...document.querySelectorAll(q)];
    const a=q=>getComputedStyle(d(q)).animationName;
    const delay=q=>parseFloat(getComputedStyle(d(q)).animationDelay)*1000;
    const boxes=all('#mixer .matrix-module');
    return {page:d('#audio').classList.contains('lcars-page-enter'),
      shell:d('.app-shell').classList.contains('lcars-booting'),
      modules:boxes.length,
      starts:boxes.map(x=>parseFloat(x.style.getPropertyValue('--matrix-build-start'))),
      totalLeds:all('#mixer .matrix-segment').length,
      rail:a('#mixer .matrix-led-ruler'),
      firstLed:a('#mixer .matrix-segment'),
      secondLed:a('#mixer .matrix-segment:nth-child(2)'),
      firstDelay:delay('#mixer .matrix-segment:first-child'),
      secondDelay:delay('#mixer .matrix-segment:nth-child(2)'),
      thumb:a('#mixer .matrix-bracket'),
      vernier:a('#mixer .matrix-fine-row'),
      micro:a('#mixer .matrix-pan-micro'),
      masterCount:all('#audio .master .lcars-slide').length,
      masterRail:a('#audio .master .lcars-pill-housing'),
      masterThumb:a('#audio .master .lcars-bracket'),
      sidebarNav:a('aside nav .nav'),
      header:a('header .elbow'),
      sourcePan:d('#mixer input[data-field="pan"]').value};
   });
   assert.equal(info.page,true,`${w}x${h}: audio build state did not activate`);
   assert.equal(info.shell,false,`${w}x${h}: fixed outer shell animated`);
   assert.deepEqual(info.starts,[240,355,380,495],`${w}x${h}: modules not staggered`);
   assert.equal(info.modules,4);assert.equal(info.totalLeds,96);
   assert.match(info.rail,/lcars-mixer-rail-on/);
   assert.match(info.firstLed,/lcars-mixer-capsule-on/);
   assert.match(info.secondLed,/lcars-mixer-capsule-on/);
   assert.ok(info.secondDelay>info.firstDelay,`${w}x${h}: capsule LEDs appear all at once`);
   assert.match(info.thumb,/lcars-mixer-rail-on/);
   assert.match(info.vernier,/lcars-mixer-rail-on/);
   assert.match(info.micro,/lcars-mixer-rail-on/);
   assert.equal(info.masterCount,2);
   assert.match(info.masterRail,/lcars-mixer-rail-on/);
   assert.match(info.masterThumb,/lcars-mixer-rail-on/);
   assert.equal(info.sidebarNav,'none','navigation must stay on');
   assert.equal(info.header,'none','header must stay on');
   // A user can adjust pan while the decorative capsules are still assembling.
   await audioPage.locator('#mixer .matrix-pan .matrix-quick-right').first().click();
   assert.ok(Number(await audioPage.locator('#mixer input[data-field="pan"]').first().inputValue())
    >Number(info.sourcePan),`${w}x${h}: animation blocked the panorama control`);
   if(w===390||w===1920){
    await audioPage.screenshot({path:path.join(screenshots,`rc11-${w}-audio-mid-build.png`)});
   }
   await audioPage.waitForFunction(()=>!document.querySelector('#audio').classList.contains('lcars-page-enter'),
     null,{timeout:2700});
   assert.deepEqual(faults,[],`${w}x${h}: errors during mixer assembly`);
   console.log(`PASS RC11 staged channel faders and master/UI volume ${w}x${h}`);
  }catch(e){fail++;console.error(`FAIL RC11 mixer animation ${w}x${h}`,e);
   await audioPage.screenshot({path:path.join(screenshots,`rc11-${w}-FAILED.png`)}).catch(()=>{});
  }finally{await audioPage.close();}
 }
 {
  const reduced=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  try{
   await reduced.goto(origin,{waitUntil:'domcontentloaded'});
   await reduced.locator('[data-tab="audio"]').click();
   assert.equal(await reduced.locator('#audio.lcars-page-enter').count(),0,
    'reduced motion should bypass mixer build');
   assert.equal(await reduced.locator('#mixer .matrix-bracket').count(),4);
  }catch(e){fail++;console.error('FAIL RC11 reduced-motion mixer',e);}
  finally{await reduced.close();}
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
