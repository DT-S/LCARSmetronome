import {decodeBytes} from './custom-sounds.js';
import {synthesize,SOUNDS} from './synth.js';
import {audible} from './model.js';
export class AudioEngine {
  constructor(){this.buffers=new Map();this.active=new Set();this.sampleStatus=[];}
  async unlock(){
    if(!this.ctx){
      this.ctx=new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});
      this.master=this.ctx.createGain();this.master.connect(this.ctx.destination);
      this.uiGain=this.ctx.createGain();this.uiGain.connect(this.master);
      this.tracks=[0,1].map(()=>{const gain=this.ctx.createGain(),pan=this.ctx.createStereoPanner();gain.connect(pan);pan.connect(this.master);return {gain,pan};});
      // Unlock synchronously within the original user gesture before fetching.
      const silent=this.ctx.createBufferSource();silent.buffer=this.ctx.createBuffer(1,1,this.ctx.sampleRate);silent.connect(this.ctx.destination);silent.start();
      this.loading=this.load();
    }
    await this.ctx.resume();
  }
  async load(){
    const ui=['switchingmenus','hoversound','Acceptsound','invalidsound','Warningsound','buttonpress'];
    const entries=ui.map(n=>[n,`./assets/audio/ui/${n}.mp3`]);

    await Promise.all(entries.map(async([key,path])=>{try{const r=await fetch(path);if(!r.ok)throw Error();const data=await r.arrayBuffer();if(data.byteLength===0)throw Error();this.buffers.set(key,await this.ctx.decodeAudioData(data));}catch{this.sampleStatus.push(key);}}));
    for(const kind of Object.keys(SOUNDS).filter(k=>k!=='auto'))for(let state=0;state<3;state++){
      const data=synthesize(kind,state,this.ctx.sampleRate),buffer=this.ctx.createBuffer(1,data.length,this.ctx.sampleRate);buffer.copyToChannel(data,0);this.buffers.set(`synth-${kind}-${state}`,buffer);
    }
  }
  async prepareCustom(bank){const buffers=new Map();for(const sound of bank){const buffer=await this.ctx.decodeAudioData(decodeBytes(sound.data));if(buffer.duration>5||buffer.duration<=0)throw Error('Custom sound exceeds 5 seconds.');buffers.set(sound.id,buffer);}return buffers;}
  async loadCustom(bank){for(const sound of bank)if(!this.buffers.has(sound.id)){const buffer=await this.ctx.decodeAudioData(decodeBytes(sound.data));if(buffer.duration>5||buffer.duration<=0)throw Error('Custom sound exceeds 5 seconds.');this.buffers.set(sound.id,buffer);}}
  mix(s){if(!this.ctx)return;this.master.gain.setValueAtTime(s.master,this.ctx.currentTime);this.uiGain.gain.value=s.uiVolume;this.tracks.forEach((t,i)=>{t.gain.gain.value=audible(s.channels,i)?s.channels[i].volume:0;t.pan.pan.value=s.channels[i].pan;});}
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
  ui(name,s){if(!this.ctx||this.ctx.state!=='running'||!s.uiEnabled)return;const b=this.buffers.get(name);if(!b)return;const source=this.ctx.createBufferSource();source.buffer=b;source.connect(this.uiGain);source.start();source.onended=()=>source.disconnect();}
  cancel(){for(const node of this.active){try{node.stop();}catch{}}this.active.clear();}
}
