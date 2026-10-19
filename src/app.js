import {installFeedback,UI_SCALES} from './interface.js';
import {installTempoControl,radialTicks} from './tempo-control.js';
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
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const audio=new AudioEngine();let state=fresh(),linear=false,saveTimer,saveChain=Promise.resolve(),wakeLock,noticeTimer,starting=false,restoring=false,activePreset='';
const scheduler=new Scheduler(audio,(message,endTime)=>{stop(message,endTime);notify(message,'Warningsound');});
const diaryUI=createDiaryUI(()=>state,save,notify);
const soundUI=customSoundUI({state:()=>state,audio,unlock,changed,render,notify,running:()=>scheduler.running||starting||restoring});
function notify(message,sound='Acceptsound'){const n=$('#notice');n.textContent=message;n.classList.add('visible');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>n.classList.remove('visible'),5000);audio.ui(sound,state);}
async function unlock(){await audio.unlock();audio.mix(state);audio.ctx.onstatechange=()=>{if(scheduler.running&&audio.ctx.state!=='running')stop('Audio interrupted. Restart when ready.');};}
function save(){clearTimeout(saveTimer);$('#saveStatus').textContent='SAVING…';saveTimer=setTimeout(()=>{const snapshot=structuredClone(state);saveChain=saveChain.catch(()=>{}).then(()=>write(snapshot)).then(()=>{$('#saveStatus').textContent='SAVED ON THIS DEVICE';}).catch(()=>{$('#saveStatus').textContent='SAVE FAILED · EXPORT BACKUP';notify('Local save failed. Export a JSON backup.','Warningsound');});},200);}
function changed(){audio.mix(state);scheduler.update(state);save();}
function number(k,v,min,max){if(!Number.isFinite(v))return;state[k]=clamp(Math.round(v),min,max);if(k==='beats')state.outer=resize(state.outer,state.beats);if(k==='subdivisions')state.inner=resize(state.inner,state.subdivisions);render();changed();}
function cycle(channel,i){const key=channel?'inner':'outer';state[key][i]=(state[key][i]+1)%4;renderPatterns();changed();}
const shortModes={standard:'STANDARD',polyrhythm:'POLYRHYTHM',polymeter:'POLYMETER',gap:'GAP CLICK',random:'RANDOM GAP',offbeat:'OFFBEAT',displacement:'DISPLACEMENT',ramp:'TEMPO RAMP'};
for(const [value,label] of Object.entries(shortModes)){
 const b=document.createElement('button');b.type='button';b.dataset.mode=value;b.textContent=label;b.title=MODES[value];b.onclick=()=>{state.mode=value;render();changed();};$('#modeButtons').append(b);
}
$('#swing').oninput=e=>{state.swing=Number(e.target.value)/100;syncSwing(state);changed();};
let heardTempo=null;
function tempoReadout(event=null){
 $('#tempoValue').textContent=state.bpm;$('#tempoValue').setAttribute('aria-valuenow',state.bpm);
 if(event)heardTempo=event;
 const ramp=state.mode==='ramp';$('#rampReadout').hidden=!ramp;$('#tempo').classList.toggle('ramp-tempo',ramp);$('#tempoLabel').textContent=ramp?'START / BPM':'QUARTER / MIN';
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
function renderPatterns(){
  let svg='<circle class="track" cx="250" cy="250" r="212"/><circle class="track inner-track" cx="250" cy="250" r="149"/>';
  svg+='<g class="dial-ticks" aria-hidden="true">'+radialTicks().map(t=>`<line x1="${t.x1}" y1="${t.y1}" x2="${t.x2}" y2="${t.y2}"/>`).join('')+'</g>';
  for(const [channel,key,r] of [[0,'outer',212],[1,'inner',149]]){
    svg+=`<circle class="hit-ring" data-ring="${channel}" cx="250" cy="250" r="${r}"/>`;
    state[key].forEach((s,i)=>{const a=i/state[key].length*Math.PI*2-Math.PI/2,x=250+Math.cos(a)*r,y=250+Math.sin(a)*r;
      svg+=`<g data-channel="${channel}" data-index="${i}" tabindex="0" role="button" aria-label="${key} ${i+1}: ${names[s]}"><path data-ring="${channel}" class="point beat-arc state${s}" d="${beatArcPath(r,i,state[key].length)}"/><text class="node-label" x="${x}" y="${y}">${s===3?'–':i+1}</text></g>`;
    });
  }
  $('#rings').innerHTML=svg;
  for(const container of [$('#linear')]){
    container.replaceChildren();
    for(const [channel,key,label] of [[0,'outer','OUTER PATTERN'],[1,'inner','INNER PATTERN']]){
      const title=document.createElement('h3');title.textContent=label;container.append(title);
      const row=document.createElement('div');row.className='pattern-row';
      state[key].forEach((s,i)=>{const b=document.createElement('button');b.className=`step state${s}`;b.dataset.channel=channel;b.dataset.index=i;b.textContent=i+1;b.setAttribute('aria-label',`${label} ${i+1}: ${names[s]}`);b.onclick=()=>cycle(channel,i);row.append(b);});container.append(row);
    }
  }
}
function applyScale(){
 document.querySelector('.app-shell').style.zoom=state.uiScale;
 document.querySelectorAll('[data-ui-scale]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.uiScale)===state.uiScale));
 $('#scaleReadout').textContent=Math.round(state.uiScale*100)+'%';
}
for(const scale of UI_SCALES){const b=document.createElement('button');b.type='button';b.dataset.uiScale=scale;b.textContent=Math.round(scale*100)+'%';b.onclick=()=>{state.uiScale=scale;applyScale();save();};$('#scaleButtons').append(b);}
function render(){applyScale();for(const k of ['bpm','beats','subdivisions','countIn','duration','master','uiVolume'])$('#'+k).value=state[k];for(const k of ['uiEnabled','hoverEnabled','haptic'])$('#'+k).checked=state[k];$$('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===state.mode));
  const poly=['polyrhythm','polymeter'].includes(state.mode);
  $('#outerLabel').textContent=poly?'OUTER PATTERN LENGTH':'QUARTERS PER BAR';
  $('#innerLabel').textContent=poly?'INNER PATTERN LENGTH':'SUBDIVISIONS / QUARTER';
  $('#meterNote').textContent=state.mode==='polyrhythm'?`Outer ${state.beats} / inner ${state.subdivisions} over ${state.training.cycleQuarters} quarters`:state.mode==='polymeter'?`Outer ${state.beats}/4 · inner ${state.subdivisions}/4`:`${state.beats}/4 · ${state.subdivisions} subdivisions per quarter`;
  tempoReadout();syncNumbers();renderTraining(state,trainingChanged);renderPatterns();renderMixer();renderPresets();diaryUI.render();soundUI.draw();}
function renderMixer(){
  $('#mixer').replaceChildren();state.channels.forEach((c,i)=>{
    const panel=document.createElement('div');panel.className='panel';
    panel.innerHTML=`<span class="eyebrow">CHANNEL 0${i+1}</span><h3>${i?'INNER CHANNEL':'OUTER CHANNEL'}</h3><label><span class="field-name">VOLUME</span> <input aria-label="Channel ${i+1} volume" data-field="volume" type="range" min="0" max="1" step=".01" value="${c.volume}"></label><label><span class="field-name">PAN</span> <input aria-label="Channel ${i+1} pan" data-field="pan" type="range" min="-1" max="1" step=".01" value="${c.pan}"></label><div class="pan-scale"><span>LEFT</span><span>CENTER</span><span>RIGHT</span></div><div class="mixer-buttons"><button data-field="mute" aria-pressed="${c.mute}" class="outline ${c.mute?'toggled':''}">MUTE</button><button data-field="solo" aria-pressed="${c.solo}" class="outline ${c.solo?'toggled':''}">SOLO</button></div>`;
    panel.querySelectorAll('input').forEach(el=>el.oninput=()=>{state.channels[i][el.dataset.field]=Number(el.value);changed();});
    panel.querySelectorAll('button[data-field]').forEach(el=>el.onclick=()=>{state.channels[i][el.dataset.field]=!state.channels[i][el.dataset.field];el.setAttribute('aria-pressed',state.channels[i][el.dataset.field]);el.classList.toggle('toggled',state.channels[i][el.dataset.field]);changed();});
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
 scheduler.stop();releaseWake();$('#start').textContent='START';$('#playStatus').textContent=message;heardTempo=null;tempoReadout();$('#dial').classList.remove('gap-phase');$$('.playing').forEach(n=>n.classList.remove('playing'));}
$('#start').onclick=async()=>{if(starting||restoring)return;if(soundUI.isBusy())return notify('Wait for sound import to finish.','Warningsound');if(scheduler.running){stop();return;}starting=true;$('#start').disabled=true;try{await unlock();await audio.loading;await audio.loadCustom(state.customSounds);audio.mix(state);scheduler.start(state,state.diary.enabled?{exercise:state.diary.exercise,category:state.diary.category,preset:activePreset}:null);$('#start').textContent='STOP';$('#playStatus').textContent='PLAYING';if(navigator.wakeLock)try{wakeLock=await navigator.wakeLock.request('screen');}catch{}}catch{notify('Audio could not start. Tap Start again.','invalidsound');}finally{starting=false;$('#start').disabled=false;}};
for(const [k,min,max] of [['beats',1,20],['subdivisions',1,20],['countIn',0,8],['duration',0,3600]])$('#'+k).onchange=e=>number(k,Number(e.target.value),min,max);
for(const id of ['beats','subdivisions','countIn','duration'])enhanceNumber($('#'+id));
$('#minus').onclick=()=>number('bpm',state.bpm-1,20,400);$('#plus').onclick=()=>number('bpm',state.bpm+1,20,400);
let taps=[];$('#tap').onclick=()=>{const t=performance.now();if(t-(taps.at(-1)||0)>3000)taps=[];taps.push(t);taps=taps.slice(-7);if(taps.length>=2)number('bpm',60000/((t-taps[0])/(taps.length-1)),20,400);$('#playStatus').textContent=taps.length<2?'TAP AGAIN':`TAPPED ${state.bpm} BPM`;};
$('#view').onclick=()=>{linear=!linear;$('#dial').hidden=linear;$('#linear').hidden=!linear;$('#view').textContent=linear?'CIRCULAR VIEW':'LINEAR VIEW';};

for(const k of ['master','uiVolume'])$('#'+k).oninput=e=>{state[k]=Number(e.target.value);changed();};
for(const k of ['uiEnabled','hoverEnabled','haptic'])$('#'+k).onchange=e=>{state[k]=e.target.checked;changed();};
$$('[data-tab]').forEach(b=>b.onclick=()=>{$$('.page').forEach(p=>p.hidden=p.id!==b.dataset.tab);$$('.nav').forEach(n=>n.classList.toggle('active',n===b));if(b.dataset.tab==='diary'||b.dataset.tab==='analytics')diaryUI.render();if(matchMedia('(max-width: 640px)').matches)$('main').scrollTop=0;});
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
gesture($('#rings'));installTempoControl($('#tempo'),$('#tempoValue'),$('#bpm'),()=>state.bpm,v=>number('bpm',v,20,400));
$('#rings').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const p=e.target.closest('[data-index]');if(p){e.preventDefault();const channel=p.dataset.channel,index=p.dataset.index;cycle(Number(channel),Number(index));$(`#rings [data-channel="${channel}"][data-index="${index}"]`)?.focus();}}});
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!e.target.closest('input,button,select,textarea,[role=button],dialog')){e.preventDefault();$('#start').click();}});
installFeedback(document,{unlock,audio,state:()=>state});
async function storageStatus(){const yes=await navigator.storage?.persisted?.();$('#storageStatus').textContent=yes?'Persistent storage granted. Keep exporting backups.':'Best-effort storage. Export regular backups.';}
$('#persist').onclick=async()=>{try{const ok=await navigator.storage?.persist?.();await storageStatus();notify(ok?'Persistent storage granted.':'Browser did not grant persistent storage.','Warningsound');}catch{notify('Storage request unavailable.','Warningsound');}};
const connection=()=>$('#connection').textContent=navigator.onLine?'LOCAL SYSTEM':'OFFLINE SYSTEM';addEventListener('online',connection);addEventListener('offline',connection);connection();
addEventListener('pagehide',()=>{if(scheduler.running){stop('Page closed');clearTimeout(saveTimer);const snapshot=structuredClone(state);saveChain=saveChain.catch(()=>{}).then(()=>write(snapshot));}});
let reg;
if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js').then(r=>{reg=r;const waiting=()=>{$('#update').hidden=!r.waiting;};waiting();r.addEventListener('updatefound',()=>r.installing?.addEventListener('statechange',waiting));return navigator.serviceWorker.ready;}).then(()=>{$('#offlineStatus').textContent='Offline resources cached. Installed under this URL.';}).catch(()=>{$('#offlineStatus').textContent='Offline installation failed. Use HTTPS or localhost and reload online.';});}else $('#offlineStatus').textContent='Service workers unavailable in this browser.';
$('#update').onclick=()=>{if(scheduler.running)return notify('Stop playback before updating.','Warningsound');if(reg?.waiting){navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});reg.waiting.postMessage('ACTIVATE');}};
function frame(){if(scheduler.running){for(const event of scheduler.position()){$$(`[data-channel="${event.channel}"] .playing, .step.playing[data-channel="${event.channel}"]`).forEach(n=>n.classList.remove('playing'));$$(`[data-channel="${event.channel}"][data-index="${event.index}"]`).forEach(n=>(n.querySelector('.point')||n).classList.add('playing'));$('#playStatus').textContent=event.count?`COUNT-IN · ${-event.bar}`:`${event.mode==='polyrhythm'?'CYCLE':'BAR'} ${event.bar+1} · ${event.phase}`;tempoReadout(event);$('#dial').classList.toggle('gap-phase',event.phase==='GAP');}const elapsed=Math.max(0,audio.ctx.currentTime-scheduler.trainingStart);const seconds=Math.floor(scheduler.settings.duration?Math.max(0,scheduler.settings.duration-elapsed):elapsed);$('#clock').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}requestAnimationFrame(frame);}
try{const saved=await read();if(saved)state=validate(saved);$('#saveStatus').textContent='LOCAL STORAGE READY';}catch{notify('Saved data could not be read. Export before making changes.','Warningsound');$('#saveStatus').textContent='STORAGE ERROR';}render();storageStatus().catch(()=>{});frame();
