import test from 'node:test';
import assert from 'node:assert/strict';
import {activationSound,installFeedback,segmentCornerRadii,UI_SCALES,defaultInterfaceScale} from '../src/interface.js';
import {fresh,validate,presetSettings,loadPreset} from '../src/model.js';
function control({tab,mode,active=false,pressed=false,tag='BUTTON'}={}){const classes=new Set(active?['active']:[]);return {dataset:{tab,mode},tagName:tag,classList:{contains:s=>classes.has(s),add:s=>classes.add(s),remove:s=>classes.delete(s)},getAttribute:k=>k==='aria-pressed'?String(pressed):null,closest:()=>null,contains:()=>false,querySelector:()=>null};}
function fixture(options={}){const c=control(options);c.closest=s=>s==='.sound-choices'?null:c;const handlers={},calls=[],state=fresh();const root={addEventListener(n,f){(handlers[n]??=[]).push(f);}};installFeedback(root,{unlock:async()=>{},audio:{loading:Promise.resolve(),ui:(name,s)=>{if(s.uiEnabled)calls.push(name);}},state:()=>state});const fire=(name,extra={})=>{for(const f of handlers[name]||[])f({target:c,button:0,pointerId:1,pointerType:'touch',clientX:1,clientY:1,...extra});};return {c,calls,fire,state};}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('navigation uses switch sound only for a different destination',()=>{assert.equal(activationSound(control({tab:'audio'})),'switchingmenus');assert.equal(activationSound(control({tab:'audio',active:true})),'buttonpress');assert.equal(activationSound(control({mode:'ramp',pressed:true})),'buttonpress');assert.equal(activationSound(control({mode:'ramp'})),'switchingmenus');});
test('finger contact hovers before release; summary activation beeps',async()=>{const f=fixture({tag:'SUMMARY'});f.fire('pointerdown');await settle();assert.deepEqual(f.calls,['hoversound']);assert.ok(f.c.classList.contains('touch-pressed'));f.fire('pointerup');assert.ok(!f.c.classList.contains('touch-pressed'));f.fire('click');await settle();assert.deepEqual(f.calls,['hoversound','buttonpress']);});
test('release or scrolling cancels a delayed hover',async()=>{for(const event of ['pointerup','pointercancel','pointermove']){const f=fixture();f.fire('pointerdown');f.fire(event,{clientX:30,clientY:30});await settle();assert.deepEqual(f.calls,[]);assert.ok(!f.c.classList.contains('touch-pressed'));}});
test('hover preference applies to touch and does not disable click feedback',async()=>{const f=fixture();f.state.hoverEnabled=false;f.fire('pointerdown');await settle();f.fire('pointerup');f.fire('click');await settle();assert.deepEqual(f.calls,['buttonpress']);});
test('disabled buttons produce no touch or click sound',async()=>{const f=fixture();f.c.disabled=true;f.fire('pointerdown');f.fire('click');await settle();assert.deepEqual(f.calls,[]);});
test('scale restores, migrates old backups and survives preset changes',()=>{const s=fresh();s.uiScale=.8;s.presets=[{name:'P',settings:presetSettings({...s,uiScale:1})}];assert.equal(validate(JSON.parse(JSON.stringify(s))).uiScale,.8);assert.equal(loadPreset(s,s.presets[0]).uiScale,.8);delete s.uiScale;assert.equal(validate(s).uiScale,1);assert.throws(()=>validate({...s,uiScale:.01}));assert.deepEqual(UI_SCALES,[.7,.8,.9,1,1.1]);});

test('90% is the initial compact-phone scale, desktop remains 100%',()=>{assert.equal(defaultInterfaceScale(true),.9);assert.equal(defaultInterfaceScale(false),1);});

function segmentRect(column,row,width=50,height=40){
 const left=column*55,top=row*45;
 return {left,top,right:left+width,bottom:top+height,width,height};
}
test('LCARS sound matrix curves only the four exposed corners of a 4-by-2 group',()=>{
 const rectangles=Array.from({length:8},(_,i)=>segmentRect(i%4,Math.floor(i/4)));
 assert.deepEqual(segmentCornerRadii(rectangles),[
  '20px 0 0 0','0 0 0 0','0 0 0 0','0 20px 0 0',
  '0 0 0 20px','0 0 0 0','0 0 0 0','0 0 20px 0'
 ]);
});
test('LCARS segment caps track reflow, incomplete rows and single controls',()=>{
 const ragged=Array.from({length:6},(_,i)=>segmentRect(i%4,Math.floor(i/4)));
 const caps=segmentCornerRadii(ragged);
 assert.equal(caps[4],'0 0 0 20px');
 assert.equal(caps[5],'0 0 20px 0');
 const twoColumns=Array.from({length:6},(_,i)=>segmentRect(i%2,Math.floor(i/2)));
 const narrow=segmentCornerRadii(twoColumns);
 assert.equal(narrow[1],'0 20px 0 0');
 assert.equal(narrow[4],'0 0 0 20px');
 assert.equal(narrow[5],'0 0 20px 0');
 assert.deepEqual(segmentCornerRadii([segmentRect(0,0)]),['20px 20px 20px 20px']);
 assert.deepEqual(segmentCornerRadii([{top:0,left:0,right:0,width:0,height:0}]),[null]);
});
