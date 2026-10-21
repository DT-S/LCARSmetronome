import {decodeBytes} from './custom-sounds.js';
import {synthesize,SOUNDS} from './synth.js';
import {UI_SPRITE_URL,resolveUiCue,fallbackUiSound} from './ui-cues.js';
export const METRONOME_GAIN=2;
// Kept as a stable public cue name for the existing navigation handlers.
export const LCARS_MENU_BUILD_SLOT='lcars-menu-build';
export const LCARS_MENU_BUILD_ASSET=UI_SPRITE_URL;
import {audible} from './model.js';
export class AudioEngine {
  constructor(){this.buffers=new Map();this.active=new Set();this.sampleStatus=[];this.uiPack=null;}
  async unlock(){
    if(!this.ctx){
      this.ctx=new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});
      this.master=this.ctx.createGain();this.master.connect(this.ctx.destination);
      this.uiGain=this.ctx.createGain();this.uiGain.connect(this.master);
      this.metronomeBus=this.ctx.createDynamicsCompressor();
      this.metronomeBus.threshold.value=-3;this.metronomeBus.knee.value=3;this.metronomeBus.ratio.value=20;this.metronomeBus.attack.value=.001;this.metronomeBus.release.value=.06;this.metronomeBus.connect(this.master);
      this.tracks=[0,1].map(()=>{const gain=this.ctx.createGain(),pan=this.ctx.createStereoPanner();gain.connect(pan);pan.connect(this.metronomeBus);return {gain,pan};});
      // Unlock synchronously within the original user gesture before fetching.
      const silent=this.ctx.createBufferSource();silent.buffer=this.ctx.createBuffer(1,1,this.ctx.sampleRate);silent.connect(this.ctx.destination);silent.start();
      this.loading=this.load();
    }
    await this.ctx.resume();
  }
  async load(){
    const ui=['switchingmenus','hoversound','Acceptsound','invalidsound','Warningsound','buttonpress'];
    const entries=ui.map(n=>[n,`./assets/audio/ui/${n}.mp3`]);
    await Promise.all([
      ...entries.map(async([key,path])=>{
        try{
          const response=await fetch(path);if(!response.ok)throw Error('Missing UI fallback');
          const data=await response.arrayBuffer();if(!data.byteLength)throw Error('Empty fallback');
          this.buffers.set(key,await this.ctx.decodeAudioData(data));
        }catch{this.sampleStatus.push(key);}
      }),
      (async()=>{
        try{
          const response=await fetch(UI_SPRITE_URL);
          if(!response.ok)throw Error('Missing LCARS sound pack');
          const data=await response.arrayBuffer();
          if(!data.byteLength)throw Error('Empty LCARS sound pack');
          this.uiPack=await this.ctx.decodeAudioData(data);
          // All cut points must fit inside the decoded buffer. A corrupt or
          // truncated pack must fall back to the original six sounds.
          const final=resolveUiCue('update&restart');
          if(this.uiPack.duration<final[0]+final[1]-.06)throw Error('Incomplete sound pack');
        }catch{
          this.uiPack=null;
          this.sampleStatus.push('lcars-ui-pack');
        }
      })()
    ]);
    for(const kind of Object.keys(SOUNDS).filter(k=>k!=='auto'))for(let state=0;state<3;state++){
      const data=synthesize(kind,state,this.ctx.sampleRate),buffer=this.ctx.createBuffer(1,data.length,this.ctx.sampleRate);buffer.copyToChannel(data,0);this.buffers.set(`synth-${kind}-${state}`,buffer);
    }
  }
  async prepareCustom(bank){const buffers=new Map();for(const sound of bank){const buffer=await this.ctx.decodeAudioData(decodeBytes(sound.data));if(buffer.duration>5||buffer.duration<=0)throw Error('Custom sound exceeds 5 seconds.');buffers.set(sound.id,buffer);}return buffers;}
  async loadCustom(bank){for(const sound of bank)if(!this.buffers.has(sound.id)){const buffer=await this.ctx.decodeAudioData(decodeBytes(sound.data));if(buffer.duration>5||buffer.duration<=0)throw Error('Custom sound exceeds 5 seconds.');this.buffers.set(sound.id,buffer);}}
  mix(s){if(!this.ctx)return;this.master.gain.setValueAtTime(s.master,this.ctx.currentTime);this.uiGain.gain.value=s.uiVolume;this.tracks.forEach((t,i)=>{t.gain.gain.value=audible(s.channels,i)?s.channels[i].volume*METRONOME_GAIN:0;t.pan.pan.value=s.channels[i].pan;});}
  click(event,time){
    if(event.state===3)return;
    const c=this.ctx,track=this.tracks[event.channel];
    const choice=event.sound||'click';
    let buffer=this.buffers.get(choice);
    if(!buffer){
      const synthKey=`synth-${choice}-${event.state}`;
      buffer=this.buffers.get(synthKey);
      if(!buffer){const data=synthesize(choice,event.state,c.sampleRate);buffer=c.createBuffer(1,data.length,c.sampleRate);buffer.copyToChannel(data,0);this.buffers.set(synthKey,buffer);}
    }
    const source=c.createBufferSource();source.buffer=buffer;source.connect(track.gain);source.start(time);
    this.active.add(source);source.onended=()=>{this.active.delete(source);source.disconnect();source._env?.disconnect();};
  }
  ui(name,s){
    if(!this.ctx||this.ctx.state!=='running'||!s.uiEnabled)return;
    const cue=this.uiPack&&resolveUiCue(name);
    const buffer=cue?this.uiPack:this.buffers.get(fallbackUiSound(name));
    if(!buffer)return;
    const source=this.ctx.createBufferSource();
    source.buffer=buffer;
    source.connect(this.uiGain);
    if(cue)source.start(0,cue[0],cue[1]);
    else source.start();
    source.onended=()=>source.disconnect();
  }
  cancel(){for(const node of this.active){try{node.stop();}catch{}}this.active.clear();}
}
