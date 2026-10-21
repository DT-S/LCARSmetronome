import {installFeedback,installTapTempo,installSegmentCorners,UI_SCALES,defaultInterfaceScale} from './interface.js';
import {PAN_PRESETS,setChannelPan} from './pan-control.js';
import {mountLcarsSlider,syncLcarsSlider} from './lcars-slider.js';
import {buildMatrixFaders} from './matrix-faders.js';
import {linearRowSizes,mobileFrameHeight,visibleViewportHeight,keyboardSafeViewportHeight} from './linear-layout.js';
import {installUpdateManager} from './update-manager.js';
import {installViewportZoomGuard} from './viewport-zoom-guard.js';
import {installLinearBeatGesture} from './linear-gesture.js';
import {installTempoControl,radialTicks} from './tempo-control.js';
import {createGestureGuide} from './gesture-guide.js';
import {createMotionController,LCARS_BOOT_DURATION_MS} from './motion.js';
import {armLaunchCue} from './launch-cue.js';
import {customSoundUI} from './custom-sounds.js';
import {createDiaryUI} from './diary-ui.js';
import {SOUNDS} from './synth.js';
import {enhanceNumber,syncNumbers} from './number-control.js';
import {renderTraining,syncSwing} from './training-ui.js';
import {fresh,clamp,resize,validate,MODES,presetSettings,loadPreset} from './model.js';
import {angleDelta} from './rhythm.js';
import {AudioEngine} from './audio.js';
import {Scheduler} from './scheduler.js';
import {read,write,download} from './storage.js';
// Prevent browser pinch/gesture zoom before registering any UI interactions.
installViewportZoomGuard(document);
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const gestureGuide=createGestureGuide(document);
const motion=createMotionController(document);
const audio=new AudioEngine();let state=fresh(),linear=false,saveTimer,saveChain=Promise.resolve(),wakeLock,noticeTimer,starting=false,restoring=false,activePreset='';
// The first launch uses 90% on phones; existing saved user preferences still win.
state.uiScale=defaultInterfaceScale(matchMedia('(max-width:640px)').matches);
const scheduler=new Scheduler(audio,(message,endTime)=>{stop(message,endTime);notify(message,'Warningsound');});
const diaryUI=createDiaryUI(()=>state,save,notify,()=>scheduler.running||starting||restoring,
  cue=>audio.ui(cue,state));
const soundUI=customSoundUI({state:()=>state,audio,unlock,changed,render,notify,running:()=>scheduler.running||starting||restoring});
function notify(message,sound='Acceptsound'){const n=$('#notice');n.textContent=message;n.classList.add('visible');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>n.classList.remove('visible'),5000);audio.ui(sound,state);}
async function unlock(){await audio.unlock();audio.mix(state);audio.ctx.onstatechange=()=>{if(scheduler.running&&audio.ctx.state!=='running')stop('Audio interrupted. Restart when ready.');};}
function save(){clearTimeout(saveTimer);$('#saveStatus').textContent='SAVING…';saveTimer=setTimeout(()=>{const snapshot=structuredClone(state);saveChain=saveChain.catch(()=>{}).then(()=>write(snapshot)).then(()=>{$('#saveStatus').textContent='SAVED ON THIS DEVICE';}).catch(()=>{$('#saveStatus').textContent='SAVE FAILED · EXPORT BACKUP';notify('Local save failed. Export a JSON backup.','Warningsound');});},200);}
function changed(){audio.mix(state);scheduler.update(state);save();}
function number(k,v,min,max){if(!Number.isFinite(v))return;state[k]=clamp(Math.round(v),min,max);if(k==='beats')state.outer=resize(state.outer,state.beats);if(k==='subdivisions')state.inner=resize(state.inner,state.subdivisions);render();changed();}
function cycle(channel,i){const key=channel?'inner':'outer';state[key][i]=(state[key][i]+1)%4;renderPatterns();changed();}
const shortModes={standard:'STANDARD',polyrhythm:'POLYRHYTHM',polymeter:'POLYMETER',gap:'GAP CLICK',random:'RANDOM GAP',offbeat:'OFFBEAT',displacement:'DISPLACEMENT',ramp:'TEMPO RAMP'};
for(const [value,label] of Object.entries(shortModes)){
 const b=document.createElement('button');b.type='button';b.dataset.mode=value;b.textContent=label;b.title=MODES[value];b.onclick=()=>{const change=state.mode!==value;state.mode=value;render();changed();if(change)motion.mode(b);};$('#modeButtons').append(b);
}
let lastFaderTone=0;
function faderTouchFeedback(){
 if(state.haptic)navigator.vibrate?.(5); // iOS may not expose vibration.
 const now=performance.now();
 if(now-lastFaderTone>95){lastFaderTone=now;audio.ui('hoversound',state);}
}
$('#swing').oninput=e=>{state.swing=Number(e.target.value)/100;syncSwing(state);changed();};
mountLcarsSlider($('#swing'),{kind:'swing',title:'SHUFFLE / SWING',code:'42-S9',onValueChange:faderTouchFeedback});
let heardTempo=null;
function tempoReadout(event=null){
 for(const selector of ['#tempoValue','#linearTempoValue']){
   const button=$(selector);button.textContent=state.bpm;
   button.setAttribute('aria-valuenow',state.bpm);
   button.setAttribute('aria-valuetext',`${state.bpm} beats per minute`);
  }
 if(event)heardTempo=event;
 const ramp=state.mode==='ramp';$('#rampReadout').hidden=!ramp;$('#tempo').classList.toggle('ramp-tempo',ramp);$('#tempoLabel').textContent=ramp?'START / BPM':'QUARTER / MIN';
  $('#linearTempo .linear-tempo-id strong').textContent=ramp?'START TEMPO / BPM':'TEMPO / BPM';
 const active=scheduler.running&&heardTempo,now=active?heardTempo.bpm:state.bpm;
 $('#liveTempo').textContent=`${now} BPM`;
 const base=active&&heardTempo.mode==='ramp'?heardTempo.startBpm:state.bpm;
 const target=active&&heardTempo.mode==='ramp'?heardTempo.targetBpm:state.training.targetBpm;
 $('#rampCurrent').textContent=now;const delta=now-base;$('#rampDelta').textContent=`${delta>=0?'+':''}${delta}`;$('#rampTarget').textContent=target;
}
function trainingChanged(){tempoReadout();changed();}
const names=['double accent','accent','normal','silent'];
// A shallow annular block per beat: the active SVG path remains the pointer target.
// Subdivide angle by the total number of steps so 1...20 never overlap.
export function beatArcPath(radius,index,total){
  const angle=index/total*Math.PI*2-Math.PI/2;
  const half=Math.min(.205, Math.PI/total*.74);
  const outer=radius+17,inner=radius-17;
  const xy=(r,a)=>`${(250+r*Math.cos(a)).toFixed(3)} ${(250+r*Math.sin(a)).toFixed(3)}`;
  return `M ${xy(outer,angle-half)} A ${outer} ${outer} 0 0 1 ${xy(outer,angle+half)} L ${xy(inner,angle+half)} A ${inner} ${inner} 0 0 0 ${xy(inner,angle-half)} Z`;
}
const linearRows=new Map();
function renderPatterns(){
  let svg='<circle class="track" cx="250" cy="250" r="212"/><circle class="track inner-track" cx="250" cy="250" r="149"/>';
  svg+='<g class="dial-ticks" aria-hidden="true">'+radialTicks().map(t=>`<line x1="${t.x1}" y1="${t.y1}" x2="${t.x2}" y2="${t.y2}"/>`).join('')+'</g>';
  for(const [channel,key,r] of [[0,'outer',212],[1,'inner',149]]){
    svg+=`<circle class="hit-ring" data-ring="${channel}" cx="250" cy="250" r="${r}"/>`;
    state[key].forEach((s,i)=>{const a=i/state[key].length*Math.PI*2-Math.PI/2,x=250+Math.cos(a)*r,y=250+Math.sin(a)*r;
      svg+=`<g data-channel="${channel}" data-index="${i}" style="--boot-delay:${560+channel*45+i*19}ms;--view-delay:${240+channel*185+i*24}ms" tabindex="0" role="button" aria-label="${key} ${i+1}: ${names[s]}"><path data-ring="${channel}" class="point beat-arc state${s}" d="${beatArcPath(r,i,state[key].length)}"/><text class="node-label" x="${x}" y="${y}">${s===3?'–':i+1}</text></g>`;
    });
  }
  $('#rings').innerHTML=svg;
  // P5: The row itself owns pointer capture. Do not replace it while the
  // user's finger is held down; re-render only/reuse its beat button children.
  for(const [channel,key,label] of [[0,'outer','OUTER PATTERN'],[1,'inner','INNER PATTERN']]){
    let row=linearRows.get(channel);
    if(!row){
      const title=document.createElement('h3');
      title.textContent=label;
      row=document.createElement('div');
      row.className='pattern-row';
      row.dataset.channel=String(channel);
      $('#linear').append(title,row);
      installLinearBeatGesture(row,{
        channel,getCount:()=>state[key].length,
        onStep:nextCount=>number(channel?'subdivisions':'beats',nextCount,1,20),
        onTap:index=>cycle(channel,index),guide:gestureGuide
      });
      linearRows.set(channel,row);
    }
    const previous=[...row.querySelectorAll('button.step')];
    const buttons=state[key].map((s,i)=>{
      const b=previous[i]||document.createElement('button');
      b.type='button';
      b.className=`step state${s}`;
      b.dataset.channel=String(channel);
      b.dataset.index=String(i);
      // Stable even on phones, where rows wrap into nested pattern-line groups.
      b.style.setProperty('--view-delay',`${820+channel*210+i*24}ms`);
      b.textContent=String(i+1);
      b.setAttribute('aria-label',`${label} ${i+1}: ${names[s]}`);
      return b;
    });
    row.replaceChildren(...buttons);
  }
  layoutLinearPatterns();
}
function layoutLinearPatterns(){
  const mobile=matchMedia('(max-width: 640px)').matches;
  for(const row of document.querySelectorAll('#linear .pattern-row')){
    const buttons=[...row.querySelectorAll('button.step')];
    if(!buttons.length)continue;
    // Desktop retains its existing flex layout without mobile-only wrappers.
    if(!mobile){if(row.firstElementChild?.classList.contains('pattern-line'))row.replaceChildren(...buttons);continue;}
    const well=document.querySelector('#metronome .instrument');
    const width=document.querySelector('#linear').clientWidth || well?.clientWidth || document.querySelector('main').clientWidth;
    const groups=linearRowSizes(buttons.length,width);
    const previous=[...row.children].map(el=>el.classList.contains('pattern-line')?el.childElementCount:1);
    if(previous.length===groups.length && previous.every((n,i)=>n===groups[i]))continue;
    const lines=[];
    let at=0;
    for(const size of groups){
      const line=document.createElement('div');line.className='pattern-line';
      line.style.setProperty('--step-columns',String(size));
      line.append(...buttons.slice(at,at+size));lines.push(line);at+=size;
    }
    row.replaceChildren(...lines);
  }
}
// iOS Safari/standalone PWA can report a viewport smaller than 100dvh,
 // particularly on older iPads with display zoom below 100%.
 let stablePaddViewport=0,stablePaddWidth=0;
function refreshMobileFrame(){
 const shell=document.querySelector('.app-shell');
 const phone=matchMedia('(max-width:640px)').matches;
 const tablet=matchMedia('(min-width:641px) and (max-width:1139px)').matches;
 if(!phone&&!tablet){
  shell.style.removeProperty('height');
  stablePaddViewport=0;stablePaddWidth=0;
  return;
 }
 const vv=window.visualViewport,width=document.documentElement.clientWidth;
 if(Math.abs(width-stablePaddWidth)>35)stablePaddViewport=0;
 stablePaddWidth=width;
 const measured=visibleViewportHeight(window.innerHeight,
   vv?vv.height+Math.max(0,vv.offsetTop||0):null,
   document.documentElement.clientHeight);
 const active=document.activeElement;
 const editorFocused=!!(active?.closest?.('#diaryEditor')&&active.matches('input,textarea,select'));
 const height=keyboardSafeViewportHeight(measured,stablePaddViewport,editorFocused);
 if(height===measured)stablePaddViewport=measured;
 // The PADD is CSS-zoomed. Use the actual usable viewport to size its
 // outer frame rather than trusting 100dvh on older iOS PWA WebKit.
 shell.style.height=`${mobileFrameHeight(height,state.uiScale)}px`;
}
window.addEventListener('resize',()=>{refreshMobileFrame();layoutLinearPatterns();},{passive:true});
window.visualViewport?.addEventListener('resize',()=>{refreshMobileFrame();layoutLinearPatterns();},{passive:true});
window.addEventListener('pageshow',refreshMobileFrame);
function applyScale(){
 const shell=document.querySelector('.app-shell');
 shell.style.zoom=state.uiScale;
 // CSS zoom normally shrinks the PADD itself; compensate its logical height
 // so the fixed LCARS frame still covers the full visual viewport.
 shell.style.setProperty('--mobile-zoom-inverse',String(1/state.uiScale));
 refreshMobileFrame();
 layoutLinearPatterns();
 document.querySelectorAll('[data-ui-scale]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.uiScale)===state.uiScale));
 $('#scaleReadout').textContent=Math.round(state.uiScale*100)+'%';
}
for(const scale of UI_SCALES){const b=document.createElement('button');b.type='button';b.dataset.uiScale=scale;b.textContent=Math.round(scale*100)+'%';b.onclick=()=>{state.uiScale=scale;applyScale();save();};$('#scaleButtons').append(b);}
function render(){applyScale();for(const k of ['bpm','beats','subdivisions','countIn','duration','master','uiVolume'])$('#'+k).value=state[k];for(const k of ['uiEnabled','hoverEnabled','haptic','launchScreen'])$('#'+k).checked=state[k];$$('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===state.mode));
  const poly=['polyrhythm','polymeter'].includes(state.mode);
  $('#outerLabel').textContent=poly?'OUTER PATTERN LENGTH':'QUARTERS PER BAR';
  $('#innerLabel').textContent=poly?'INNER PATTERN LENGTH':'SUBDIVISIONS / QUARTER';
  $('#meterNote').textContent=state.mode==='polyrhythm'?`Outer ${state.beats} / inner ${state.subdivisions} over ${state.training.cycleQuarters} quarters`:state.mode==='polymeter'?`Outer ${state.beats}/4 · inner ${state.subdivisions}/4`:`${state.beats}/4 · ${state.subdivisions} subdivisions per quarter`;
  tempoReadout();syncNumbers();renderTraining(state,trainingChanged);renderPatterns();renderMixer();renderPresets();diaryUI.render();soundUI.draw();syncLcarsSlider($('#master'));syncLcarsSlider($('#uiVolume'));}
function renderMixer(){
  $('#mixer').replaceChildren();state.channels.forEach((c,i)=>{
    const panel=document.createElement('div');panel.className='panel';
    panel.classList.add('matrix-channel');
    panel.innerHTML=`<span class="eyebrow">CHANNEL 0${i+1}</span><h3>${i?'INNER CHANNEL':'OUTER CHANNEL'}</h3>`;
    let panButtons=[];
    // The source demo only supplies the look/interaction, not a new audio bus.
    const matrix=buildMatrixFaders(i,c,{onChange:(kind,value,{gesture=false}={})=>{
      if(kind==='pan')setChannelPan(c,value,matrix.inputs.pan,panButtons);
      else c.volume=value;
      matrix.sync();changed();
      if(gesture)faderTouchFeedback();
    }});
    panel.append(matrix.root);
    const panGroup=document.createElement('div');
    panGroup.className='pan-scale';panGroup.setAttribute('role','group');
    panGroup.setAttribute('aria-label',`Channel ${i+1} panorama presets`);
    for(const {label,value} of PAN_PRESETS){
      const button=document.createElement('button');button.type='button';
      button.dataset.pan=String(value);button.textContent=label;panGroup.append(button);
    }
    panButtons=[...panGroup.querySelectorAll('button')];
    setChannelPan(c,c.pan,matrix.inputs.pan,panButtons);
    for(const kind of ['volume','pan']){
      const input=matrix.inputs[kind];
      input.addEventListener('input',()=>{
        if(kind==='pan')setChannelPan(c,input.value,input,panButtons);
        else c.volume=Number(input.value);
        matrix.sync();changed();
      });
    }
    panButtons.forEach(button=>button.onclick=()=>{
      setChannelPan(c,button.dataset.pan,matrix.inputs.pan,panButtons);
      matrix.sync();changed();
    });
    panel.append(panGroup);
    const muteSolo=document.createElement('div');muteSolo.className='mixer-buttons';
    for(const field of ['mute','solo']){
      const button=document.createElement('button');button.type='button';
      button.dataset.field=field;button.textContent=field.toUpperCase();
      button.className='outline'+(c[field]?' toggled':'');
      button.setAttribute('aria-pressed',String(c[field]));
      button.onclick=()=>{
        c[field]=!c[field];button.setAttribute('aria-pressed',String(c[field]));
        button.classList.toggle('toggled',c[field]);changed();
      };
      muteSolo.append(button);
    }
    panel.append(muteSolo);
    ['DOUBLE ACCENT','ACCENT','NORMAL'].forEach((title,clickState)=>{
      const row=document.createElement('div');row.className='accent-sound-row';const label=document.createElement('h4');label.textContent=title;row.append(label);
      const group=document.createElement('div');group.className='sound-choices';group.setAttribute('role','group');group.setAttribute('aria-label',`Channel ${i+1} ${title}`);
      for(const [value,name] of [...Object.entries(SOUNDS).filter(([value])=>value!=='auto'),...state.customSounds.map(s=>[s.id,s.name])]){
        const b=document.createElement('button');b.type='button';b.textContent=name;b.setAttribute('aria-pressed',state.channels[i].sounds[clickState]===value);
        b.onclick=async()=>{state.channels[i].sounds[clickState]=value;for(const peer of group.children)peer.setAttribute('aria-pressed',peer===b);changed();
          if(!scheduler.running)try{await unlock();await audio.loading;await audio.loadCustom(state.customSounds);audio.click({channel:i,state:clickState,sound:value},audio.ctx.currentTime+.01);}catch{notify('Could not preview sound.','invalidsound');}
        };group.append(b);
      }
      row.append(group);panel.append(row);
    });
    $('#mixer').append(panel);
  });
}
function renderPresets(){
  const list=$('#presetList');list.replaceChildren();if(!state.presets.length){const p=document.createElement('p');p.className='system-field';p.textContent='PRESET MEMORY EMPTY · SAVE A RHYTHM ABOVE';list.append(p);}
  state.presets.forEach((preset,i)=>{const box=document.createElement('article');box.className='panel';const h=document.createElement('h3');h.textContent=preset.name;const p=document.createElement('p');p.className='preset-data';p.textContent=`${MODES[preset.settings.mode]} · ${preset.settings.bpm} BPM · outer ${preset.settings.beats} / inner ${preset.settings.subdivisions}`;const actions=document.createElement('div');actions.className='preset-actions';
    for(const [label,fn] of [['LOAD',()=>{state=loadPreset(state,preset);activePreset=preset.name;render();changed();notify('Preset loaded.');}],['RENAME',()=>{const name=prompt('Preset name',preset.name);if(name?.trim()){preset.name=name.trim().slice(0,80);renderPresets();save();}}],['DUPLICATE',()=>{if(state.presets.length>=100)return notify('Maximum 100 presets.','invalidsound');state.presets.push({...structuredClone(preset),name:(preset.name+' copy').slice(0,80)});renderPresets();save();}],['DELETE',()=>{if(confirm(`Delete preset “${preset.name}”?`)){state.presets.splice(i,1);renderPresets();save();}}]]){const b=document.createElement('button');b.className='outline';b.textContent=label;b.onclick=fn;actions.append(b);}box.append(h,p,actions);list.append(box);
  });
}
async function releaseWake(){try{await wakeLock?.release();}catch{}wakeLock=null;}
function stop(message='READY',endTime=audio.ctx?.currentTime){
 if(scheduler.settings?.duration)endTime=Math.min(endTime,scheduler.trainingStart+scheduler.settings.duration);
 const entry=scheduler.recorder.end(endTime,crypto.randomUUID());
 if(entry){entry.reason=message==='READY'?'Stopped':message;if(state.diary.entries.length<10000){state.diary.entries.push(entry);save();diaryUI.render();}else notify('Diary full. Export and remove old entries.','Warningsound');}
 scheduler.stop();releaseWake();$('#start').textContent='START';motion.status($('#start'));$('#playStatus').textContent=message;heardTempo=null;tempoReadout();$('#dial').classList.remove('gap-phase');$$('.playing').forEach(n=>n.classList.remove('playing'));}
$('#start').onclick=async()=>{if(starting||restoring)return;if(soundUI.isBusy())return notify('Wait for sound import to finish.','Warningsound');if(scheduler.running){stop();return;}starting=true;$('#start').disabled=true;try{await unlock();await audio.loading;await audio.loadCustom(state.customSounds);audio.mix(state);scheduler.start(state,state.diary.enabled?{exercise:state.diary.exercise,category:state.diary.category,preset:activePreset,minAutoLogSeconds:state.diary.minAutoLogSeconds}:null);$('#start').textContent='STOP';motion.status($('#start'));$('#playStatus').textContent='PLAYING';if(navigator.wakeLock)try{wakeLock=await navigator.wakeLock.request('screen');}catch{}}catch{notify('Audio could not start. Tap Start again.','invalidsound');}finally{starting=false;$('#start').disabled=false;}};
for(const [k,min,max] of [['beats',1,20],['subdivisions',1,20],['countIn',0,8],['duration',0,3600]])$('#'+k).onchange=e=>number(k,Number(e.target.value),min,max);
for(const id of ['beats','subdivisions','countIn','duration'])enhanceNumber($('#'+id),gestureGuide);
for(const id of ['minus','linearTempoMinus'])$('#'+id).onclick=()=>number('bpm',state.bpm-1,20,400);
for(const id of ['plus','linearTempoPlus'])$('#'+id).onclick=()=>number('bpm',state.bpm+1,20,400);
let taps=[];installTapTempo($('#tap'),()=>{const t=performance.now();if(t-(taps.at(-1)||0)>3000)taps=[];taps.push(t);taps=taps.slice(-7);if(taps.length>=2)number('bpm',60000/((t-taps[0])/(taps.length-1)),20,400);$('#playStatus').textContent=taps.length<2?'TAP AGAIN':`TAPPED ${state.bpm} BPM`;});
$('#view').onclick=()=>{linear=!linear;$('#dial').hidden=linear;$('#linear').hidden=!linear;$('#view').textContent=linear?'CIRCULAR VIEW':'LINEAR VIEW';if(linear)layoutLinearPatterns();motion.view(linear?$('#linear'):$('#dial'));};

for(const k of ['master','uiVolume']){
 const input=$('#'+k);
 input.oninput=e=>{state[k]=Number(e.target.value);changed();};
 mountLcarsSlider(input,{kind:'volume',title:k==='master'?'MASTER / OUTPUT':'UI / VOLUME',
   code:k==='master'?'GAIN-M':'GAIN-UI',onValueChange:faderTouchFeedback});
}
for(const k of ['uiEnabled','hoverEnabled','haptic','launchScreen'])$('#'+k).onchange=e=>{state[k]=e.target.checked;changed();};
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('.page').forEach(p=>p.hidden=p.id!==b.dataset.tab);document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n===b));if(b.dataset.tab==='diary'||b.dataset.tab==='analytics')diaryUI.render();$('main').scrollTop=0;motion.page(b.dataset.tab);});
$('#presetForm').onsubmit=e=>{e.preventDefault();const name=$('#presetName').value.trim();if(!name)return;if(state.presets.length>=100)return notify('Maximum 100 presets.','invalidsound');const existing=state.presets.find(p=>p.name===name);if(existing&&!confirm('Replace this preset with the current settings?'))return;const settings=presetSettings(state);if(existing)existing.settings=settings;else state.presets.push({name,settings});save();renderPresets();$('#presetName').value='';notify('Preset saved.');};
$('#export').onclick=()=>{download(`lcars-backup-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(state,null,2));notify('Backup exported.');};
$('#import').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>25e6)throw Error('Backup is too large.');const next=validate(JSON.parse(await f.text()));if(soundUI.isBusy()||restoring||starting)throw Error('Wait for the current import to finish.');if(!confirm('Replace settings, presets, practice entries and custom sounds with this backup?'))return;stop();restoring=true;e.target.disabled=true;await unlock();await audio.loading;const prepared=await audio.prepareCustom(next.customSounds);for(const key of audio.buffers.keys())if(key.startsWith('user-'))audio.buffers.delete(key);for(const [key,buffer] of prepared)audio.buffers.set(key,buffer);state=next;activePreset='';diaryUI.closeEditor();render();changed();notify('Backup restored.');}catch(err){notify('Import rejected: '+err.message,'invalidsound');}finally{restoring=false;e.target.disabled=false;e.target.value='';}};
// Pointer capture stays on a persistent ancestor while ring SVG nodes rerender.
function gesture(el,isTempo=false){let g=null,suppressClick=false;
  el.addEventListener('pointerdown',e=>{if(e.button!==0||g)return;if(isTempo&&e.target.closest('button,input'))return;const r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let ring;
    if(!isTempo){const p=e.target.closest('[data-channel]');ring=p?Number(p.dataset.channel):Number(e.target.dataset.ring);if(!Number.isFinite(ring))return;}
    g={id:e.pointerId,x:e.clientX,y:e.clientY,cx,cy,a:Math.atan2(e.clientY-cy,e.clientX-cx),sum:0,moved:false,ring,point:e.target.closest('[data-index]')?.dataset.index};el.setPointerCapture(e.pointerId);e.preventDefault();});
  el.addEventListener('pointermove',e=>{if(!g||g.id!==e.pointerId)return;const a=Math.atan2(e.clientY-g.cy,e.clientX-g.cx);g.sum+=angleDelta(g.a,a);g.a=a;if(Math.hypot(e.clientX-g.x,e.clientY-g.y)>7)g.moved=true;if(!g.moved)return;const threshold=isTempo?.055:.23;const steps=Math.trunc(g.sum/threshold);if(steps){g.sum-=steps*threshold;const k=isTempo?'bpm':g.ring?'subdivisions':'beats';number(k,state[k]+steps,isTempo?20:1,isTempo?400:20);}});
  const end=(e,cancel=false)=>{if(!g||g.id!==e.pointerId)return;const prev=g;g=null;if(!cancel&&!prev.moved&&!isTempo&&prev.point!==undefined)cycle(prev.ring,Number(prev.point));suppressClick=true;if(el.hasPointerCapture(e.pointerId))el.releasePointerCapture(e.pointerId);};
  el.addEventListener('pointerup',e=>end(e));el.addEventListener('pointercancel',e=>end(e,true));el.addEventListener('lostpointercapture',()=>{g=null;});
  el.addEventListener('click',e=>{if(suppressClick){suppressClick=false;return;}if(isTempo)return;const p=e.target.closest('[data-index]');if(p)cycle(Number(p.dataset.channel),Number(p.dataset.index));});
}
gesture($('#rings'));
installTempoControl($('#tempo'),$('#tempoValue'),$('#bpm'),()=>state.bpm,
 v=>number('bpm',v,20,400),gestureGuide);
installTempoControl($('#linearTempo'),$('#linearTempoValue'),$('#linearBpm'),()=>state.bpm,
 v=>number('bpm',v,20,400),gestureGuide);
$('#rings').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const p=e.target.closest('[data-index]');if(p){e.preventDefault();const channel=p.dataset.channel,index=p.dataset.index;cycle(Number(channel),Number(index));$(`#rings [data-channel="${channel}"][data-index="${index}"]`)?.focus();}}});
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!e.target.closest('input,button,select,textarea,[role=button],dialog')){e.preventDefault();$('#start').click();}});
installFeedback(document,{unlock,audio,state:()=>state});
installSegmentCorners(document.querySelector('.app-shell'));
async function storageStatus(){const yes=await navigator.storage?.persisted?.();$('#storageStatus').textContent=yes?'Persistent storage granted. Keep exporting backups.':'Best-effort storage. Export regular backups.';}
$('#persist').onclick=async()=>{try{const ok=await navigator.storage?.persist?.();await storageStatus();notify(ok?'Persistent storage granted.':'Browser did not grant persistent storage.','Warningsound');}catch{notify('Storage request unavailable.','Warningsound');}};
const connection=()=>$('#connection').textContent=navigator.onLine?'LOCAL SYSTEM':'OFFLINE SYSTEM';addEventListener('online',connection);addEventListener('offline',connection);connection();
addEventListener('pagehide',()=>{if(scheduler.running){stop('Page closed');clearTimeout(saveTimer);const snapshot=structuredClone(state);saveChain=saveChain.catch(()=>{}).then(()=>write(snapshot));}});
installUpdateManager({
 serviceWorker:navigator.serviceWorker,
 button:$('#update'),status:$('#offlineStatus'),notify,
 isBusy:()=>scheduler.running||starting||restoring||soundUI.isBusy(),
 reload:()=>location.reload(),online:()=>navigator.onLine
});
function frame(){if(scheduler.running){for(const event of scheduler.position()){$$(`[data-channel="${event.channel}"] .playing, .step.playing[data-channel="${event.channel}"]`).forEach(n=>n.classList.remove('playing'));$$(`[data-channel="${event.channel}"][data-index="${event.index}"]`).forEach(n=>(n.querySelector('.point')||n).classList.add('playing'));$('#playStatus').textContent=event.count?`COUNT-IN · ${-event.bar}`:`${event.mode==='polyrhythm'?'CYCLE':'BAR'} ${event.bar+1} · ${event.phase}`;tempoReadout(event);$('#dial').classList.toggle('gap-phase',event.phase==='GAP');}const elapsed=Math.max(0,audio.ctx.currentTime-scheduler.trainingStart);const seconds=Math.floor(scheduler.settings.duration?Math.max(0,scheduler.settings.duration-elapsed):elapsed);$('#clock').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}requestAnimationFrame(frame);}
try{const saved=await read();if(saved)state=validate(saved);$('#saveStatus').textContent='LOCAL STORAGE READY';}catch{notify('Saved data could not be read. Export before making changes.','Warningsound');$('#saveStatus').textContent='STORAGE ERROR';}render();
const startup=$('#lcarsStartup'),initialize=$('#lcarsInitialize');
function bootDirect(){
 const isLaunching=motion.boot();
 if(isLaunching)armLaunchCue({
  root:document,audio,unlock,getState:()=>state,
  isBooting:()=>document.querySelector('.app-shell')?.classList.contains('lcars-booting'),
  bootDurationMs:LCARS_BOOT_DURATION_MS
 });
}
if(state.launchScreen){
 const shell=$('.app-shell');
 shell.inert=true; // No keyboard or pointer interaction behind the modal.
 startup.hidden=false;
 initialize.focus({preventScroll:true});
 initialize.addEventListener('click',async()=>{
  if(initialize.disabled)return;
  initialize.disabled=true;
  initialize.textContent='INITIALIZING LCARS…';
  // The unlock call begins synchronously in this actual user click, before
  // any awaiting, so Firefox/WebKit may grant WebAudio playback.
  if(state.uiEnabled){
   let timeout;
   try{
    const ready=unlock();
    await Promise.race([
     Promise.all([ready,audio.launchReady]),
     new Promise(resolve=>{timeout=setTimeout(resolve,1800);})
    ]);
   }catch{}finally{clearTimeout(timeout);}
  }
  startup.hidden=true;
  shell.inert=false;
  motion.boot(); // Real animation starts only after the initialization gesture.
  if(state.uiEnabled && audio.ctx?.state==='running' && audio.buffers.has('lcars-launch')){
   audio.mix(state);
   audio.ui('lcars-launch',state);
  }else if(state.uiEnabled){
   // A blocked browser or slow decoder must never trap the user on the splash.
   armLaunchCue({
    root:document,audio,unlock,getState:()=>state,
    isBooting:()=>document.querySelector('.app-shell')?.classList.contains('lcars-booting'),
    bootDurationMs:LCARS_BOOT_DURATION_MS
   });
  }
 },{once:true});
}else bootDirect();
startup.dataset.ready='true';
storageStatus().catch(()=>{});frame();
